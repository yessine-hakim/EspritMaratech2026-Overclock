from django.core.management.base import BaseCommand
from products.models import Product
from pay4all.qdrant_config import get_qdrant_client, init_visual_collection, VISUAL_COLLECTION
from fastembed import ImageEmbedding
from qdrant_client.models import PointStruct
import requests
import tempfile
import os
from PIL import Image

class Command(BaseCommand):
    help = 'Index products with visual embeddings using CLIP'

    def handle(self, *args, **kwargs):
        self.stdout.write("Initializing Visual Collection...")
        client = init_visual_collection()
        
        self.stdout.write("Loading CLIP model (Qdrant/clip-ViT-B-32-vision)...")
        # fastembed will download the model on first run
        embedding_model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")
        
        products = Product.objects.all()
        points = []
        batch_size = 10
        total = products.count()
        processed = 0
        
        self.stdout.write(f"Found {total} products to process.")
        
        for product in products:
            image_url = product.get_first_image()
            if not image_url:
                continue
                
            try:
                # Download image
                # Use a specific user agent to avoid some blocking
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(image_url, headers=headers, stream=True, timeout=10)
                
                if response.status_code == 200:
                    # Create temp file
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                        for chunk in response.iter_content(1024):
                            tmp.write(chunk)
                        tmp_path = tmp.name
                    
                    try:
                        # Validate image with Pillow
                        with Image.open(tmp_path) as img:
                            img.verify()
                        
                        # Embed (pass the path)
                        # fastembed.ImageEmbedding.embed takes a list of paths or images
                        # We pass generator to list
                        embedding = list(embedding_model.embed([tmp_path]))[0]
                        
                        points.append(PointStruct(
                            id=product.id,
                            vector=embedding,
                            payload={
                                "title": product.title,
                                "price": product.price,
                                "image": image_url,
                                "category": product.category.name if product.category else "Uncategorized"
                            }
                        ))
                        
                        processed += 1
                        if processed % 5 == 0:
                            self.stdout.write(f"Processed {processed}/{total}")
                            
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"Invalid image content for {product.title}: {e}"))
                    finally:
                        # Clean up temp file
                        if os.path.exists(tmp_path):
                            os.unlink(tmp_path)
                            
                else:
                    self.stdout.write(self.style.WARNING(f"Could not download image {image_url}: Status {response.status_code}"))
                            
            except Exception as e:
                 self.stdout.write(self.style.ERROR(f"Error processing {product.title}: {e}"))

            # Upsert batch
            if len(points) >= batch_size:
                try:
                    client.upsert(collection_name=VISUAL_COLLECTION, points=points)
                    self.stdout.write(self.style.SUCCESS(f"Upserted batch of {len(points)}"))
                    points = []
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to upsert batch: {e}"))

        # Final batch
        if points:
            try:
                client.upsert(collection_name=VISUAL_COLLECTION, points=points)
                self.stdout.write(self.style.SUCCESS(f"Upserted final batch of {len(points)}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to upsert final batch: {e}"))
                
        self.stdout.write(self.style.SUCCESS(f"Finished! Processed {processed}/{total} products."))

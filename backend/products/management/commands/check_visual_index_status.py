from django.core.management.base import BaseCommand
from products.models import Product
from pay4all.qdrant_config import get_qdrant_client, VISUAL_COLLECTION

class Command(BaseCommand):
    help = 'Check status of visual product indexing'

    def handle(self, *args, **kwargs):
        client = get_qdrant_client()
        
        # Qdrant count
        try:
            # Check if collection exists first
            collections = client.get_collections().collections
            collection_names = [col.name for col in collections]
            
            if VISUAL_COLLECTION not in collection_names:
                self.stdout.write(self.style.ERROR(f"Collection '{VISUAL_COLLECTION}' does not exist!"))
                qdrant_count = 0
            else:
                qdrant_count = client.count(collection_name=VISUAL_COLLECTION).count
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error connecting to Qdrant: {e}"))
            return

        # DB count
        # We only care about products that have at least one image
        products_total = Product.objects.count()
        products_with_images = 0
        
        # Count products with images (naive check)
        # Doing this in Python for accuracy with model logic
        for p in Product.objects.all():
            if p.get_first_image():
                products_with_images += 1
        
        self.stdout.write(f"Total Products in DB: {products_total}")
        self.stdout.write(f"Products with Images (Indexable): {products_with_images}")
        self.stdout.write(f"Total Vectors in Qdrant '{VISUAL_COLLECTION}': {qdrant_count}")
        
        if qdrant_count == 0:
             self.stdout.write(self.style.WARNING("No products are indexed visually!"))
        elif qdrant_count < products_with_images:
             self.stdout.write(self.style.WARNING(f"Mismatch! {products_with_images - qdrant_count} indexable products might be missing."))
        elif qdrant_count > products_with_images:
             self.stdout.write(self.style.WARNING(f"Mismatch! Qdrant has {qdrant_count - products_with_images} more vectors than indexable products (orphaned vectors?)."))
        else:
             self.stdout.write(self.style.SUCCESS("Counts match perfectly."))

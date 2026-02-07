import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from products.models import Product, Category
from pay4all.qdrant_config import sync_product_text

def seed_real_products(input_file):
    print(f"Seeding products from {input_file}...")
    
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    count = 0
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                
                # Get or create category
                category_name = data.get('category', 'General')
                category, _ = Category.objects.get_or_create(name=category_name)
                
                # Create product
                # We use get_or_create to avoid duplicates if run multiple times
                product, created = Product.objects.get_or_create(
                    title=data['title'],
                    defaults={
                        "category": category,
                        "price": data.get('price', '10.00 USD'),
                        "rating": data.get('rating', '4.0'),
                        "nbr_rating": data.get('nbr_rating', '10'),
                        "description": data.get('description', ''),
                        "image": data.get('image', ''),
                        "name": data['title']
                    }
                )
                
                if created:
                    print(f"Created product: {product.title}")
                    count += 1
                
                    # Sync to Qdrant
                    try:
                        sync_product_text(product)
                        # print(f"Synced {product.title} to Qdrant.")
                    except Exception as e:
                        print(f"Failed to sync {product.title} to Qdrant: {e}")
                
                if count % 50 == 0 and count > 0:
                    print(f"Imported {count} new products...")

            except Exception as e:
                print(f"Error seeding product: {e}")
                
    print(f"Done! Seeded {count} new products.")

if __name__ == "__main__":
    input_path = os.path.join('backend', 'data', 'products_cleaned.jsonl')
    seed_real_products(input_path)

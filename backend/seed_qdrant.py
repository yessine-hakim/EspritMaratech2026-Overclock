import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from products.models import Product
from pay4all.qdrant_config import init_products_collection, init_visual_collection, sync_product_text, sync_product_visual

def seed_qdrant():
    print("Initializing Qdrant collections...")
    init_products_collection()
    init_visual_collection()
    
    products = Product.objects.all()
    print(f"Syncing {products.count()} products to Qdrant...")
    
    for i, product in enumerate(products):
        try:
            sync_product_text(product)
            # sync_product_visual(product) # Optional for now, skip to save time and API calls if any
            if (i + 1) % 10 == 0:
                print(f"Indexed {i+1} products...")
        except Exception as e:
            print(f"Error syncing product {product.id}: {e}")

    print("Qdrant seeding complete.")

if __name__ == "__main__":
    seed_qdrant()

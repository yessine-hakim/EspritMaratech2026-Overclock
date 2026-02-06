import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from products.models import Product, Category
from pay4all.qdrant_config import sync_product_text

def seed_dummy_products():
    print("Seeding dummy products...")
    
    categories_data = ["Electronics", "Fashion", "Home", "Groceries"]
    categories = {}
    for cat_name in categories_data:
        cat, _ = Category.objects.get_or_create(name=cat_name)
        categories[cat_name] = cat
        
    products_data = [
        {"title": "iPhone 15", "price": "999.00 USD", "category": "Electronics", "description": "Latest Apple smartphone with dynamic island."},
        {"title": "Samsung Galaxy S24", "price": "899.00 USD", "category": "Electronics", "description": "High-end Android phone with AI features."},
        {"title": "Sony WH-1000XM5", "price": "349.00 USD", "category": "Electronics", "description": "Industry-leading noise cancelling headphones."},
        {"title": "Nike Air Max 270", "price": "150.00 USD", "category": "Fashion", "description": "Comfortable and stylish sneakers."},
        {"title": "Levis 501 Jeans", "price": "60.00 USD", "category": "Fashion", "description": "Classic straight fit jeans."},
        {"title": "MacBook Air M2", "price": "1199.00 USD", "category": "Electronics", "description": "Thin and light laptop with powerful M2 chip."},
        {"title": "Espresso Machine", "price": "199.00 USD", "category": "Home", "description": "Start your day with a perfect coffee."},
        {"title": "Organic Honey", "price": "12.00 USD", "category": "Groceries", "description": "Pure honey from mountain bees."},
    ]
    
    for item in products_data:
        product, created = Product.objects.get_or_create(
            title=item["title"],
            defaults={
                "category": categories[item["category"]],
                "price": item["price"],
                "description": item["description"],
                "name": item["title"]
            }
        )
        if created:
            print(f"Created product: {product.title}")
        
        # Sync to Qdrant
        try:
            sync_product_text(product)
            print(f"Synced {product.title} to Qdrant.")
        except Exception as e:
            print(f"Failed to sync {product.title}: {e}")

    print("Dummy product seeding and Qdrant sync complete.")

if __name__ == "__main__":
    seed_dummy_products()

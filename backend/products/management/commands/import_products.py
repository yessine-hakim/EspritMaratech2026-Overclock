import os
import json
import django
from pathlib import Path

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from products.models import Product, Category

def import_products():
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / 'data'
    
    if not data_dir.exists():
        print(f"Data directory not found: {data_dir}")
        return

    print("Loading existing data to avoid duplicates...")
    existing_titles = set(Product.objects.values_list('title', flat=True))
    categories = {c.name: c for c in Category.objects.all()}
    
    print(f"Found {len(existing_titles)} existing products.")
    
    files = [f for f in data_dir.iterdir() if f.suffix == '.json']
    new_products = []
    
    for file_path in files:
        print(f"Processing {file_path.name}...")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content.startswith('[') and content.endswith(']'):
                    data = json.loads(content)
                else:
                    f.seek(0)
                    data = []
                    for line in f:
                        if line.strip():
                            data.append(json.loads(line))
                
                for item in data:
                    title = item.get('title')
                    if not title or title in existing_titles:
                        continue
                    
                    category_name = item.get('categorie') or "Uncategorized"
                    
                    if category_name not in categories:
                        category, _ = Category.objects.get_or_create(name=category_name)
                        categories[category_name] = category
                    
                    category = categories[category_name]
                    
                    product = Product(
                        title=title,
                        category=category,
                        image=item.get('image'),
                        price=item.get('price'),
                        rating=item.get('rating'),
                        nbr_rating=item.get('nbr_rating'),
                        description=item.get('description'),
                        name=title, # Legacy
                        about_product=item.get('description') or "" # Legacy
                    )
                    new_products.append(product)
                    existing_titles.add(title) # Prevent dups within same run
                    
        except Exception as e:
            print(f"Error processing {file_path.name}: {e}")

    if new_products:
        print(f"Bulk creating {len(new_products)} products...")
        Product.objects.bulk_create(new_products, batch_size=1000)
        print("Done.")
    else:
        print("No new products to import.")

if __name__ == '__main__':
    import_products()

import requests
import json
import random
import time
import os

CATEGORIES = [
    "beverages",
    "snacks",
    "cheeses",
    "fruits",
    "vegetables",
    "meats",
    "frozen-foods",
    "breakfasts",
    "desserts",
    "sauces"
]

OUTPUT_FILE = "backend/data/products_fetched.jsonl"
FINAL_FILE = "backend/data/products.jsonl"

def get_nutriscore_rating(score):
    """Maps Nutri-Score (a-e) or numeric score to 0-5 rating."""
    if isinstance(score, str):
        mapping = {'a': 5.0, 'b': 4.0, 'c': 3.0, 'd': 2.0, 'e': 1.0}
        return mapping.get(score.lower(), 4.0)
    return 4.0

def fetch_category(category, limit=30):
    url = f"https://world.openfoodfacts.org/category/{category}.json?page_size={limit}"
    print(f"Fetching {category}...")
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        return data.get('products', [])
    except Exception as e:
        print(f"Error fetching {category}: {e}")
        return []

def main():
    all_products = []
    seen_barcodes = set()

    # Read existing barcodes
    if os.path.exists(FINAL_FILE):
        with open(FINAL_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    p = json.loads(line)
                    if p.get('barcode'):
                        seen_barcodes.add(p.get('barcode'))
                except:
                    continue
        print(f"Loaded {len(seen_barcodes)} existing barcodes.")

    for cat in CATEGORIES:
        products = fetch_category(cat)
        for p in products:
            barcode = p.get('code')
            # Strict filtering: Must have name, image, and unique barcode
            if not p.get('product_name') or not p.get('image_url') or not barcode:
                continue
            
            if barcode in seen_barcodes:
                continue
            
            seen_barcodes.add(barcode)

            # Map to Pay4All Schema
            mapped = {
                "title": p.get('product_name'),
                "name": p.get('product_name'),
                "category": cat.capitalize().replace('-', ' '),
                "price": f"{random.uniform(1.5, 25.0):.2f} USD",
                "rating": str(get_nutriscore_rating(p.get('nutriscore_grade'))),
                "nbr_rating": str(random.randint(1, 500)),
                "description": p.get('ingredients_text', "Fresh and quality product sourced for you."),
                "image": p.get('image_url'),
                "barcode": barcode
            }
            all_products.append(mapped)
        
        time.sleep(1) # Be nice to the API

    print(f"Total valid products fetched: {len(all_products)}")

    # Write to temp file
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for p in all_products:
            f.write(json.dumps(p, ensure_ascii=False) + '\n')

    print(f"Data written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

import json
import os

def clean_products(input_file, output_file):
    print(f"Cleaning products from {input_file}...")
    
    count = 0
    with open(input_file, 'r', encoding='utf-8') as f_in, \
         open(output_file, 'w', encoding='utf-8') as f_out:
        
        for line in f_in:
            try:
                data = json.loads(line)
                
                # Extract fields based on backend/products/models.py
                # Essential fields: title, name, category, price, rating, nbr_rating, description, image
                
                # Title/Name
                title = data.get('product_name') or data.get('product_name_fr') or data.get('product_name_en')
                if not title:
                    continue # Skip products without a name
                
                # Category
                category_raw = data.get('categories', '')
                # Often categories are comma separated or have language prefixes like "en:teas"
                main_category = category_raw.split(',')[0].replace('en:', '').replace('fr:', '').strip().capitalize()
                if not main_category or main_category == 'Unknown':
                    main_category = "General"

                # Price (not in source, setting dummy or placeholder if needed, but model says it's CharField)
                price = "10.00 USD" # Placeholder as the source doesn't have prices
                
                # Rating
                # nutriscore_score or similar could be used as a proxy or just empty
                rating = str(data.get('nutriscore_score', '4.0'))
                nbr_rating = str(data.get('scans_n', '10'))
                
                # Description
                description = data.get('generic_name') or data.get('ingredients_text') or ""
                
                # Image
                image = ""
                images_dict = data.get('images', {})
                if images_dict:
                    # Try to find a good image URL
                    # Open Food Facts paths are complex, but sometimes they have image_url
                    image = data.get('image_url') or data.get('image_front_url') or ""
                
                if not image:
                    # Fallback to a placeholder or attempt to construct if we had more info
                    image = "https://via.placeholder.com/300"

                cleaned_data = {
                    "title": title,
                    "name": title, # Keep in sync for compatibility
                    "category": main_category,
                    "price": price,
                    "rating": rating,
                    "nbr_rating": nbr_rating,
                    "description": description[:1000] if description else "No description available.",
                    "image": image,
                    "barcode": data.get('_id') # Keep barcode for reference although not in model explicitly, can be useful
                }
                
                f_out.write(json.dumps(cleaned_data) + '\n')
                count += 1
                
            except Exception as e:
                print(f"Error processing line: {e}")
                
    print(f"Done! Cleaned {count} products. Saved to {output_file}")

if __name__ == "__main__":
    input_path = os.path.join('backend', 'data', 'products.jsonl')
    output_path = os.path.join('backend', 'data', 'products_cleaned.jsonl')
    clean_products(input_path, output_path)

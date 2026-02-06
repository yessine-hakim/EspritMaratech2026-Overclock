from django.core.management.base import BaseCommand
from products.models import Product
import re

class Command(BaseCommand):
    help = 'Clean product data: fix price typos, remove invalid products, and convert to USD'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting product cleanup and conversion...')
        
        products = Product.objects.all()
        cleaned_count = 0
        deleted_count = 0
        converted_count = 0
        
        # approximate exchange rate
        EUR_TO_USD = 1.05 
        
        for product in products:
            if not product.price or not product.price.strip():
                self.stdout.write(f'Deleting product {product.id} (Title: {product.title[:30]}...) - Price is empty')
                product.delete()
                deleted_count += 1
                continue
                
            original_price = product.price
            price_str = original_price
            
            # Step 1: specific typo fix (double commas)
            if ',,' in price_str:
                price_str = price_str.replace(',,', ',')
            if '..' in price_str:
                price_str = price_str.replace('..', '.')
                
            # Step 2: Extract numeric value
            # Remove currency symbol and whitespace
            clean_str = price_str.replace('€', '').replace('$', '').strip()
            # Remove thousands separators (space or non-breaking space)
            clean_str = clean_str.replace(' ', '').replace('\u202f', '')
            # Replace decimal comma with dot
            clean_str = clean_str.replace(',', '.')
            
            try:
                # Extract the first float found if simple parse fails, or just float()
                # Use regex to find number in case of hidden chars
                match = re.search(r'[\d\.]+', clean_str)
                if match:
                    val_eur = float(match.group())
                    val_usd = val_eur * EUR_TO_USD
                    
                    # Format as USD
                    new_price = f"${val_usd:.2f}"
                    
                    if new_price != original_price:
                        product.price = new_price
                        product.save()
                        cleaned_count += 1
                        # self.stdout.write(f'Converted {product.id}: "{original_price}" -> "{product.price}"')
                else:
                    self.stdout.write(f'Skipping {product.id}: Could not parse "{original_price}"')
                    
            except ValueError:
                self.stdout.write(f'Skipping {product.id}: Error parsing "{original_price}"')
                
        self.stdout.write(self.style.SUCCESS(f'\nCleanup complete!'))
        self.stdout.write(f'Processed/Converted: {cleaned_count}')
        self.stdout.write(f'Deleted products: {deleted_count}')

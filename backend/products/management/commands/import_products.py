import os
import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product, Category

class Command(BaseCommand):
    help = 'Import products from JSONL files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to a specific JSONL file to import',
        )

    def handle(self, *args, **kwargs):
        file_arg = kwargs.get('file')
        if file_arg:
            data_files = [Path(file_arg)]
        else:
            # Default to backend/data directory
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            data_dir = base_dir / 'data'
            if not data_dir.exists():
                self.stdout.write(self.style.ERROR(f"Data directory not found: {data_dir}"))
                return
            
            # Explicitly look for products_cleaned.jsonl first
            cleaned_file = data_dir / 'products_cleaned.jsonl'
            if cleaned_file.exists():
                data_files = [cleaned_file]
            else:
                data_files = list(data_dir.glob('*.jsonl'))

        if not data_files:
            self.stdout.write(self.style.WARNING("No data files found to import."))
            return

        self.stdout.write("Loading existing data to avoid duplicates...")
        existing_titles = set(Product.objects.values_list('title', flat=True))
        categories = {c.name.lower(): c for c in Category.objects.all()}
        
        new_products = []
        
        for file_path in data_files:
            self.stdout.write(f"Processing {file_path.name}...")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            item = json.loads(line)
                        except json.JSONDecodeError:
                            self.stdout.write(self.style.WARNING(f"Skipping invalid JSON line in {file_path.name}"))
                            continue

                        title = item.get('title')
                        if not title or title in existing_titles:
                            continue
                        
                        category_name = item.get('category') or "Uncategorized"
                        category_key = category_name.lower()
                        
                        if category_key not in categories:
                            category, _ = Category.objects.get_or_create(name=category_name)
                            categories[category_key] = category
                        
                        category = categories[category_key]
                        
                        product = Product(
                            title=title,
                            category=category,
                            image=item.get('image'),
                            price=item.get('price'),
                            rating=item.get('rating'),
                            nbr_rating=item.get('nbr_rating'),
                            description=item.get('description'),
                            barcode=item.get('barcode'),
                            name=title,
                        )
                        new_products.append(product)
                        existing_titles.add(title) # Prevent dups within same run
                        
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing {file_path.name}: {e}"))

        if new_products:
            self.stdout.write(f"Bulk creating {len(new_products)} products...")
            with transaction.atomic():
                Product.objects.bulk_create(new_products, batch_size=1000)
            self.stdout.write(self.style.SUCCESS("Import completed successfully."))
        else:
            self.stdout.write("No new products to import.")

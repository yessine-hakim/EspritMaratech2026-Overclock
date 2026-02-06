import os
import json
import tempfile
import requests
from pathlib import Path
from PIL import Image
import numpy as np
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product, Category
from pay4all.qdrant_config import (
    get_qdrant_client, 
    PRODUCTS_COLLECTION, 
    VISUAL_COLLECTION, 
    init_products_collection, 
    init_visual_collection,
    delete_collection
)
from django.core.management import call_command
from fastembed import ImageEmbedding
from qdrant_client.models import PointStruct

class Command(BaseCommand):
    help = 'Purge Qdrant and re-index products from DB (or re-import from JSON)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sync-only',
            action='store_true',
            help='Skip DB purge and JSON import, only sync Qdrant with current DB content',
        )
        parser.add_argument(
            '--text-only',
            action='store_true',
            help='Only run text indexing',
        )
        parser.add_argument(
            '--visual-only',
            action='store_true',
            help='Only run visual indexing',
        )

    def handle(self, *args, **kwargs):
        from django.db.models.signals import post_save, post_delete
        from products.signals import product_post_save, product_post_delete
        
        # Mute signals to avoid redundant Qdrant calls during bulk cleaning
        post_save.disconnect(product_post_save, sender=Product)
        post_delete.disconnect(product_post_delete, sender=Product)
        
        try:
            self._handle_reindex(*args, **kwargs)
        finally:
            # Reconnect signals
            post_save.connect(product_post_save, sender=Product)
            post_delete.connect(product_post_delete, sender=Product)

    def _handle_reindex(self, *args, **kwargs):
        sync_only = kwargs.get('sync_only')
        text_only = kwargs.get('text_only')
        visual_only = kwargs.get('visual_only')
        
        if sync_only:
            self.stdout.write(self.style.NOTICE("--- SYNCING QDRANT WITH CURRENT DATABASE ---"))
        else:
            self.stdout.write(self.style.WARNING("--- STARTING FULL CATALOG RE-INDEXING (PURGE + IMPORT) ---"))

        # 1. Purge Database (Skip if sync-only or specific index flags)
        indexing_specific = text_only or visual_only
        if not sync_only and not indexing_specific:
            self.stdout.write("Purging Database (Products & Categories)...")
            with transaction.atomic():
                Product.objects.all().delete()
                Category.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Database purged."))

        # 2. Purge Qdrant (Skip if specific index flags)
        if not indexing_specific:
            self.stdout.write("Purging Qdrant Collections...")
            delete_collection(PRODUCTS_COLLECTION)
            delete_collection(VISUAL_COLLECTION)
            
            self.stdout.write("Initializing Qdrant Collections...")
            init_products_collection()
            init_visual_collection()
            self.stdout.write(self.style.SUCCESS("Qdrant initialized."))

        # 3. Import Data (Skip if sync-only or specific index flags)
        if not sync_only and not indexing_specific:
            self.stdout.write("Importing Data from JSON files...")
            self.import_data()
            self.stdout.write("Cleaning and Normalizing imported data...")
            self.clean_data()
        
        # 4. Index Text
        if not visual_only:
            self.stdout.write("Indexing Text Vectors (Delegating to index_products)...")
            call_command('index_products')

        # 5. Index Visual
        if not text_only:
            self.stdout.write("Indexing Visual Vectors (Delegating to index_visual_products)...")
            call_command('index_visual_products')

        self.stdout.write(self.style.SUCCESS("--- CATALOG RE-INDEXING COMPLETE ---"))

    def qdrant_retry(self, func, *args, max_retries=3, **kwargs):
        import time
        last_exception = None
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                self.stdout.write(self.style.WARNING(f"    Qdrant call failed (Attempt {attempt+1}/{max_retries}): {e}"))
                time.sleep(2 * (attempt + 1))  # Exponential backoff
        raise last_exception

    def import_data(self):
        from django.conf import settings
        data_dir = settings.BASE_DIR / 'data'
        
        if not data_dir.exists():
            self.stdout.write(self.style.ERROR(f"Data directory not found: {data_dir}"))
            return

        categories = {}
        new_products = []
        
        files = [f for f in data_dir.iterdir() if f.suffix == '.json']
        for file_path in files:
            self.stdout.write(f"  Processing {file_path.name}...")
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
                        if not title: continue
                        
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
                            name=title,
                            about_product=item.get('description') or ""
                        )
                        new_products.append(product)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Error processing {file_path.name}: {e}"))

        if new_products:
            Product.objects.bulk_create(new_products, batch_size=500)
            self.stdout.write(self.style.SUCCESS(f"  Imported {len(new_products)} products."))

    def clean_data(self):
        import re
        products = Product.objects.all()
        cleaned_count = 0
        deleted_count = 0
        EUR_TO_USD = 1.05 
        
        for product in products:
            if not product.price or not product.price.strip():
                product.delete()
                deleted_count += 1
                continue
                
            original_price = product.price
            price_str = original_price
            
            if ',,' in price_str: price_str = price_str.replace(',,', ',')
            if '..' in price_str: price_str = price_str.replace('..', '.')
                
            clean_str = price_str.replace('€', '').replace('$', '').strip()
            clean_str = clean_str.replace(' ', '').replace('\u202f', '')
            clean_str = clean_str.replace(',', '.')
            
            try:
                match = re.search(r'[\d\.]+', clean_str)
                if match:
                    val_eur = float(match.group())
                    val_usd = val_eur * EUR_TO_USD
                    new_price = f"${val_usd:.2f}"
                    
                    if new_price != original_price:
                        product.price = new_price
                        product.save()
                        cleaned_count += 1
            except ValueError:
                pass
                
        self.stdout.write(f"  Cleanup: {cleaned_count} converted, {deleted_count} deleted.")


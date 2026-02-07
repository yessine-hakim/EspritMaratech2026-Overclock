import os
import sys

# Add the project root to sys.path if running directly
if __name__ == "__main__":
    # Get the backend directory (project root)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
    if project_root not in sys.path:
        sys.path.append(project_root)
    
    # Set Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
    import django
    django.setup()

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
            self.stdout.write("Importing Data from JSONL (Delegating to import_products)...")
            call_command('import_products')
        
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


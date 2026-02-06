from django.core.management.base import BaseCommand
from pay4all.qdrant_config import get_qdrant_client, init_products_collection


class Command(BaseCommand):
    help = 'Test Qdrant connection and initialize products collection'

    def handle(self, *args, **kwargs):
        self.stdout.write('Testing Qdrant connection...')
        
        try:
            # Get client
            client = get_qdrant_client()
            
            # Test connection by listing collections
            collections = client.get_collections()
            self.stdout.write(self.style.SUCCESS(
                f'✓ Connected to Qdrant! Found {len(collections.collections)} collections'
            ))
            
            # List existing collections
            if collections.collections:
                self.stdout.write('\nExisting collections:')
                for col in collections.collections:
                    self.stdout.write(f'  - {col.name} ({col.vectors_count} vectors)')
            
            # Initialize products collection
            self.stdout.write('\nInitializing products collection...')
            init_products_collection(client)
            
            self.stdout.write(self.style.SUCCESS('\n✓ Qdrant setup complete!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ Error: {str(e)}'))
            raise

import os
import sys
from django.core.management.base import BaseCommand

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
                f'Connected to Qdrant! Found {len(collections.collections)} collections'
            ))
            
            # List existing collections
            if collections.collections:
                self.stdout.write('\nExisting collections:')
                for col in collections.collections:
                    # Get detailed info for each collection. Note: get_collection returns CollectionInfo
                    info = client.get_collection(col.name)
                    # For older versions of qdrant_client, it might be info.vectors_count
                    # For newer, it's usually info.points_count or in info.config
                    count = getattr(info, 'points_count', getattr(info, 'vectors_count', 'N/A'))
                    self.stdout.write(f'  - {col.name} ({count} points)')
            
            # Initialize products collection
            self.stdout.write('\nInitializing products collection...')
            init_products_collection(client)
            
            self.stdout.write(self.style.SUCCESS('\nQdrant setup complete!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\nError: {str(e)}'))
            raise

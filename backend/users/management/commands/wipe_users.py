
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Deletes all non-superuser accounts'

    def handle(self, *args, **kwargs):
        self.stdout.write('Deleting all standard users...')
        
        # Delete all users who are not superusers
        count, _ = User.objects.filter(is_superuser=False).delete()
        
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} users.'))

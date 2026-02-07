from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'List all users in the database'

    def handle(self, *args, **kwargs):
        users = User.objects.all()
        count = users.count()
        
        self.stdout.write(f"Total Users: {count}")
        
        if count > 0:
            self.stdout.write("-" * 50)
            self.stdout.write(f"{'ID':<5} {'Email':<30} {'Name':<20} {'Active':<10} {'Superuser':<10}")
            self.stdout.write("-" * 50)
            
            for user in users:
                name = f"{user.first_name} {user.last_name}"
                self.stdout.write(f"{user.id:<5} {user.email:<30} {name:<20} {str(user.is_active):<10} {str(user.is_superuser):<10}")
        else:
            self.stdout.write("No users found in the database.")

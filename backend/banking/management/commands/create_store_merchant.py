from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from banking.models import BankAccount
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize the Store Merchant account'

    def handle(self, *args, **kwargs):
        email = 'store@pay4all.com'
        username = 'store_merchant'
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'username': username, 'is_staff': True}
        )
        
        if created:
            user.set_unusable_password()
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created Store user: {email}'))
        else:
            self.stdout.write(f'Store user exists: {email}')
            
        account, acc_created = BankAccount.objects.get_or_create(
            iban='STORE-PAY4ALL-001',
            defaults={'user': user, 'balance': 1000000.000, 'currency': 'TND'}
        )
        
        if acc_created:
            self.stdout.write(self.style.SUCCESS(f'Created Store BankAccount with IBAN: STORE-PAY4ALL-001'))
        else:
            self.stdout.write(f'Store BankAccount already exists')

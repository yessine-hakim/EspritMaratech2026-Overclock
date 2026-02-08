
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from banking.models import BankAccount
import random
import string
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Links existing users to bank accounts'

    def handle(self, *args, **kwargs):
        self.stdout.write('Linking users to bank accounts...')
        
        users_without_accounts = User.objects.filter(bank_account__isnull=True)
        count = 0
        
        for user in users_without_accounts:
            # Try to find an unclaimed account
            account = BankAccount.objects.filter(user=None).first()
            
            if account:
                account.user = user
                account.save()
                self.stdout.write(f"Linked user {user.email} to existing account {account.iban}")
            else:
                # Create a new one
                digits = ''.join(random.choices(string.digits, k=22))
                iban = f"TN{digits}"
                while BankAccount.objects.filter(iban=iban).exists():
                     digits = ''.join(random.choices(string.digits, k=22))
                     iban = f"TN{digits}"

                account = BankAccount.objects.create(
                    user=user,
                    iban=iban,
                    balance=random.uniform(500, 5000)
                )
                self.stdout.write(f"Created new account {account.iban} for user {user.email}")
            
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f'Successfully linked {count} users.'))

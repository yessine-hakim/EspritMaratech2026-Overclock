
from django.core.management.base import BaseCommand
from banking.models import BankAccount
import random
import string

class Command(BaseCommand):
    help = 'Seeds the database with unclaimed bank accounts'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding unclaimed bank accounts...')
        
        count = 0
        for _ in range(50):
            # Generate a random Tunisian-style IBAN (TN + 22 digits)
            # Keeping it simple for demo: TN + 22 random digits
            digits = ''.join(random.choices(string.digits, k=22))
            iban = f"TN{digits}"
            
            if not BankAccount.objects.filter(iban=iban).exists():
                BankAccount.objects.create(
                    user=None,
                    iban=iban,
                    balance=random.uniform(500, 5000) # Random balance between 500 and 5000 TND
                )
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully created {count} unclaimed bank accounts.'))

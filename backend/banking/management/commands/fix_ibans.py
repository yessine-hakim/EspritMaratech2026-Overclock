
from django.core.management.base import BaseCommand
from banking.models import BankAccount
import random
import string

class Command(BaseCommand):
    help = 'Fixes invalid IBANs (not starting with TN)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Checking for invalid IBANs...')
        
        # specific fix for the user reported: hakimedam72@gmail.com
        # But generally look for any IBAN not starting with 'TN'
        
        invalid_accounts = BankAccount.objects.exclude(iban__startswith='TN')
        count = 0
        
        for account in invalid_accounts:
            old_iban = account.iban
            
            # Generate new valid IBAN
            digits = ''.join(random.choices(string.digits, k=22))
            new_iban = f"TN{digits}"
            while BankAccount.objects.filter(iban=new_iban).exists():
                    digits = ''.join(random.choices(string.digits, k=22))
                    new_iban = f"TN{digits}"
            
            account.iban = new_iban
            account.save()
            self.stdout.write(f"Fixed account {account.id}. Old: {old_iban} -> New: {new_iban}")
            if account.user:
                self.stdout.write(f"  User: {account.user.email}")
            
            count += 1
            
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No invalid IBANs found.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully fixed {count} invalid IBANs.'))

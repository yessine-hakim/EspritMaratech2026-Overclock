
from django.core.management.base import BaseCommand
from banking.models import BankAccount

class Command(BaseCommand):
    help = 'Seeds the Store Merchant Account'

    def handle(self, *args, **kwargs):
        iban = "STORE-PAY4ALL-001"
        account, created = BankAccount.objects.get_or_create(
            iban=iban,
            defaults={
                'user': None,
                'balance': 0.0,
                'currency': 'TND'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Successfully created merchant account: {iban}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Merchant account already exists: {iban}'))

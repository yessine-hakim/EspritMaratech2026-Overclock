import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from users.models import User
from banking.models import BankAccount, Transaction
from decimal import Decimal

def seed_banking_data():
    print("Seeding banking data...")
    users = User.objects.all()
    
    if not users.exists():
        print("No users found. Please register a user first.")
        return

    for user in users:
        account, created = BankAccount.objects.get_or_create(user=user)
        if created:
            account.balance = Decimal('250.000')
            account.save()
            print(f"Created bank account for {user.email} with 250 TND balance.")
            
            # Create a few dummy transactions
            Transaction.objects.create(
                sender=None,
                recipient=account,
                amount=Decimal('250.000'),
                transaction_type='DEPOSIT',
                description='Account initialization'
            )
            
            Transaction.objects.create(
                sender=account,
                recipient=None,
                amount=Decimal('45.500'),
                transaction_type='PAYMENT',
                description='Grocery Payment (Simulated)',
                category='Shopping'
            )
            
            account.balance -= Decimal('45.500')
            account.save()
            print(f"Added dummy transactions for {user.email}.")
        else:
            print(f"Bank account already exists for {user.email}.")

    print("Banking data seeding complete.")

if __name__ == "__main__":
    seed_banking_data()

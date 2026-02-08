
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from django.contrib.auth import get_user_model
from banking.models import BankAccount, Transaction
from django.db import transaction

User = get_user_model()

def test_logic():
    try:
        sender_user = User.objects.get(email='hakimedam72@gmail.com')
        sender_account = BankAccount.objects.get(user=sender_user)
        
        recipient_iban = 'TN3271876352790699891909'
        recipient_account = BankAccount.objects.get(iban=recipient_iban)
        
        print(f"Sender: {sender_account.iban} (Balance: {sender_account.balance})")
        print(f"Recipient: {recipient_account.iban} (Balance: {recipient_account.balance})")
        
        amount = 10.0
        
        if sender_account.balance < amount:
            print("Insufficient funds")
            return

        with transaction.atomic():
            sender_account.balance = float(sender_account.balance) - amount
            sender_account.save()
            
            recipient_account.balance = float(recipient_account.balance) + amount
            recipient_account.save()
            
            Transaction.objects.create(
                sender=sender_account,
                recipient=recipient_account,
                amount=amount,
                transaction_type='TRANSFER',
                description='Debug Logic Transfer'
            )
            
        print("Transfer Successful")
        
        sender_account.refresh_from_db()
        recipient_account.refresh_from_db()
        print(f"New Sender Balance: {sender_account.balance}")
        print(f"New Recipient Balance: {recipient_account.balance}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_logic()

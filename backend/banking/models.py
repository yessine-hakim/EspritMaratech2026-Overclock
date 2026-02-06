from django.db import models
from django.conf import settings
import uuid

class BankAccount(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bank_account')
    iban = models.CharField(max_length=36, unique=True, default=uuid.uuid4)
    balance = models.DecimalField(max_digits=12, decimal_places=3, default=0.000) # TND has 3 decimal places
    currency = models.CharField(max_length=3, default='TND')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.balance} {self.currency}"

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('TRANSFER', 'Transfer'),
        ('PAYMENT', 'Payment'),
        ('DEPOSIT', 'Deposit'),
    )

    sender = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='sent_transactions', null=True, blank=True)
    recipient = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='received_transactions', null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=3)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='PAYMENT')
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    category = models.CharField(max_length=50, default='General')

    def __str__(self):
        return f"{self.transaction_type}: {self.amount} TND ({self.timestamp})"

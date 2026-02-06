from rest_framework import serializers
from .models import BankAccount, Transaction

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'sender', 'recipient', 'amount', 'transaction_type', 'description', 'timestamp', 'category']
        read_only_fields = ['id', 'timestamp', 'sender', 'recipient']  # Sender/Recipient handled by view logic

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['iban', 'balance', 'currency']

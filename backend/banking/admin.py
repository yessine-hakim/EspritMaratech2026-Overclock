from django.contrib import admin
from .models import BankAccount, Transaction

@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'currency', 'iban')
    search_fields = ('user__email', 'iban')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_type', 'amount', 'sender', 'recipient', 'timestamp')
    list_filter = ('transaction_type', 'timestamp')
    search_fields = ('description',)

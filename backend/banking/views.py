from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from .models import BankAccount, Transaction
from .serializers import BankAccountSerializer, TransactionSerializer

class BalanceView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountSerializer

    def get_object(self):
        # Automatically create account if not exists (for prototype simplicity)
        account, created = BankAccount.objects.get_or_create(user=self.request.user)
        if created:
            # Seed initial balance for demo
            account.balance = 200.000
            account.save()
        return account

class TransferView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = float(request.data.get('amount', 0))
        description = request.data.get('description', 'Transfer')
        recipient_iban = request.data.get('recipient_iban')

        sender_account = get_object_or_404(BankAccount, user=request.user)

        if sender_account.balance < amount:
            return Response({"error": "Insufficient funds"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Deduct from sender
            sender_account.balance = float(sender_account.balance) - amount
            sender_account.save()

            # Create Transaction Record
            Transaction.objects.create(
                sender=sender_account,
                amount=amount,
                transaction_type='TRANSFER',
                description=description
            )
            
            # If recipient exists in system (by IBAN or dummy), add to them
            # For prototype, we just deduct and log the transaction
            
        return Response({"message": "Transfer successful", "new_balance": sender_account.balance}, status=status.HTTP_200_OK)
class TransactionListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        account = get_object_or_404(BankAccount, user=self.request.user)
        return Transaction.objects.filter(
            models.Q(sender=account) | models.Q(recipient=account)
        ).order_by('-timestamp')

from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from .models import BankAccount, Transaction, Order, OrderItem
from .serializers import BankAccountSerializer, TransactionSerializer

class BalanceView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountSerializer

    def get_object(self):
        # Automatically create account if not exists (for prototype simplicity)
        account, created = BankAccount.objects.get_or_create(user=self.request.user)
        return account

class TransferView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            amount = float(request.data.get('amount', 0))
        except (ValueError, TypeError):
            return Response({"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"error": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)

        description = request.data.get('description', 'Transfer')
        recipient_iban = request.data.get('recipient_iban', '').replace(' ', '').strip()

        sender_account = get_object_or_404(BankAccount, user=request.user)
        recipient_account = get_object_or_404(BankAccount, iban=recipient_iban)

        if sender_account == recipient_account:
            return Response({"error": "Cannot transfer to yourself"}, status=status.HTTP_400_BAD_REQUEST)

        if sender_account.balance < amount:
            return Response({"error": "Insufficient funds"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Deduct from sender
            sender_account.balance = float(sender_account.balance) - amount
            sender_account.save()

            # Add to recipient
            recipient_account.balance = float(recipient_account.balance) + amount
            recipient_account.save()

            # Create Transaction Record
            Transaction.objects.create(
                sender=sender_account,
                recipient=recipient_account,
                amount=amount,
                transaction_type='TRANSFER',
                description=description
            )
            
        return Response({"message": "Transfer successful", "new_balance": sender_account.balance}, status=status.HTTP_200_OK)

class CheckoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from cart.models import Cart
        
        user_account, _ = BankAccount.objects.get_or_create(user=request.user)
        cart = Cart.objects.filter(user=request.user, is_active=True).first()
        
        if not cart or cart.items.count() == 0:
            return Response({"error": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
            
        total_price = float(cart.total_price)
        
        if float(user_account.balance) < total_price:
            return Response({"error": f"Insufficient funds. You need ${total_price:.2f} but have ${user_account.balance:.2f}"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get Store Merchant
        try:
            store_account = BankAccount.objects.get(iban="STORE-PAY4ALL-001")
        except BankAccount.DoesNotExist:
            return Response({"error": "Store merchant account not initialized"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        with transaction.atomic():
            # 1. Transfer funds
            user_account.balance = float(user_account.balance) - total_price
            user_account.save()
            
            store_account.balance = float(store_account.balance) + total_price
            store_account.save()
            
            # 2. Record Transaction
            tx = Transaction.objects.create(
                sender=user_account,
                recipient=store_account,
                amount=total_price,
                transaction_type='PAYMENT',
                description=f"Purchase from Pay4All Store",
                category='Shopping'
            )
            
            # 3. Create Order
            order = Order.objects.create(
                user=request.user,
                transaction=tx,
                total_amount=total_price
            )
            
            for item in cart.items.all():
                # Fix: item.total_price is property, we need unit price
                try:
                    import re
                    numeric_part = re.sub(r'[^\d.]', '', str(item.product.price))
                    unit_price = float(numeric_part) if numeric_part else 0
                except:
                    unit_price = 0

                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    quantity=item.quantity,
                    price_at_purchase=unit_price
                )
                
            # 4. Finalize Cart
            cart.is_active = False
            cart.save()
            
        return Response({
            "message": "Checkout successful",
            "order_id": order.id,
            "transaction_id": tx.id,
            "new_balance": user_account.balance
        }, status=status.HTTP_200_OK)
class TransactionListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        account = get_object_or_404(BankAccount, user=self.request.user)
        return Transaction.objects.filter(
            models.Q(sender=account) | models.Q(recipient=account)
        ).order_by('-timestamp')

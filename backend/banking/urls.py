from django.urls import path
from .views import BalanceView, TransferView, TransactionListView, CheckoutView

urlpatterns = [
    path('balance/', BalanceView.as_view(), name='bank-balance'),
    path('transfer/', TransferView.as_view(), name='bank-transfer'),
    path('transactions/', TransactionListView.as_view(), name='bank-transactions'),
    path('checkout/', CheckoutView.as_view(), name='bank-checkout'),
]

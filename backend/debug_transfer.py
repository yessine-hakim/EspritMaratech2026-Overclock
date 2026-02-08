
import os
import django
from rest_framework.test import APIRequestFactory, force_authenticate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from banking.views import TransferView
from django.contrib.auth import get_user_model

User = get_user_model()

def test_transfer():
    sender = User.objects.get(email='hakimedam72@gmail.com')
    recipient_iban = 'TN3271876352790699891909' # hakimyessine72
    
    amount = 10.0
    
    factory = APIRequestFactory()
    view = TransferView.as_view()
    
    request = factory.post('/api/banking/transfer/', {
        'recipient_iban': recipient_iban,
        'amount': amount,
        'description': 'Debug Transfer'
    })
    force_authenticate(request, user=sender)
    
    print(f"Attempting transfer of {amount} from {sender.email} to {recipient_iban}")
    
    try:
        response = view(request)
        print(f"Status Code: {response.status_code}")
        print(f"Data: {response.data}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == '__main__':
    test_transfer()

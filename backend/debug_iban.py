
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    u = User.objects.filter(email='hakimyessine72@gmail.com').first()
    if u and u.bank_account:
        with open('debug_result.txt', 'w') as f:
            f.write(f"IBAN: {u.bank_account.iban}\nBalance: {u.bank_account.balance}")
        print(f"Written IBAN and Balance to debug_result.txt")
    else:
        print("User or account not found")
except Exception as e:
    print(f"Error: {e}")

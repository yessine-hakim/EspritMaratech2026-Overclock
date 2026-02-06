from django.core.management.base import BaseCommand
from users.models import User
from django.contrib.auth.hashers import make_password

class Command(BaseCommand):
    help = 'Generate diverse test users'

    def handle(self, *args, **kwargs):
        users_data = [
            {
                'username': 'budget_bob',
                'first_name': 'Bob',
                'last_name': 'Budget',
                'email': 'bob@example.com',
                'password': 'password123',
                'monthly_budget': 100.00,
                'max_single_purchase': 50.00,
                'preferred_price_range_min': 0.00,
                'preferred_price_range_max': 50.00,
                'payment_preferences': 'cash'
            },
            {
                'username': 'luxury_lucy',
                'first_name': 'Lucy',
                'last_name': 'Luxury',
                'email': 'lucy@example.com',
                'password': 'password123',
                'monthly_budget': 5000.00,
                'max_single_purchase': 2000.00,
                'preferred_price_range_min': 100.00,
                'preferred_price_range_max': 1000.00,
                'payment_preferences': 'card'
            },
            {
                'username': 'tech_tim',
                'first_name': 'Tim',
                'last_name': 'Tech',
                'email': 'tim@example.com',
                'password': 'password123',
                'monthly_budget': 1000.00,
                'max_single_purchase': 500.00,
                'preferred_price_range_min': 50.00,
                'preferred_price_range_max': 300.00,
                'payment_preferences': 'installments'
            },
            {
                'username': 'normal_nancy',
                'first_name': 'Nancy',
                'last_name': 'Normal',
                'email': 'nancy@example.com',
                'password': 'password123',
                'monthly_budget': 500.00,
                'max_single_purchase': 150.00,
                'preferred_price_range_min': 20.00,
                'preferred_price_range_max': 100.00,
                'payment_preferences': 'card'
            }
        ]

        created_count = 0
        for data in users_data:
            if not User.objects.filter(username=data['username']).exists():
                User.objects.create(
                    username=data['username'],
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    email=data['email'],
                    password=make_password(data['password']),
                    monthly_budget=data['monthly_budget'],
                    max_single_purchase=data['max_single_purchase'],
                    preferred_price_range_min=data['preferred_price_range_min'],
                    preferred_price_range_max=data['preferred_price_range_max'],
                    payment_preferences=data['payment_preferences']
                )
                self.stdout.write(f"Created user: {data['username']}")
                created_count += 1
            else:
                self.stdout.write(f"User already exists: {data['username']}")

        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} users'))

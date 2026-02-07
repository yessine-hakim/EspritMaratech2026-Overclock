from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    first_name = models.CharField(max_length=150, blank=False)
    last_name = models.CharField(max_length=150, blank=False)
    email = models.EmailField(unique=True)

    # Financial context
    monthly_budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    max_single_purchase = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    preferred_price_range_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    preferred_price_range_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    currency = models.CharField(max_length=3, default="TND")

    # Payment preferences
    PAYMENT_CHOICES = [
        ("card", "Card"),
        ("installments", "Installments"),
        ("cash", "Cash"),
    ]
    payment_preferences = models.CharField(
        max_length=20, choices=PAYMENT_CHOICES, null=True, blank=True
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


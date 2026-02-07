from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = (
            'email', 'first_name', 'last_name',
            'monthly_budget', 'max_single_purchase',
            'preferred_price_range_min', 'preferred_price_range_max',
            'currency'
        )
        widgets = {
            'preferred_price_range_min': forms.NumberInput(attrs={'placeholder': 'Min', 'required': 'required'}),
            'preferred_price_range_max': forms.NumberInput(attrs={'placeholder': 'Max', 'required': 'required'}),
            'monthly_budget': forms.NumberInput(attrs={'required': 'required'}),
            'max_single_purchase': forms.NumberInput(attrs={'required': 'required'}),
            'currency': forms.Select(attrs={'required': 'required'}),
        }
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = user.email
        if commit:
            user.save()
        return user

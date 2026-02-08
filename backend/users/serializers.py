from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    from banking.serializers import BankAccountSerializer
    bank_account = BankAccountSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name', 
            'monthly_budget', 'max_single_purchase', 
            'preferred_price_range_min', 'preferred_price_range_max', 
            'currency', 'bank_account'
        )

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    iban = serializers.CharField(write_only=True, required=True) # Mandatory field

    class Meta:
        model = User
        fields = (
            'email', 'password', 'first_name', 'last_name',
            'monthly_budget', 'max_single_purchase',
            'preferred_price_range_min', 'preferred_price_range_max',
            'currency', 'iban'
        )

    def validate_iban(self, value):
        from banking.models import BankAccount
        # Check if IBAN exists and is unclaimed
        try:
            account = BankAccount.objects.get(iban=value)
            if account.user is not None:
                raise serializers.ValidationError("This IBAN is already linked to another user.")
        except BankAccount.DoesNotExist:
            raise serializers.ValidationError("Invalid IBAN. Please double-check your bank details.")
        return value

    def create(self, validated_data):
        iban = validated_data.pop('iban') # Remove IBAN from user data
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            monthly_budget=validated_data.get('monthly_budget', 0),
            max_single_purchase=validated_data.get('max_single_purchase', 0),
            preferred_price_range_min=validated_data.get('preferred_price_range_min', 0),
            preferred_price_range_max=validated_data.get('preferred_price_range_max', 0),
            currency=validated_data.get('currency', 'TND'),
            username=validated_data['email'] 
        )
        
        # Link Bank Account
        from banking.models import BankAccount
        account = BankAccount.objects.get(iban=iban)
        account.user = user
        account.save()
        
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect Credentials")

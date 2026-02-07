from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name', 
            'monthly_budget', 'max_single_purchase', 
            'preferred_price_range_min', 'preferred_price_range_max', 
            'currency'
        )

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            'email', 'password', 'first_name', 'last_name',
            'monthly_budget', 'max_single_purchase',
            'preferred_price_range_min', 'preferred_price_range_max',
            'currency'
        )

    def create(self, validated_data):
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
            username=validated_data['email'] # Ensure username is email as per forms.py logic
        )
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect Credentials")

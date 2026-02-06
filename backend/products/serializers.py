from rest_framework import serializers
from .models import Product, Category, Review
from users.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'user', 'rating', 'comment', 'created_at']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'name', 'category', 'price', 
            'rating', 'nbr_rating', 'description', 
            'image', 'image_url', 'created_at'
        ]

    def get_image_url(self, obj):
        return obj.get_first_image()

class ProductDetailSerializer(ProductSerializer):
    reviews = ReviewSerializer(many=True, read_only=True)
    similar_products = serializers.SerializerMethodField()

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ['reviews', 'similar_products']

    def get_similar_products(self, obj):
        # This will be populated in the view context or manually
        if 'similar_products' in self.context:
            return ProductSerializer(self.context['similar_products'], many=True).data
        return []

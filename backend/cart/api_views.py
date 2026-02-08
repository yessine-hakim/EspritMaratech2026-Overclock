from rest_framework import views, permissions, status, generics
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem
from products.models import Product
from .serializers import CartSerializer, CartItemSerializer

class CartAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user, is_active=True)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

class AddToCartAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, product_id):
        print(f"DEBUG: AddToCartAPIView.post called for user {request.user}")
        print(f"DEBUG: Headers: {request.headers}")
        print(f"DEBUG: CSRF Cookie in request: {request.COOKIES.get('pay4all_csrftoken')}")
        try:
            cart, _ = Cart.objects.get_or_create(user=request.user, is_active=True)
            print(f"DEBUG: Found/created active cart {cart.id}")
            product = get_object_or_404(Product, pk=product_id)
            print(f"DEBUG: Found product {product.title}")
            
            cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
            if not created:
                cart_item.quantity += 1
                cart_item.save()
                print(f"DEBUG: Incremented quantity for {product.title}")
            else:
                print(f"DEBUG: Created new cart item for {product.title}")
            
            # Return updated cart
            serializer = CartSerializer(cart)
            data = serializer.data
            print(f"DEBUG: Serialization successful. Items in cart: {len(data.get('items', []))}")
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"ERROR: AddToCartAPIView failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateCartItemAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, item_id):
        action = request.data.get('action') # 'increase' or 'decrease'
        cart_item = get_object_or_404(CartItem, pk=item_id, cart__user=request.user, cart__is_active=True)
        
        if action == 'increase':
            cart_item.quantity += 1
            cart_item.save()
        elif action == 'decrease':
            if cart_item.quantity > 1:
                cart_item.quantity -= 1
                cart_item.save()
            else:
                cart_item.delete()
        elif action == 'remove':
            cart_item.delete()
            
        cart = Cart.objects.get(user=request.user, is_active=True)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def delete(self, request, item_id):
        cart_item = get_object_or_404(CartItem, pk=item_id, cart__user=request.user, cart__is_active=True)
        cart_item.delete()
        
        cart = Cart.objects.get(user=request.user, is_active=True)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

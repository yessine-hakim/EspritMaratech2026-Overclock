from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from products.models import Product
from .models import Cart, CartItem
from django.contrib import messages

@login_required
def cart_detail(request):
    cart, created = Cart.objects.get_or_create(user=request.user, is_active=True)
    return render(request, 'cart/cart.html', {'cart': cart})

@login_required
def add_to_cart(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    cart, created = Cart.objects.get_or_create(user=request.user, is_active=True)
    
    cart_item, item_created = CartItem.objects.get_or_create(cart=cart, product=product)
    
    if not item_created:
        cart_item.quantity += 1
        cart_item.save()
        messages.success(request, f"Updated quantity of {product.title} in your cart.")
    else:
        messages.success(request, f"Added {product.title} to your cart.")
    
    return redirect('cart_detail')

@login_required
def remove_from_cart(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
    cart_item.delete()
    messages.success(request, "Item removed from cart.")
    return redirect('cart_detail')

@login_required
@require_POST
def update_quantity(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
    action = request.POST.get('action')
    
    if action == 'increase':
        cart_item.quantity += 1
        cart_item.save()
    elif action == 'decrease':
        if cart_item.quantity > 1:
            cart_item.quantity -= 1
            cart_item.save()
        else:
            cart_item.delete()
    
    return redirect('cart_detail')

from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    # Legacy
    path('', views.cart_detail, name='cart_detail'),
    path('add/<int:product_id>/', views.add_to_cart, name='add_to_cart'),
    path('remove/<int:item_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('update/<int:item_id>/', views.update_quantity, name='update_cart_quantity'),

    # API
    path('api/', api_views.CartAPIView.as_view(), name='api_cart_detail'),
    path('api/add/<int:product_id>/', api_views.AddToCartAPIView.as_view(), name='api_add_to_cart'),
    path('api/item/<int:item_id>/', api_views.UpdateCartItemAPIView.as_view(), name='api_update_cart_item'),
]

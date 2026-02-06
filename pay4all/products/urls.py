from django.urls import path
from . import views

urlpatterns = [
    path('<int:pk>/', views.product_detail, name='product_detail'),
    path('<int:product_id>/review/', views.add_review, name='add_review'),
    path('results/', views.results, name='results'),
    path('visual-search/', views.visual_search, name='visual_search'),
]

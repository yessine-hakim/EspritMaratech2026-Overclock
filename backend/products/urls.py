from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    # Legacy Views (Optional to keep)
    path('<int:pk>/', views.product_detail, name='product_detail'),
    path('<int:product_id>/review/', views.add_review, name='add_review'),
    path('results/', views.results, name='results'),
    path('visual-search/', views.visual_search, name='visual_search'),

    # New API Endpoints
    path('api/detail/<int:pk>/', api_views.ProductDetailAPIView.as_view(), name='api_product_detail'),
    path('api/results/', api_views.ResultsAPIView.as_view(), name='api_results'),
    path('api/visual-search/', api_views.VisualSearchAPIView.as_view(), name='api_visual_search'),
    path('api/review/<int:product_id>/', api_views.AddReviewAPIView.as_view(), name='api_add_review'),
]

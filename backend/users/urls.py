from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterAPIView.as_view(), name='api_register'),
    path('login/', views.LoginAPIView.as_view(), name='api_login'),
    path('logout/', views.LogoutAPIView.as_view(), name='api_logout'),
    path('me/', views.CheckSessionView.as_view(), name='api_me'),
    path('csrf/', views.GetCSRFToken.as_view(), name='api_csrf'),
    path('transcribe/', views.TranscribeAPIView.as_view(), name='api_transcribe'),
]

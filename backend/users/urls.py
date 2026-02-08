from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterAPIView.as_view(), name='api_register'),
    path('login/', views.LoginAPIView.as_view(), name='api_login'),
    path('logout/', views.LogoutAPIView.as_view(), name='api_logout'),
    path('me/', views.CheckSessionView.as_view(), name='api_me'),
    path('csrf/', views.GetCSRFToken.as_view(), name='api_csrf'),
    path('transcribe/', views.TranscribeAPIView.as_view(), name='api_transcribe'),
    path('update/', views.ProfileUpdateAPIView.as_view(), name='api_profile_update'),
    path('update-bank-account/', views.UpdateBankAccountAPIView.as_view(), name='api_update_bank_account'),
    
    # Traditional views for templates
    path('auth/login/', views.login_view, name='login'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/logout/', views.logout_view, name='logout'),
]

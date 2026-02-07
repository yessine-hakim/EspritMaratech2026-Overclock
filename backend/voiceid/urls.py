from django.urls import path
from . import views

urlpatterns = [
    path('enroll/', views.enroll_voice, name='voiceid-enroll'),
    path('verify/', views.verify_voice, name='voiceid-verify'),
]

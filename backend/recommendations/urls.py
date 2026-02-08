from django.urls import path
from . import api
from .voice_intent import classify_voice_intent

urlpatterns = [
    path('ask/', api.recommend, name='ask_recommendation'),
    path('voice-intent/', classify_voice_intent, name='classify_voice_intent'),
]

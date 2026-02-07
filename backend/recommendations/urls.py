from django.urls import path
from . import api
from .voice_intent import classify_voice_intent, voice_intent_health, clear_voice_cache

urlpatterns = [
    path('ask/', api.recommend, name='ask_recommendation'),
    path('voice-intent/', classify_voice_intent, name='classify_voice_intent'),
    path('voice-intent/health/', voice_intent_health, name='voice_intent_health'),
    path('voice-intent/cache/clear/', clear_voice_cache, name='clear_voice_cache'),
]

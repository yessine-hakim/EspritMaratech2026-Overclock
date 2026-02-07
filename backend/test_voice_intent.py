import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from recommendations.voice_intent import classify_voice_intent
from django.test import RequestFactory

def test_intent(transcript):
    print(f"\nTesting: '{transcript}'")
    factory = RequestFactory()
    request = factory.post('/api/recommendations/voice-intent/', 
                          data=json.dumps({"transcript": transcript}),
                          content_type='application/json')
    
    response = classify_voice_intent(request)
    print(f"Status: {response.status_code}")
    print(f"Result: {response.content.decode()}")

if __name__ == "__main__":
    test_intent("I want to see my shopping cart")
    test_intent("make the text twice as big")
    test_intent("find me some blue shoes")
    test_intent("everything should be high contrast")

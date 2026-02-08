
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/recommendations/voice-intent/"

def test_intent(transcript):
    print(f"\n--- Testing: '{transcript}' ---")
    try:
        response = requests.post(BASE_URL, json={"transcript": transcript})
        if response.status_code == 200:
            data = response.json()
            print(f"Action: {data.get('action')}")
            print(f"Target: {data.get('target')}")
            print(f"Response: {data.get('response')}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    # Test 1: Navigation match
    test_intent("open The Original HP Sauce")
    
    # Test 2: Navigation partial match or variation
    test_intent("go to HP Sauce")

    # Test 3: Search fallback
    test_intent("find me a flux capacitor")

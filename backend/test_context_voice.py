
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/recommendations/voice-intent/"

def test_context(transcript, visible_products):
    print(f"\n--- Testing: '{transcript}' with Context: {[p['title'] for p in visible_products]} ---")
    payload = {
        "transcript": transcript,
        "visibleProducts": visible_products
    }
    try:
        response = requests.post(BASE_URL, json=payload)
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
    # Case 1: Context Match
    # Simulating that we see "Special Context Yoghurt" on screen, which might fail global search or be different
    test_context("Open Special Yoghurt", [{"id": 999, "title": "My Special Context Yoghurt"}])

    # Case 2: No Context (Fallback to global)
    test_context("Open HP Sauce", [])

    # Case 3: Context Override
    # Suppose there is a product globally called "Apple", but we see "Pineapple" on screen. 
    # If I say "Open Pineapple", should open specific ID from context.
    test_context("Open Pineapple", [{"id": 888, "title": "Golden Pineapple"}])

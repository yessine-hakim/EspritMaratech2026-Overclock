
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/recommendations/voice-intent/"

def test_intent(transcript, expected_action=None):
    print(f"\n--- Testing: '{transcript}' ---")
    try:
        response = requests.post(BASE_URL, json={"transcript": transcript})
        if response.status_code == 200:
            data = response.json()
            action = data.get('action')
            target = data.get('target')
            resp_text = data.get('response')
            print(f"Action: {action}")
            print(f"Target: {target}")
            print(f"Response: {resp_text}")
            
            if expected_action and action != expected_action:
                print(f"FAIL: Expected {expected_action}, got {action}")
            elif expected_action:
                print(f"PASS: Got {expected_action}")
                
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    # 1. Generic Search Intent
    test_intent("I want to buy yoghurt", expected_action="search")
    
    # 2. Specific Navigation Intent (Product exists)
    # We know 'The Original HP Sauce' exists and is unique
    test_intent("Open The Original HP Sauce", expected_action="navigate")

    # 3. Specific Product Name by itself
    test_intent("The Original HP Sauce", expected_action="navigate")
    
    # 4. Ambiguous/Category Navigation Intent 
    # (If 'yoghurt' has 1 match, 'Open Yoghurt' -> navigate. If >1, search)
    test_intent("Open Yoghurt")

    # 5. Generic Search for something that definitely exists
    test_intent("Search for HP Sauce", expected_action="search")

import requests
import os
from PIL import Image

# 1. Create a dummy image
img = Image.new('RGB', (100, 100), color='blue')
img.save('repro_image.jpg')

url = "http://127.0.0.1:8000/api/recommendations/ask/"

# 2. Send request with image (mimicking chatbot)
with open("repro_image.jpg", "rb") as f:
    files = {"image": f}
    data = {
        "query": "",  # Empty query as per user's log
        "user_id": 1, # Assuming user 1 exists
        "diversity": 0.7
    }

    try:
        print("Sending visual recommendation request...")
        response = requests.post(url, files=files, data=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            res_data = response.json()
            recs = res_data.get('recommendations', [])
            print(f"Received {len(recs)} recommendations")
            for r in recs:
                print(f"- {r.get('title')} (ID: {r.get('id')})")
            print(f"Explanation: {res_data.get('explanation')}")
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Request failed: {e}")

# Clean up
if os.path.exists("repro_image.jpg"):
    os.remove("repro_image.jpg")

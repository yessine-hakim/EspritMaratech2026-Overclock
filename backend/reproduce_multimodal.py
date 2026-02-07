import requests
import os
import time
from PIL import Image

# Create a valid image using PIL
img = Image.new('RGB', (100, 100), color='white')
img.save('test_yoghurt_image.jpg')

url = "http://127.0.0.1:8000/api/products/api/visual-search/"
# Use context manager to ensure file is closed
with open("test_yoghurt_image.jpg", "rb") as f:
    files = {"image": f}
    data = {"q": "yoghurt"}

    try:
        print(f"Sending request with q='yoghurt'...")
        response = requests.post(url, files=files, data=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            results = response.json().get('results', [])
            print(f"Received {len(results)} results:")
            for p in results[:5]:
                print(f"- {p.get('title')} (ID: {p.get('id')})")
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

# Clean up
try:
    if os.path.exists("test_yoghurt_image.jpg"):
        os.remove("test_yoghurt_image.jpg")
except Exception as e:
    print(f"Failed to remove temp image: {e}")

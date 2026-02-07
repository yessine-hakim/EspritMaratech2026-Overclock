import os
import sys
import django

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from django.test import RequestFactory
from products.api_views import ResultsAPIView

def test_browse_endpoint():
    request = RequestFactory().get('/api/products/api/results/')
    view = ResultsAPIView.as_view()
    response = view(request)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.data
        count = data.get('count')
        print(f"Count: {count}")
        results = data.get('results', [])
        print(f"Results length (page 1): {len(results)}")
        if len(results) > 0:
            print(f"First product title: {results[0].get('title')}")
    else:
        print(f"Error: {response.data}")

if __name__ == "__main__":
    test_browse_endpoint()

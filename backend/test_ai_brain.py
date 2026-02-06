import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from users.models import User
from recommendations.graph import create_recommendation_graph

def test_ai_brain():
    user = User.objects.first()
    if not user:
        print("No users found to test.")
        return

    app = create_recommendation_graph()
    
    # Test 1: Banking Intent
    print("\n--- Test 1: Banking Intent ---")
    state_banking = {
        "query": "what is my current balance?",
        "user_profile": {"user_obj": user, "monthly_budget": float(user.monthly_budget)},
        "cart_total": 0.0,
        "inferred_budget": {},
        "retrieved_products": [],
        "filtered_products": [],
        "final_recommendations": [],
        "explanation": "",
        "visual_ids": []
    }
    result_banking = app.invoke(state_banking)
    print(f"Detected Intent: {result_banking.get('intent')}")
    print(f"Explanation: {result_banking.get('explanation')}")

    # Test 2: Shopping Intent
    print("\n--- Test 2: Shopping Intent ---")
    state_shopping = {
        "query": "i want to buy a cheap phone",
        "user_profile": {"user_obj": user, "monthly_budget": float(user.monthly_budget)},
        "cart_total": 0.0,
        "inferred_budget": {},
        "retrieved_products": [],
        "filtered_products": [],
        "final_recommendations": [],
        "explanation": "",
        "visual_ids": []
    }
    result_shopping = app.invoke(state_shopping)
    print(f"Detected Intent: {result_shopping.get('intent')}")
    print(f"Explanation: {result_shopping.get('explanation')}")

if __name__ == "__main__":
    test_ai_brain()

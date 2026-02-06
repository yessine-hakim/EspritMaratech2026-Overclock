import os
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from recommendations.graph import create_recommendation_graph
from users.models import User

def test_recommendation(query, username=None):
    print(f"\n--- Testing Query: '{query}' for User: {username} ---")
    
    user_profile = {}
    if username:
        try:
            user = User.objects.get(username=username)
            user_profile = {
                "monthly_budget": float(user.monthly_budget),
                "spending_habits": user.payment_preferences
            }
            print(f"User Profile: {user_profile}")
        except User.DoesNotExist:
            print("User not found")
            
    app = create_recommendation_graph()
    
    initial_state = {
        "query": query,
        "user_profile": user_profile,
        "inferred_budget": {},
        "retrieved_products": [],
        "filtered_products": [],
        "final_recommendations": [],
        "explanation": ""
    }
    
    try:
        result = app.invoke(initial_state)
        
        print("\n[Inferred Budget]")
        print(json.dumps(result.get("inferred_budget"), indent=2))
        
        print("\n[Recommendations]")
        recs = result.get("final_recommendations", [])
        for rec in recs:
            print(f"- {rec.get('title')} (${rec.get('price')})")
            
        if not recs:
            print("No recommendations found.")
            
        print("\n[Explanation]")
        print(result.get("explanation"))
        
        if not result.get("budget_respected", True):
            print("\nWARNING: Budget constraints were relaxed.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    # Test 1: Cheap headphones (low budget)
    test_recommendation("I need cheap headphones for running", "budget_bob")
    
    # Test 2: Premium laptop (high budget)
    test_recommendation("Best gaming laptop for professional work", "luxury_lucy")

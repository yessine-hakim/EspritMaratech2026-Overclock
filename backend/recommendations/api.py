from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .graph import create_recommendation_graph
from users.models import User
from products.anomaly_detection import SearchAnomalyDetector
from datetime import datetime

# Global search anomaly detector
search_detector = SearchAnomalyDetector()

@csrf_exempt
@require_http_methods(["POST"])
def recommend(request):
    try:
        # 1. Extract inputs (handles both JSON and multipart/form-data)
        query = None
        user_id = None
        image_file = None
        diversity = 0.7  # Default MMR diversity
        
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            query = data.get("query")
            user_id = data.get("user_id")
            diversity = float(data.get("diversity", 0.7))
        else:
            query = request.POST.get("query")
            user_id = request.POST.get("user_id")
            image_file = request.FILES.get("image")
            diversity = float(request.POST.get("diversity", 0.7))
            
        if not query and not image_file:
            return JsonResponse({"error": "Query or image is required"}, status=400)
            
        # Fetch user profile and cart total
        user_profile = {}
        user_obj = None
        cart_total = 0.0
        
        if user_id:
            try:
                user_obj = User.objects.get(id=user_id)
                user_profile = {
                    "monthly_budget": float(user_obj.monthly_budget),
                    "spending_habits": user_obj.payment_preferences,
                    "user_obj": user_obj # Pass for banking node access
                }
                
                # Fetch live cart total
                from cart.models import Cart
                cart = Cart.objects.filter(user=user_obj, is_active=True).first()
                if cart:
                    cart_total = float(cart.total_price)
            except Exception as e:
                print(f"Error fetching user/cart info for recommendations: {e}")
        
        # 2. Handle Visual Context if image is provided
        visual_ids = []
        if image_file:
            try:
                from products.views import ImageEmbedding, get_qdrant_client, VISUAL_COLLECTION
                import tempfile
                import os
                
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                    for chunk in image_file.chunks():
                        tmp.write(chunk)
                    tmp_path = tmp.name
                
                image_model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")
                image_embedding = list(image_model.embed([tmp_path]))[0]
                os.unlink(tmp_path)
                
                client = get_qdrant_client()
                visual_results = client.query_points(
                    collection_name=VISUAL_COLLECTION,
                    query=image_embedding.tolist(),
                    limit=50
                )
                visual_ids = [point.id for point in visual_results.points]
            except Exception as e:
                print(f"Visual processing in API failed: {e}")

        # 3. Initialize and Invoke Graph
        app = create_recommendation_graph()
        
        initial_state = {
            "query": query or "",
            "user_profile": user_profile,
            "cart_total": cart_total,
            "inferred_budget": {},
            "retrieved_products": [],
            "filtered_products": [],
            "final_recommendations": [],
            "explanation": "",
            "visual_ids": visual_ids,
            "diversity": diversity  # Pass MMR diversity parameter
        }
        
        result = app.invoke(initial_state)
        
        # Track search for anomaly detection
        results_count = len(result.get("final_recommendations", []))
        search_detector.track_search(
            user_id=user_id,
            query=query or "[image search]",
            results_count=results_count,
            timestamp=datetime.now()
        )
        
        # Check for bot behavior
        if user_id and search_detector.detect_bot_behavior(user_id):
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Potential bot detected: user {user_id}")
        
        return JsonResponse({
            "inferred_budget": result.get("inferred_budget"),
            "recommendations": result.get("final_recommendations"),
            "explanation": result.get("explanation"),
            "budget_respected": result.get("budget_respected", True)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


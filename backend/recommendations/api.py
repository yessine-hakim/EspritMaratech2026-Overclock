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
                # Fallback to default profile if user fetch fails
                user_profile = {
                    "monthly_budget": 1000.0,
                    "spending_habits": 'card'
                }
        else:
            # Default profile for unauthenticated users - budget will be inferred from query
            user_profile = {
                "monthly_budget": 1000.0,
                "spending_habits": 'card'
            }
        
        # 2. Handle Visual Context if image is provided
        visual_ids = []
        if image_file:
            try:
                from fastembed import ImageEmbedding
                from pay4all.qdrant_config import get_qdrant_client, VISUAL_COLLECTION
                import tempfile
                import os
                
                print(f"Processing image file: {image_file.name}, size: {image_file.size}")
                
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                    for chunk in image_file.chunks():
                        tmp.write(chunk)
                    tmp_path = tmp.name
                
                print(f"Temp image saved to: {tmp_path}")
                image_model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")
                image_embedding = list(image_model.embed([tmp_path]))[0]
                os.unlink(tmp_path)
                print(f"Image embedding generated, length: {len(image_embedding)}")
                
                client = get_qdrant_client()
                visual_results = client.query_points(
                    collection_name=VISUAL_COLLECTION,
                    query=image_embedding.tolist(),
                    limit=50
                )
                visual_ids = [point.id for point in visual_results.points]
                print(f"Visual search found {len(visual_ids)} product IDs")
            except Exception as e:
                print(f"Visual processing in API failed: {e}")
                import traceback
                traceback.print_exc()

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
            "diversity": diversity,  # Pass MMR diversity parameter
            "intent": "SHOPPING",  # Will be set by intent_classification node
            "bank_data": None,
            "anomalies": [],
            "alternatives": [],
            "budget_respected": True,
            "safety_check_passed": True
        }
        
        result = app.invoke(initial_state)
        
        # Debug logging - check all stages
        print(f"\n=== RECOMMENDATION DEBUG ===")
        print(f"Query: {query}")
        print(f"Retrieved products: {len(result.get('retrieved_products', []))}")
        print(f"Filtered products: {len(result.get('filtered_products', []))}")
        print(f"Final recommendations: {len(result.get('final_recommendations', []))}")
        print(f"Alternatives: {len(result.get('alternatives', []))}")
        
        if result.get('retrieved_products'):
            print(f"First retrieved product: {result['retrieved_products'][0]}")
        if result.get('filtered_products'):
            print(f"First filtered product: {result['filtered_products'][0]}")
        if result.get('final_recommendations'):
            print(f"First final recommendation: {result['final_recommendations'][0]}")
        print(f"============================\n")
        
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
        
        final_recommendations = result.get("final_recommendations", [])
        
        print(f"\n=== FORMATTING RECOMMENDATIONS ===")
        print(f"Raw final_recommendations count: {len(final_recommendations)}")
        if final_recommendations:
            print(f"First raw recommendation structure: {final_recommendations[0]}")
            print(f"First raw recommendation keys: {list(final_recommendations[0].keys()) if isinstance(final_recommendations[0], dict) else 'Not a dict'}")
        
        # Ensure all recommendations have required fields and verify products exist
        from products.models import Product
        formatted_recommendations = []
        for idx, rec in enumerate(final_recommendations):
            print(f"Processing recommendation {idx}: {type(rec)}, is_dict: {isinstance(rec, dict)}")
            if isinstance(rec, dict):
                rec_id = rec.get('id')
                print(f"  - Has 'id': {rec_id is not None}, id value: {rec_id}, type: {type(rec_id)}")
                if rec_id:
                    # Convert to int if it's a string
                    try:
                        product_id = int(rec_id)
                    except (ValueError, TypeError):
                        print(f"  - SKIPPED: Invalid ID format: {rec_id}")
                        continue
                    
                    # Verify product exists in database
                    try:
                        product = Product.objects.get(pk=product_id)
                        print(f"  - Product exists: {product.title}")
                    except Product.DoesNotExist:
                        print(f"  - SKIPPED: Product with ID {product_id} does not exist in database")
                        continue
                    except Exception as e:
                        print(f"  - ERROR checking product: {e}")
                        continue
                    
                    formatted_recommendations.append({
                        'id': product_id,
                        'title': rec.get('title') or product.title,
                        'price': rec.get('price') or product.price or 'N/A',
                        'image': rec.get('image') or rec.get('image_url') or product.get_first_image(),
                        'image_url': rec.get('image_url') or rec.get('image') or product.get_first_image(),
                        'category': rec.get('category') or (product.category.name if product.category else ''),
                        'similarity_score': rec.get('similarity_score', 0)
                    })
                    print(f"  - ✓ Added to formatted recommendations: ID={product_id}, Title={formatted_recommendations[-1]['title']}")
                else:
                    print(f"  - SKIPPED: No 'id' field")
            else:
                print(f"  - SKIPPED: Not a dict, type: {type(rec)}")
        
        print(f"Formatted {len(formatted_recommendations)} recommendations out of {len(final_recommendations)} total")
        print(f"===================================\n")
        
        return JsonResponse({
            "inferred_budget": result.get("inferred_budget"),
            "recommendations": formatted_recommendations,
            "explanation": result.get("explanation"),
            "budget_respected": result.get("budget_respected", True)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


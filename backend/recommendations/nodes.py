from typing import Any, Dict, List
import operator
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

from .state import RecommendationState
from .chains import get_budget_profiling_chain, get_synthesis_chain, get_intent_classification_chain
from banking.models import BankAccount
from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION
from decimal import Decimal
from langchain_qdrant import QdrantVectorStore

# --- Utilities ---

def get_retriever():
    client = get_qdrant_client()
    embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=PRODUCTS_COLLECTION,
        embedding=embeddings,
    )
    return vector_store

# --- Nodes ---

def intent_classification_node(state: RecommendationState) -> dict[str, Any]:
    """Determine user intent: SHOPPING, BANKING, or NAVIGATION."""
    # Force SHOPPING if an image was provided
    if state.get("visual_ids"):
        print("DEBUG: Visual IDs detected, forcing intent to SHOPPING")
        return {
            "intent": "SHOPPING",
            "bank_data": {}
        }
        
    chain = get_intent_classification_chain()
    result = chain.invoke({"query": state["query"]})
    
    intent = result["intent"]
    entities = result.get("entities", {})
    
    # If it's a NAVIGATION or ACTION intent, we can provide immediate control codes
    control_code = None
    if intent == "NAVIGATION":
        page_map = {
            "home": "/",
            "banking": "/banking",
            "cart": "/cart",
            "profile": "/profile",
            "products": "/results"
        }
        target_page = entities.get("page", "").lower()
        if target_page in page_map:
            control_code = {"type": "NAVIGATE", "path": page_map[target_page]}
            
    if intent == "ACTION":
        action_type = entities.get("action_type", "").lower()
        item_ref = entities.get("item_ref", "").lower()
        control_code = {"type": "UI_ACTION", "action": action_type, "ref": item_ref}

    return {
        "intent": intent,
        "bank_data": entities,
        "control_code": control_code # Custom field for frontend voice controller
    }

def banking_node(state: RecommendationState) -> dict[str, Any]:
    """Handle banking inquiries (Balance, Transactions)."""
    user = state["user_profile"].get("user_obj") # Passed from view
    if not user:
        return {"explanation": "User authentication required for banking actions."}
    
    account = BankAccount.objects.filter(user=user).first()
    if not account:
        return {"explanation": "No bank account found for this user."}
    
    bank_info = {
        "balance": float(account.balance),
        "currency": account.currency,
        "iban": account.iban
    }
    
    return {"bank_data": bank_info}

def safety_agent_node(state: RecommendationState) -> dict[str, Any]:
    """Safety Guard: Check if cart total + recommendations fit bank balance."""
    bank_balance = state.get("bank_data", {}).get("balance", 0)
    cart_total = state.get("cart_total", 0)
    final_recommendations = state.get("final_recommendations", [])
    
    # Calculate potential cost of top 1 recommendation
    top_rec_price = 0
    if final_recommendations:
        top_rec_price = final_recommendations[0].get('price_val', 0)
    
    predicted_total = cart_total + top_rec_price
    
    # Only check safety if we have bank data, otherwise always pass
    safety_passed = (bank_balance == 0) or (predicted_total <= bank_balance)
    
    print(f"Safety agent: {len(final_recommendations)} recommendations, safety_passed={safety_passed}")
    
    # Always preserve final_recommendations
    return {"safety_check_passed": safety_passed, "final_recommendations": final_recommendations}

def budget_profiling_node(state: RecommendationState) -> dict[str, Any]:
    """Infer budget from query and profile."""
    query = state["query"]
    
    # If no text query but we have visual search, use a relaxed budget to avoid filtering
    if not query.strip() and state.get("visual_ids"):
        print("DEBUG: Empty query with visual search, using relaxed budget")
        return {
            "inferred_budget": {
                "min_budget": 0,
                "target_budget": 1000,
                "max_budget": 10000, # High limit for visual search
                "intended_category": "visual_search",
                "reasoning": "Relaxed budget for visual search without text constraints."
            }
        }
        
    chain = get_budget_profiling_chain()
    result = chain.invoke({
        "query": query,
        "user_profile": state["user_profile"]
    })
    return {"inferred_budget": result}

from products.models import Product

def retrieval_node(state: RecommendationState) -> dict[str, Any]:
    """Retrieve candidate products from Qdrant and/or DB with MMR for diversity."""
    query = state["query"]
    visual_ids = state.get("visual_ids", [])
    diversity = state.get("diversity", 0.7)  # Default diversity level
    
    retrieved = []
    
    # 1. Start with Text Retrieval using MMR (if query exists)
    if query.strip():
        from products.mmr_search import search_products_with_mmr
        from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
        
        # Generate query embedding
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        query_vector = embeddings.embed_query(query)
        
        # Use MMR search for diverse results
        mmr_results = search_products_with_mmr(
            query_vector=query_vector,
            limit=20,
            diversity=diversity,
            score_threshold=0.3
        )
        
        print(f"MMR search returned {len(mmr_results)} results")
        for idx, point in enumerate(mmr_results):
            try:
                # Qdrant ScoredPoint has: id, score, payload
                point_id = point.id
                score = point.score
                payload = point.payload if hasattr(point, 'payload') else {}
                
                print(f"  Point {idx}: ID={point_id}, Score={score}, Payload={payload}")
                
                # Build product dict from payload, ensure ID is set
                product = dict(payload) if isinstance(payload, dict) else {}
                
                # Ensure ID is an integer
                try:
                    product_id = int(point_id)
                except (ValueError, TypeError):
                    print(f"  ✗ SKIPPED: Invalid point ID: {point_id}")
                    continue
                
                # Verify product exists in database before adding
                try:
                    db_product = Product.objects.get(pk=product_id)
                    product['id'] = product_id
                    product['similarity_score'] = score
                    
                    # Use database values as fallback if payload is missing data
                    if not product.get('title'):
                        product['title'] = db_product.title
                    if not product.get('price'):
                        product['price'] = db_product.price or 'N/A'
                    if not product.get('image') and not product.get('image_url'):
                        product['image'] = db_product.get_first_image()
                    if not product.get('category'):
                        product['category'] = db_product.category.name if db_product.category else ''
                    
                    retrieved.append(product)
                    print(f"  ✓ Added product: ID={product_id}, Title={product.get('title', 'N/A')}")
                except Product.DoesNotExist:
                    print(f"  ✗ SKIPPED: Product ID {product_id} does not exist in database")
                    continue
                except Exception as e:
                    print(f"  ✗ ERROR verifying product {product_id}: {e}")
                    continue
            except Exception as e:
                print(f"  ✗ ERROR processing point {idx}: {e}")
                import traceback
                traceback.print_exc()
            
    # 2. Incorporate Visual Results (if image was uploaded)
    print(f"DEBUG: Retrieval Node - input visual_ids: {visual_ids} (Type: {type(visual_ids)})")
    if visual_ids:
        # Crucial: Ensure visual_ids are integers for DB query
        try:
            clean_visual_ids = []
            for vid in visual_ids:
                try:
                    clean_visual_ids.append(int(vid))
                except (ValueError, TypeError):
                    print(f"  ✗ WARNING: Could not cast visual ID {vid} to int")
            
            print(f"DEBUG: Querying DB for {len(clean_visual_ids)} clean_visual_ids")
            visual_products = Product.objects.filter(pk__in=clean_visual_ids)
            print(f"DEBUG: Found {visual_products.count()} products in DB matches")
            
            for p in visual_products:
                # Check if already added by text search
                already_added = any(str(item.get('id')) == str(p.id) for item in retrieved)
                if not already_added:
                    retrieved.append({
                        'id': p.id,
                        'title': p.title,
                        'price': p.price or p.selling_price,
                        'image': p.get_first_image(),
                        'similarity_score': 0.9, # Prioritize visual
                        'category': p.category.name if p.category else ""
                    })
                    print(f"  ✓ Added visual product: {p.title} (ID: {p.id})")
        except Exception as e:
            print(f"  ✗ ERROR in visual product processing: {e}")
            import traceback
            traceback.print_exc()

    # Fallback: If no products retrieved from Qdrant, try simple text search in DB
    if not retrieved and query and query.strip():
        print(f"WARNING: No products retrieved from Qdrant for query '{query}', trying DB fallback...")
        try:
            from django.db.models import Q
            # Extract keywords from query for better matching
            keywords = query.strip().split()[:3]  # Use first 3 words
            db_products = Product.objects.filter(
                Q(title__icontains=query) | Q(description__icontains=query) |
                Q(title__icontains=keywords[0] if keywords else "")
            )[:20]
            for p in db_products:
                retrieved.append({
                    'id': p.id,
                    'title': p.title,
                    'price': p.price or 'N/A',
                    'image': p.get_first_image(),
                    'similarity_score': 0.5,  # Default score for DB fallback
                    'category': p.category.name if p.category else "",
                    'price_val': 0.0  # Will be calculated below
                })
            print(f"DB fallback found {len(retrieved)} products")
        except Exception as e:
            print(f"DB fallback failed: {e}")
    
    # Final check: If still no products and we have visual_ids, use those directly as fallback
    if not retrieved and visual_ids:
        print(f"Using visual_ids as absolute fallback: {len(visual_ids)} IDs")
        try:
            clean_ids = [int(vid) for vid in visual_ids if str(vid).isdigit()]
            visual_products = Product.objects.filter(pk__in=clean_ids[:20])
            for p in visual_products:
                retrieved.append({
                    'id': p.id,
                    'title': p.title,
                    'price': p.price or 'N/A',
                    'image': p.get_first_image(),
                    'similarity_score': 0.9,
                    'category': p.category.name if p.category else "",
                    'price_val': 0.0
                })
            print(f"Visual absolute fallback found {len(retrieved)} products")
        except Exception as e:
            print(f"Absolute fallback failed: {e}")
    
    # Format all results (ensure price_val exists)
    for product in retrieved:
        try:
            price_raw = product.get('price')
            if isinstance(price_raw, str):
                 # Clean price string
                 clean_price = price_raw.replace('$', '').replace('€', '').replace(',', '').replace('TND', '').strip()
                 product['price_val'] = float(clean_price.split(' ')[0])
            else:
                 product['price_val'] = float(price_raw or 0)
        except Exception:
            product['price_val'] = 0.0
    
    print(f"Retrieval node FINISHED: returning {len(retrieved)} products")
    return {"retrieved_products": retrieved}


def early_budget_filter_node(state: RecommendationState) -> dict[str, Any]:
    """Filter products based on inferred budget."""
    budget = state["inferred_budget"]
    max_budget = budget.get("max_budget", 1000000)
    
    filtered = []
    dropped = []
    
    for product in state["retrieved_products"]:
        if product['price_val'] <= max_budget:
            filtered.append(product)
        else:
            dropped.append(product)
            
    # If filtered is empty, we might need to relax constraints or use alternatives?
    # Logic will be handled in Conditional Edge or next node
    
    return {"filtered_products": filtered, "alternatives": dropped} # Keep dropped as potential alternatives context

def anomaly_detection_node(state: RecommendationState) -> dict[str, Any]:
    """Detect anomalies (e.g. price too low/high compared to cluster)."""
    products = state.get("filtered_products", [])
    final_recommendations = state.get("final_recommendations", [])
    
    print(f"Anomaly detection: {len(products)} filtered products, {len(final_recommendations)} final recommendations")
    
    if not products:
        # Preserve final_recommendations if they exist
        return {"anomalies": [], "final_recommendations": final_recommendations}
        
    # Simple heuristic: Price deviation from mean > 2 std dev?
    # Or just too cheap (suspicious)?
    # For now, let's just pass through, but add a flag if price is outlier
    
    prices = [p['price_val'] for p in products]
    if not prices:
        return {"final_recommendations": final_recommendations}
        
    avg_price = sum(prices) / len(prices)
    
    # Mock anomaly detection
    for p in products:
        if p['price_val'] < avg_price * 0.2: # Too cheap?
            p['is_anomaly'] = True
        else:
            p['is_anomaly'] = False
    
    # Preserve final_recommendations
    return {"filtered_products": products, "final_recommendations": final_recommendations}

def ranking_node(state: RecommendationState) -> dict[str, Any]:
    """Rank products (MMR or simple score)."""
    # Simply sort by similarity for now, or use MMR if we had vector access handy
    # Since 'retrieved_products' in state are dicts (metadata), we trust the retrieval order or re-sort
    
    filtered = state.get("filtered_products", [])
    print(f"Ranking node: {len(filtered)} filtered products")
    
    if not filtered:
        # If no filtered products, use retrieved products
        retrieved = state.get("retrieved_products", [])
        print(f"Ranking node: No filtered products, using {len(retrieved)} retrieved products")
        ranked = sorted(retrieved, key=lambda x: x.get('similarity_score', 0), reverse=True)
    else:
        ranked = sorted(filtered, key=lambda x: x.get('similarity_score', 0), reverse=True)
    
    final = ranked[:5]  # Top 5
    print(f"Ranking node: Returning {len(final)} final recommendations")
    return {"final_recommendations": final}

def alternatives_node(state: RecommendationState) -> dict[str, Any]:
    """Find alternatives if no results."""
    # Check if we already have final_recommendations from ranking
    existing_recommendations = state.get("final_recommendations", [])
    
    print(f"Alternatives node: Existing recommendations: {len(existing_recommendations)}")
    
    if existing_recommendations:
        # Don't overwrite existing recommendations
        print(f"Alternatives node: Preserving existing {len(existing_recommendations)} recommendations")
        return {"budget_respected": True}
    
    # If no filtered products, pick from 'dropped' (which were over budget)
    # or just use the retrieved ones but flag them.
    filtered = state.get("filtered_products", [])
    retrieved = state.get("retrieved_products", [])
    alternatives_list = state.get("alternatives", [])
    
    if filtered:
        # We have filtered products, use them
        return {"final_recommendations": filtered[:5], "budget_respected": True}
    elif alternatives_list:
        # Use alternatives (dropped products)
        print(f"Alternatives node: Using {len(alternatives_list)} alternatives")
        return {"final_recommendations": alternatives_list[:3], "budget_respected": False}
    elif retrieved:
        # Use top 3 from retrieved even if over budget, but flag them
        print(f"Alternatives node: Using {len(retrieved)} retrieved products as fallback")
        return {"final_recommendations": retrieved[:3], "budget_respected": False}
    else:
        print("Alternatives node: No products available")
        return {"final_recommendations": [], "budget_respected": False}

def synthesis_node(state: RecommendationState) -> dict[str, Any]:
    """Generate final explanation."""
    chain = get_synthesis_chain()
    
    final_recommendations = state.get("final_recommendations", [])
    print(f"Synthesis node: {len(final_recommendations)} final recommendations")
    
    result = chain.invoke({
        "query": state["query"],
        "intent": state.get("intent", "SHOPPING"),
        "inferred_budget": state.get("inferred_budget", {}),
        "products": final_recommendations,
        "bank_data": state.get("bank_data", {}),
        "cart_total": state.get("cart_total", 0),
        "safety_check_passed": state.get("safety_check_passed", True)
    })
    
    # Preserve final_recommendations in the final output
    return {"explanation": result.content, "final_recommendations": final_recommendations}

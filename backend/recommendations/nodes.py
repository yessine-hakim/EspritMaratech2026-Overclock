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
    chain = get_intent_classification_chain()
    result = chain.invoke({"query": state["query"]})
    return {
        "intent": result["intent"],
        "bank_data": result.get("entities", {}) # Initial extraction
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
    
    # Calculate potential cost of top 1 recommendation
    top_rec_price = 0
    if state.get("final_recommendations"):
        top_rec_price = state["final_recommendations"][0].get('price_val', 0)
    
    predicted_total = cart_total + top_rec_price
    
    safety_passed = predicted_total <= bank_balance
    
    return {"safety_check_passed": safety_passed}

def budget_profiling_node(state: RecommendationState) -> dict[str, Any]:
    """Infer budget from query and profile."""
    chain = get_budget_profiling_chain()
    result = chain.invoke({
        "query": state["query"],
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
        
        for result in mmr_results:
            product = result.payload
            product['similarity_score'] = result.score
            retrieved.append(product)
            
    # 2. Incorporate Visual Results (if image was uploaded)
    if visual_ids:
        # Fetch actual product metadata for visual IDs
        # We use a high constant similarity score (0.9) to prioritize visual matches in hybrid
        visual_products = Product.objects.filter(pk__in=visual_ids)
        for p in visual_products:
            # Check if already added by text search
            already_added = any(item.get('id') == p.id for item in retrieved)
            if not already_added:
                retrieved.append({
                    'id': p.id,
                    'title': p.title,
                    'price': p.price or p.selling_price,
                    'image': p.get_first_image(),
                    'similarity_score': 0.9, # Prioritize visual
                    'category': p.category.name if p.category else ""
                })

    # Format all results (ensure price_val exists)
    for product in retrieved:
        try:
            price_raw = product.get('price')
            if isinstance(price_raw, str):
                 clean_price = price_raw.replace('$', '').replace('€', '').replace(',', '').strip()
                 product['price_val'] = float(clean_price.split(' ')[0])
            else:
                 product['price_val'] = float(price_raw or 0)
        except Exception:
            product['price_val'] = 0.0
            
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
    products = state["filtered_products"]
    
    if not products:
        return {"anomalies": []}
        
    # Simple heuristic: Price deviation from mean > 2 std dev?
    # Or just too cheap (suspicious)?
    # For now, let's just pass through, but add a flag if price is outlier
    
    prices = [p['price_val'] for p in products]
    if not prices:
        return {}
        
    avg_price = sum(prices) / len(prices)
    
    # Mock anomaly detection
    for p in products:
        if p['price_val'] < avg_price * 0.2: # Too cheap?
            p['is_anomaly'] = True
        else:
            p['is_anomaly'] = False
            
    return {"filtered_products": products}

def ranking_node(state: RecommendationState) -> dict[str, Any]:
    """Rank products (MMR or simple score)."""
    # Simply sort by similarity for now, or use MMR if we had vector access handy
    # Since 'retrieved_products' in state are dicts (metadata), we trust the retrieval order or re-sort
    
    ranked = sorted(state["filtered_products"], key=lambda x: x.get('similarity_score', 0), reverse=True)
    return {"final_recommendations": ranked[:5]} # Top 5

def alternatives_node(state: RecommendationState) -> dict[str, Any]:
    """Find alternatives if no results."""
    # If no filtered products, pick form 'dropped' (which were over budget)
    # or just use the retrieved ones but flag them.
    
    if not state["filtered_products"]:
        # Use top 3 from retrieved even if over budget, but flag them
        alternatives = state["retrieved_products"][:3]
        return {"final_recommendations": alternatives, "budget_respected": False}
    return {"budget_respected": True}

def synthesis_node(state: RecommendationState) -> dict[str, Any]:
    """Generate final explanation."""
    chain = get_synthesis_chain()
    
    result = chain.invoke({
        "query": state["query"],
        "intent": state.get("intent", "SHOPPING"),
        "inferred_budget": state.get("inferred_budget", {}),
        "products": state.get("final_recommendations", []),
        "bank_data": state.get("bank_data", {}),
        "cart_total": state.get("cart_total", 0),
        "safety_check_passed": state.get("safety_check_passed", True)
    })
    
    return {"explanation": result.content}

from typing import TypedDict, List, Dict, Any, Optional

class RecommendationState(TypedDict):
    """State for the recommendation graph."""
    query: str
    user_profile: Dict[str, Any]
    
    # Inferred data
    inferred_budget: Dict[str, float]  # {min, target, max}
    
    # Processing state
    retrieved_products: List[Any]  # List of Qdrant ScoredPoint or Product model objects
    filtered_products: List[Any]
    anomalies: List[Any]
    alternatives: List[Any]
    
    # Final output
    final_recommendations: List[Dict[str, Any]]
    explanation: str
    budget_respected: bool
    visual_ids: List[int]


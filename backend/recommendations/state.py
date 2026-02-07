from typing import TypedDict, Optional, Any

class RecommendationState(TypedDict):
    """State for the recommendation graph."""
    # Intent & Routing
    query: str
    user_profile: dict[str, Any]
    intent: str  # SHOPPING, BANKING, NAVIGATION
    
    # Inferred data
    inferred_budget: dict[str, float]  # {min, target, max}
    bank_data: Optional[dict[str, Any]] # Balance, Transactions
    cart_total: float
    
    # Processing state
    retrieved_products: list[Any]
    filtered_products: list[Any]
    anomalies: list[Any]
    alternatives: list[Any]
    
    # Final output
    final_recommendations: list[dict[str, Any]]
    explanation: str
    budget_respected: bool
    visual_ids: list[int]
    safety_check_passed: bool
    control_code: Optional[dict[str, Any]] # For voice automation


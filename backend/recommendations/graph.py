from langgraph.graph import StateGraph, END
from .state import RecommendationState
from .nodes import (
    intent_classification_node,
    banking_node,
    safety_agent_node,
    budget_profiling_node,
    retrieval_node,
    early_budget_filter_node,
    anomaly_detection_node,
    ranking_node,
    alternatives_node,
    synthesis_node
)

def create_recommendation_graph():
    workflow = StateGraph(RecommendationState)
    
    # Add nodes
    workflow.add_node("intent_classification", intent_classification_node)
    workflow.add_node("banking", banking_node)
    workflow.add_node("safety_agent", safety_agent_node)
    workflow.add_node("budget_profiling", budget_profiling_node)
    workflow.add_node("retrieval", retrieval_node)
    workflow.add_node("filtering", early_budget_filter_node)
    workflow.add_node("ranking", ranking_node)
    workflow.add_node("anomaly_detection", anomaly_detection_node)
    workflow.add_node("alternatives", alternatives_node)
    workflow.add_node("synthesis", synthesis_node)
    
    # Define routing logic
    def route_intent(state):
        intent = state.get("intent", "SHOPPING")
        if intent == "BANKING" or intent == "STATUS":
            return "banking"
        if intent == "SHOPPING":
            return "budget_profiling"
        return "synthesis" # Default/Navigation

    # Define edges
    workflow.set_entry_point("intent_classification")
    
    workflow.add_conditional_edges(
        "intent_classification",
        route_intent,
        {
            "banking": "banking",
            "budget_profiling": "budget_profiling",
            "synthesis": "synthesis"
        }
    )
    
    # Path: BANKING / STATUS
    workflow.add_edge("banking", "safety_agent")
    
    # Path: SHOPPING
    workflow.add_edge("budget_profiling", "retrieval")
    workflow.add_edge("retrieval", "filtering")
    workflow.add_edge("filtering", "ranking")
    workflow.add_edge("ranking", "anomaly_detection")
    
    # Add Safety Agent before synthesis for shopping
    workflow.add_edge("anomaly_detection", "safety_agent")
    
    # Check results if we need alternatives
    def check_shopping_results(state):
        final_recommendations = state.get("final_recommendations", [])
        filtered_products = state.get("filtered_products", [])
        retrieved_products = state.get("retrieved_products", [])
        
        print(f"check_shopping_results: final_recommendations={len(final_recommendations)}, filtered={len(filtered_products)}, retrieved={len(retrieved_products)}")
        
        # If we already have final_recommendations, go straight to synthesis
        if final_recommendations:
            print("check_shopping_results: Has final_recommendations, going to synthesis")
            return "synthesis"
        
        # If we have filtered or retrieved products, go to synthesis (alternatives node will handle it)
        if filtered_products or retrieved_products:
            print("check_shopping_results: Has products, going to synthesis")
            return "synthesis"
        
        # Only go to alternatives if we have absolutely nothing
        print("check_shopping_results: No products found, going to alternatives")
        return "alternatives"

    workflow.add_conditional_edges(
        "safety_agent",
        check_shopping_results,
        {
            "alternatives": "alternatives",
            "synthesis": "synthesis"
        }
    )
    
    workflow.add_edge("alternatives", "synthesis")
    workflow.add_edge("synthesis", END)
    
    return workflow.compile()

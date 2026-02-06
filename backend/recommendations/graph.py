from langgraph.graph import StateGraph, END
from .state import RecommendationState
from .nodes import (
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
    workflow.add_node("budget_profiling", budget_profiling_node)
    workflow.add_node("retrieval", retrieval_node)
    workflow.add_node("filtering", early_budget_filter_node)
    workflow.add_node("ranking", ranking_node)
    workflow.add_node("anomaly_detection", anomaly_detection_node)
    workflow.add_node("alternatives", alternatives_node)
    workflow.add_node("synthesis", synthesis_node)
    
    # Define edges
    workflow.set_entry_point("budget_profiling")
    
    workflow.add_edge("budget_profiling", "retrieval")
    workflow.add_edge("retrieval", "filtering")
    workflow.add_edge("filtering", "ranking")
    workflow.add_edge("ranking", "anomaly_detection")
    
    # Conditional logic: If no filtered products, go to alternatives
    def check_results(state):
        if not state.get("filtered_products") and not state.get("final_recommendations"):
            return "alternatives"
        return "synthesis"
    
    # For now, simplistic flow: Anomaly -> Synthesis (assuming ranking did the job)
    # But wait, ranking produced 'final_recommendations'.
    # Let's adjust: filtering -> anomaly -> ranking -> synthesis
    # Re-ordering nodes in logic:
    # Filter -> Anomaly (flagging) -> Ranking (sorting & picking top K) -> Check -> Synthesis
    
    # Redefine edges based on logic in nodes.py
    # nodes.py assumes flow.
    # Let's stick to the linear flow for MVP, but add the check.
    
    workflow.add_edge("anomaly_detection", "alternatives") # Check happens inside alternatives node? 
    # Actually 'alternatives_node' in nodes.py checks if filtered_products is empty.
    # So: Anomaly -> Alternatives -> Synthesis
    
    workflow.add_edge("alternatives", "synthesis")
    workflow.add_edge("synthesis", END)
    
    return workflow.compile()

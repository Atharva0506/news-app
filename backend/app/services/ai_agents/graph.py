from langgraph.graph import StateGraph, END
from app.services.ai_agents.state import AgentState
from app.services.ai_agents.nodes import (
    collector_node,
    classifier_node,
    summarizer_node,
    bias_node
)

def create_news_processing_graph():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("collector", collector_node)
    workflow.add_node("classifier", classifier_node)
    workflow.add_node("summarizer", summarizer_node)
    workflow.add_node("bias", bias_node)
    
    # helper for conditional edge
    def check_quality(state: AgentState):
        if state["quality_score"] < 0.3:
            return END
        return "classifier"

    # Define edges
    # Start -> Collector
    workflow.set_entry_point("collector")
    
    # Collector -> Check Quality -> Classifier (or END)
    workflow.add_conditional_edges(
        "collector",
        check_quality,
        {
            END: END,
            "classifier": "classifier"
        }
    )
    
    # Classifier -> Summarizer
    workflow.add_edge("classifier", "summarizer")
    
    # Summarizer -> Bias
    workflow.add_edge("summarizer", "bias")
    
    # Bias -> End
    workflow.add_edge("bias", END)
    
    return workflow.compile()

news_graph = create_news_processing_graph()

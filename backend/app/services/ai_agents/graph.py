from typing import TypedDict, Any, Optional
from langgraph.graph import StateGraph, END  # LangGraph StateGraph workflow building. [web:10]
from .collector import collector_node
from .classifier import classifier_node
from .summarizer import summarizer_node
from .bias import bias_node
from .explainer import explainer_node

class ArticleState(TypedDict, total=False):
    article: dict
    cleaned: dict
    classification: dict
    summary: dict
    bias: dict
    explanation: dict
    errors: list[str]

def build_graph():
    g = StateGraph(ArticleState)
    g.add_node("collector", collector_node)
    g.add_node("classifier", classifier_node)
    g.add_node("summarizer", summarizer_node)
    g.add_node("bias", bias_node)
    g.add_node("explainer", explainer_node)

    g.set_entry_point("collector")
    g.add_edge("collector", "classifier")
    g.add_edge("classifier", "summarizer")
    g.add_edge("summarizer", "bias")
    g.add_edge("bias", "explainer")
    g.add_edge("explainer", END)
    return g.compile()

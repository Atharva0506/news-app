import logging
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.services.ai_agents.state import AgentState
from app.services.ai_agents.llm_manager import llm_manager, get_current_llm

logger = logging.getLogger(__name__)

async def collector_node(state: AgentState) -> Dict[str, Any]:
    """
    Filters low quality content.
    """
    prompt = ChatPromptTemplate.from_template(
        """
        Analyze the following news article content for quality and relevance.
        Return a JSON with "quality_score" (0.0 to 1.0) and "reason".
        
        Title: {title}
        Content: {content}
        """
    )
    try:
        result = await llm_manager.invoke_with_fallback(
            prompt,
            JsonOutputParser(),
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 10}
        )
        return {"quality_score": result.get("quality_score", 0.5)}
    except Exception as e:
        logger.error("Collector node failed", exc_info=e)
        return {"quality_score": 0.5}

async def classifier_node(state: AgentState) -> Dict[str, Any]:
    """
    Classifies category, sentiment, and tags.
    """
    prompt = ChatPromptTemplate.from_template(
        """
        Classify this news article.
        Return JSON with:
        - "category": (Technology, Finance, Politics, Sports, Entertainment, Health, Science, World)
        - "sentiment": (Positive, Negative, Neutral)
        - "tags": [list of 3-5 keywords]
        
        Title: {title}
        Content: {content}
        """
    )
    try:
        result = await llm_manager.invoke_with_fallback(
            prompt,
            JsonOutputParser(),
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 15}
        )
        return {
            "category": result.get("category", "General"),
            "sentiment": result.get("sentiment", "Neutral"),
            "tags": result.get("tags", [])
        }
    except Exception as e:
        logger.error("Classifier node failed", exc_info=e)
        return {"category": "General", "sentiment": "Neutral", "tags": []}

async def summarizer_node(state: AgentState) -> Dict[str, Any]:
    """
    Generates summaries.
    """
    prompt = ChatPromptTemplate.from_template(
        """
        Summarize this article.
        Return JSON with:
        - "summary_short": 2 sentence summary
        - "summary_detail": 2 paragraph detailed summary
        
        Title: {title}
        Content: {content}
        """
    )
    try:
        result = await llm_manager.invoke_with_fallback(
            prompt,
            JsonOutputParser(),
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 25}
        )
        return {
            "summary_short": result.get("summary_short", "Summary unavailable."),
            "summary_detail": result.get("summary_detail", state.get("content", "")[:500] + "...")
        }
    except Exception as e:
        logger.error("Summarizer node failed", exc_info=e)
        fallback = state.get("content", "")[:200] + "..."
        return {"summary_short": "Summary unavailable.", "summary_detail": fallback}

async def bias_node(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes bias (Premium only).
    """
    if not state.get("is_premium"):
        return {"bias_score": None, "bias_explanation": "Premium feature"}

    prompt = ChatPromptTemplate.from_template(
        """
        Analyze the political or sensational bias of this article.
        Return JSON with:
        - "bias_score": 0.0 (Neutral) to 1.0 (Highly Biased)
        - "bias_explanation": Brief explanation of the bias
        
        Title: {title}
        Content: {content}
        """
    )
    try:
        result = await llm_manager.invoke_with_fallback(
            prompt,
            JsonOutputParser(),
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 15}
        )
        return {
            "bias_score": result.get("bias_score", 0.0),
            "bias_explanation": result.get("bias_explanation", "Neutral consideration.")
        }
    except Exception as e:
        logger.error("Bias analysis node failed", exc_info=e)
        return {"bias_score": 0.0, "bias_explanation": "Analysis unavailable."}

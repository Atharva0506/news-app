import os
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser

from app.core.config import settings
from app.services.ai_agents.state import AgentState

# Initialize LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-lite",
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0, # Reduced for consistency and speed
    convert_system_message_to_human=True,
    request_timeout=10 # Global timeout
)

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
    chain = prompt | llm | JsonOutputParser()
    try:
        # 5 second timeout for collector
        result = await chain.ainvoke(
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 5}
        )
        return {"quality_score": result.get("quality_score", 0.5)}
    except Exception as e:
        print(f"Collector Error: {e}")
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
    chain = prompt | llm | JsonOutputParser()
    try:
        result = await chain.ainvoke(
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 8}
        )
        return {
            "category": result.get("category", "General"),
            "sentiment": result.get("sentiment", "Neutral"),
            "tags": result.get("tags", [])
        }
    except Exception as e:
        print(f"Classifier Error: {e}")
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
    chain = prompt | llm | JsonOutputParser()
    try:
        result = await chain.ainvoke(
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 15}
        )
        return {
            "summary_short": result.get("summary_short", "Summary unavailable."),
            "summary_detail": result.get("summary_detail", state.get("content", "")[:500] + "...")
        }
    except Exception as e:
        print(f"Summarizer Error: {e}")
        # Fallback to description or truncated content
        fallback = state.get("content", "")[:200] + "..."
        return {"summary_short": "Summary unavailable due to high load.", "summary_detail": fallback}

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
    chain = prompt | llm | JsonOutputParser()
    try:
        result = await chain.ainvoke(
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 10}
        )
        return {
            "bias_score": result.get("bias_score", 0.0),
            "bias_explanation": result.get("bias_explanation", "Neutral consideration.")
        }
    except Exception as e:
        print(f"Bias Node Error: {e}")
        return {"bias_score": 0.0, "bias_explanation": "Analysis unavailable at this moment."}

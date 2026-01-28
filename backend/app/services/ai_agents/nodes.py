import os
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser

from app.core.config import settings
from app.services.ai_agents.state import AgentState

# Initialize LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
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
# Helper for retry logic
import asyncio
import random

async def invoke_with_retry(chain, input_data, config=None, max_retries=3):
    """
    Invokes chain with exponential backoff on 429/Quota errors.
    """
    retries = 0
    while True:
        try:
            return await chain.ainvoke(input_data, config=config)
        except Exception as e:
            msg = str(e)
            # Check for 429 or ResourceExhausted
            if "429" in msg or "ResourceExhausted" in msg or "quota" in msg.lower():
                if retries >= max_retries:
                    print(f"Max retries reached for AI call: {msg}")
                    # Re-raise to let the API handle the error response
                    raise e
                
                delay = (2 ** retries) + random.uniform(0, 1)
                print(f"AI Rate Limit (Attempt {retries+1}). Retrying in {delay:.2f}s...")
                await asyncio.sleep(delay)
                retries += 1
            else:
                # Other errors can be swallowed or re-raised depending on node strategy
                # For now, we re-raise to be safe, or we can fallback.
                # The original code returned defaults, so for non-429 we should arguably try fallback?
                # But to comply with "Clean Error Response", maybe simple fallback is better for other errors.
                # However, the user specifically asked to handle 429.
                raise e

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
        result = await invoke_with_retry(
            chain, 
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 10} # Increased timeout a bit for retries
        )
        return {"quality_score": result.get("quality_score", 0.5)}
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(e) or "quota" in str(e).lower():
             raise e # Propagate 429
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
        result = await invoke_with_retry(
            chain,
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 15}
        )
        return {
            "category": result.get("category", "General"),
            "sentiment": result.get("sentiment", "Neutral"),
            "tags": result.get("tags", [])
        }
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(e) or "quota" in str(e).lower():
             raise e
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
        result = await invoke_with_retry(
            chain,
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 25}
        )
        return {
            "summary_short": result.get("summary_short", "Summary unavailable."),
            "summary_detail": result.get("summary_detail", state.get("content", "")[:500] + "...")
        }
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(e) or "quota" in str(e).lower():
             raise e
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
        result = await invoke_with_retry(
            chain,
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 15}
        )
        return {
            "bias_score": result.get("bias_score", 0.0),
            "bias_explanation": result.get("bias_explanation", "Neutral consideration.")
        }
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(e) or "quota" in str(e).lower():
             raise e
        print(f"Bias Node Error: {e}")
        return {"bias_score": 0.0, "bias_explanation": "Analysis unavailable at this moment."}

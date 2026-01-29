import os
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser

from app.core.config import settings
from app.services.ai_agents.state import AgentState

import os
import asyncio
import random
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser

from app.core.config import settings
from app.services.ai_agents.state import AgentState

# Initialize LLMs (one per key)
api_keys = settings.GOOGLE_API_KEYS
if not api_keys:
    # Fallback to single key if list is empty (though config should handle this)
    api_keys = [settings.GOOGLE_API_KEY]

llm_instances = [
    ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview",
        google_api_key=key,
        temperature=0,
        convert_system_message_to_human=True,
        request_timeout=10
    ) for key in api_keys
]

current_llm_index = 0

def get_current_llm():
    global current_llm_index
    return llm_instances[current_llm_index]

def rotate_llm():
    global current_llm_index
    current_llm_index = (current_llm_index + 1) % len(llm_instances)
    print(f"Rotating Gemini API Key to index {current_llm_index}")

async def call_llm_with_rotation(prompt, parser, input_data, config=None):
    """
    Invokes chain with rotation on 429/Quota errors.
    """
    global current_llm_index
    
    # Try getting result, rotating if necessary
    # We try at most len(api_keys) * 2 times to be robust
    max_attempts = len(llm_instances) * 2
    
    for attempt in range(max_attempts):
        try:
            # Build chain with current LLM
            current_llm = get_current_llm()
            chain = prompt | current_llm | parser
            
            return await chain.ainvoke(input_data, config=config)
            
        except Exception as e:
            msg = str(e)
            if "429" in msg or "ResourceExhausted" in msg or "quota" in msg.lower():
                print(f"Gemini 429/Quota error (Key Index {current_llm_index}): {msg}")
                rotate_llm()
                # Optional: Add small backoff even when rotating to be safe?
                await asyncio.sleep(0.5) 
                continue
            else:
                # Non-retriable error (e.g. invalid prompt)
                raise e
    
    raise Exception("Max retries reached for Gemini API rotation")

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
        result = await call_llm_with_rotation(
            prompt, 
            JsonOutputParser(),
            {"title": state["title"], "content": state["content"]},
            config={"timeout": 10}
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
    try:
        result = await call_llm_with_rotation(
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
    try:
        result = await call_llm_with_rotation(
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
        print(f"Summarizer Error: {e}")
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
        result = await call_llm_with_rotation(
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
        print(f"Bias Node Error: {e}")
        return {"bias_score": 0.0, "bias_explanation": "Analysis unavailable."}

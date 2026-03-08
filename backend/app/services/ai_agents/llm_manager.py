import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, date

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from app.core.config import settings

logger = logging.getLogger("app.services.ai_agents.llm_manager")

class LLMProviderManager:
    """
    Manages LLM instances, tracking tokens/requests, and providing fallbacks
    from Gemini (primary) to Groq (secondary) to prevent 429 quota errors.
    """
    
    def __init__(self):
        self.gemini_keys = settings.GOOGLE_API_KEYS
        self.groq_key = settings.GROQ_API_KEY
        
        self.primary_instances: List[ChatGoogleGenerativeAI] = []
        self.fallback_instances: List[ChatGroq] = []
        
        self.current_primary_idx = 0
        
        # Simple in-memory tracker (can be replaced by Redis for multi-worker scaling)
        self.daily_requests: int = 0
        self.tracker_date: date = datetime.utcnow().date()
        
        self.GEMINI_DAILY_LIMIT = 1500
        self.SWITCH_THRESHOLD = int(self.GEMINI_DAILY_LIMIT * 0.80)  # Switch at 80% limit = 1200 requests
        
        self._initialize_providers()

    def _initialize_providers(self):
        # Initialize Gemini instances
        for key in self.gemini_keys:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=settings.GEMINI_MODEL,
                    google_api_key=key,
                    temperature=0.3,
                    convert_system_message_to_human=True,
                    request_timeout=30
                )
                self.primary_instances.append(llm)
            except Exception as e:
                logger.warning(f"Failed to init Gemini model {settings.GEMINI_MODEL} with key ...{key[-5:]}: {e}")
                
        # Initialize Groq fallback
        if self.groq_key:
            try:
                # Typically llama-3.3-70b-versatile or mixtral-8x7b-32768
                groq_llm = ChatGroq(
                    model="llama3-8b-8192", 
                    api_key=self.groq_key,
                    temperature=0.3
                )
                self.fallback_instances.append(groq_llm)
            except Exception as e:
                logger.warning(f"Failed to init Groq fallback: {e}")
                
        if not self.primary_instances and not self.fallback_instances:
            logger.critical("Failed to initialize any LLM providers (Primary or Fallback)")

    def _reset_tracker_if_needed(self):
        today = datetime.utcnow().date()
        if today > self.tracker_date:
            self.daily_requests = 0
            self.tracker_date = today

    def get_llm(self, streaming: bool = False) -> tuple[BaseChatModel, str]:
        """
        Returns the appropriate LLM instance and its provider name.
        Uses Gemini until 80% quota is reached, then falls back to Groq.
        """
        self._reset_tracker_if_needed()
        
        # Check quota
        if self.primary_instances and self.daily_requests < self.SWITCH_THRESHOLD:
            provider = "Gemini"
            llm = self.primary_instances[self.current_primary_idx]
            
            # For streaming, we need to ensure the streaming flag is handled appropriately 
            # by Langchain implementations if applicable, though typically calling .astream() works fine.
            return llm, provider
            
        elif self.fallback_instances:
            if self.primary_instances:
                logger.info(f"Gemini usage ({self.daily_requests}/{self.SWITCH_THRESHOLD}) reached 80% threshold. Switching to Groq fallback.")
            provider = "Groq"
            return self.fallback_instances[0], provider
            
        elif self.primary_instances:
            logger.warning("Gemini over 80% quota, but no Groq fallback available. Continuing with Gemini.")
            provider = "Gemini"
            return self.primary_instances[self.current_primary_idx], provider
            
        raise RuntimeError("No LLM instances available.")
        
    def rotate_primary_key(self):
        if self.primary_instances:
            self.current_primary_idx = (self.current_primary_idx + 1) % len(self.primary_instances)
            logger.warning(f"Rotated Gemini API Key to index {self.current_primary_idx}")

    def increment_usage(self):
        self._reset_tracker_if_needed()
        self.daily_requests += 1

    async def invoke_with_fallback(self, prompt, parser, input_data: Dict[str, Any], config=None):
        """
        Invokes LLM safely. If Gemini throws a 429 ResourceExhausted or quota error,
        it automatically marks the threshold as reached and attempts Groq immediately.
        """
        max_attempts = 2
        last_error = None
        
        for attempt in range(max_attempts):
            llm, provider_name = self.get_llm()
            chain = prompt | llm | parser
            
            try:
                # logger.debug(f"Attempting invoke with {provider_name}")
                result = await chain.ainvoke(input_data, config=config)
                self.increment_usage()
                logger.info(f"Successfully processed LLM request using {provider_name}.")
                return result
                
            except Exception as e:
                msg = str(e).lower()
                last_error = e
                logger.error(f"Error invoking {provider_name}: {e}")
                
                if provider_name == "Gemini" and ("429" in msg or "resourceexhausted" in msg or "quota" in msg):
                    logger.warning(f"Gemini 429/Quota error encountered. Forcing switch to fallback.")
                    # Force threshold trip
                    self.daily_requests = self.SWITCH_THRESHOLD
                    self.rotate_primary_key()
                    await asyncio.sleep(0.5)
                    continue # Retry (will pick Groq next loop due to quota override)
                    
                raise e
                
        raise last_error or RuntimeError("LLM invocation failed after retries.")

# Global instance
llm_manager = LLMProviderManager()

def get_current_llm():
    """Legacy helper for compatibility, returns just the LLM."""
    llm, _ = llm_manager.get_llm()
    return llm

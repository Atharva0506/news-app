import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.api import deps
from app.models.user import User

logger = logging.getLogger("app.api.support")
router = APIRouter()

class SupportMessage(BaseModel):
    role: str
    content: str

class SupportRequest(BaseModel):
    message: str
    history: List[SupportMessage] = []

class SupportResponse(BaseModel):
    response: str



from fastapi.responses import StreamingResponse
import json

@router.post("/chat")
async def support_chat(
    request: SupportRequest,
    current_user: Optional[User] = Depends(deps.get_current_active_user_optional),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Chat with the AI Support Agent.
    """
    from app.services.ai_agents.llm_manager import llm_manager

    try:
        # System Prompt
        system_prompt = """You are the official AI Support Agent for NewsAI, a next-generation AI-powered news aggregator platform.
        
        **Your Goal:** Provide helpful, accurate, and polite assistance to NewsAI users.

        **App Context & Features:**
        - **NewsAI** aggregates news from global sources and uses AI to summarize, analyze sentiment, and detect bias.
        - **Smart Feed:** Personalized news feed based on user interests (Technology, Finance, Politics, etc.).
        - **AI Chat:** Users can chat with the AI about news, get summaries, and ask questions.
        - **Deep Analysis:** Pro feature — in-depth AI breakdown of articles (sentiment, bias, fact-checking, summary). Pro users get 3 per day.
        - **Cross-Platform:** Available on Web and Mobile (responsive design).
        
        **Pricing Plans (Payments in SOL - Solana):**
        1. **Free Plan:**
           - AI chat limit: 1,000 tokens per chat.
           - No deep analysis.
           - Daily automatic news summaries and feed refresh only.
           - Basic features with strict rate limits.
           - **Free Trial:** First 3 days include all Pro features (no payment needed).
        2. **Pro Plan (paid in SOL/month):**
           - AI chat limit: 10,000 tokens per chat.
           - 3 deep analyses per day.
           - Manual news summary and feed refresh.
           - Billing history and invoices in settings.
           - All features unlocked.
           - Higher rate limits.
        
        **Common Issues & Troubleshooting:**
        - **Login:** If login fails, check email/password or use "Forgot Password".
        - **Payments:** Ensure Phantom/Solflare Wallet is connected and has sufficient SOL.
        - **Feed:** Click "Refresh" to get the latest news (manual refresh is Pro only).
        - **Limits:** Token and deep analysis limits reset daily at midnight UTC.
        
        **Tone:** Professional, friendly, and concise. Use formatting (bullet points, bold text) for readability.
        
        If you cannot answer a question, politely ask the user to email human support at **support@newsai.com**.
        """

        messages = [
            ("system", system_prompt)
        ]

        for msg in request.history[-5:]: # Keep last 5 messages for context
            messages.append((msg.role, msg.content))

        messages.append(("user", request.message))

        async def chat_generator():
            try:
                from langchain_core.prompts import ChatPromptTemplate
                from langchain_core.output_parsers import BaseOutputParser
                
                class PassThroughParser(BaseOutputParser):
                    def parse(self, text: str) -> str:
                        return text
                
                # We format messages directly for the LLM
                prompt = ChatPromptTemplate.from_messages(messages)
                
                full_response = ""
                provider_name = "Unknown"
                
                async for chunk_type, chunk_data in llm_manager.stream_with_fallback(
                    prompt=prompt,
                    parser=PassThroughParser(),
                    input_data={}
                ):
                    if chunk_type == "provider":
                        provider_name = chunk_data
                    elif chunk_type == "chunk":
                        full_response += chunk_data
                        yield f"data: {json.dumps({'text': chunk_data})}\n\n"
                
                # Log usage completion
                logger.info(f"Support chat fulfilled with {provider_name}")
                
                if current_user:
                    try:
                        from app.models.payment import AIUsageLog
                        from app.db.session import AsyncSessionLocal
                        async with AsyncSessionLocal() as session:
                            log = AIUsageLog(
                                user_id=current_user.id,
                                action="support_chat",
                                tokens_used=max(len(full_response) // 4, 10)
                            )
                            session.add(log)
                            await session.commit()
                    except Exception as db_e:
                        logger.error("Failed to log support chat usage", exc_info=db_e)
                
                yield f"data: {json.dumps({'status': 'done'})}\n\n"
            except Exception as e:
                logger.error("Support chat streaming failed", exc_info=e)
                yield f"data: {json.dumps({'status': 'error', 'message': 'Support chat failed'})}\n\n"

        return StreamingResponse(chat_generator(), media_type="text/event-stream")

    except Exception as e:
        logger.error("Support chat failed", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to initialize support chat")

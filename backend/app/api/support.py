import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.api import deps
from sqlalchemy.ext.asyncio import AsyncSession
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
        system_prompt = """You are the AI Support Agent for NewsAI, an AI-powered news aggregator.

**Platform Overview:**
- Aggregates global news with AI-powered summaries, sentiment analysis, and bias detection.
- Smart Feed: personalized by interests (Technology, Finance, Politics, etc.).
- AI Chat: converse with AI about any article or news topic.
- Deep Analysis: sentiment, bias, and fact-check breakdown (Pro only, 3/day).
- Available on Web and Mobile (PWA).

**Plans (payments in SOL via Phantom/Solflare):**
- **Free:** 1,000 tokens/chat, no deep analysis, auto feed refresh, 3-day full Pro trial on signup.
- **Pro:** 10,000 tokens/chat, 3 deep analyses/day, manual refresh, billing history, all features.
- Limits reset daily at midnight UTC.

**Common Fixes:**
- Login issues → verify email/password or use "Forgot Password".
- Payment issues → ensure wallet is connected and has enough SOL.
- Feed not updating → Pro users can click "Refresh"; Free users get automatic daily refresh.
- Deep analysis unavailable → feature is Pro-only; upgrade or wait for daily reset.
- Slow responses → the app uses free-tier APIs (Gemini/Groq); brief delays may occur at peak times.

**Behavior Rules:**
1. Answer only questions related to NewsAI. For unrelated topics, politely decline.
2. Be concise and use bullet points or bold text for clarity.
3. If a question is ambiguous, ask one focused follow-up question before answering.
4. If you cannot resolve an issue, say so honestly and escalate.

**Escalation:** If the issue is beyond your scope or requires account-level action, ask the user to email **atharvan.coder@gmail.com** with a description of their problem."""

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

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.api import deps
from app.models.user import User

router = APIRouter()

class SupportMessage(BaseModel):
    role: str
    content: str

class SupportRequest(BaseModel):
    message: str
    history: List[SupportMessage] = []

class SupportResponse(BaseModel):
    response: str

@router.post("/chat", response_model=SupportResponse)
async def support_chat(
    request: SupportRequest,
    current_user: Optional[User] = Depends(deps.get_current_active_user_optional), # Allow free/anon users? Maybe just auth users for now
):
    """
    Chat with the AI Support Agent.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from app.core.config import settings
    import os

    try:
        if not settings.GOOGLE_API_KEY:
             raise HTTPException(status_code=500, detail="AI Service not configured")

        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3
        )

        # System Prompt
        system_prompt = """You are the official AI Support Agent for NewsAI, a next-generation AI-powered news aggregator platform.
        
        Your capabilities:
        1. Answer questions about NewsAI's features (AI Summaries, Bias Detection, Sentiment Analysis).
        2. Explain Pricing Plans:
           - Free Plan: 10 daily summaries, Basic bias detection, 1 category, Email digest.
           - Pro Plan: Unlimited summaries, Advanced bias detection, 5 categories, Real-time notifications, AI Q&A, Multi-agent analysis, Priority support.
           - Payments are in SOL (Solana).
        3. Troubleshoot common issues (Login, Payments, Feed refreshing).
        4. Be polite, concise, and helpful.
        
        If you don't know the answer, ask the user to contact human support at support@newsai.com.
        """

        messages = [
            ("system", system_prompt)
        ]
        
        for msg in request.history[-5:]: # Keep last 5 messages for context
            messages.append((msg.role, msg.content))
            
        messages.append(("user", request.message))

        response = llm.invoke(messages)
        
        return {"response": response.content}

    except Exception as e:
        print(f"Support Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get support response")

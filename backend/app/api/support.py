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
        
        **Your Goal:** Provide helpful, accurate, and polite assistance to NewsAI users.

        **App Context & Features:**
        - **NewsAI** aggregates news from global sources and uses AI to summarize, analyze sentiment, and detect bias.
        - **Smart Feed:** Personalized news feed based on user interests (Technology, Finance, Politics, etc.).
        - **AI Analysis:** Users can ask the AI questions about any article or get deep analysis (Sentiment, Bias Score, Summary).
        - **Cross-Platform:** Available on Web and Mobile (responsive design).
        
        **Pricing Plans (Payments in SOL - Solana):**
        1. **Free Plan:**
           - 10 Daily AI Summaries.
           - Basic Bias Detection.
           - 1 Interest Category.
           - Ad-supported.
        2. **Pro Plan (0.05 SOL/month):**
           - Unlimited AI Summaries & Deep Analysis.
           - Advanced Bias Detection & Sentiment Analysis.
           - Unlimited Categories.
           - Ad-free experience.
           - **"Ask AI" Feature:** Chat with articles.
           - **Priority Support.**
        
        **Common Issues & Troubleshooting:**
        - **Login:** If login fails, check email/password or use "Forgot Password".
        - **Payments:** Ensure Phantom Wallet is connected and has sufficient SOL (Devnet for testing).
        - **Feed:** Click "Refresh" to get the latest news.
        
        **Tone:** Professional, friendly, and concise. Use formatting (bullet points, bold text) for readability.
        
        If you cannot answer a question, politely ask the user to email human support at **support@newsai.com**.
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

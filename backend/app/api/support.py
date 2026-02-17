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
    current_user: Optional[User] = Depends(deps.get_current_active_user_optional),
):
    """
    Chat with the AI Support Agent.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from app.core.config import settings
    import random
    
    try:
        if not settings.GOOGLE_API_KEYS:
             raise HTTPException(status_code=500, detail="AI Service not configured")

        # Basic rotation: Randomly select a key
        api_key = random.choice(settings.GOOGLE_API_KEYS)

        try:
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=api_key,
                temperature=0.3
            )
        except Exception as e:
            # Fallback if 2.5 is rejected by validation
            print(f"Warning: Failed to instantiate {settings.GEMINI_MODEL}, falling back to gemini-1.5-flash. Error: {e}")
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=api_key,
                temperature=0.3
            )

        
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

        response = llm.invoke(messages)
        
        return {"response": response.content}

    except Exception as e:
        print(f"Support Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get support response")

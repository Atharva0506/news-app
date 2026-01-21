from pydantic import BaseModel, Field
from .gemini_client import gemini_json

class SummarizerOut(BaseModel):
    short: str = Field(..., description="3–4 lines summary")
    detailed: list[str] = Field(..., description="Bullet points")

async def summarizer_node(state: dict) -> dict:
    cleaned = state.get("cleaned")
    if not cleaned:
        return {"summary": {"short": "", "detailed": []}}

    out = await gemini_json(
        model="gemini-2.5-pro",
        system="Summarize the news clearly and factually.",
        user=f"TITLE: {cleaned['title']}\nCONTENT: {cleaned['content'][:6000]}",
        schema=SummarizerOut,
        timeout_s=30,
        retries=2,
    )
    return {"summary": out.model_dump()}

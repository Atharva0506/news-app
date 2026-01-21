from pydantic import BaseModel, Field
from .gemini_client import gemini_json

class BiasOut(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
    explanation: str

async def bias_node(state: dict) -> dict:
    cleaned = state.get("cleaned")
    if not cleaned:
        return {"bias": {"score": 0.0, "explanation": ""}}

    out = await gemini_json(
        model="gemini-2.5-pro",
        system="Detect political/media bias. Output a score in [0,1] and a brief explanation.",
        user=f"TITLE: {cleaned['title']}\nCONTENT: {cleaned['content'][:6000]}",
        schema=BiasOut,
        timeout_s=25,
        retries=2,
    )
    return {"bias": out.model_dump()}

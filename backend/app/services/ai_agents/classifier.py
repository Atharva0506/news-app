from pydantic import BaseModel
from .gemini_client import gemini_json

class ClassifierOut(BaseModel):
    category: str | None = None
    sentiment: str | None = None  # positive/neutral/negative
    tags: list[str] = []

async def classifier_node(state: dict) -> dict:
    cleaned = state.get("cleaned")
    if not cleaned:
        return {"classification": {}}

    out = await gemini_json(
        model="gemini-2.5-pro",
        system="Classify news into category, sentiment, and tags.",
        user=f"TITLE: {cleaned['title']}\nCONTENT: {cleaned['content'][:6000]}",
        schema=ClassifierOut,
        timeout_s=25,
        retries=2,
    )
    return {"classification": out.model_dump()}

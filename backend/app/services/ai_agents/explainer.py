from pydantic import BaseModel
from .gemini_client import gemini_json

class ExplainerOut(BaseModel):
    eli5: str
    interview: str

async def explainer_node(state: dict) -> dict:
    cleaned = state.get("cleaned")
    if not cleaned:
        return {"explanation": {"eli5": "", "interview": ""}}

    out = await gemini_json(
        model="gemini-2.5-pro",
        system="Explain the news in two ways: ELI5 and interview-focused explanation.",
        user=f"TITLE: {cleaned['title']}\nCONTENT: {cleaned['content'][:6000]}",
        schema=ExplainerOut,
        timeout_s=30,
        retries=2,
    )
    return {"explanation": out.model_dump()}

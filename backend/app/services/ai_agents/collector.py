import re
from pydantic import BaseModel, Field
from .gemini_client import gemini_json

class CollectorOut(BaseModel):
    keep: bool = Field(..., description="False if spam/low-quality/duplicate")
    cleaned_title: str
    cleaned_url: str
    cleaned_content: str

def _strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s or "").strip()

async def collector_node(state: dict) -> dict:
    a = state["article"] or {}
    title = (a.get("title") or "").strip()
    url = (a.get("url") or "").strip()
    content = _strip_html(a.get("description") or a.get("content") or "")

    out = await gemini_json(
        model="gemini-2.5-pro",
        system="You are a news quality filter. Remove junk, detect obvious duplicates.",
        user=f"TITLE: {title}\nURL: {url}\nCONTENT: {content[:6000]}",
        schema=CollectorOut,
        timeout_s=20,
        retries=2,
    )

    if not out.keep:
        state.setdefault("errors", []).append("Collector rejected article")
        return {"cleaned": None}

    return {"cleaned": {"title": out.cleaned_title, "url": out.cleaned_url, "content": out.cleaned_content}}

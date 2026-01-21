from pydantic import BaseModel

class SummarizeIn(BaseModel):
    article_id: str

class ExplainIn(BaseModel):
    article_id: str
    mode: str = "eli5"  # or "interview"

class CompareIn(BaseModel):
    article_ids: list[str]

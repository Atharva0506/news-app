from fastapi import APIRouter, Depends, BackgroundTasks
from app.schemas.ai import SummarizeIn, ExplainIn, CompareIn
from app.api.deps import get_current_user
from app.models.user import User
from app.services.ai_service import run_pipeline_and_persist_safe

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/summarize")
async def summarize(
    data: SummarizeIn,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    bg.add_task(run_pipeline_and_persist_safe, data.article_id, str(user.id))
    return {"status": "queued", "article_id": data.article_id}

@router.post("/explain")
async def explain(
    data: ExplainIn,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    bg.add_task(run_pipeline_and_persist_safe, data.article_id, str(user.id))
    return {"status": "queued", "article_id": data.article_id, "mode": data.mode}

@router.post("/compare")
async def compare(data: CompareIn, user: User = Depends(get_current_user)):
    return {"status": "todo", "article_ids": data.article_ids}

@router.get("/usage")
async def usage(user: User = Depends(get_current_user)):
    return {"status": "todo"}

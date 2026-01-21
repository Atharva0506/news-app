from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.db.session import AsyncSessionLocal
from app.models.news import NewsArticle
from app.models.ai import NewsSummary, AIUsageLog
from app.services.ai_agents.graph import build_graph

graph_app = build_graph()

def _now():
    return datetime.now(timezone.utc)

async def run_pipeline_and_persist(db: AsyncSession, article_id: str, user_id: str | None):
    res = await db.execute(select(NewsArticle).where(NewsArticle.id == article_id))
    article = res.scalar_one_or_none()
    if not article:
        # Background task: fail gracefully
        return {"error": "Article not found", "article_id": article_id}

    state = {"article": article.raw_payload, "errors": []}

    result = await graph_app.ainvoke(state)

    summary = NewsSummary(
        article_id=article.id,
        short_summary=result["summary"]["short"],
        detailed_summary=result["summary"]["detailed"],
        sentiment=(result.get("classification") or {}).get("sentiment"),
        tags=(result.get("classification") or {}).get("tags") or [],
        bias_score=(result.get("bias") or {}).get("score"),
        bias_explanation=(result.get("bias") or {}).get("explanation"),
        created_at=_now(),
    )
    db.add(summary)

    db.add(AIUsageLog(
        user_id=user_id,
        action="pipeline",
        tokens_in=0,
        tokens_out=0,
        meta={"article_id": article_id},
        created_at=_now(),
    ))

    await db.commit()
    return result

# IMPORTANT: BackgroundTasks should call this, not run_pipeline_and_persist(db, ...)
async def run_pipeline_and_persist_safe(article_id: str, user_id: str | None):
    async with AsyncSessionLocal() as db:
        return await run_pipeline_and_persist(db, article_id, user_id)

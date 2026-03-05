"""
Shareable Analysis API — public read, authenticated write.
"""

import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.user import User
from app.models.share import SharedAnalysis

logger = logging.getLogger("app.api.share")
router = APIRouter()


class ShareCreate(BaseModel):
    article_title: str
    article_url: str
    analysis_json: dict  # The full analysis JSON blob


class ShareResponse(BaseModel):
    id: str
    article_title: str
    article_url: str
    analysis: dict
    view_count: int
    created_at: str


@router.post("/")
async def create_share(
    payload: ShareCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> dict:
    """Create a shareable link for an article analysis (auth required)."""
    shared = SharedAnalysis(
        article_title=payload.article_title,
        article_url=payload.article_url,
        analysis_json=payload.analysis_json,
    )
    db.add(shared)
    await db.commit()
    await db.refresh(shared)

    return {"id": str(shared.id), "url": f"/share/{shared.id}"}


@router.get("/{analysis_id}")
async def get_shared_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> dict:
    """Public endpoint — returns a shared analysis by ID."""
    try:
        uid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Analysis not found")

    result = await db.execute(select(SharedAnalysis).where(SharedAnalysis.id == uid))
    shared = result.scalars().first()

    if not shared:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Increment view count
    shared.view_count = (shared.view_count or 0) + 1
    await db.commit()

    return {
        "id": str(shared.id),
        "article_title": shared.article_title,
        "article_url": shared.article_url,
        "analysis": shared.analysis_json,
        "view_count": shared.view_count,
        "created_at": shared.created_at.isoformat(),
    }

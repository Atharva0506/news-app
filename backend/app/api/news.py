from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.news import NewsArticleOut, NewsRefreshIn
from app.services.news_service import get_feed, refresh_news, get_article
from app.core.rate_limit import rate_limit

router = APIRouter(prefix="/news", tags=["news"])

@router.get("/feed", response_model=list[NewsArticleOut], dependencies=[Depends(rate_limit)])
async def feed(db: AsyncSession = Depends(get_db)):
    items = await get_feed(db)
    return [NewsArticleOut(
        id=str(a.id), title=a.title, url=a.url, author=a.author,
        published_at=a.published_at, raw_payload=a.raw_payload
    ) for a in items]

@router.get("/{id}", dependencies=[Depends(rate_limit)])
async def get_one(id: str, db: AsyncSession = Depends(get_db)):
    art = await get_article(db, id)
    if not art:
        raise HTTPException(status_code=404, detail="Article not found")
    return art

@router.post("/refresh", dependencies=[Depends(rate_limit)])
async def refresh(data: NewsRefreshIn, db: AsyncSession = Depends(get_db)):
    inserted = await refresh_news(db, category=data.category, keyword=data.keyword)
    return {"inserted": inserted}

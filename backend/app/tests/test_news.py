import pytest
from app.services.currents import currents_service
from app.models.news import NewsArticle

@pytest.mark.asyncio
async def test_news_ingestion(session):
    # Ensure we are in test mode
    assert currents_service.mode == "TEST"
    
    # Fetch news
    news_data = await currents_service.fetch_latest_news()
    assert len(news_data) > 0
    assert news_data[0]["title"] == "AI Breakthrough in Healthcare Diagnostics"
    
    # Ingest
    count = await currents_service.ingest_articles(session, news_data)
    assert count > 0
    
    # Verify DB
    from sqlalchemy.future import select
    result = await session.execute(select(NewsArticle))
    articles = result.scalars().all()
    assert len(articles) >= count

import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class NewsSummary(Base):
    __tablename__ = "news_summaries"
    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"))
    short_summary: Mapped[str] = mapped_column(Text)
    detailed_summary: Mapped[list] = mapped_column(JSONB)  # list[str]
    sentiment: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    bias_score: Mapped[float | None] = mapped_column(nullable=True)
    bias_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(String(50))
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

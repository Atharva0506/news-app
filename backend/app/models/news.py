from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, Table, Column, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY
import uuid

from app.db.base import Base

class NewsCategory(Base):
    __tablename__ = "news_categories"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    
    articles: Mapped[List["NewsArticle"]] = relationship(back_populates="category")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Full content if available
    url: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    image: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("news_categories.id"), nullable=True)
    category: Mapped[Optional["NewsCategory"]] = relationship(back_populates="articles")
    
    # AI Processed fields
    sentiment: Mapped[Optional[str]] = mapped_column(String, nullable=True) # positive, negative, neutral
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    summary_short: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bias_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bias_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    favorite_categories: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])
    favorite_keywords: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])
    summary_style: Mapped[str] = mapped_column(String, default="short", server_default="short") # short, detailed, bullet
    
    user: Mapped["User"] = relationship(back_populates="preferences")




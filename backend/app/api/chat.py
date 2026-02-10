from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.api import deps
from app.models.user import User
from app.models.chat import SavedChat
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

router = APIRouter()

class SavedChatBase(BaseModel):
    title: str
    messages: List[dict] # List of {role: str, content: str}

class SavedChatCreate(SavedChatBase):
    pass

class SavedChatOut(SavedChatBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[SavedChatOut])
async def list_saved_chats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_premium_user),
    skip: int = 0,
    limit: int = 50
) -> Any:
    """
    List saved chats (Premium Only).
    """
    result = await db.execute(
        select(SavedChat)
        .where(SavedChat.user_id == current_user.id)
        .order_by(desc(SavedChat.updated_at))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=SavedChatOut)
async def create_saved_chat(
    db: AsyncSession = Depends(deps.get_db),
    chat_in: SavedChatCreate = Body(...),
    current_user: User = Depends(deps.get_current_premium_user)
) -> Any:
    """
    Save a chat session (Premium Only).
    """
    saved_chat = SavedChat(
        user_id=current_user.id,
        title=chat_in.title,
        messages=chat_in.messages
    )
    db.add(saved_chat)
    await db.commit()
    await db.refresh(saved_chat)
    return saved_chat

@router.delete("/{chat_id}", status_code=204)
async def delete_saved_chat(
    chat_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_premium_user)
) -> None:
    """
    Delete a saved chat (Premium Only).
    """
    result = await db.execute(select(SavedChat).where(SavedChat.id == chat_id, SavedChat.user_id == current_user.id))
    saved_chat = result.scalars().first()
    
    if not saved_chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    await db.delete(saved_chat)
    await db.commit()
    return None

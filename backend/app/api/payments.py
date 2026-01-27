from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core.solana import solana_service
from app.models.user import User
from app.models.payment import PaymentTransaction, Subscription, TransactionStatus
from app.schemas.payment import PaymentIntentResponse, PaymentIntentCreate, PaymentVerify, PaymentTransaction as TransactionSchema

router = APIRouter()

@router.post("/create", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payload: PaymentIntentCreate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Generate a payment intent (wallet address to send to)
    """
    intent = await solana_service.generate_payment_intent(current_user.id, payload.amount)
    return intent

@router.post("/verify", response_model=TransactionSchema)
async def verify_payment(
    payload: PaymentVerify,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Verify a Solana transaction signature
    """
    # Check if transaction already processed
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.transaction_signature == payload.transaction_signature))
    existing_tx = result.scalars().first()
    if existing_tx:
        raise HTTPException(status_code=400, detail="Transaction already processed")
    
    # Verify with Solana Service
    verification = await solana_service.verify_transaction(payload.transaction_signature, payload.amount)
    
    if not verification["success"]:
        raise HTTPException(status_code=400, detail=verification["message"])
    
    # Record Transaction
    tx = PaymentTransaction(
        user_id=current_user.id,
        amount=payload.amount,
        transaction_signature=payload.transaction_signature,
        status=TransactionStatus.COMPLETED
    )
    db.add(tx)
    await db.flush() # Get ID
    
    # Create Subscription
    # Default 30 days
    expiry = datetime.utcnow() + timedelta(days=30)
    
    # Check if existing active subscription, extend it
    # For now, just create new active one
    subscription = Subscription(
        user_id=current_user.id,
        end_date=expiry,
        is_active=True,
        transaction_id=tx.id
    )
    db.add(subscription)
    
    # Update User Premium Status
    current_user.is_premium = True
    current_user.premium_expiry = expiry
    db.add(current_user)
    
    await db.commit()
    await db.refresh(tx)
    
    return tx

@router.get("/status", response_model=TransactionSchema)
async def check_transaction_status(
    signature: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Check status of a transaction
    """
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.transaction_signature == signature))
    tx = result.scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check ownership
    if tx.user_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    return tx

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

from app.core.config import settings

@router.get("/config")
async def get_payment_config() -> Any:
    """
    Get payment configuration (Price, Network)
    """
    return {
        "pro_plan_price": settings.PRO_PLAN_PRICE_SOL,
        "solana_network": settings.SOLANA_NETWORK
    }

@router.post("/create", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payload: PaymentIntentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Generate a payment intent and record it as PENDING
    """
    try:
        intent = await solana_service.generate_payment_intent(current_user.id, payload.amount)
        
        # Create PENDING transaction record
        tx = PaymentTransaction(
            user_id=current_user.id,
            amount=payload.amount,
            status=TransactionStatus.PENDING,
            transaction_signature=None, # Not signed yet
            is_test=(intent["mode"] == "TEST"),
            plan=payload.plan
        )
        db.add(tx)
        await db.commit()
        await db.refresh(tx)
        
        return PaymentIntentResponse(
            payment_id=tx.id,
            address=intent["address"],
            reference=intent["reference"],
            mode=intent["mode"]
        )
    except Exception as e:
        print(f"Error creating payment intent: {e}")
        # Return a clean error to the frontend
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment initialization failed: {str(e)}"
        )

@router.post("/verify", response_model=TransactionSchema)
async def verify_payment(
    payload: PaymentVerify,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Verify a Solana transaction signature and complete payment
    """
    # Find the pending transaction
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.id == payload.payment_id))
    tx = result.scalars().first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
        
    if tx.status == TransactionStatus.COMPLETED:
        return tx # Already verified
        
    if tx.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify with Solana Service
    verification = await solana_service.verify_transaction(payload.transaction_signature, payload.amount)
    
    if not verification["success"]:
        # Log failure reason if possible? 
        # For now, just raise error, but frontend might try again.
        # If it's a hard failure, we could mark as FAILED.
        raise HTTPException(status_code=400, detail=verification["message"])
    
    # Update Transaction
    tx.transaction_signature = payload.transaction_signature
    tx.sender_address = payload.sender_address
    tx.status = TransactionStatus.COMPLETED
    
    db.add(tx)
    
    # Create Subscription
    expiry = datetime.utcnow() + timedelta(days=30)
    
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

from app.schemas.payment import PaymentCancel

@router.post("/cancel", response_model=TransactionSchema)
async def cancel_payment(
    payload: PaymentCancel,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Mark a payment intent as CANCELLED (e.g. user rejected wallet popup)
    """
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.id == payload.payment_id))
    tx = result.scalars().first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
        
    if tx.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if tx.status == TransactionStatus.COMPLETED:
         raise HTTPException(status_code=400, detail="Cannot cancel completed transaction")
         
    tx.status = TransactionStatus.CANCELLED
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    
    return tx

@router.get("/status", response_model=TransactionSchema)
async def check_transaction_status(
    signature: str = None,
    payment_id: str = None, # Can check by ID too
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Check status of a transaction
    """
    if payment_id:
        result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.id == payment_id))
    elif signature:
        result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.transaction_signature == signature))
    else:
        raise HTTPException(status_code=400, detail="Provide signature or payment_id")
        
    tx = result.scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check ownership
    if tx.user_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    return tx

@router.get("/history", response_model=list[TransactionSchema])
async def get_payment_history(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get payment history for the current user
    """
    result = await db.execute(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == current_user.id)
        .order_by(PaymentTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transactions = result.scalars().all()
    return transactions

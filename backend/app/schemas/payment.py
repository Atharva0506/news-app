from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.payment import TransactionStatus

class PaymentIntentCreate(BaseModel):
    amount: float = 0.5 # Default premium cost
    plan: str = "pro"

class PaymentIntentResponse(BaseModel):
    payment_id: UUID
    address: str
    reference: str
    mode: str

class PaymentVerify(BaseModel):
    payment_id: UUID
    transaction_signature: str
    amount: float
    sender_address: Optional[str] = None

class PaymentCancel(BaseModel):
    payment_id: UUID

class PaymentTransaction(BaseModel):
    id: UUID
    amount: float
    currency: str
    transaction_signature: Optional[str] = None
    sender_address: Optional[str] = None
    status: TransactionStatus
    plan: Optional[str] = "pro"
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

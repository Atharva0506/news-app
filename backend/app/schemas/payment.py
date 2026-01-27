from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.payment import TransactionStatus

class PaymentIntentCreate(BaseModel):
    amount: float = 0.5 # Default premium cost

class PaymentIntentResponse(BaseModel):
    address: str
    reference: str
    mode: str

class PaymentVerify(BaseModel):
    transaction_signature: str
    amount: float

class PaymentTransaction(BaseModel):
    id: UUID
    amount: float
    currency: str
    transaction_signature: str
    status: TransactionStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

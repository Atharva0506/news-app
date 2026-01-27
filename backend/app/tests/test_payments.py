import pytest
from app.core.solana import solana_service

@pytest.mark.asyncio
async def test_payment_intent_generation():
    # Force TEST mode
    current_mode = solana_service.mode
    solana_service.mode = "TEST"
    
    import uuid
    uid = uuid.uuid4()
    intent = await solana_service.generate_payment_intent(uid, 0.5)
    
    assert intent["mode"] == "TEST"
    assert intent["reference"].startswith("TEST-")
    
    # Verify
    verify_result = await solana_service.verify_transaction(intent["reference"], 0.5)
    assert verify_result["success"] is True
    
    # Restore
    solana_service.mode = current_mode

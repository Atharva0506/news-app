import hashlib
import uuid
from typing import Optional, Dict
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.signature import Signature

from app.core.config import settings

class SolanaService:
    def __init__(self):
        self.mode = settings.SOLANA_MODE.upper()
        self.rpc_client = AsyncClient(settings.SOLANA_RPC_URL)
        self.merchant_wallet = settings.SOLANA_MERCHANT_WALLET

    async def verify_transaction(self, signature: str, amount_sol: float) -> Dict[str, bool]:
        """
        Verify if a transaction is valid and transferred the correct amount to merchant wallet.
        Returns: {"success": bool, "message": str}
        """
        if self.mode == "TEST":
            return self._verify_test_transaction(signature, amount_sol)
        else:
            return await self._verify_real_transaction(signature, amount_sol)

    def _verify_test_transaction(self, signature: str, amount_sol: float) -> Dict[str, bool]:
        """
        In Test Mode, the signature is expected to be a hash of 'TEST-{user_id}-{amount}'.
        We simulate verification by checking the format.
        """
        if not signature.startswith("TEST-"):
             return {"success": False, "message": "Invalid test signature format"}
        
        # In a real test scenario, we might verify the hash matches expected params
        # For now, we assume if it starts with TEST- it is valid for simulation
        # In production test mode, you'd store the expected hash in DB and compare.
        return {"success": True, "message": "Test transaction verified"}

    async def _verify_real_transaction(self, signature: str, amount_sol: float) -> Dict[str, bool]:
        try:
            # Convert string signature to Signature object
            sig = Signature.from_string(signature)
            
            # Fetch transaction details
            # We use get_transaction with max_supported_transaction_version=0
            response = await self.rpc_client.get_transaction(sig, max_supported_transaction_version=0)
            
            if not response.value:
                return {"success": False, "message": "Transaction not found on chain"}
            
            tx_info = response.value
            
            # Basic checks: error check
            if tx_info.meta.err:
                return {"success": False, "message": "Transaction failed on chain"}
                
            # Verify recipient and amount
            # This logic needs to parse the instruction data or balance changes.
            # Simpler approach: check pre/post balances of the merchant wallet.
            
            if not self.merchant_wallet:
                return {"success": False, "message": "Merchant wallet not configured"}

            merchant_pubkey = Pubkey.from_string(self.merchant_wallet)
            account_keys = tx_info.transaction.message.account_keys
            
            # Find index of merchant wallet
            try:
                merchant_index = account_keys.index(merchant_pubkey)
            except ValueError:
                return {"success": False, "message": "Merchant wallet not involved in transaction"}

            pre_balance = tx_info.meta.pre_balances[merchant_index]
            post_balance = tx_info.meta.post_balances[merchant_index]
            
            received_lamports = post_balance - pre_balance
            received_sol = received_lamports / 1_000_000_000
            
            # Allow small float difference
            if received_sol >= amount_sol - 0.0001:
                return {"success": True, "message": "Transaction verified"}
            else:
                return {"success": False, "message": f"Insufficient amount. Received {received_sol} SOL, expected {amount_sol} SOL"}
                
        except Exception as e:
            return {"success": False, "message": f"Verification error: {str(e)}"}

    async def generate_payment_intent(self, user_id: uuid.UUID, amount_sol: float) -> Dict[str, str]:
        if self.mode == "TEST":
            # Generate a fake signature that the frontend can send back
            # In test mode, frontend mimics the wallet flow and sends this signature back
            fake_sig = f"TEST-{user_id}-{amount_sol}-{uuid.uuid4().hex[:8]}"
            return {
                "address": "TEST_WALLET_ADDRESS",
                "reference": fake_sig,  # In test mode, we use this as the signature to "approve"
                "mode": "TEST"
            }
        else:
             return {
                "address": self.merchant_wallet,
                "reference": str(user_id), # Can be used as memo or reference in real tx
                "mode": "REAL"
            }

solana_service = SolanaService()

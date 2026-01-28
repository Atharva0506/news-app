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
                # Retry once after a short delay might be good, but for now just fail
                return {"success": False, "message": "Transaction not found on chain"}
            
            tx_info = response.value
            
            # Basic checks: error check
            if tx_info.meta.err:
                return {"success": False, "message": "Transaction failed on chain"}
                
            # Verify recipient and amount
            if not self.merchant_wallet:
                return {"success": False, "message": "Merchant wallet not configured"}

            merchant_pubkey = Pubkey.from_string(self.merchant_wallet)
            
            # Check pre/post balances to confirm transfer to merchant
            # We need to find the account index for the merchant wallet
            account_keys = tx_info.transaction.message.account_keys
            
            # In newer transaction versions, account_keys might be different (lookup tables etc), 
            # but for standard transfers it usually works directly. 
            # However, solders MessageV0 vs MessageLegacy differences exist.
            # A more robust way using meta.post_balances/pre_balances mapping:

            # We iterate through account keys to find our merchant wallet
            merchant_index = -1
            for idx, key in enumerate(account_keys):
                if key == merchant_pubkey:
                    merchant_index = idx
                    break
            
            if merchant_index == -1:
                 return {"success": False, "message": "Merchant wallet not involved in transaction"}

            pre_balance = tx_info.meta.pre_balances[merchant_index]
            post_balance = tx_info.meta.post_balances[merchant_index]
            
            received_lamports = post_balance - pre_balance
            received_sol = received_lamports / 1_000_000_000
            
            # Check if received amount is sufficient (allow small dust difference for float precision if needed, though lamports are exact)
            # floating point comparison
            if received_sol >= amount_sol - 0.000005: 
                return {"success": True, "message": "Transaction verified"}
            else:
                return {"success": False, "message": f"Insufficient amount. Received {received_sol} SOL, expected {amount_sol} SOL"}
                
        except Exception as e:
            print(f"Solana Verification Error: {e}")
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

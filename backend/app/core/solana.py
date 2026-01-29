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
            
            # Fetch transaction details with retry
            import asyncio
            import json
            max_retries = 10
            response = None
            
            for attempt in range(max_retries):
                try:
                     response = await self.rpc_client.get_transaction(sig, max_supported_transaction_version=0)
                     if response.value:
                         break
                except Exception as e:
                    print(f"Retry {attempt} failed: {e}")
                    pass
                
                if attempt < max_retries - 1:
                    await asyncio.sleep(2) # Wait 2 seconds before retry
            
            if not response or not response.value:
                return {"success": False, "message": "Transaction not found on chain after retries"}
            
            tx_info = response.value
            
            # DEBUG: Print structure to logs
            try:
                print(f"DEBUG TX INFO TYPE: {type(tx_info)}")
                print(f"DEBUG TX INFO DIR: {dir(tx_info)}")
            except:
                pass

            # Robustly access meta and transaction
            # In some solders versions, it might be via .meta or ["meta"] if it's a dict (unlikely for object)
            # Or json parsing
            
            meta = None
            transaction = None
            
            if hasattr(tx_info, "meta"):
                meta = tx_info.meta
            elif hasattr(tx_info, "result") and hasattr(tx_info.result, "meta"): # Sometimes wrapped
                meta = tx_info.result.meta
                
            if hasattr(tx_info, "transaction"):
                transaction = tx_info.transaction
            
            # Convert to JSON/Dict if direct access fails or for easier parsing
            if meta is None:
                # Try converting to json string then dict as fallback
                try:
                    tx_json = json.loads(tx_info.to_json())
                    meta = tx_json.get("meta")
                    transaction = tx_json.get("transaction")
                except:
                    pass

            if not meta:
                return {"success": False, "message": "Transaction metadata missing"}
            
            # Check for error
            # If meta is a dict now (from json)
            if isinstance(meta, dict):
                if meta.get("err"):
                     return {"success": False, "message": "Transaction failed on chain"}
                pre_balances = meta.get("preBalances", [])
                post_balances = meta.get("postBalances", [])
            else:
                # Object access
                if meta.err:
                    return {"success": False, "message": "Transaction failed on chain"}
                pre_balances = meta.pre_balances
                post_balances = meta.post_balances

            # Verify recipient and amount
            if not self.merchant_wallet:
                return {"success": False, "message": "Merchant wallet not configured"}

            merchant_pubkey_str = self.merchant_wallet
            
            # Find account index
            # If transaction is dict
            account_keys = []
            if isinstance(transaction, dict):
                 message = transaction.get("message", {})
                 account_keys = message.get("accountKeys", [])
                 # Account keys in JSON might be strings or objects
                 account_keys = [k if isinstance(k, str) else k.get("pubkey") for k in account_keys]
            else:
                 # Object access
                 # solders.message.Message or MessageV0
                 msg = transaction.message
                 account_keys = [str(k) for k in msg.account_keys]

            merchant_index = -1
            for idx, key in enumerate(account_keys):
                if key == merchant_pubkey_str:
                    merchant_index = idx
                    break
            
            if merchant_index == -1:
                 return {"success": False, "message": "Merchant wallet not involved in transaction"}

            if merchant_index >= len(pre_balances) or merchant_index >= len(post_balances):
                 return {"success": False, "message": "Balance information missing for merchant"}

            pre_balance = pre_balances[merchant_index]
            post_balance = post_balances[merchant_index]
            
            received_lamports = post_balance - pre_balance
            received_sol = received_lamports / 1_000_000_000
            
            if received_sol >= amount_sol - 0.000005: 
                return {"success": True, "message": "Transaction verified"}
            else:
                return {"success": False, "message": f"Insufficient amount. Received {received_sol} SOL, expected {amount_sol} SOL"}
                
        except Exception as e:
            print(f"Solana Verification Error: {e}")
            import traceback
            traceback.print_exc()
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

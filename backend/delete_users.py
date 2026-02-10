import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.payment import PaymentTransaction, Subscription, AIUsageLog
from app.models.news import UserPreference
from app.models.chat import SavedChat

async def delete_all_users():
    async with AsyncSessionLocal() as session:
        print("Deleting all users and related data...")
        
        # Disable foreign key checks temporarily if needed, or just delete in order?
        # Since we have cascade ondelete=CASCADE on most FKs in DB (hopefully), deleting users should start the chain.
        # But to be safe and thorough based on our recent auth.py changes:
        
        try:
            # Delete related data explicitly just in case
            await session.execute(text("DELETE FROM saved_chats"))
            await session.execute(text("DELETE FROM user_preferences"))
            await session.execute(text("DELETE FROM ai_usage_logs"))
            await session.execute(text("DELETE FROM subscriptions"))
            await session.execute(text("DELETE FROM payment_transactions"))
            
            # Delete users
            await session.execute(text("DELETE FROM users"))
            
            await session.commit()
            print("Successfully deleted all users and related data.")
        except Exception as e:
            print(f"Error deleting data: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(delete_all_users())

import asyncio
import sys
import os

# Add current directory to python path so 'app' module can be found
sys.path.append(os.getcwd())

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def fix():
    async with AsyncSessionLocal() as db:
        # Find users who are premium but still on trial plan_type
        result = await db.execute(
            select(User).where(User.is_premium == True, User.plan_type == "trial")
        )
        users = result.scalars().all()
        
        if not users:
            print("No users to fix — all premium users already have plan_type='pro'")
            return
            
        for u in users:
            print(f"Fixing: {u.email} — plan_type='trial' → 'pro'")
            u.plan_type = "pro"
            db.add(u)
        
        await db.commit()
        print(f"Fixed {len(users)} user(s)")

asyncio.run(fix())

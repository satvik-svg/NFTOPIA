import asyncio
from sqlalchemy import select, create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as s:
        r = await s.execute(text("SELECT agent_token_id, content_url, content_id FROM content_outputs"))
        for row in r.all():
            print(row)

asyncio.run(main())

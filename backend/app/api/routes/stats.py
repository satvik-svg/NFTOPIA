from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models.agent import AgentConfig
from app.models.content import ContentOutput
from app.models.trade import TradeLog

router = APIRouter()


@router.get("/platform")
async def platform_stats(db: AsyncSession = Depends(get_db_session)):
    agents = await db.execute(select(func.count(AgentConfig.id)))
    contents = await db.execute(select(func.count(ContentOutput.id)))
    trades = await db.execute(select(func.count(TradeLog.id)))

    return {
        "agents": agents.scalar() or 0,
        "contents": contents.scalar() or 0,
        "trades": trades.scalar() or 0,
    }

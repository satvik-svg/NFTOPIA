from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models.agent import AgentConfig
from app.models.memory import AgentMemory
from app.schemas.agent import AgentResponse, ForgeRequest, ForgeResponse
from app.services.agent_orchestrator import AgentOrchestrator

router = APIRouter()
orchestrator = AgentOrchestrator()


@router.post("/forge", response_model=ForgeResponse)
async def forge_agent(request: ForgeRequest, db: AsyncSession = Depends(get_db_session)):
    try:
        return await orchestrator.forge(request, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/forge/preview")
async def preview_forge(request: ForgeRequest):
    return await orchestrator.generate_dna_preview(request)


@router.get("/{token_id}", response_model=AgentResponse)
async def get_agent(token_id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(AgentConfig).where(AgentConfig.token_id == token_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/owner/{owner_address}")
async def get_agents_by_owner(owner_address: str, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(AgentConfig).where(AgentConfig.owner_address == owner_address.lower()))
    return result.scalars().all()


@router.get("/leaderboard/global")
async def get_leaderboard(limit: int = 50, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(AgentConfig).order_by(AgentConfig.reputation_score.desc()).limit(limit)
    )
    return result.scalars().all()


@router.get("/{token_id}/memory")
async def get_agent_memory(token_id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(AgentMemory).where(AgentMemory.token_id == token_id).order_by(AgentMemory.timestamp.desc()).limit(100)
    )
    return result.scalars().all()


@router.get("/{token_id}/evolution")
async def get_evolution_history(token_id: int, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(AgentMemory)
        .where(AgentMemory.token_id == token_id, AgentMemory.event_type == "evolution_triggered")
        .order_by(AgentMemory.timestamp.desc())
    )
    return result.scalars().all()

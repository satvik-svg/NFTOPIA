from sqlalchemy import select

from app.models.agent import AgentConfig
from app.models.base import async_session
from app.models.strategy import TradingStrategy
from app.services.evolution_engine import EvolutionEngine
from app.services.trading_engine import trading_engine
from app.tasks.async_runner import run_async
from app.tasks.celery_app import celery_app

evolution_engine = EvolutionEngine()


async def _execute_all() -> dict:
    async with async_session() as db:
        result = await db.execute(
            select(AgentConfig, TradingStrategy)
            .join(TradingStrategy, AgentConfig.token_id == TradingStrategy.token_id)
            .where(AgentConfig.agent_type == "trading")
            .order_by(TradingStrategy.token_id.asc())
        )
        rows = result.all()

        if not rows:
            return {"status": "ok", "executed": 0, "results": []}

        results = []
        for agent, strategy in rows:
            try:
                outcome = await trading_engine.execute_strategy(db, strategy, agent)
                await evolution_engine.check_evolution(db, agent.token_id)
                results.append(outcome)
            except Exception as exc:
                results.append(
                    {
                        "status": "error",
                        "tokenId": strategy.token_id,
                        "error": str(exc),
                    }
                )

        return {"status": "ok", "executed": len(results), "results": results}


async def _execute_single(token_id: int) -> dict:
    async with async_session() as db:
        result = await db.execute(
            select(AgentConfig, TradingStrategy)
            .join(TradingStrategy, AgentConfig.token_id == TradingStrategy.token_id)
            .where(TradingStrategy.token_id == token_id, AgentConfig.agent_type == "trading")
        )
        row = result.first()
        if not row:
            return {"status": "missing", "tokenId": token_id}

        agent, strategy = row
        outcome = await trading_engine.execute_strategy(db, strategy, agent)
        await evolution_engine.check_evolution(db, agent.token_id)
        return {"status": "ok", **outcome}


@celery_app.task
def execute_all_strategies():
    return run_async(_execute_all)


@celery_app.task
def execute_single_strategy(token_id: int):
    return run_async(lambda: _execute_single(token_id))

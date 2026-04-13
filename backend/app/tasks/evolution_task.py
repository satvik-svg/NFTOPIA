from app.models.base import async_session
from app.services.evolution_engine import EvolutionEngine
from app.tasks.async_runner import run_async
from app.tasks.celery_app import celery_app

engine = EvolutionEngine()


async def _check_all() -> dict:
    async with async_session() as db:
        return await engine.check_all_agents(db)


@celery_app.task
def check_all_agents():
    return run_async(_check_all)

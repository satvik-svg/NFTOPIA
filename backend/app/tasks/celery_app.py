from celery import Celery

from app.config import settings

celery_app = Celery(
    "agentforge",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.trading_cron",
        "app.tasks.evolution_task",
        "app.tasks.training_task",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "execute-trading-strategies": {
            "task": "app.tasks.trading_cron.execute_all_strategies",
            "schedule": 900.0,
        },
        "run-evolution-engine": {
            "task": "app.tasks.evolution_task.check_all_agents",
            "schedule": 3600.0,
        },
    },
)


# Ensure tasks are imported when Celery app initializes in worker/beat processes.
from app.tasks import evolution_task, trading_cron, training_task  # noqa: F401,E402

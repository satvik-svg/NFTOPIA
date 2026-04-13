import uuid

from sqlalchemy import select

from app.ml.training.rl_trainer import trainer
from app.models.agent import AgentConfig
from app.models.base import async_session
from app.models.memory import AgentMemory
from app.models.strategy import TradingStrategy
from app.tasks.async_runner import run_async
from app.tasks.celery_app import celery_app


async def _train_custom_bot(config: dict) -> dict:
    owner = (config.get("owner_address") or "").lower()
    token_id = config.get("agent_token_id")
    training_id = str(config.get("training_id") or uuid.uuid4().hex[:10])

    async with async_session() as db:
        if token_id is None:
            res = await db.execute(
                select(AgentConfig)
                .where(AgentConfig.owner_address == owner, AgentConfig.agent_type == "trading")
                .order_by(AgentConfig.level.desc())
            )
            candidate = res.scalars().first()
            token_id = candidate.token_id if candidate else None

        if token_id is None:
            return {
                "status": "failed",
                "detail": "No trading agent found for this owner",
                "owner": owner,
            }

        strategy_res = await db.execute(select(TradingStrategy).where(TradingStrategy.token_id == token_id))
        strategy = strategy_res.scalar_one_or_none()
        if not strategy:
            strategy = TradingStrategy(
                token_id=token_id,
                strategy_type=config.get("strategy_type", "momentum"),
                assets=config.get("assets", ["BTC"]),
                timeframe=config.get("timeframe", "4h"),
                risk_params=config.get("risk_params", {}),
                indicator_config={},
                decision_model="ml_model",
            )
            db.add(strategy)
        else:
            strategy.strategy_type = config.get("strategy_type", strategy.strategy_type)
            strategy.assets = config.get("assets", strategy.assets)
            strategy.timeframe = config.get("timeframe", strategy.timeframe)
            strategy.risk_params = config.get("risk_params", strategy.risk_params)
            strategy.decision_model = "ml_model"

        training_config = {
            "assets": strategy.assets,
            "goal": config.get("goal", "maximize_returns"),
            "risk_tolerance": config.get("risk_tolerance", "medium"),
            "training_period": config.get("training_period", "6m"),
            "timesteps": config.get("timesteps"),
            "initial_balance": config.get("initial_balance", 10000),
        }

        price_data = await trainer.fetch_training_data(
            strategy.assets,
            period=str(training_config.get("training_period") or "6m"),
        )

        model_path, metrics = trainer.train(training_id=training_id, config=training_config, price_data=price_data)
        strategy.model_path = model_path

        db.add(
            AgentMemory(
                token_id=token_id,
                event_type="model_trained",
                event_data={
                    "strategyType": strategy.strategy_type,
                    "assets": strategy.assets,
                    "modelPath": strategy.model_path,
                    "metrics": metrics,
                },
            )
        )

        await db.commit()

        return {
            "status": "completed",
            "detail": "training finished",
            "trainingId": training_id,
            "tokenId": token_id,
            "strategy": strategy.strategy_type,
            "assets": strategy.assets,
            "modelPath": strategy.model_path,
            "decisionModel": strategy.decision_model,
            "metrics": metrics,
        }


@celery_app.task(bind=True)
def train_custom_bot(self, config: dict):
    payload = dict(config or {})
    payload["training_id"] = self.request.id
    return run_async(lambda: _train_custom_bot(payload))

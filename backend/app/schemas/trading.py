from pydantic import BaseModel


class AllocationRequest(BaseModel):
    agent_token_id: int
    amount_forge: float
    allocator_address: str | None = None


class CustomBotConfig(BaseModel):
    owner_address: str
    agent_token_id: int | None = None
    strategy_type: str
    assets: list[str]
    timeframe: str = "4h"
    risk_params: dict = {}
    goal: str = "maximize_returns"
    risk_tolerance: str = "medium"
    training_period: str = "6m"
    timesteps: int | None = None
    initial_balance: float = 10000.0

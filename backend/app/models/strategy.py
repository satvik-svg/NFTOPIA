from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class TradingStrategy(Base):
    __tablename__ = "trading_strategies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)

    strategy_type: Mapped[str] = mapped_column(String(50), nullable=False)
    assets: Mapped[list] = mapped_column(JSON, nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), default="4h")
    risk_params: Mapped[dict] = mapped_column(JSON, default=dict)
    indicator_config: Mapped[dict] = mapped_column(JSON, default=dict)

    decision_model: Mapped[str] = mapped_column(String(20), default="rule_based")
    model_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    win_rate: Mapped[float] = mapped_column(Float, default=0)
    total_pnl: Mapped[float] = mapped_column(Float, default=0)
    sharpe_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[float | None] = mapped_column(Float, nullable=True)

    is_marketplace_listed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

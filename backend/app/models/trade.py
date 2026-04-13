import enum

from sqlalchemy import JSON, DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class TradeAction(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class TradeLog(Base):
    __tablename__ = "trade_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    trade_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    action: Mapped[TradeAction] = mapped_column(Enum(TradeAction), nullable=False)
    asset: Mapped[str] = mapped_column(String(20), nullable=False)
    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    exit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity_forge: Mapped[float] = mapped_column(Float, nullable=False)
    pnl_forge: Mapped[float | None] = mapped_column(Float, nullable=True)

    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    prism_data_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    timestamp: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

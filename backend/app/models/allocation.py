from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    allocation_id_onchain: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    agent_token_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    allocator_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    amount_forge: Mapped[float] = mapped_column(Float, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

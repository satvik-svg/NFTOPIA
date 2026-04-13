from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class ContentOutput(Base):
    __tablename__ = "content_outputs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    agent_token_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    creator_address: Mapped[str] = mapped_column(String(42), nullable=False)

    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    content_url: Mapped[str] = mapped_column(Text, nullable=False)
    content_nft_token_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    price_forge: Mapped[float] = mapped_column(Float, default=0)
    popularity_score: Mapped[float] = mapped_column(Float, default=0)
    views: Mapped[int] = mapped_column(Integer, default=0)
    purchases: Mapped[int] = mapped_column(Integer, default=0)
    tips_received: Mapped[float] = mapped_column(Float, default=0)

    metadata_uri: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

import enum

from sqlalchemy import JSON, DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class AgentType(str, enum.Enum):
    CONTENT = "content"
    TRADING = "trading"


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    agent_type: Mapped[AgentType] = mapped_column(Enum(AgentType), nullable=False)
    specialization: Mapped[str] = mapped_column(String(100), nullable=False)

    personality_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    style_parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    system_prompt_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    skill_scores: Mapped[list] = mapped_column(JSON, default=lambda: [50, 50, 50, 50, 50])
    level: Mapped[int] = mapped_column(Integer, default=1)
    total_earnings: Mapped[float] = mapped_column(Float, default=0.0)
    jobs_completed: Mapped[int] = mapped_column(Integer, default=0)
    reputation_score: Mapped[int] = mapped_column(Integer, default=50)
    traits: Mapped[list] = mapped_column(JSON, default=list)

    owner_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    tba_wallet_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    metadata_uri: Mapped[str | None] = mapped_column(String(500), nullable=True)

    gemini_model: Mapped[str] = mapped_column(String(50), default="gemini-2.0-flash")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

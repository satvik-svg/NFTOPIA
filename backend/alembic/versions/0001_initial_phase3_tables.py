"""Initial Phase 3 tables

Revision ID: 0001_initial_phase3
Revises:
Create Date: 2026-04-10 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial_phase3"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


agent_type_enum = sa.Enum("CONTENT", "TRADING", name="agenttype")
trade_action_enum = sa.Enum("BUY", "SELL", "HOLD", name="tradeaction")


def upgrade() -> None:
    op.create_table(
        "agent_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token_id", sa.Integer(), nullable=False),
        sa.Column("agent_type", agent_type_enum, nullable=False),
        sa.Column("specialization", sa.String(length=100), nullable=False),
        sa.Column("personality_prompt", sa.Text(), nullable=False),
        sa.Column("style_parameters", sa.JSON(), nullable=False),
        sa.Column("system_prompt_template", sa.Text(), nullable=True),
        sa.Column("skill_scores", sa.JSON(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("total_earnings", sa.Float(), nullable=False),
        sa.Column("jobs_completed", sa.Integer(), nullable=False),
        sa.Column("reputation_score", sa.Integer(), nullable=False),
        sa.Column("traits", sa.JSON(), nullable=False),
        sa.Column("owner_address", sa.String(length=42), nullable=False),
        sa.Column("tba_wallet_address", sa.String(length=42), nullable=True),
        sa.Column("metadata_uri", sa.String(length=500), nullable=True),
        sa.Column("gemini_model", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_id"),
    )
    op.create_index(op.f("ix_agent_configs_owner_address"), "agent_configs", ["owner_address"], unique=False)
    op.create_index(op.f("ix_agent_configs_token_id"), "agent_configs", ["token_id"], unique=True)

    op.create_table(
        "allocations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("allocation_id_onchain", sa.Integer(), nullable=True),
        sa.Column("agent_token_id", sa.Integer(), nullable=False),
        sa.Column("allocator_address", sa.String(length=42), nullable=False),
        sa.Column("amount_forge", sa.Float(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_allocations_agent_token_id"), "allocations", ["agent_token_id"], unique=False)
    op.create_index(op.f("ix_allocations_allocation_id_onchain"), "allocations", ["allocation_id_onchain"], unique=False)
    op.create_index(op.f("ix_allocations_allocator_address"), "allocations", ["allocator_address"], unique=False)

    op.create_table(
        "content_outputs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("content_id", sa.String(length=50), nullable=False),
        sa.Column("agent_token_id", sa.Integer(), nullable=False),
        sa.Column("creator_address", sa.String(length=42), nullable=False),
        sa.Column("content_type", sa.String(length=20), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("content_url", sa.String(length=500), nullable=False),
        sa.Column("content_nft_token_id", sa.Integer(), nullable=True),
        sa.Column("price_forge", sa.Float(), nullable=False),
        sa.Column("popularity_score", sa.Float(), nullable=False),
        sa.Column("views", sa.Integer(), nullable=False),
        sa.Column("purchases", sa.Integer(), nullable=False),
        sa.Column("tips_received", sa.Float(), nullable=False),
        sa.Column("metadata_uri", sa.String(length=500), nullable=True),
        sa.Column("tx_hash", sa.String(length=66), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("content_id"),
    )
    op.create_index(op.f("ix_content_outputs_agent_token_id"), "content_outputs", ["agent_token_id"], unique=False)

    op.create_table(
        "agent_memory",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("event_data", sa.JSON(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agent_memory_token_id"), "agent_memory", ["token_id"], unique=False)

    op.create_table(
        "trading_strategies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token_id", sa.Integer(), nullable=False),
        sa.Column("strategy_type", sa.String(length=50), nullable=False),
        sa.Column("assets", sa.JSON(), nullable=False),
        sa.Column("timeframe", sa.String(length=10), nullable=False),
        sa.Column("risk_params", sa.JSON(), nullable=False),
        sa.Column("indicator_config", sa.JSON(), nullable=False),
        sa.Column("decision_model", sa.String(length=20), nullable=False),
        sa.Column("model_path", sa.String(length=500), nullable=True),
        sa.Column("total_trades", sa.Integer(), nullable=False),
        sa.Column("win_rate", sa.Float(), nullable=False),
        sa.Column("total_pnl", sa.Float(), nullable=False),
        sa.Column("sharpe_ratio", sa.Float(), nullable=True),
        sa.Column("max_drawdown", sa.Float(), nullable=True),
        sa.Column("is_marketplace_listed", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_id"),
    )
    op.create_index(op.f("ix_trading_strategies_token_id"), "trading_strategies", ["token_id"], unique=True)

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("wallet_address", sa.String(length=42), nullable=False),
        sa.Column("tier", sa.String(length=20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("content_credits_remaining", sa.Integer(), nullable=False),
        sa.Column("renews_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriptions_wallet_address"), "subscriptions", ["wallet_address"], unique=False)

    op.create_table(
        "trade_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token_id", sa.Integer(), nullable=False),
        sa.Column("trade_id", sa.String(length=50), nullable=False),
        sa.Column("action", trade_action_enum, nullable=False),
        sa.Column("asset", sa.String(length=20), nullable=False),
        sa.Column("entry_price", sa.Float(), nullable=False),
        sa.Column("exit_price", sa.Float(), nullable=True),
        sa.Column("quantity_forge", sa.Float(), nullable=False),
        sa.Column("pnl_forge", sa.Float(), nullable=True),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("prism_data_snapshot", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trade_id"),
    )
    op.create_index(op.f("ix_trade_logs_token_id"), "trade_logs", ["token_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_trade_logs_token_id"), table_name="trade_logs")
    op.drop_table("trade_logs")

    op.drop_index(op.f("ix_subscriptions_wallet_address"), table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_index(op.f("ix_trading_strategies_token_id"), table_name="trading_strategies")
    op.drop_table("trading_strategies")

    op.drop_index(op.f("ix_agent_memory_token_id"), table_name="agent_memory")
    op.drop_table("agent_memory")

    op.drop_index(op.f("ix_content_outputs_agent_token_id"), table_name="content_outputs")
    op.drop_table("content_outputs")

    op.drop_index(op.f("ix_allocations_allocator_address"), table_name="allocations")
    op.drop_index(op.f("ix_allocations_allocation_id_onchain"), table_name="allocations")
    op.drop_index(op.f("ix_allocations_agent_token_id"), table_name="allocations")
    op.drop_table("allocations")

    op.drop_index(op.f("ix_agent_configs_token_id"), table_name="agent_configs")
    op.drop_index(op.f("ix_agent_configs_owner_address"), table_name="agent_configs")
    op.drop_table("agent_configs")

    trade_action_enum.drop(op.get_bind(), checkfirst=True)
    agent_type_enum.drop(op.get_bind(), checkfirst=True)
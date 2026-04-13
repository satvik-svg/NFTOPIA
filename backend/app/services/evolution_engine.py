import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentConfig
from app.models.content import ContentOutput
from app.models.memory import AgentMemory
from app.models.trade import TradeLog
from app.services.blockchain_service import blockchain

logger = logging.getLogger(__name__)


class EvolutionEngine:
    EVOLUTION_THRESHOLD = 5

    async def check_evolution(self, db: AsyncSession, token_id: int) -> dict:
        result = await db.execute(select(AgentConfig).where(AgentConfig.token_id == token_id))
        agent = result.scalar_one_or_none()
        if not agent:
            return {"tokenId": token_id, "status": "missing"}

        if agent.jobs_completed <= 0 or (agent.jobs_completed % self.EVOLUTION_THRESHOLD != 0):
            reputation = await self._reputation_score(db, token_id, agent)
            agent.reputation_score = reputation
            await db.commit()
            return {
                "tokenId": token_id,
                "status": "skipped",
                "reason": "threshold_not_met",
                "jobsCompleted": agent.jobs_completed,
                "reputation": reputation,
            }

        logger.info("Evolution check for Agent #%s (jobs=%s)", token_id, agent.jobs_completed)
        if agent.agent_type.value == "content":
            return await self._evolve_content_agent(db, agent)
        return await self._evolve_trading_agent(db, agent)

    async def evaluate_agent(self, db: AsyncSession, token_id: int) -> dict:
        """Compatibility alias retained for existing callers."""
        return await self.check_evolution(db, token_id)

    async def check_all_agents(self, db: AsyncSession) -> dict:
        result = await db.execute(select(AgentConfig.token_id))
        token_ids = [row[0] for row in result.all()]
        outcomes = []
        for token_id in token_ids:
            outcomes.append(await self.check_evolution(db, token_id))
        return {"checked": len(token_ids), "results": outcomes}

    async def _evolve_content_agent(self, db: AsyncSession, agent: AgentConfig) -> dict:
        result = await db.execute(
            select(ContentOutput)
            .where(ContentOutput.agent_token_id == agent.token_id)
            .order_by(ContentOutput.created_at.desc())
            .limit(20)
        )
        recent_content = result.scalars().all()

        avg_popularity = (
            sum(float(content.popularity_score or 0.0) for content in recent_content) / len(recent_content)
            if recent_content
            else 0.0
        )
        total_purchases = int(sum(int(content.purchases or 0) for content in recent_content))

        current_traits = list(agent.traits or [])
        new_trait = None
        if avg_popularity > 70 and "viral_instinct" not in current_traits:
            new_trait = "viral_instinct"
        elif total_purchases > 50 and "crowd_favorite" not in current_traits:
            new_trait = "crowd_favorite"
        elif agent.jobs_completed > 50 and "prolific_creator" not in current_traits:
            new_trait = "prolific_creator"

        new_level = self._target_level(agent)
        return await self._apply_evolution(db, agent, new_level, new_trait)

    async def _evolve_trading_agent(self, db: AsyncSession, agent: AgentConfig) -> dict:
        result = await db.execute(select(TradeLog).where(TradeLog.token_id == agent.token_id))
        trades = result.scalars().all()

        total_trades = len(trades)
        closed_trades = [trade for trade in trades if trade.pnl_forge is not None]
        win_rate_pct = (
            (sum(1 for trade in closed_trades if float(trade.pnl_forge or 0.0) > 0) / len(closed_trades)) * 100.0
            if closed_trades
            else 0.0
        )

        current_traits = list(agent.traits or [])
        new_trait = None
        if total_trades > 100 and win_rate_pct > 55 and "battle_tested" not in current_traits:
            new_trait = "battle_tested"
        elif win_rate_pct > 65 and "sharp_shooter" not in current_traits:
            new_trait = "sharp_shooter"

        new_level = self._target_level(agent)
        return await self._apply_evolution(db, agent, new_level, new_trait)

    async def _apply_evolution(
        self,
        db: AsyncSession,
        agent: AgentConfig,
        new_level: int,
        new_trait: str | None,
    ) -> dict:
        level_before = int(agent.level)
        evolved = False

        if new_level > agent.level or new_trait:
            evolved = True
            agent.level = max(int(agent.level), int(new_level))

            if new_trait:
                traits = list(agent.traits or [])
                if new_trait not in traits:
                    traits.append(new_trait)
                    agent.traits = traits

            skills = list(agent.skill_scores or [50, 50, 50, 50, 50])
            while len(skills) < 5:
                skills.append(50)
            if new_trait in {"viral_instinct", "crowd_favorite", "prolific_creator"}:
                skills[0] = min(100, int(skills[0]) + 5)
            elif new_trait in {"battle_tested", "sharp_shooter"}:
                skills[3] = min(100, int(skills[3]) + 5)
            agent.skill_scores = skills

        reputation = await self._reputation_score(db, agent.token_id, agent)
        agent.reputation_score = reputation

        db.add(
            AgentMemory(
                token_id=agent.token_id,
                event_type="evolution_checked",
                event_data={
                    "levelBefore": level_before,
                    "levelAfter": agent.level,
                    "reputation": reputation,
                    "evolved": evolved,
                },
            )
        )

        if evolved and new_trait:
            db.add(
                AgentMemory(
                    token_id=agent.token_id,
                    event_type="evolution_triggered",
                    event_data={
                        "newLevel": agent.level,
                        "newTrait": new_trait,
                    },
                )
            )

            if blockchain.account and blockchain.agent_nft:
                try:
                    blockchain.evolve_agent(
                        agent.token_id,
                        agent.level,
                        new_trait,
                        agent.metadata_uri or "ipfs://placeholder",
                    )
                except Exception as exc:
                    logger.error("On-chain evolution failed for token %s: %s", agent.token_id, exc)
                    db.add(
                        AgentMemory(
                            token_id=agent.token_id,
                            event_type="evolution_onchain_failed",
                            event_data={"reason": "onchain_sync_error"},
                        )
                    )

        await db.commit()

        return {
            "tokenId": agent.token_id,
            "status": "ok",
            "evolved": evolved,
            "level": agent.level,
            "newTrait": new_trait,
            "reputation": reputation,
        }

    def _target_level(self, agent: AgentConfig) -> int:
        return max(1, 1 + (int(agent.jobs_completed) // 10))

    async def _reputation_score(self, db: AsyncSession, token_id: int, agent: AgentConfig) -> int:
        from sqlalchemy import func

        wins = await db.execute(select(func.count(TradeLog.id)).where(TradeLog.token_id == token_id, TradeLog.pnl_forge > 0))
        losses = await db.execute(
            select(func.count(TradeLog.id)).where(TradeLog.token_id == token_id, TradeLog.pnl_forge < 0)
        )

        win_count = int(wins.scalar() or 0)
        loss_count = int(losses.scalar() or 0)

        base = 50
        base += min(20, int(agent.jobs_completed) // 5)
        base += min(20, win_count)
        base -= min(20, loss_count)

        return max(0, min(100, base))

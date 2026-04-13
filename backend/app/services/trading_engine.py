import logging
import uuid


import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentConfig
from app.models.memory import AgentMemory
from app.models.strategy import TradingStrategy
from app.models.trade import TradeAction, TradeLog
from app.services.prism_service import prism

logger = logging.getLogger(__name__)


class TradingEngine:
    async def execute_strategy(
        self,
        db: AsyncSession,
        strategy: TradingStrategy,
        agent_config: AgentConfig | None = None,
    ) -> dict:
        agent = agent_config or await self._load_agent(db, strategy.token_id)
        if not agent:
            return {"status": "missing_agent", "tokenId": strategy.token_id}

        market_context = await prism.get_trading_context(strategy.assets)
        if not market_context.get("healthy", False):
            decision = {"action": "HOLD", "reasoning": "Data source unhealthy"}
        elif strategy.decision_model == "ml_model":
            decision = await self._ml_model_decision(strategy, market_context)
        else:
            decision = await self._rule_based_decision(strategy, market_context)

        result = await self._log_trade_and_update_metrics(db, agent, strategy, decision, market_context)
        return result

    async def _load_agent(self, db: AsyncSession, token_id: int) -> AgentConfig | None:
        result = await db.execute(select(AgentConfig).where(AgentConfig.token_id == token_id))
        return result.scalar_one_or_none()

    async def _rule_based_decision(self, strategy: TradingStrategy, market_context: dict) -> dict:
        strategy_key = (strategy.strategy_type or "momentum").lower()
        if strategy_key == "mean_reversion":
            return self._mean_reversion_strategy(strategy, market_context)
        if strategy_key == "trend_following":
            return self._trend_following_strategy(strategy, market_context)
        return self._momentum_strategy(strategy, market_context)

    def _momentum_strategy(self, strategy: TradingStrategy, market_context: dict) -> dict:
        asset, data = self._pick_asset(strategy, market_context)
        if not data:
            return {"action": "HOLD", "reasoning": f"No data for {asset}"}

        price = float(data.get("price") or 0)
        change_24h = float(data.get("change_24h") or 0)

        risk = strategy.risk_params or {}
        buy_threshold = float(risk.get("buy_threshold", 2.0))
        sell_threshold = float(risk.get("sell_threshold", -3.0))
        size = float(risk.get("max_position_pct", 0.2))

        if change_24h > buy_threshold:
            return {
                "action": "BUY",
                "asset": asset,
                "price": price,
                "quantity": size,
                "reasoning": f"{asset} up {change_24h:.2f}% in 24h momentum signal",
            }
        if change_24h < sell_threshold:
            return {
                "action": "SELL",
                "asset": asset,
                "price": price,
                "quantity": size,
                "reasoning": f"{asset} down {change_24h:.2f}% in 24h stop-loss signal",
            }
        return {
            "action": "HOLD",
            "asset": asset,
            "price": price,
            "quantity": 0.0,
            "reasoning": f"{asset} in neutral zone ({change_24h:.2f}%)",
        }

    def _mean_reversion_strategy(self, strategy: TradingStrategy, market_context: dict) -> dict:
        asset, data = self._pick_asset(strategy, market_context)
        if not data:
            return {"action": "HOLD", "reasoning": f"No data for {asset}"}

        price = float(data.get("price") or 0)
        change_24h = float(data.get("change_24h") or 0)

        if change_24h < -5.0:
            return {
                "action": "BUY",
                "asset": asset,
                "price": price,
                "quantity": 0.15,
                "reasoning": f"{asset} oversold at {change_24h:.2f}%",
            }
        if change_24h > 5.0:
            return {
                "action": "SELL",
                "asset": asset,
                "price": price,
                "quantity": 0.15,
                "reasoning": f"{asset} overbought at {change_24h:.2f}%",
            }
        return {"action": "HOLD", "asset": asset, "price": price, "quantity": 0.0, "reasoning": "No reversion signal"}

    def _trend_following_strategy(self, strategy: TradingStrategy, market_context: dict) -> dict:
        asset, data = self._pick_asset(strategy, market_context)
        if not data:
            return {"action": "HOLD", "reasoning": f"No data for {asset}"}

        price = float(data.get("price") or 0)
        change_24h = float(data.get("change_24h") or 0)

        if change_24h > 1.0:
            return {
                "action": "BUY",
                "asset": asset,
                "price": price,
                "quantity": 0.1,
                "reasoning": f"Uptrend confirmed ({change_24h:.2f}%)",
            }
        if change_24h < -1.0:
            return {
                "action": "SELL",
                "asset": asset,
                "price": price,
                "quantity": 0.1,
                "reasoning": f"Downtrend confirmed ({change_24h:.2f}%)",
            }
        return {"action": "HOLD", "asset": asset, "price": price, "quantity": 0.0, "reasoning": "No clear trend"}

    async def _ml_model_decision(self, strategy: TradingStrategy, market_context: dict) -> dict:
        if not strategy.model_path:
            return {"action": "HOLD", "reasoning": "No trained model"}

        try:
            from stable_baselines3 import PPO

            model = PPO.load(strategy.model_path)
            obs = self._build_observation(strategy, market_context)
            action, _ = model.predict(obs, deterministic=True)

            action_id = int(np.array(action).item())
            action_map = {0: "HOLD", 1: "BUY", 2: "BUY", 3: "SELL", 4: "SELL", 5: "SELL"}
            quantity_map = {0: 0.0, 1: 0.25, 2: 0.5, 3: 0.25, 4: 0.5, 5: 1.0}

            asset, data = self._pick_asset(strategy, market_context)
            return {
                "action": action_map.get(action_id, "HOLD"),
                "asset": asset,
                "price": float((data or {}).get("price") or 0.0),
                "quantity": quantity_map.get(action_id, 0.0),
                "reasoning": f"RL model prediction action={action_id}",
            }
        except Exception as exc:
            logger.error("ML decision failed for token %s: %s", strategy.token_id, exc)
            return {"action": "HOLD", "reasoning": f"Model error: {exc}"}

    def _build_observation(self, strategy: TradingStrategy, market_context: dict) -> np.ndarray:
        obs: list[float] = []
        for asset in strategy.assets:
            payload = market_context.get("assets", {}).get(asset) or {}
            obs.extend(
                [
                    float(payload.get("price") or 0.0),
                    float(payload.get("change_24h") or 0.0),
                    float(payload.get("volume_24h") or 0.0),
                    float(payload.get("market_cap") or 0.0),
                ]
            )
        while len(obs) < 20:
            obs.append(0.0)
        return np.array(obs[:20], dtype=np.float32)

    async def _log_trade_and_update_metrics(
        self,
        db: AsyncSession,
        agent: AgentConfig,
        strategy: TradingStrategy,
        decision: dict,
        market_context: dict,
    ) -> dict:
        action = self._to_trade_action(decision.get("action"))
        asset = decision.get("asset") or (strategy.assets[0] if strategy.assets else "UNKNOWN")
        price = float(decision.get("price") or 0.0)

        # Quantity is interpreted as portfolio fraction unless >1, then treated as absolute units.
        quantity_input = float(decision.get("quantity") or 0.0)
        quantity = self._resolve_quantity(strategy, quantity_input)

        change_24h = float(((market_context.get("assets") or {}).get(asset) or {}).get("change_24h") or 0.0)
        pnl = self._estimate_pnl(action, quantity, change_24h)

        trade = TradeLog(
            token_id=agent.token_id,
            trade_id=str(uuid.uuid4())[:12],
            action=action,
            asset=asset,
            entry_price=price,
            exit_price=price * (1.0 + (change_24h / 100.0)) if price > 0 else price,
            quantity_forge=quantity,
            pnl_forge=pnl,
            reasoning=str(decision.get("reasoning") or "no reasoning")[:1000],
            prism_data_snapshot=market_context.get("assets", {}),
        )
        db.add(trade)

        strategy.total_trades += 1
        strategy.total_pnl = float(strategy.total_pnl or 0.0) + pnl

        pnl_values = await self._collect_pnl_values(db, strategy.token_id)
        if pnl_values:
            wins = sum(1 for value in pnl_values if value > 0)
            strategy.win_rate = wins / len(pnl_values)
            strategy.sharpe_ratio = self._estimate_sharpe(pnl_values)
            strategy.max_drawdown = self._estimate_drawdown(pnl_values)
        else:
            strategy.win_rate = 0.0
            strategy.sharpe_ratio = 0.0
            strategy.max_drawdown = 0.0

        db.add(strategy)
        db.add(
            AgentMemory(
                token_id=agent.token_id,
                event_type="trade_executed",
                event_data={
                    "action": action.value,
                    "asset": asset,
                    "price": price,
                    "quantity": quantity,
                    "pnl": pnl,
                    "reasoning": str(decision.get("reasoning") or "")[:200],
                },
            )
        )

        await db.commit()

        return {
            "status": "ok",
            "tokenId": strategy.token_id,
            "action": action.value,
            "asset": asset,
            "pnl": pnl,
            "strategyPnl": pnl,
            "totalPnl": strategy.total_pnl,
            "winRate": strategy.win_rate,
            "sharpeRatio": strategy.sharpe_ratio,
            "maxDrawdown": strategy.max_drawdown,
        }

    async def _collect_pnl_values(self, db: AsyncSession, token_id: int) -> list[float]:
        result = await db.execute(select(TradeLog.pnl_forge).where(TradeLog.token_id == token_id))
        return [float(row[0]) for row in result.all() if row[0] is not None]

    def _resolve_quantity(self, strategy: TradingStrategy, quantity_input: float) -> float:
        if quantity_input <= 0:
            return 0.0
        if quantity_input > 1.0:
            return quantity_input

        risk = strategy.risk_params or {}
        capital = float(risk.get("capital_forge", 1000.0))
        return round(capital * quantity_input, 6)

    def _estimate_pnl(self, action: TradeAction, quantity: float, change_24h: float) -> float:
        if action == TradeAction.HOLD or quantity <= 0:
            return 0.0
        signed_change = change_24h / 100.0
        direction = 1.0 if action == TradeAction.BUY else -1.0
        return round(quantity * direction * signed_change, 6)

    def _estimate_sharpe(self, pnl_values: list[float]) -> float:
        if not pnl_values:
            return 0.0
        pnl_arr = np.array(pnl_values, dtype=np.float64)
        std = float(np.std(pnl_arr))
        if std == 0:
            return 0.0
        return round(float(np.mean(pnl_arr)) / std, 4)

    def _estimate_drawdown(self, pnl_values: list[float]) -> float:
        if not pnl_values:
            return 0.0
        cumulative = np.cumsum(np.array(pnl_values, dtype=np.float64))
        running_max = np.maximum.accumulate(cumulative)
        drawdowns = cumulative - running_max
        worst = float(np.min(drawdowns)) if drawdowns.size > 0 else 0.0
        denom = float(np.max(np.abs(running_max))) if running_max.size > 0 else 0.0
        if denom == 0:
            return 0.0
        return round(abs(worst) / denom, 4)

    def _pick_asset(self, strategy: TradingStrategy, market_context: dict) -> tuple[str, dict | None]:
        assets = strategy.assets or []
        if not assets:
            return "UNKNOWN", None

        data_map = market_context.get("assets", {}) or {}
        # Pick first available payload; otherwise use first declared asset.
        for asset in assets:
            if data_map.get(asset):
                return asset, data_map.get(asset)
        return assets[0], data_map.get(assets[0])

    def _to_trade_action(self, action: str | None) -> TradeAction:
        normalized = (action or "HOLD").upper()
        if normalized == "BUY":
            return TradeAction.BUY
        if normalized == "SELL":
            return TradeAction.SELL
        return TradeAction.HOLD


trading_engine = TradingEngine()

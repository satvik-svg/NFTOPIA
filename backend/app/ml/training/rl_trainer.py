import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import redis
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback

from app.config import settings
from app.ml.environments.trading_env import ForgeTradingEnv
from app.services.prism_service import prism

logger = logging.getLogger(__name__)


class TrainingProgressCallback(BaseCallback):
    """Publishes periodic training updates via Redis pub/sub."""

    def __init__(self, training_id: str, redis_client: redis.Redis | None, total_timesteps: int, verbose: int = 0):
        super().__init__(verbose)
        self.training_id = training_id
        self.redis = redis_client
        self.total_timesteps = max(total_timesteps, 1)
        self.episode_rewards: list[float] = []

    def _on_step(self) -> bool:
        if self.n_calls % 500 == 0:
            mean_reward = float(np.mean(self.episode_rewards[-100:])) if self.episode_rewards else 0.0
            progress = {
                "training_id": self.training_id,
                "step": int(self.n_calls),
                "total_steps": int(self.total_timesteps),
                "mean_reward": mean_reward,
                "progress_pct": min((self.n_calls / self.total_timesteps) * 100.0, 100.0),
            }
            self._publish(progress)
        return True

    def _on_rollout_end(self) -> None:
        rewards = self.model.rollout_buffer.rewards.flatten()
        self.episode_rewards.extend(rewards.tolist())

    def _publish(self, payload: dict) -> None:
        if not self.redis:
            return
        try:
            self.redis.publish(f"training:{self.training_id}", json.dumps(payload))
        except Exception as exc:
            logger.warning("Failed publishing training progress for %s: %s", self.training_id, exc)


class RLTrainer:
    """Trains custom trading agents using a PPO policy."""

    def __init__(self):
        try:
            self.redis = redis.from_url(settings.REDIS_URL)
        except Exception as exc:
            logger.warning("Redis unavailable for training progress: %s", exc)
            self.redis = None

    async def fetch_training_data(self, assets: list[str], period: str = "6m") -> pd.DataFrame:
        all_frames: list[pd.DataFrame] = []
        lookback = self._period_to_limit(period)

        for asset in assets:
            try:
                payload = await prism.get_ohlcv(asset, interval="1d", limit=lookback)
                parsed = self._parse_ohlcv_payload(payload)
                if not parsed.empty:
                    all_frames.append(parsed)
            except Exception as exc:
                logger.warning("Failed to fetch OHLCV for %s: %s", asset, exc)

        if not all_frames:
            return self._generate_synthetic_data(days=max(lookback, 120))

        # Use first asset for baseline single-instrument training.
        return all_frames[0]

    def train(self, training_id: str, config: dict, price_data: pd.DataFrame) -> tuple[str, dict]:
        model_dir = Path(__file__).resolve().parents[1] / "models" / f"agent_{training_id}"
        model_dir.mkdir(parents=True, exist_ok=True)

        env = ForgeTradingEnv(price_data, config)

        learning_rates = {"low": 1e-4, "medium": 3e-4, "high": 5e-4}
        risk_tolerance = str(config.get("risk_tolerance", "medium")).lower()
        lr = float(learning_rates.get(risk_tolerance, 3e-4))

        timesteps_map = {"low": 20000, "medium": 50000, "high": 100000}
        total_timesteps = int(config.get("timesteps") or timesteps_map.get(risk_tolerance, 50000))

        model = PPO(
            "MlpPolicy",
            env,
            learning_rate=lr,
            n_steps=1024,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            verbose=0,
        )

        callback = TrainingProgressCallback(training_id=training_id, redis_client=self.redis, total_timesteps=total_timesteps)
        model.learn(total_timesteps=total_timesteps, callback=callback)

        model_path = model_dir / "model"
        model.save(str(model_path))

        metrics = self._evaluate_model(model, env)

        completion = {
            "training_id": training_id,
            "status": "completed",
            "model_path": str(model_path),
            "metrics": metrics,
        }
        self._publish(training_id, completion)

        return str(model_path), metrics

    def _evaluate_model(self, model: PPO, env: ForgeTradingEnv) -> dict:
        obs, _ = env.reset()
        done = False

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, _, done, _, _ = env.step(action)

        portfolio_values = env.portfolio_values or [env.initial_balance]
        returns = []
        for idx in range(1, len(portfolio_values)):
            prev = portfolio_values[idx - 1]
            cur = portfolio_values[idx]
            returns.append((cur - prev) / prev if prev > 0 else 0.0)

        total_return = (
            (portfolio_values[-1] - portfolio_values[0]) / portfolio_values[0] if portfolio_values[0] > 0 else 0.0
        )

        returns_arr = np.array(returns, dtype=np.float64) if returns else np.array([0.0], dtype=np.float64)
        std = float(np.std(returns_arr))
        sharpe = (float(np.mean(returns_arr)) / std * np.sqrt(252.0)) if std > 0 else 0.0

        max_drawdown = self._max_drawdown(np.array(portfolio_values, dtype=np.float64))

        return {
            "total_return_pct": round(total_return * 100.0, 2),
            "sharpe_ratio": round(sharpe, 2),
            "max_drawdown_pct": round(max_drawdown * 100.0, 2),
            "total_trades": len(env.trades),
            "win_rate": self._calculate_win_rate(env.trades),
        }

    def _max_drawdown(self, values: np.ndarray) -> float:
        if values.size == 0:
            return 0.0
        peak = values[0]
        max_dd = 0.0
        for value in values:
            if value > peak:
                peak = value
            drawdown = (value - peak) / peak if peak > 0 else 0.0
            max_dd = min(max_dd, drawdown)
        return float(max_dd)

    def _calculate_win_rate(self, trades: list[dict]) -> float:
        sell_trades = [trade for trade in trades if trade.get("action") == "SELL"]
        if not sell_trades:
            return 0.0
        wins = sum(1 for trade in sell_trades if float(trade.get("pnl") or 0.0) > 0)
        return round((wins / len(sell_trades)) * 100.0, 1)

    def _publish(self, training_id: str, payload: dict) -> None:
        if not self.redis:
            return
        try:
            self.redis.publish(f"training:{training_id}", json.dumps(payload))
        except Exception as exc:
            logger.warning("Failed publishing completion for %s: %s", training_id, exc)

    def _period_to_limit(self, period: str) -> int:
        mapping = {"1m": 30, "3m": 90, "6m": 180, "1y": 365}
        return mapping.get(period, 180)

    def _parse_ohlcv_payload(self, payload: dict | list) -> pd.DataFrame:
        if payload is None:
            return pd.DataFrame()

        if isinstance(payload, list):
            rows = payload
        elif isinstance(payload, dict):
            rows = payload.get("data") or payload.get("candles") or payload.get("result") or []
        else:
            rows = []

        if not rows:
            return pd.DataFrame()

        frame = pd.DataFrame(rows)

        normalized_columns = {
            "o": "open",
            "h": "high",
            "l": "low",
            "c": "close",
            "v": "volume",
        }
        frame = frame.rename(columns=normalized_columns)

        required = ["open", "high", "low", "close", "volume"]
        if not all(column in frame.columns for column in required):
            return pd.DataFrame()

        for column in required:
            frame[column] = pd.to_numeric(frame[column], errors="coerce")

        frame = frame.dropna(subset=required)
        return frame[required].reset_index(drop=True)

    def _generate_synthetic_data(self, days: int = 180) -> pd.DataFrame:
        np.random.seed(42)
        rng = np.random.default_rng(42)
        prices = [40000.0]
        for _ in range(max(days - 1, 1)):
            change = np.random.normal(0.001, 0.03)
            prices.append(prices[-1] * (1 + change))

        frame = pd.DataFrame(
            {
                "open": prices,
                "high": [price * (1 + abs(np.random.normal(0, 0.01))) for price in prices],
                "low": [price * (1 - abs(np.random.normal(0, 0.01))) for price in prices],
                "close": prices,
                "volume": [float(rng.integers(100_000_000, 10_000_000_000, dtype=np.int64)) for _ in prices],
            }
        )
        return frame


trainer = RLTrainer()

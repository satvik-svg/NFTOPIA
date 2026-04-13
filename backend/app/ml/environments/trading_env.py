import gymnasium as gym
import numpy as np
import pandas as pd
from gymnasium import spaces


class ForgeTradingEnv(gym.Env):
    """Custom Gymnasium environment for training trading agents."""

    metadata = {"render_modes": ["human"]}

    def __init__(self, price_data: pd.DataFrame, config: dict):
        super().__init__()
        self.price_data = price_data.reset_index(drop=True).copy()
        self.config = config

        self.current_step = 0
        self.max_steps = max(len(self.price_data) - 1, 1)

        self.initial_balance = float(config.get("initial_balance", 10000.0))
        self.balance = self.initial_balance
        self.position = 0.0
        self.entry_price = 0.0

        # 0=HOLD, 1=BUY_25%, 2=BUY_50%, 3=SELL_25%, 4=SELL_50%, 5=SELL_ALL
        self.action_space = spaces.Discrete(6)

        # 15-dimensional market + portfolio state vector.
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(15,), dtype=np.float32)

        self.trades: list[dict] = []
        self.portfolio_values: list[float] = []

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = min(20, self.max_steps)
        self.balance = self.initial_balance
        self.position = 0.0
        self.entry_price = 0.0
        self.trades = []
        self.portfolio_values = [self.initial_balance]
        return self._get_observation(), {}

    def step(self, action):
        action_id = int(action)
        current_price = float(self.price_data.iloc[self.current_step]["close"])
        prev_portfolio = self._portfolio_value(current_price)

        self._execute_action(action_id, current_price)

        self.current_step += 1
        done = self.current_step >= self.max_steps

        next_idx = min(self.current_step, self.max_steps)
        new_price = float(self.price_data.iloc[next_idx]["close"])
        new_portfolio = self._portfolio_value(new_price)
        self.portfolio_values.append(new_portfolio)

        reward = self._calculate_reward(prev_portfolio, new_portfolio)

        return self._get_observation(), reward, done, False, {}

    def _execute_action(self, action: int, price: float) -> None:
        position_sizes = {0: 0.0, 1: 0.25, 2: 0.5, 3: 0.25, 4: 0.5, 5: 1.0}
        size = position_sizes.get(action, 0.0)

        if action in (1, 2) and self.balance > 0:
            buy_amount = self.balance * size
            units = buy_amount / price if price > 0 else 0.0
            self.position += units
            self.balance -= buy_amount
            self.entry_price = price
            self.trades.append({"action": "BUY", "price": price, "amount": buy_amount})

        elif action in (3, 4, 5) and self.position > 0:
            sell_units = self.position * size
            sell_value = sell_units * price
            self.position -= sell_units
            self.balance += sell_value
            pnl = (price - self.entry_price) * sell_units if self.entry_price > 0 else 0.0
            self.trades.append({"action": "SELL", "price": price, "pnl": pnl})

    def _portfolio_value(self, price: float) -> float:
        return self.balance + (self.position * price)

    def _calculate_reward(self, prev_value: float, new_value: float) -> float:
        returns = (new_value - prev_value) / prev_value if prev_value > 0 else 0.0
        goal = self.config.get("goal", "maximize_returns")

        if goal == "maximize_sharpe":
            return (returns * 100.0) - (abs(returns) * 10.0)
        if goal == "minimize_drawdown":
            return returns * 200.0 if returns < 0 else returns * 50.0
        return returns * 100.0

    def _get_observation(self) -> np.ndarray:
        idx = min(self.current_step, self.max_steps)
        current_price = float(self.price_data.iloc[idx]["close"])

        prev_idx = max(0, idx - 1)
        price_prev = float(self.price_data.iloc[prev_idx]["close"])
        change_1d = (current_price - price_prev) / price_prev if price_prev > 0 else 0.0

        week_idx = max(0, idx - 7)
        price_week = float(self.price_data.iloc[week_idx]["close"])
        change_7d = (current_price - price_week) / price_week if price_week > 0 else 0.0

        start_changes = max(1, idx - 14)
        gains = 0.0
        losses = 0.0
        for i in range(start_changes, idx + 1):
            delta = float(self.price_data.iloc[i]["close"] - self.price_data.iloc[i - 1]["close"])
            if delta > 0:
                gains += delta
            else:
                losses += abs(delta)
        rsi_proxy = gains / (gains + losses) if (gains + losses) > 0 else 0.5

        volume_window = self.price_data.iloc[max(0, idx - 20):idx]
        avg_vol = float(volume_window["volume"].mean()) if not volume_window.empty else 1.0
        cur_vol = float(self.price_data.iloc[idx]["volume"])
        vol_ratio = cur_vol / avg_vol if avg_vol > 0 else 1.0

        portfolio_val = self._portfolio_value(current_price)
        balance_ratio = self.balance / self.initial_balance if self.initial_balance > 0 else 0.0
        position_ratio = (self.position * current_price) / portfolio_val if portfolio_val > 0 else 0.0
        unrealized_pnl = ((current_price - self.entry_price) / self.entry_price) if self.entry_price > 0 else 0.0

        open_price = float(self.price_data.iloc[idx].get("open", current_price))
        high_price = float(self.price_data.iloc[idx].get("high", current_price))
        low_price = float(self.price_data.iloc[idx].get("low", current_price))

        obs = np.array(
            [
                current_price / 100000.0,
                change_1d,
                change_7d,
                rsi_proxy,
                vol_ratio,
                balance_ratio,
                position_ratio,
                unrealized_pnl,
                idx / self.max_steps if self.max_steps > 0 else 1.0,
                len(self.trades) / 100.0,
                portfolio_val / self.initial_balance if self.initial_balance > 0 else 1.0,
                (high_price / current_price) - 1.0 if current_price > 0 else 0.0,
                (low_price / current_price) - 1.0 if current_price > 0 else 0.0,
                (open_price / current_price) - 1.0 if current_price > 0 else 0.0,
                cur_vol / 1e9,
            ],
            dtype=np.float32,
        )
        return obs

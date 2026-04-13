import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class PrismService:
    """Wrapper around PRISM API with graceful fallbacks for hackathon reliability."""

    def __init__(self) -> None:
        self.base_url = settings.PRISM_BASE_URL.rstrip("/")
        self.headers = {"Authorization": f"Bearer {settings.PRISM_API_KEY}"} if settings.PRISM_API_KEY else {}

    async def _get(self, endpoint: str, params: dict | None = None, timeout: float = 10.0) -> dict:
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    async def resolve_asset(self, query: str) -> dict:
        return await self._get(f"/resolve/{query}")

    async def agent_resolve(self, natural_language: str) -> dict:
        return await self._get("/agent/resolve", params={"q": natural_language})

    async def get_crypto_price(self, symbol: str) -> dict:
        return await self._get(f"/crypto/price/{symbol}")

    async def get_crypto_prices_batch(self, symbols: list[str]) -> list[dict]:
        results: list[dict] = []
        for symbol in symbols:
            try:
                results.append(await self.get_crypto_price(symbol))
            except Exception as exc:
                logger.warning("Failed to get price for %s: %s", symbol, exc)
        return results

    async def get_ohlcv(self, symbol: str, interval: str = "1d", limit: int = 100) -> dict:
        return await self._get(f"/crypto/{symbol}/ohlcv", params={"interval": interval, "limit": limit})

    async def get_market_overview(self) -> dict:
        return await self._get("/crypto/market/overview")

    async def get_trending(self) -> dict:
        return await self._get("/crypto/trending")

    async def check_health(self) -> bool:
        try:
            await self._get("/crypto/sources/status")
            return True
        except Exception as exc:
            logger.warning("PRISM health check failed: %s", exc)
            return False

    async def get_forex_rate(self, pair: str = "USD") -> dict:
        return await self._get(f"/forex/{pair}")

    async def get_indexes(self) -> dict:
        return await self._get("/indexes")

    async def get_trading_context(self, assets: list[str]) -> dict:
        context = {"assets": {}, "healthy": True}

        context["healthy"] = await self.check_health()
        if not context["healthy"]:
            logger.warning("PRISM unhealthy. Trading engines should default to HOLD")
            return context

        for asset in assets:
            try:
                payload = await self.get_crypto_price(asset)
                context["assets"][asset] = self._normalize_price_payload(asset, payload)
            except Exception as exc:
                logger.error("Failed to get trading context for %s: %s", asset, exc)
                context["assets"][asset] = None

        return context

    async def market_snapshot(self, asset: str) -> dict:
        """Backward-compatible single-asset snapshot used by existing callers."""
        context = await self.get_trading_context([asset])
        if not context["healthy"]:
            return {"asset": asset, "error": "prism_unhealthy"}
        return context["assets"].get(asset) or {"asset": asset, "error": "asset_unavailable"}

    def _normalize_price_payload(self, asset: str, payload: dict) -> dict:
        price = self._safe_float(
            payload.get("price")
            or payload.get("lastPrice")
            or payload.get("close")
            or payload.get("markPrice")
            or 0
        )
        change_24h = self._safe_float(
            payload.get("change_24h")
            or payload.get("change24h")
            or payload.get("change_pct")
            or payload.get("changePercent")
            or payload.get("percentChange24h")
            or 0
        )
        volume_24h = self._safe_float(payload.get("volume_24h") or payload.get("volume24h") or payload.get("volume") or 0)
        market_cap = self._safe_float(payload.get("market_cap") or payload.get("marketCap") or 0)

        normalized = dict(payload)
        normalized.update(
            {
                "asset": payload.get("asset") or asset,
                "price": price,
                "change_24h": change_24h,
                "volume_24h": volume_24h,
                "market_cap": market_cap,
            }
        )
        return normalized

    def _safe_float(self, value: object) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0


prism = PrismService()

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.models.base import async_session
from app.models.trade import TradeLog

router = APIRouter()


@router.websocket("/ws/trading/{token_id}")
async def trading_feed(websocket: WebSocket, token_id: int) -> None:
    await websocket.accept()
    try:
        while True:
            async with async_session() as db:
                result = await db.execute(
                    select(TradeLog)
                    .where(TradeLog.token_id == token_id)
                    .order_by(TradeLog.timestamp.desc())
                    .limit(20)
                )
                trades = list(reversed(result.scalars().all()))

            cumulative = 0.0
            serialized = []
            for trade in trades:
                pnl = float(trade.pnl_forge or 0.0)
                cumulative += pnl
                serialized.append(
                    {
                        "tradeId": trade.trade_id,
                        "asset": trade.asset,
                        "action": trade.action.value,
                        "entryPrice": trade.entry_price,
                        "exitPrice": trade.exit_price,
                        "quantityForge": trade.quantity_forge,
                        "pnlForge": trade.pnl_forge,
                        "timestamp": trade.timestamp.isoformat(),
                        "cumulativePnl": round(cumulative, 6),
                    }
                )

            await websocket.send_json(
                {
                    "tokenId": token_id,
                    "status": "live",
                    "tradeCount": len(serialized),
                    "cumulativePnl": round(cumulative, 6),
                    "trades": serialized,
                }
            )

            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=2.0)
                if message.lower() in {"close", "disconnect", "stop"}:
                    await websocket.close(code=1000)
                    return
            except TimeoutError:
                continue
    except WebSocketDisconnect:
        return

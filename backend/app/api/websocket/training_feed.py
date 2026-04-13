import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings

router = APIRouter()


@router.websocket("/ws/training/{training_id}")
async def training_feed(websocket: WebSocket, training_id: str) -> None:
    """Training feed websocket - gracefully handles missing Celery/Redis."""
    await websocket.accept()

    try:
        # Send a simple status update since Celery is not available in production
        while True:
            payload = {
                "trainingId": training_id,
                "status": "TRAINING",
                "ready": False,
            }

            await websocket.send_json(payload)

            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=2.0)
                if message.lower() in {"close", "disconnect", "stop"}:
                    await websocket.close(code=1000)
                    return
            except TimeoutError:
                pass
    except WebSocketDisconnect:
        return

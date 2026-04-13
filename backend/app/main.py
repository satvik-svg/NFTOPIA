from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import agents, auth, content, marketplace, stats, trading
from app.api.websocket.trading_feed import router as trading_ws_router
from app.api.websocket.training_feed import router as training_ws_router
from app.config import settings
from app.models.base import Base, engine
from app import models  # noqa: F401

# Ensure the generated images directory exists
GENERATED_DIR = Path(__file__).resolve().parent.parent / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Agent NFT Utility Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated images as static files
app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")

app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
app.include_router(agents.router, prefix=f"{settings.API_PREFIX}/agents", tags=["agents"])
app.include_router(content.router, prefix=f"{settings.API_PREFIX}/content", tags=["content"])
app.include_router(trading.router, prefix=f"{settings.API_PREFIX}/trading", tags=["trading"])
app.include_router(marketplace.router, prefix=f"{settings.API_PREFIX}/marketplace", tags=["marketplace"])
app.include_router(stats.router, prefix=f"{settings.API_PREFIX}/stats", tags=["stats"])

app.include_router(trading_ws_router)
app.include_router(training_ws_router)


@app.on_event("startup")
async def ensure_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "alive", "platform": settings.APP_NAME}

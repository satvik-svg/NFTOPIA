from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_wallet, get_db_session
from app.models.agent import AgentConfig
from app.models.allocation import Allocation
from app.models.content import ContentOutput
from app.models.memory import AgentMemory
from app.models.strategy import TradingStrategy
from app.schemas.marketplace import (
    BuyContentRequest,
    ContentPurchaseResponse,
    ContentTipResponse,
    ListForRentRequest,
    RentRequest,
    RentalQuote,
    TipContentRequest,
)

router = APIRouter()


@router.get("/overview")
async def marketplace_overview(db: AsyncSession = Depends(get_db_session)):
    strategy_count = await db.execute(
        select(func.count(TradingStrategy.id)).where(TradingStrategy.is_marketplace_listed.is_(True))
    )
    content_count = await db.execute(select(func.count(ContentOutput.id)).where(ContentOutput.content_nft_token_id.is_not(None)))

    return {
        "status": "ok",
        "listedStrategies": strategy_count.scalar() or 0,
        "listedContent": content_count.scalar() or 0,
    }


@router.get("/strategies")
async def list_marketplace_strategies(limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(TradingStrategy)
        .where(TradingStrategy.is_marketplace_listed.is_(True))
        .order_by(TradingStrategy.total_pnl.desc())
        .limit(limit)
        .offset(offset)
    )
    items = result.scalars().all()

    response = []
    for strategy in items:
        listing_result = await db.execute(
            select(AgentMemory)
            .where(
                AgentMemory.token_id == strategy.token_id,
                AgentMemory.event_type == "strategy_listed_for_rent",
            )
            .order_by(AgentMemory.timestamp.desc())
            .limit(1)
        )
        listing = listing_result.scalars().first()
        data = listing.event_data if listing else {}

        response.append(
            {
                "token_id": strategy.token_id,
                "strategy_type": strategy.strategy_type,
                "assets": strategy.assets,
                "total_pnl": strategy.total_pnl,
                "total_trades": strategy.total_trades,
                "win_rate": strategy.win_rate,
                "max_drawdown": strategy.max_drawdown,
                "sharpe_ratio": strategy.sharpe_ratio,
                "is_marketplace_listed": strategy.is_marketplace_listed,
                "created_at": strategy.created_at,
                "owner_address": data.get("owner", ""),
                "price_per_day": float(data.get("pricePerDay", 0.0)),
                "max_duration": int(data.get("maxDuration", 0)),
            }
        )

    return response


@router.post("/strategies/list")
async def list_strategy_for_rent(
    request: ListForRentRequest,
    wallet: str = Depends(get_current_wallet),
    db: AsyncSession = Depends(get_db_session),
):
    agent_result = await db.execute(select(AgentConfig).where(AgentConfig.token_id == request.token_id))
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_address.lower() != wallet.lower():
        raise HTTPException(status_code=403, detail="Only owner can list this strategy")

    strategy_result = await db.execute(select(TradingStrategy).where(TradingStrategy.token_id == request.token_id))
    strategy = strategy_result.scalar_one_or_none()
    if not strategy:
        strategy = TradingStrategy(
            token_id=request.token_id,
            strategy_type="marketplace_baseline",
            assets=["BTC"],
            timeframe="4h",
            risk_params={},
            indicator_config={},
        )
        db.add(strategy)

    strategy.is_marketplace_listed = True
    db.add(
        AgentMemory(
            token_id=request.token_id,
            event_type="strategy_listed_for_rent",
            event_data={
                "owner": wallet.lower(),
                "pricePerDay": request.price_per_day,
                "maxDuration": request.max_duration,
            },
        )
    )

    await db.commit()
    return {
        "status": "listed",
        "tokenId": request.token_id,
        "pricePerDay": request.price_per_day,
        "maxDuration": request.max_duration,
    }


@router.post("/strategies/rent", response_model=RentalQuote)
async def rent_strategy(
    request: RentRequest,
    wallet: str = Depends(get_current_wallet),
    db: AsyncSession = Depends(get_db_session),
):
    strategy_result = await db.execute(select(TradingStrategy).where(TradingStrategy.token_id == request.token_id))
    strategy = strategy_result.scalar_one_or_none()
    if not strategy or not strategy.is_marketplace_listed:
        raise HTTPException(status_code=404, detail="Strategy is not listed")

    memory_result = await db.execute(
        select(AgentMemory)
        .where(
            AgentMemory.token_id == request.token_id,
            AgentMemory.event_type == "strategy_listed_for_rent",
        )
        .order_by(AgentMemory.timestamp.desc())
    )
    listing_event = memory_result.scalars().first()
    if not listing_event:
        raise HTTPException(status_code=400, detail="Listing metadata missing")

    price_per_day = float(listing_event.event_data.get("pricePerDay", 0))
    max_duration = int(listing_event.event_data.get("maxDuration", 0))
    if request.days > max_duration:
        raise HTTPException(status_code=400, detail=f"Requested days exceeds max duration ({max_duration})")

    total_price = round(price_per_day * request.days, 6)
    allocation = Allocation(
        agent_token_id=request.token_id,
        allocator_address=wallet.lower(),
        amount_forge=total_price,
        active=True,
    )
    db.add(allocation)

    db.add(
        AgentMemory(
            token_id=request.token_id,
            event_type="strategy_rented",
            event_data={
                "renter": wallet.lower(),
                "days": request.days,
                "pricePerDay": price_per_day,
                "totalPrice": total_price,
            },
        )
    )

    await db.commit()
    return {
        "token_id": request.token_id,
        "renter": wallet.lower(),
        "days": request.days,
        "price_per_day": price_per_day,
        "total_price_forge": total_price,
    }


@router.get("/content")
async def marketplace_content(limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(ContentOutput)
        .where(ContentOutput.content_nft_token_id.is_not(None))
        .order_by(ContentOutput.popularity_score.desc(), ContentOutput.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.post("/content/buy", response_model=ContentPurchaseResponse)
async def buy_content(
    request: BuyContentRequest,
    wallet: str = Depends(get_current_wallet),
    db: AsyncSession = Depends(get_db_session),
):
    content_result = await db.execute(select(ContentOutput).where(ContentOutput.content_id == request.content_id))
    content = content_result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.purchases += 1
    content.popularity_score += 2.0
    
    # Use tips_received to track the highest bid
    if request.bid_amount is not None:
        if request.bid_amount > content.tips_received and request.bid_amount > content.price_forge:
            content.tips_received = float(request.bid_amount)

    db.add(
        AgentMemory(
            token_id=content.agent_token_id,
            event_type="content_purchased",
            event_data={
                "contentId": content.content_id,
                "buyer": wallet.lower(),
                "priceForge": request.bid_amount or content.price_forge,
            },
        )
    )

    await db.commit()

    return {
        "content_id": content.content_id,
        "price_forge": content.price_forge,
        "purchases": content.purchases,
    }


@router.post("/content/tip", response_model=ContentTipResponse)
async def tip_content(
    request: TipContentRequest,
    wallet: str = Depends(get_current_wallet),
    db: AsyncSession = Depends(get_db_session),
):
    content_result = await db.execute(select(ContentOutput).where(ContentOutput.content_id == request.content_id))
    content = content_result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.tips_received = float(content.tips_received) + float(request.amount_forge)
    content.popularity_score += min(5.0, float(request.amount_forge) / 10.0)

    db.add(
        AgentMemory(
            token_id=content.agent_token_id,
            event_type="content_tipped",
            event_data={
                "contentId": content.content_id,
                "tipper": wallet.lower(),
                "amountForge": request.amount_forge,
            },
        )
    )

    await db.commit()

    return {
        "content_id": content.content_id,
        "tip_amount_forge": request.amount_forge,
        "tips_received": content.tips_received,
    }

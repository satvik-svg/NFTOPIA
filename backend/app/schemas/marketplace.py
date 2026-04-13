from pydantic import BaseModel, Field


class ListForRentRequest(BaseModel):
    token_id: int
    price_per_day: float = Field(gt=0)
    max_duration: int = Field(ge=1, le=365)


class RentRequest(BaseModel):
    token_id: int
    days: int = Field(ge=1, le=365)


class BuyContentRequest(BaseModel):
    content_id: str
    bid_amount: float = None


class TipContentRequest(BaseModel):
    content_id: str
    amount_forge: float = Field(gt=0)


class RentalQuote(BaseModel):
    token_id: int
    renter: str
    days: int
    price_per_day: float
    total_price_forge: float


class ContentPurchaseResponse(BaseModel):
    content_id: str
    price_forge: float
    purchases: int


class ContentTipResponse(BaseModel):
    content_id: str
    tip_amount_forge: float
    tips_received: float

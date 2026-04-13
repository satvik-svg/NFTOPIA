from pydantic import BaseModel


class GenerationRequest(BaseModel):
    agent_id: int
    prompt: str
    content_type: str = "image"


class GenerationResponse(BaseModel):
    content_id: str
    agent_token_id: int
    content_type: str
    content_url: str
    prompt: str
    metadata_uri: str | None = None
    content_nft_token_id: int | None = None
    tx_hash: str | None = None
    debug_info: dict | None = None


class MintContentRequest(BaseModel):
    price_forge: float = 0.0


class MintContentResponse(BaseModel):
    content_id: str
    content_nft_token_id: int
    price_forge: float
    tx_hash: str

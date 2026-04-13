from pydantic import BaseModel, Field


class ForgeRequest(BaseModel):
    owner_address: str = Field(min_length=42, max_length=42)
    agent_type: str
    specialization: str


class ForgePreviewResponse(BaseModel):
    agentType: str
    specialization: str
    personality: str
    skillScores: list[int]
    styleParameters: dict
    level: int
    traits: list[str]


class ForgeResponse(BaseModel):
    tokenId: int
    dna: dict
    tbaWallet: str | None
    nftVisualUrl: str
    txHash: str | None


class AgentResponse(BaseModel):
    token_id: int
    agent_type: str
    specialization: str
    owner_address: str
    level: int
    total_earnings: float
    jobs_completed: int
    reputation_score: int
    traits: list

    class Config:
        from_attributes = True

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AgentForge"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    DATABASE_URL: str = "postgresql+asyncpg://forge:forgepass@localhost:5432/agentforge"

    def __init__(self, **values):
        super().__init__(**values)
        if self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        elif self.DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in self.DATABASE_URL:
            self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

    REDIS_URL: str = "redis://localhost:6379/0"

    HELA_RPC_URL: str = "https://testnet-rpc.helachain.com"
    HELA_CHAIN_ID: int = 666888
    PRIVATE_KEY: str = ""
    AGENT_NFT_ADDRESS: str = ""
    FORGE_TOKEN_ADDRESS: str = ""
    ERC6551_REGISTRY_ADDRESS: str = ""
    ERC6551_ACCOUNT_ADDRESS: str = ""
    JOB_ESCROW_ADDRESS: str = ""
    RENTAL_MARKET_ADDRESS: str = ""

    GEMINI_API_KEY: str = ""
    PRISM_API_KEY: str = ""
    PRISM_BASE_URL: str = "https://strykr-prism.up.railway.app"

    PINATA_API_KEY: str = ""
    PINATA_SECRET_KEY: str = ""
    IPFS_GATEWAY: str = "https://gateway.pinata.cloud/ipfs/"

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    JWT_SECRET_KEY: str = "change-this-in-prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI News Backend"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    APP_ENV: str = "development" # development | production
    DEBUG: bool = True
    
    # Auth
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    # Support both direct URL (Neon) or component-based (Docker)
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_PORT: int = 5432
    
    # AI Keys
    GOOGLE_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CURRENTS_API_KEY: str
    NEWS_MODE: str = "TEST"

    # Solana / Payments
    SOLANA_MODE: str = "TEST" # TEST or REAL
    SOLANA_RPC_URL: str = "https://api.devnet.solana.com"
    SOLANA_MERCHANT_WALLET: Optional[str] = None
    SOLANA_NETWORK: str = "devnet" # devnet | mainnet
    PRO_PLAN_PRICE_SOL: float = 0.05

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.POSTGRES_SERVER and self.POSTGRES_USER and self.POSTGRES_PASSWORD and self.POSTGRES_DB:
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        # Fallback to empty string if not set, let application fail if needed or handle gracefully
        return ""
    
    @property
    def GOOGLE_API_KEYS(self) -> List[str]:
        return [key.strip() for key in self.GOOGLE_API_KEY.split(",") if key.strip()]

    @property
    def CURRENTS_API_KEYS(self) -> List[str]:
        return [key.strip() for key in self.CURRENTS_API_KEY.split(",") if key.strip()]
        
    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    """
    Application Settings
    
    Loads configuration from environment variables.
    Sensitive keys (API keys, Secrets) are read from .env file.
    """
    
    # --- Project Metadata ---
    PROJECT_NAME: str = "AI News Backend"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"  # Options: development, production
    DEBUG: bool = True

    # --- Authentication ---
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Database Configuration ---
    # Supports both local component-based config and production connection strings
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_PORT: int = 5432

    # --- AI Services ---
    GOOGLE_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CURRENTS_API_KEY: str
    NEWS_MODE: str = "TEST"

    # --- Blockchain / Payments (Solana) ---
    SOLANA_MODE: str = "TEST"  # TEST or REAL
    SOLANA_NETWORK: str = "devnet"  # devnet or mainnet-beta
    SOLANA_RPC_URL: str = "https://api.devnet.solana.com"
    SOLANA_MERCHANT_WALLET: Optional[str] = None
    PRO_PLAN_PRICE_SOL: float = 0.05

    # --- CORS / Security ---
    FRONTEND_ORIGIN: str = "http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """
        Constructs the Database URI.
        In production, prefers DATABASE_URL.
        In development, constructs from individual POSTGRES_* components.
        """
        if self.APP_ENV == "production" and self.DATABASE_URL:
            url = self.DATABASE_URL
            # Fix Render's default postgres:// scheme
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            # Force asyncpg driver if not specified
            if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            
            # Fix sslmode argument for asyncpg
            if "sslmode=" in url:
                 url = url.replace("sslmode=", "ssl=")
            return url
        
        if self.POSTGRES_SERVER and self.POSTGRES_USER and self.POSTGRES_PASSWORD:
            return (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        
        return ""

    @property
    def GOOGLE_API_KEYS(self) -> List[str]:
        """Returns a list of Google API keys from a comma-separated string."""
        return [key.strip() for key in self.GOOGLE_API_KEY.split(",") if key.strip()]

    @property
    def CURRENTS_API_KEYS(self) -> List[str]:
        """Returns a list of Currents API keys from a comma-separated string."""
        return [key.strip() for key in self.CURRENTS_API_KEY.split(",") if key.strip()]
        
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Returns a list of allowed CORS origins."""
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]

    # Pydantic Config
    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True, 
        extra="ignore"
    )

settings = Settings()

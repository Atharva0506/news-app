from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI News Backend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int = 5432
    



    GOOGLE_API_KEY: str
    
    CURRENTS_API_KEY: str
    NEWS_MODE: str
    
    SOLANA_MODE: str = "TEST" # TEST or REAL
    SOLANA_RPC_URL: str = "https://api.devnet.solana.com"
    SOLANA_MERCHANT_WALLET: Optional[str] = None

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    

        
    @property
    def GOOGLE_API_KEYS(self) -> List[str]:
        return [key.strip() for key in self.GOOGLE_API_KEY.split(",") if key.strip()]

    @property
    def CURRENTS_API_KEYS(self) -> List[str]:
        return [key.strip() for key in self.CURRENTS_API_KEY.split(",") if key.strip()]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

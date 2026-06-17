from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    MONGODB_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GROQ_API_KEY: Optional[str] = None
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX_NAME: Optional[str] = None
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

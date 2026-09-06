"""
App configuration — loads values from .env file.
Never hardcode secrets here. This file only defines WHAT settings exist,
actual values always come from environment (.env locally, Secrets Manager in production).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30

    # Redis
    REDIS_URL: str

    # AWS S3
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str

    # Google Maps
    GOOGLE_MAPS_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Single shared instance — import this everywhere, don't re-instantiate Settings().
settings = Settings()

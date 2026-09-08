"""
App configuration — loads values from .env file.
Never hardcode secrets here. This file only defines WHAT settings exist,
actual values always come from environment (.env locally, Secrets Manager in production).
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env relative to this file's own folder (app/), not the
# current working directory the app happens to be launched from. Without
# this, `uvicorn app.main:app` run from backend/ silently fails to find
# backend/app/.env because pydantic-settings looks in the CWD by default.
ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"


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

    # First Admin Auto-Seed (Phase 2, Step 10 - see ADR-002)
    FIRST_ADMIN_EMAIL: str
    FIRST_ADMIN_PASSWORD: str

    model_config = SettingsConfigDict(env_file=ENV_FILE_PATH, env_file_encoding="utf-8")


# Single shared instance — import this everywhere, don't re-instantiate Settings().
settings = Settings()

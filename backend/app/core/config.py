"""
App configuration - loads values from .env file.
Never hardcode secrets here. This file only defines WHAT settings exist,
actual values always come from environment (.env locally, Secrets Manager in production).
"""
from pathlib import Path

from pydantic import field_validator
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

    # Storage (AWS S3 / Supabase Storage)
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "speedymeals-docs"
    S3_ENDPOINT_URL: str | None = None
    SUPABASE_URL: str | None = None
    SUPABASE_STORAGE_URL: str | None = None

    # Google Maps
    GOOGLE_MAPS_API_KEY: str
    GOOGLE_PLACES_API_KEY: str = ""
    MAPS_DAILY_CALL_BUDGET: int = 300

<<<<<<< HEAD
    # CORS (production-ready browser security)
    # Browser origins allowed to call this API cross-origin. Locally the
    # defaults cover the dev website (3000) and dev mobile web (8080).
    # Override via env as a JSON list — ALLOWED_ORIGINS=["https://app.example.com"]
    # — or as a plain comma-separated string for convenience in .env files:
    # ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
    # The literal "*" is supported for local development only; main.py
    # pairs it with allow_credentials=False (wildcard + credentials is a
    # browser-rejected combination and must never ship).
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _parse_allowed_origins(cls, value):
        """Accept either a JSON list (pydantic-settings native) or a
        comma-separated string from env, and normalize entries (trim
        whitespace, drop empties)."""
        if isinstance(value, str):
            value = [origin.strip() for origin in value.split(",")]
        if isinstance(value, (list, tuple)):
            cleaned = [str(origin).strip() for origin in value if str(origin).strip()]
            if cleaned:
                return cleaned
        return value


=======
>>>>>>> 036a44af1997d708f88b65d0e60574bdfb87c8a2
    # First Admin Auto-Seed (Phase 2, Step 10 - see ADR-002)
    FIRST_ADMIN_EMAIL: str
    FIRST_ADMIN_PASSWORD: str

    # Cash Collection Cap (Phase 3, Step 7 - spec Sec 3.4/6)
    CASH_COLLECTION_CAP: float = 5000

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH, env_file_encoding="utf-8", extra="ignore"
    )


# Single shared instance - import this everywhere, don't re-instantiate Settings().
settings = Settings()

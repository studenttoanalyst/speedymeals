"""
App configuration - loads values from .env file.
Never hardcode secrets here. This file only defines WHAT settings exist,
actual values always come from environment (.env locally, Secrets Manager in production).
"""
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve candidate .env files in priority order:
# 1. backend/.env (standard server deployment root)
# 2. backend/app/.env (module-level .env)
# 3. Current working directory .env
_APP_DIR = Path(__file__).resolve().parent.parent
_BACKEND_DIR = _APP_DIR.parent
_CANDIDATE_ENV_PATHS = [
    _BACKEND_DIR / ".env",
    _APP_DIR / ".env",
    Path.cwd() / ".env",
]
ENV_FILES: list[Path] = [p for p in _CANDIDATE_ENV_PATHS if p.is_file()] or [_APP_DIR / ".env"]
ENV_FILE_PATH: Path = ENV_FILES[0]


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"

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

    # CORS (production-ready browser security)
    # Browser origins allowed to call this API cross-origin. Locally the
    # defaults cover the dev website (3000, 3001) and dev mobile web (8080).
    # Override via env as a JSON list: ALLOWED_ORIGINS=["https://app.example.com"]
    # or as a plain comma-separated string for convenience in .env files:
    # ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
    # The literal "*" is supported for local development only; main.py
    # pairs it with allow_credentials=False (wildcard + credentials is a
    # browser-rejected combination and must never ship).
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8080",
        "https://speedymeals.pk",
        "https://www.speedymeals.pk",
        "https://speedymealservices.com",
        "https://www.speedymealservices.com",
        "https://api.speedymealservices.com",
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

    # First Admin Auto-Seed (Phase 2, Step 10 - see ADR-002)
    FIRST_ADMIN_EMAIL: str = "admin@speedymealservices.com"
    FIRST_ADMIN_PASSWORD: str = "admin123"

    # Firebase Cloud Messaging (push notifications). Leave BOTH empty to disable
    # push entirely (every send becomes a no-op). Provide either the service
    # account JSON as a single-line string (preferred on the server) or a path
    # to the JSON file (local dev). Never commit the key.
    FIREBASE_CREDENTIALS_JSON: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""
    # Origin used to build click-through links for web push notifications.
    WEB_PUSH_BASE_URL: str = "https://speedymealservices.com"

    # Rider assignment timeout. An offered order a rider does not answer within
    # this many seconds is taken back and offered to the next nearest rider.
    # The sweeper also retries orders that found no eligible rider.
    RIDER_ASSIGNMENT_TIMEOUT_SECONDS: int = 60
    ASSIGNMENT_SWEEPER_INTERVAL_SECONDS: int = 15
    ASSIGNMENT_SWEEPER_ENABLED: bool = True

    # Cash Collection Cap (Phase 3, Step 7 - spec Sec 3.4/6)
    CASH_COLLECTION_CAP: float = 5000

    # SMS Gateway (SendPK & Console fallback)
    # SMS_MODE: 'console' (dev/test default, logs OTP to server console) or 'sendpk' (live SMS gateway)
    SMS_MODE: str = "console"
    SENDPK_API_URL: str = "https://sendpk.com/api/sms.php"
    SENDPK_API_KEY: str = ""
    SENDPK_SENDER_ID: str = "SpeedyMeals"
    SENDPK_TEMPLATE_ID: str = ""
    OTP_TEMPLATE: str = "Your SpeedyMeals OTP code is #code#"

    @property
    def effective_sms_mode(self) -> str:
        """Returns the active SMS delivery mode ('console' or 'sendpk')."""
        return self.SMS_MODE.strip().strip("'\"").lower()

    model_config = SettingsConfigDict(
        env_file=ENV_FILES, env_file_encoding="utf-8", extra="ignore"
    )


# Single shared instance - import this everywhere, don't re-instantiate Settings().
settings = Settings()

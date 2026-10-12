"""
App entry point. Run with:
    uvicorn app.main:app --reload
(run this command from inside backend/ folder, not backend/app/)
"""
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import SessionLocal
from app.platform.auth import service as auth_service
from app.platform.auth.routes import router as auth_router
from app.platform.location.routes import router as location_router
from app.platform.users.routes import router as users_router
from app.platform.wallet_payment.routes import router as wallet_router
from app.modules.admin.routes import router as admin_router
from app.modules.admin_roles.routes import router as admin_roles_router
from app.modules.admin_accounts.routes import router as admin_accounts_router
from app.modules.food_delivery.routes import (
    customer_orders_router,
    customer_router,
    orders_router,
    restaurant_portal_router,
    router as menu_router,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="SpeedyMeals API", version="0.1.0")

# --- Production-ready CORS ---
# Allowed browser origins come from settings.ALLOWED_ORIGINS (env-driven:
# JSON list or comma-separated; see config.py). Never hardcoded per-origin
# in code, and never a blind wildcard: when the env sets ["*"] for local
# dev we drop credentials instead (browsers reject "*" + credentials, and
# shipping that combo would be an auth-continuation hazard).
_wildcard_origins = any(o.strip() == "*" for o in settings.ALLOWED_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _wildcard_origins else settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://(www\.)?speedymealservices\.com|https://(www\.)?speedymeals\.pk|https://speedymeals(-[a-zA-Z0-9_-]+)?\.vercel\.app",
    allow_credentials=not _wildcard_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

app.include_router(auth_router)
app.include_router(location_router)
app.include_router(users_router)
app.include_router(wallet_router)

app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(restaurant_portal_router)
app.include_router(customer_router)
app.include_router(customer_orders_router)
app.include_router(admin_router)
app.include_router(admin_roles_router)
app.include_router(admin_accounts_router)


@app.get("/", tags=["system"])
def root_status() -> dict[str, str]:
    """Root endpoint for status check and API discovery."""
    return {
        "status": "online",
        "service": "SpeedyMeals API",
        "docs": "/docs",
        "health": "/health",
    }


@app.on_event("startup")
def seed_first_admin_on_startup() -> None:
    """
    Step 10: auto-seed the first admin and demo restaurant accounts. Uses its own
    short-lived DB session (not the get_db() request dependency, which only
    exists during a request) so this runs once, cleanly, before the app
    starts accepting traffic.
    """
    # ── SMS configuration banner ──────────────────────────────────────────────
    # Logged at every startup so `journalctl -u speedymeals` immediately shows
    # which SMS mode is active and whether the env file was picked up.
    # If you see 'console' here after setting SMS_MODE=sendpk in .env, a
    # system-level environment variable is overriding the .env file.
    from app.core.config import ENV_FILE_PATH
    sms_mode = settings.effective_sms_mode
    api_key_present = bool(settings.SENDPK_API_KEY)
    env_file_exists = ENV_FILE_PATH.exists()
    banner_msg = (
        f"[CONFIG] SMS_MODE={sms_mode} | SENDPK_API_KEY present={api_key_present} | "
        f"env_file={ENV_FILE_PATH} (exists={env_file_exists}) | "
        f"OS SMS_MODE override={os.environ.get('SMS_MODE', '<not set in OS env>')}"
    )
    logger.info(banner_msg)
    print(banner_msg, flush=True)
    if sms_mode == "console":
        warn_msg = (
            "[CONFIG] WARNING: SMS is running in CONSOLE mode — OTPs will NOT be dispatched "
            "via SendPK. Set SMS_MODE=sendpk in your .env file and verify no "
            "systemd/OS Environment override is active."
        )
        logger.warning(warn_msg)
        print(warn_msg, flush=True)
    else:
        active_msg = "[CONFIG] SMS gateway: SendPK live dispatch ACTIVE."
        logger.info(active_msg)
        print(active_msg, flush=True)
    # ─────────────────────────────────────────────────────────────────────────

    db = SessionLocal()
    try:
        auth_service.seed_first_admin(db)
        auth_service.seed_demo_restaurant(db)
    finally:
        db.close()


@app.get("/health")
def health_check():
    """
    Simple check: is the API up and responding.
    Used by Docker/deployment to confirm the service is alive.
    """
    return {"status": "ok"}

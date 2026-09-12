"""
App entry point. Run with:
    uvicorn app.main:app --reload
(run this command from inside backend/ folder, not backend/app/)
"""
from fastapi import FastAPI

from app.core.database import SessionLocal
from app.platform.auth import service as auth_service
from app.platform.auth.routes import router as auth_router
from app.platform.users.routes import router as users_router
from app.platform.wallet_payment.routes import router as wallet_router
from app.modules.admin.routes import router as admin_router
from app.modules.food_delivery.routes import (
    customer_orders_router,
    customer_router,
    orders_router,
    router as menu_router,
)

app = FastAPI(title="SpeedyMeals API", version="0.1.0")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(wallet_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(customer_router)
app.include_router(customer_orders_router)
app.include_router(admin_router)


@app.on_event("startup")
def seed_first_admin_on_startup() -> None:
    """
    Step 10 — auto-seed the first admin account (see ADR-002). Uses its own
    short-lived DB session (not the get_db() request dependency, which only
    exists during a request) so this runs once, cleanly, before the app
    starts accepting traffic.
    """
    db = SessionLocal()
    try:
        auth_service.seed_first_admin(db)
    finally:
        db.close()


@app.get("/health")
def health_check():
    """
    Simple check: is the API up and responding.
    Used by Docker/deployment to confirm the service is alive.
    """
    return {"status": "ok"}

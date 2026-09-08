"""
App entry point. Run with:
    uvicorn app.main:app --reload
(run this command from inside backend/ folder, not backend/app/)
"""
from fastapi import FastAPI

from app.platform.auth.routes import router as auth_router

app = FastAPI(title="SpeedyMeals API", version="0.1.0")

app.include_router(auth_router)


@app.get("/health")
def health_check():
    """
    Simple check: is the API up and responding.
    Used by Docker/deployment to confirm the service is alive.
    """
    return {"status": "ok"}

"""
App entry point. Run with:
    uvicorn app.main:app --reload
(run this command from inside backend/ folder, not backend/app/)
"""
from fastapi import FastAPI

app = FastAPI(title="SpeedyMeals API", version="0.1.0")


@app.get("/health")
def health_check():
    """
    Simple check: is the API up and responding.
    Used by Docker/deployment to confirm the service is alive.
    """
    return {"status": "ok"}

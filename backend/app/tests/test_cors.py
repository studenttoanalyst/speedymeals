"""
Point: CORS middleware verification.

These tests build small FastAPI sub-apps with the exact same middleware
configuration logic main.py uses (settings.ALLOWED_ORIGINS + explicit
method/header allowlists + the wildcard→no-credentials guard), then assert
browser-visible response headers through TestClient. The real app import
is also exercised to prove startup wiring doesn't break.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.core.config import settings


def _build_app(allowed_origins, wildcard: bool) -> TestClient:
    """Mirror of main.py's CORS wiring, parameterized for testing."""
    app = FastAPI()

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if wildcard else allowed_origins,
        allow_credentials=not wildcard,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    )
    return TestClient(app)


def test_cors_allows_configured_origin():
    client = _build_app(settings.ALLOWED_ORIGINS, wildcard=False)
    response = client.get(
        "/health", headers={"Origin": settings.ALLOWED_ORIGINS[0]}
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == settings.ALLOWED_ORIGINS[0]
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_blocks_unknown_origin():
    client = _build_app(settings.ALLOWED_ORIGINS, wildcard=False)
    response = client.get("/health", headers={"Origin": "https://evil.example.com"})
    assert response.status_code == 200  # request still served...
    assert "access-control-allow-origin" not in response.headers  # ...but browser will reject the response


def test_cors_preflight_options_allowed():
    client = _build_app(settings.ALLOWED_ORIGINS, wildcard=False)
    response = client.options(
        "/health",
        headers={
            "Origin": settings.ALLOWED_ORIGINS[0],
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == settings.ALLOWED_ORIGINS[0]
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
    assert response.headers["access-control-allow-methods"].find("PATCH") != -1


def test_cors_wildcard_disables_credentials():
    """The ['*'] local-dev env value must never combine with credentials."""
    client = _build_app(["*"], wildcard=True)
    response = client.get("/health", headers={"Origin": "https://anything.example.com"})
    assert response.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in response.headers


def test_main_app_imports_with_cors_wiring():
    """Importing the real app proves main.py's middleware wiring doesn't
    break startup (settings parse, middleware adds cleanly)."""
    from app.main import app as real_app

    assert real_app.title == "SpeedyMeals API"
    # middleware stack contains our CORSMiddleware instance
    from fastapi.middleware.cors import CORSMiddleware as CM

    assert any(isinstance(m.cls, type) and issubclass(m.cls, CM) for m in real_app.user_middleware)

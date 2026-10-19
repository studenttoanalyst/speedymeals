import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_system_security_headers():
    """Verify security headers are applied to HTTP responses."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Strict-Transport-Security" in response.headers
    assert "max-age=63072000" in response.headers["Strict-Transport-Security"]

def test_auth_cache_control_no_store():
    """Verify auth endpoints enforce Cache-Control: no-store."""
    # Even on invalid/401/422 requests, cache-control should prevent caching of sensitive auth interactions
    response = client.post("/auth/login", json={"email": "invalid@test.com", "password": "wrong"})
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert "no-store" in response.headers.get("Cache-Control", "")
    assert response.headers.get("Pragma") == "no-cache"

def test_wallet_cache_control_no_store():
    """Verify wallet endpoints enforce Cache-Control: no-store."""
    response = client.get("/wallet/balance")
    assert "no-store" in response.headers.get("Cache-Control", "")
    assert response.headers.get("Pragma") == "no-cache"

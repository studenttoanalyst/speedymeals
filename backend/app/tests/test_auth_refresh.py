"""
Phase 10 hardening — tests for the refresh-token flow that was missing
entirely before this patch (issue_tokens/revoke_refresh_token existed,
but nothing let a client trade a refresh token for a new access token).
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.platform.auth import service
from app.platform.auth.models import RefreshToken
from app.platform.auth.routes import router as auth_router


@pytest.fixture
def auth_client(db_session):
    app = FastAPI()
    app.include_router(auth_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def _make_customer(db):
    from app.platform.users.models import User
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92327{unique}", name="Refresh Tester", country_code="+92")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_refresh_access_token_issues_new_pair_and_revokes_old(db_session):
    customer = _make_customer(db_session)
    tokens = service.issue_tokens(db_session, customer.id, "customer")
    old_raw_refresh = tokens["refresh_token"]

    new_tokens = service.refresh_access_token(db_session, old_raw_refresh)

    assert new_tokens["access_token"] != tokens["access_token"]
    assert new_tokens["refresh_token"] != old_raw_refresh

    old_hash = service._hash_token(old_raw_refresh)
    old_record = db_session.query(RefreshToken).filter(RefreshToken.token_hash == old_hash).first()
    assert old_record.status == "revoked"


def test_refresh_access_token_rejects_reused_token(db_session):
    customer = _make_customer(db_session)
    tokens = service.issue_tokens(db_session, customer.id, "customer")
    raw_refresh = tokens["refresh_token"]

    service.refresh_access_token(db_session, raw_refresh)  # first use: OK, rotates

    with pytest.raises(HTTPException) as exc_info:
        service.refresh_access_token(db_session, raw_refresh)  # second use: same token, must fail
    assert exc_info.value.status_code == 401


def test_refresh_access_token_rejects_expired_token(db_session):
    customer = _make_customer(db_session)
    tokens = service.issue_tokens(db_session, customer.id, "customer")
    raw_refresh = tokens["refresh_token"]

    record = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.token_hash == service._hash_token(raw_refresh))
        .first()
    )
    record.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        service.refresh_access_token(db_session, raw_refresh)
    assert exc_info.value.status_code == 401


def test_refresh_access_token_rejects_unknown_token(db_session):
    with pytest.raises(HTTPException) as exc_info:
        service.refresh_access_token(db_session, "not-a-real-token")
    assert exc_info.value.status_code == 401


def test_refresh_route_returns_200(auth_client, db_session):
    customer = _make_customer(db_session)
    tokens = service.issue_tokens(db_session, customer.id, "customer")

    response = auth_client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"] != tokens["access_token"]
    assert body["refresh_token"] != tokens["refresh_token"]


def test_refresh_route_rejects_invalid_token(auth_client, db_session):
    response = auth_client.post("/auth/refresh", json={"refresh_token": "garbage"})
    assert response.status_code == 401

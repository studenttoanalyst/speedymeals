"""
Gap 3 fix — Phase 2 (OTP/login/logout), Phase 3 Step 0 (rider signup+login),
Phase 9 (restaurant login) and Phase 10 (admin login) had no test file at
all despite being live since early phases. This covers that gap.
Refresh-token rotation itself is already covered separately in
test_auth_refresh.py — not duplicated here.
"""
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.redis_client import redis_client
from app.core.security import hash_password
from app.platform.auth import service
from app.platform.auth.models import Admin
from app.platform.auth.routes import router as auth_router
from app.platform.wallet_payment.models import Rider
from app.tests.test_order_tracking import _make_restaurant


def _make_restaurant_with_password(db, password="password123"):
    """test_order_tracking._make_restaurant sets password_hash='x' (a raw
    placeholder, fine for tests that never log in) — login tests need a
    real bcrypt hash, so this is a separate helper rather than changing
    the shared one and risking an unrelated test depending on that value."""
    from app.modules.food_delivery.models import Restaurant
    unique = uuid.uuid4().hex[:8]
    r = Restaurant(
        name="Login Test Cafe", email=f"login-rest-{unique}@t.com",
        password_hash=hash_password(password), phone_number=f"+92318{unique}",
        commission_rate=10, status="active", latitude=31.53, longitude=74.36,
        country_code="+92", currency="PKR",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r, password


@pytest.fixture
def auth_client(db_session):
    app = FastAPI()
    app.include_router(auth_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def _unique_phone(prefix="+92311"):
    return f"{prefix}{uuid.uuid4().hex[:8]}"


def _otp_for(phone_number: str) -> str:
    """Read the OTP straight out of Redis the same way verify_otp() does —
    tests can't read the console log, but they share the same Redis
    instance as the app, so this is the real code, not a stub."""
    code = redis_client.get(service._otp_key(phone_number))
    assert code is not None, "OTP was not stored — request it first"
    return code


def _make_admin(db, password="adminpass123"):
    unique = uuid.uuid4().hex[:8]
    admin = Admin(
        email=f"admin-{unique}@speedymeals.test",
        password_hash=hash_password(password),
        role="support",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin, password


# --- customer OTP request/verify ---


def test_otp_request_then_verify_creates_customer_and_issues_tokens(auth_client):
    phone = _unique_phone()

    request_response = auth_client.post(
        "/auth/otp/request", json={"phone_number": phone, "country_code": "+92"}
    )
    assert request_response.status_code == 200

    otp_code = _otp_for(phone)
    verify_response = auth_client.post(
        "/auth/otp/verify",
        json={"phone_number": phone, "country_code": "+92", "otp_code": otp_code},
    )
    assert verify_response.status_code == 200
    body = verify_response.json()
    assert "access_token" in body and "refresh_token" in body


def test_otp_verify_wrong_code_rejected(auth_client):
    phone = _unique_phone()
    auth_client.post("/auth/otp/request", json={"phone_number": phone, "country_code": "+92"})

    response = auth_client.post(
        "/auth/otp/verify",
        json={"phone_number": phone, "country_code": "+92", "otp_code": "000000"},
    )
    assert response.status_code == 400


def test_otp_request_cooldown_rejects_immediate_resend(auth_client):
    phone = _unique_phone()
    first = auth_client.post("/auth/otp/request", json={"phone_number": phone, "country_code": "+92"})
    assert first.status_code == 200

    second = auth_client.post("/auth/otp/request", json={"phone_number": phone, "country_code": "+92"})
    assert second.status_code == 429


def test_otp_verify_second_time_same_phone_logs_in_existing_customer(db_session, auth_client):
    phone = _unique_phone()
    service.generate_and_send_otp(phone)
    first_user = service.get_or_create_customer(db_session, phone, "+92")

    # Bypass the 45s resend cooldown for this second OTP request — the
    # cooldown itself is real, correct production behavior (proven by
    # test_otp_request_cooldown_rejects_immediate_resend above); this test
    # is checking a different thing (no duplicate row on repeat login), so
    # it clears the cooldown key rather than sleeping 45s in a unit test.
    redis_client.delete(service._cooldown_key(phone))
    service.generate_and_send_otp(phone)
    otp_code = _otp_for(phone)
    response = auth_client.post(
        "/auth/otp/verify",
        json={"phone_number": phone, "country_code": "+92", "otp_code": otp_code},
    )
    assert response.status_code == 200

    same_user = db_session.query(type(first_user)).filter_by(phone_number=phone).all()
    assert len(same_user) == 1  # no duplicate row created on second login


# --- rider OTP signup/login ---


def test_rider_otp_verify_first_time_creates_pending_rider(auth_client):
    phone = _unique_phone(prefix="+92312")
    auth_client.post("/auth/otp/request", json={"phone_number": phone, "country_code": "+92"})
    otp_code = _otp_for(phone)

    response = auth_client.post(
        "/auth/rider/otp/verify",
        json={
            "phone_number": phone, "country_code": "+92", "otp_code": otp_code,
            "name": "Test Rider", "cnic_number": f"cnic-{uuid.uuid4().hex[:8]}",
            "vehicle_type": "bike", "vehicle_registration": "ABC-123",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_rider_otp_verify_existing_phone_ignores_signup_fields(db_session, auth_client):
    phone = _unique_phone(prefix="+92313")
    existing = Rider(
        phone_number=phone, name="Original Name", cnic_number=f"cnic-{uuid.uuid4().hex[:8]}",
        approval_status="pending", wallet_balance=0, pending_cash_owed=0,
        is_online=False, country_code="+92", is_active=True,
    )
    db_session.add(existing)
    db_session.commit()

    service.generate_and_send_otp(phone)
    otp_code = _otp_for(phone)
    response = auth_client.post(
        "/auth/rider/otp/verify",
        json={
            "phone_number": phone, "country_code": "+92", "otp_code": otp_code,
            "name": "Different Name", "cnic_number": "different-cnic",
            "vehicle_type": "car", "vehicle_registration": "XYZ-999",
        },
    )
    assert response.status_code == 200

    db_session.refresh(existing)
    assert existing.name == "Original Name"  # signup fields NOT overwritten on login


# --- logout ---


def test_logout_revokes_refresh_token(db_session, auth_client):
    from app.platform.users.models import User
    user = User(phone_number=_unique_phone(prefix="+92314"), name="Logout Tester", country_code="+92")
    db_session.add(user)
    db_session.commit()
    tokens = service.issue_tokens(db_session, user.id, "customer")

    response = auth_client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 200

    with pytest.raises(HTTPException) as exc_info:
        service.refresh_access_token(db_session, tokens["refresh_token"])
    assert exc_info.value.status_code == 401


def test_logout_twice_rejected(db_session, auth_client):
    from app.platform.users.models import User
    user = User(phone_number=_unique_phone(prefix="+92315"), name="Logout Tester 2", country_code="+92")
    db_session.add(user)
    db_session.commit()
    tokens = service.issue_tokens(db_session, user.id, "customer")

    auth_client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    second = auth_client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert second.status_code == 400


# --- /auth/me guard ---


def test_get_me_returns_identity_for_valid_token(db_session, auth_client):
    from app.platform.users.models import User
    user = User(phone_number=_unique_phone(prefix="+92316"), name="Me Tester", country_code="+92")
    db_session.add(user)
    db_session.commit()
    tokens = service.issue_tokens(db_session, user.id, "customer")

    response = auth_client.get("/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)
    assert response.json()["role"] == "customer"


def test_get_me_rejects_missing_token(auth_client):
    response = auth_client.get("/auth/me")
    assert response.status_code in (401, 403)


def test_get_me_rejects_garbage_token(auth_client):
    response = auth_client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert response.status_code == 401


# --- restaurant login ---


def test_restaurant_login_with_correct_password_succeeds(db_session, auth_client):
    restaurant, password = _make_restaurant_with_password(db_session)
    response = auth_client.post(
        "/auth/restaurant/login", json={"email": restaurant.email, "password": password}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_restaurant_login_with_wrong_password_rejected(db_session, auth_client):
    restaurant, _ = _make_restaurant_with_password(db_session)
    response = auth_client.post(
        "/auth/restaurant/login", json={"email": restaurant.email, "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_restaurant_otp_verify_existing_account_logs_in(db_session, auth_client):
    restaurant = _make_restaurant(db_session)
    service.generate_and_send_otp(restaurant.phone_number)
    otp_code = _otp_for(restaurant.phone_number)

    response = auth_client.post(
        "/auth/restaurant/otp/verify",
        json={"phone_number": restaurant.phone_number, "country_code": "+92", "otp_code": otp_code},
    )
    assert response.status_code == 200


def test_restaurant_otp_verify_no_account_is_404(auth_client):
    phone = _unique_phone(prefix="+92317")
    service.generate_and_send_otp(phone)
    otp_code = _otp_for(phone)

    response = auth_client.post(
        "/auth/restaurant/otp/verify",
        json={"phone_number": phone, "country_code": "+92", "otp_code": otp_code},
    )
    assert response.status_code == 404


# --- admin login ---


def test_admin_login_with_correct_password_succeeds(db_session, auth_client):
    admin, password = _make_admin(db_session)
    response = auth_client.post("/auth/admin/login", json={"email": admin.email, "password": password})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_admin_login_with_wrong_password_rejected(db_session, auth_client):
    admin, _ = _make_admin(db_session)
    response = auth_client.post("/auth/admin/login", json={"email": admin.email, "password": "wrong"})
    assert response.status_code == 401


def test_admin_login_rejects_deactivated_admin(db_session, auth_client):
    admin, password = _make_admin(db_session)
    admin.is_active = False
    db_session.commit()

    response = auth_client.post("/auth/admin/login", json={"email": admin.email, "password": password})
    assert response.status_code == 401

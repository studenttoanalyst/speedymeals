"""
Phase 8, Step 1 (dashboard summary) and Step 2 (restaurant management)
tests. Reuses the customer/restaurant/order helpers from
test_order_tracking.py rather than redefining them.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.modules.admin import service
from app.modules.admin.routes import router as admin_router
from app.modules.food_delivery.models import Restaurant
from app.platform.auth.jwt_utils import create_access_token
from app.platform.wallet_payment.models import Rider
from app.tests.test_order_tracking import (
    _make_address,
    _make_customer,
    _make_order,
    _make_restaurant,
)


class _Payload:
    """Tiny attribute-bag standing in for a Pydantic schema instance, so
    service-level tests can call service functions directly without going
    through FastAPI request validation."""
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


@pytest.fixture
def admin_token():
    return create_access_token(uuid.uuid4(), "admin")


@pytest.fixture
def admin_client(db_session):
    app = FastAPI()
    app.include_router(admin_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


# --- Step 1: dashboard ---


def test_dashboard_counts_todays_orders_and_revenue(db_session):
    customer = _make_customer(db_session)
    restaurant = _make_restaurant(db_session)
    address = _make_address(db_session, customer)
    _make_order(db_session, customer, restaurant, address, order_status="Delivered")

    result = service.get_dashboard_summary(db_session)

    assert result["total_orders_today"] == 1
    assert result["gross_revenue_today"] == 1110
    # commission (100) + one Rs.10 wallet deduction for the Delivered order
    assert result["net_revenue_today"] == 110


def test_dashboard_includes_rider_wallet_and_cod_totals(db_session):
    unique = uuid.uuid4().hex[:8]
    rider = Rider(
        phone_number=f"+92302{unique}", name="Dash Rider", cnic_number=f"cnic-{unique}",
        approval_status="approved", wallet_balance=500, pending_cash_owed=200,
        is_online=True, country_code="+92", is_active=True,
    )
    db_session.add(rider)
    db_session.commit()

    result = service.get_dashboard_summary(db_session)

    assert result["total_rider_wallet_balance"] >= 500
    assert result["total_pending_cod_cash"] >= 200


def test_dashboard_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_dashboard_route_returns_200_for_admin(admin_client, admin_token):
    response = admin_client.get("/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert "total_orders_today" in response.json()


# --- Step 2: restaurant management ---


def test_create_restaurant_succeeds(db_session):
    unique = uuid.uuid4().hex[:8]
    payload = _Payload(
        name="New Cafe", email=f"new-{unique}@cafe.com", password="password123",
        phone_number=f"+92303{unique}", country_code="+92", address=None,
        latitude=None, longitude=None, commission_rate=10.0, currency="PKR",
    )

    restaurant = service.create_restaurant(db_session, payload)

    assert restaurant.status == "active"
    assert restaurant.commission_rate == 10.0
    assert restaurant.password_hash != "password123"  # actually hashed


def test_create_restaurant_rejects_duplicate_email(db_session):
    existing = _make_restaurant(db_session)
    unique = uuid.uuid4().hex[:8]
    payload = _Payload(
        name="Dup Cafe", email=existing.email, password="password123",
        phone_number=f"+92304{unique}", country_code="+92", address=None,
        latitude=None, longitude=None, commission_rate=10.0, currency="PKR",
    )

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.create_restaurant(db_session, payload)
    assert exc_info.value.status_code == 400


def test_set_restaurant_status_deactivate(db_session):
    restaurant = _make_restaurant(db_session)

    result = service.set_restaurant_status(db_session, restaurant.id, False)

    assert result.status == "inactive"


def test_update_restaurant_commission(db_session):
    restaurant = _make_restaurant(db_session)

    result = service.update_restaurant_commission(db_session, restaurant.id, 15.0)

    assert result.commission_rate == 15.0


def test_reset_credentials_updates_password_only(db_session):
    restaurant = _make_restaurant(db_session)
    old_hash = restaurant.password_hash
    payload = _Payload(new_password="brandnewpassword", new_email=None, new_phone_number=None)

    result = service.reset_restaurant_credentials(db_session, restaurant.id, payload)

    assert result.password_hash != old_hash
    assert result.email == restaurant.email  # untouched


def test_reset_credentials_rejects_email_clash(db_session):
    r1 = _make_restaurant(db_session)
    r2 = _make_restaurant(db_session)
    payload = _Payload(new_password=None, new_email=r2.email, new_phone_number=None)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.reset_restaurant_credentials(db_session, r1.id, payload)
    assert exc_info.value.status_code == 400


def test_restaurant_management_route_requires_admin_role(admin_client, db_session):
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")

    response = admin_client.get("/admin/restaurants", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_create_restaurant_route_returns_201(admin_client, admin_token):
    unique = uuid.uuid4().hex[:8]
    response = admin_client.post(
        "/admin/restaurants",
        json={
            "name": "Route Cafe", "email": f"route-{unique}@cafe.com",
            "password": "password123", "phone_number": f"+92305{unique}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "active"

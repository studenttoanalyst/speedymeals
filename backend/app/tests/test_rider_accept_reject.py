"""
Phase 6 Step 4 — rider accept/reject assignment tests.

Covers: correct rider accepts, wrong rider rejected, correct rider rejects,
next rider attempted, rejected rider excluded, double accept prevented,
accept after rejection prevented, no next rider handled safely, invalid
status rejected, and route-level auth. Follows the same service-level
+ route-level test pattern as test_rider_assignment.py.
"""
import json
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.redis_client import redis_client
from app.modules.food_delivery import service
from app.modules.food_delivery.models import Order, Restaurant
from app.modules.food_delivery.routes import orders_router
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service as wallet_service
from app.platform.wallet_payment.models import Rider
from app.platform.wallet_payment.routes import router as wallet_router


# --- helpers ---


def _make_restaurant(db, lat=31.53, lng=74.36):
    unique = uuid.uuid4().hex[:8]
    r = Restaurant(
        name=f"Rest {unique}",
        email=f"rest-{unique}@t.com",
        password_hash="x",
        phone_number=f"+92300{unique}",
        commission_rate=10,
        status="active",
        latitude=lat,
        longitude=lng,
        country_code="+92",
        currency="PKR",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _make_customer(db):
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92329{unique}", name="Customer", country_code="+92")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_address(db, user, lat=31.52, lng=74.35):
    a = Address(user_id=user.id, latitude=lat, longitude=lng, full_address="Home")
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def _make_order(db, restaurant, customer, address, status="Rider Assigned", rider=None):
    from datetime import datetime, timezone
    order = Order(
        user_id=customer.id,
        restaurant_id=restaurant.id,
        delivery_address_id=address.id,
        status=status,
        payment_method="COD",
        food_subtotal=500,
        delivery_distance_km=3,
        delivery_fee=110,
        total_amount=610,
        commission_amount=50,
        restaurant_payable=450,
        rider_earning=110,
        rider_id=rider.id if rider else None,
        country_code="+92",
        currency="PKR",
        placed_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _make_rider(db, wallet=1000, is_online=True, approval="approved", lat=None, lng=None):
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique}",
        name=f"Rider {unique}",
        cnic_number=f"cnic-{unique}",
        approval_status=approval,
        wallet_balance=wallet,
        pending_cash_owed=0,
        is_online=is_online,
        country_code="+92",
        is_active=True,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    if lat is not None and lng is not None:
        wallet_service.update_rider_location(db, r.id, lat, lng)
    return r


def _cleanup(rider_id):
    redis_client.delete(wallet_service._rider_location_key(rider_id))


# --- service-level tests ---


def test_correct_rider_accepts(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        result = service.rider_respond_to_assignment(db_session, rider.id, order.id, "accept")
        assert result["status"] == "Accepted by Rider"
        assert result["rider_id"] == rider.id
        db_session.refresh(order)
        assert order.status == "Accepted by Rider"
    finally:
        _cleanup(rider.id)


def test_wrong_rider_rejected_404(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider_a = _make_rider(db_session, lat=31.531, lng=74.361)
    rider_b = _make_rider(db_session, lat=31.532, lng=74.362)
    order = _make_order(db_session, restaurant, customer, address, rider=rider_a)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_respond_to_assignment(db_session, rider_b.id, order.id, "accept")
        assert exc_info.value.status_code == 404
        db_session.refresh(order)
        assert order.status == "Rider Assigned"  # unchanged
    finally:
        _cleanup(rider_a.id)
        _cleanup(rider_b.id)


def test_correct_rider_rejects_next_rider_attempted(db_session):
    """Rider A rejects → Rider B (nearest remaining) gets assigned."""
    restaurant = _make_restaurant(db_session, lat=31.53, lng=74.36)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider_a = _make_rider(db_session, lat=31.531, lng=74.361)
    rider_b = _make_rider(db_session, lat=31.54, lng=74.37)
    order = _make_order(db_session, restaurant, customer, address, rider=rider_a)

    try:
        result = service.rider_respond_to_assignment(db_session, rider_a.id, order.id, "reject")
        assert result["status"] == "Rider Assigned"
        assert result["rider_id"] == rider_b.id
        db_session.refresh(order)
        assert order.rider_id == rider_b.id
        assert order.status == "Rider Assigned"
    finally:
        _cleanup(rider_a.id)
        _cleanup(rider_b.id)


def test_rejected_rider_excluded_from_reassignment(db_session):
    """Rider A is the only eligible rider. After reject, no re-assignment."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        result = service.rider_respond_to_assignment(db_session, rider.id, order.id, "reject")
        assert result["status"] == "Rejected"
        assert result["rider_id"] is None
        db_session.refresh(order)
        assert order.rider_id is None
        assert order.status == "Rejected"
    finally:
        _cleanup(rider.id)


def test_double_accept_prevented(db_session):
    """After accepting, the order is no longer in 'Rider Assigned' status."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        service.rider_respond_to_assignment(db_session, rider.id, order.id, "accept")
        with pytest.raises(HTTPException) as exc_info:
            service.rider_respond_to_assignment(db_session, rider.id, order.id, "accept")
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


def test_reject_after_accept_prevented(db_session):
    """Cannot reject after already accepting."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        service.rider_respond_to_assignment(db_session, rider.id, order.id, "accept")
        with pytest.raises(HTTPException) as exc_info:
            service.rider_respond_to_assignment(db_session, rider.id, order.id, "reject")
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


def test_no_next_rider_order_stays_rejected(db_session):
    """Reject when no other eligible rider exists → order stays Rejected."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        result = service.rider_respond_to_assignment(db_session, rider.id, order.id, "reject")
        assert result["status"] == "Rejected"
        assert result["rider_id"] is None
    finally:
        _cleanup(rider.id)


def test_invalid_action_rejected(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_respond_to_assignment(db_session, rider.id, order.id, "skip")
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


def test_invalid_status_rejected(db_session):
    """Cannot respond to an order not in 'Rider Assigned' status."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, status="Accepted", rider=rider)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_respond_to_assignment(db_session, rider.id, order.id, "accept")
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


def test_response_contains_assignment_data(db_session):
    """Response includes pickup, dropoff, payment, distance, earning info."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        result = service.rider_respond_to_assignment(db_session, rider.id, order.id, "accept")
        assert "payment_method" in result
        assert "delivery_distance_km" in result
        assert "delivery_fee" in result
        assert "total_amount" in result
        assert "rider_earning" in result
        assert result["payment_method"] == "COD"
        assert result["rider_earning"] == 110
    finally:
        _cleanup(rider.id)


# --- route-level tests ---


def test_route_end_to_end_accept(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        app = FastAPI()
        app.include_router(wallet_router)
        app.dependency_overrides[get_db] = lambda: db_session
        client = TestClient(app)

        token = create_access_token(rider.id, "rider")
        response = client.post(
            f"/wallet/assignments/{order.id}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "Accepted by Rider"
        assert body["rider_id"] == str(rider.id)
    finally:
        _cleanup(rider.id)


def test_route_end_to_end_reject(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        app = FastAPI()
        app.include_router(wallet_router)
        app.dependency_overrides[get_db] = lambda: db_session
        client = TestClient(app)

        token = create_access_token(rider.id, "rider")
        response = client.post(
            f"/wallet/assignments/{order.id}/respond",
            json={"action": "reject"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "Rejected"
        assert body["rider_id"] is None
    finally:
        _cleanup(rider.id)


def test_route_missing_token_rejected(db_session):
    app = FastAPI()
    app.include_router(wallet_router)
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)

    response = client.post(
        f"/wallet/assignments/{uuid.uuid4()}/respond",
        json={"action": "accept"},
    )
    assert response.status_code == 403


def test_route_wrong_role_rejected(db_session):
    restaurant = _make_restaurant(db_session)
    app = FastAPI()
    app.include_router(wallet_router)
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)

    token = create_access_token(restaurant.id, "restaurant")
    response = client.post(
        f"/wallet/assignments/{uuid.uuid4()}/respond",
        json={"action": "accept"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403

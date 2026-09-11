"""
Phase 6 Step 3 — nearest rider assignment tests.

Covers: single eligible rider, multiple riders (nearest selected),
offline/insufficient-wallet/expired-location riders ignored, no eligible
rider, correct restaurant coordinates, no double-assignment, and
unauthorized manipulation rejection. Follows the same service-level
+ route-level test pattern as test_food_delivery.py.
"""
import json
import uuid

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.redis_client import redis_client
from app.modules.food_delivery import service
from app.modules.food_delivery.models import MenuItem, Order, OrderItem, Restaurant
from app.modules.food_delivery.routes import orders_router
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service as wallet_service
from app.platform.wallet_payment.models import Rider


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
    user = User(phone_number=f"+92329{unique}", name="Customer", country_code="++92")
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


def _make_order(db, restaurant, customer, address, status="Preparing"):
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


# --- tests ---


def test_single_eligible_rider_assigned(db_session):
    """One eligible rider → order gets assigned to that rider."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)

    try:
        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Rider Assigned"
        db_session.refresh(order)
        assert order.rider_id == rider.id
    finally:
        _cleanup(rider.id)


def test_nearest_rider_selected_among_multiple(db_session):
    """Multiple eligible riders → the nearest one is selected."""
    restaurant = _make_restaurant(db_session, lat=31.53, lng=74.36)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)

    # Rider A: ~1 km away
    rider_a = _make_rider(db_session, lat=31.54, lng=74.37)
    # Rider B: ~5 km away
    rider_b = _make_rider(db_session, lat=31.58, lng=74.40)

    try:
        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Rider Assigned"
        db_session.refresh(order)
        assert order.rider_id == rider_a.id  # nearest
    finally:
        _cleanup(rider_a.id)
        _cleanup(rider_b.id)


def test_offline_rider_ignored(db_session):
    """Offline rider is not eligible → not assigned."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)
    rider = _make_rider(db_session, is_online=False, lat=31.531, lng=74.361)

    try:
        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        # No eligible rider → order stays at Ready for Pickup
        assert result["status"] == "Ready for Pickup"
        db_session.refresh(order)
        assert order.rider_id is None
    finally:
        _cleanup(rider.id)


def test_insufficient_wallet_rider_ignored(db_session):
    """Rider with wallet < 500 is not eligible → not assigned."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)
    rider = _make_rider(db_session, wallet=100, lat=31.531, lng=74.361)

    try:
        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Ready for Pickup"
        db_session.refresh(order)
        assert order.rider_id is None
    finally:
        _cleanup(rider.id)


def test_expired_location_rider_ignored(db_session):
    """Rider whose Redis location has expired is not eligible → not assigned."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)

    try:
        # Force-expire the location
        key = wallet_service._rider_location_key(rider.id)
        redis_client.expire(key, 0)

        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Ready for Pickup"
        db_session.refresh(order)
        assert order.rider_id is None
    finally:
        _cleanup(rider.id)


def test_no_eligible_rider_order_stays_ready_for_pickup(db_session):
    """No eligible riders at all → order stays at Ready for Pickup."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)

    result = service.update_order_status(
        db_session, restaurant.id, order.id, "Ready for Pickup"
    )
    assert result["status"] == "Ready for Pickup"
    db_session.refresh(order)
    assert order.rider_id is None


def test_uses_restaurant_coordinates_not_address(db_session):
    """Distance is calculated from the restaurant, not the delivery address."""
    restaurant = _make_restaurant(db_session, lat=31.53, lng=74.36)
    customer = _make_customer(db_session)
    # Delivery address is far away
    address = _make_address(db_session, customer, lat=33.0, lng=75.0)
    order = _make_order(db_session, restaurant, customer, address)

    # Rider close to restaurant (but far from address)
    rider = _make_rider(db_session, lat=31.535, lng=74.365)

    try:
        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Rider Assigned"
        db_session.refresh(order)
        assert order.rider_id == rider.id
    finally:
        _cleanup(rider.id)


def test_assignment_happens_only_once_no_double(db_session):
    """Calling Ready for Pickup on an already-assigned order is rejected."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)

    try:
        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Rider Assigned"

        # Second call — order is no longer at "Ready for Pickup"
        with pytest.raises(HTTPException) as exc_info:
            service.update_order_status(
                db_session, restaurant.id, order.id, "Ready for Pickup"
            )
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


def test_unauthorized_restaurant_cannot_trigger_assignment(db_session):
    """A different restaurant cannot trigger assignment on someone else's order."""
    restaurant_a = _make_restaurant(db_session)
    restaurant_b = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant_a, customer, address)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.update_order_status(
                db_session, restaurant_b.id, order.id, "Ready for Pickup"
            )
        assert exc_info.value.status_code == 404
        db_session.refresh(order)
        assert order.status == "Preparing"  # unchanged
    finally:
        _cleanup(rider.id)


def test_pending_approval_rider_ignored(db_session):
    """Rider with approval_status='pending' is not eligible."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)
    rider = _make_rider(db_session, approval="pending", lat=31.531, lng=74.361)

    try:
        result = service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Ready for Pickup"
        db_session.refresh(order)
        assert order.rider_id is None
    finally:
        _cleanup(rider.id)


def test_valid_non_ready_for_pickup_transition_unaffected(db_session):
    """Transitions unrelated to Ready for Pickup are not affected by Step 3."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address, status="Accepted")

    result = service.update_order_status(
        db_session, restaurant.id, order.id, "Preparing"
    )
    assert result["status"] == "Preparing"
    db_session.refresh(order)
    assert order.rider_id is None  # no assignment triggered


def test_route_end_to_end(db_session):
    """Full route-level test: restaurant triggers Ready for Pickup → assignment."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(db_session, restaurant, customer, address)
    rider = _make_rider(db_session, lat=31.531, lng=74.361)

    try:
        app = FastAPI()
        app.include_router(orders_router)
        app.dependency_overrides[get_db] = lambda: db_session
        client = TestClient(app)

        token = create_access_token(restaurant.id, "restaurant")
        response = client.patch(
            f"/restaurants/me/orders/{order.id}/status",
            json={"status": "Ready for Pickup"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "Rider Assigned"

        # Verify in DB
        db_session.refresh(order)
        assert order.rider_id == rider.id
    finally:
        _cleanup(rider.id)

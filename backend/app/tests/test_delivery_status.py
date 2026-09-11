"""
Phase 6 Step 5 — delivery status flow tests.

Covers: arrived, picked up, on the way, delivered, invalid jump, wrong
rider, unauthorized user, duplicate request, and Phase 4 regression.
Follows the same service-level + route-level test pattern as previous steps.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.redis_client import redis_client
from app.modules.food_delivery import service
from app.modules.food_delivery.models import Order, Restaurant
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service as wallet_service
from app.platform.wallet_payment.models import Rider
from app.platform.wallet_payment.routes import router as wallet_router


# --- helpers ---


def _make_restaurant(db):
    unique = uuid.uuid4().hex[:8]
    r = Restaurant(
        name=f"Rest {unique}",
        email=f"rest-{unique}@t.com",
        password_hash="x",
        phone_number=f"+92300{unique}",
        commission_rate=10,
        status="active",
        latitude=31.53,
        longitude=74.36,
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


def _make_address(db, user):
    a = Address(user_id=user.id, latitude=31.52, longitude=74.35, full_address="Home")
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def _make_order(db, restaurant, customer, address, status="Accepted by Rider", rider=None):
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


def _make_rider(db, lat=31.531, lng=74.361):
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique}",
        name=f"Rider {unique}",
        cnic_number=f"cnic-{unique}",
        approval_status="approved",
        wallet_balance=1000,
        pending_cash_owed=0,
        is_online=True,
        country_code="+92",
        is_active=True,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    wallet_service.update_rider_location(db, r.id, lat, lng)
    return r


def _cleanup(rider_id):
    redis_client.delete(wallet_service._rider_location_key(rider_id))


# --- full happy path ---


def test_full_delivery_flow_happy_path(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Arrived at Restaurant"
        )
        assert result["status"] == "Arrived at Restaurant"

        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Picked Up"
        )
        assert result["status"] == "Picked Up"

        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "On the Way"
        )
        assert result["status"] == "On the Way"

        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Delivered"
        )
        assert result["status"] == "Delivered"
    finally:
        _cleanup(rider.id)


# --- individual transitions ---


def test_arrived_at_restaurant(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Arrived at Restaurant"
        )
        assert result["status"] == "Arrived at Restaurant"
        db_session.refresh(order)
        assert order.status == "Arrived at Restaurant"
    finally:
        _cleanup(rider.id)


def test_picked_up(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(
        db_session, restaurant, customer, address,
        status="Arrived at Restaurant", rider=rider,
    )

    try:
        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Picked Up"
        )
        assert result["status"] == "Picked Up"
    finally:
        _cleanup(rider.id)


def test_on_the_way(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(
        db_session, restaurant, customer, address,
        status="Picked Up", rider=rider,
    )

    try:
        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "On the Way"
        )
        assert result["status"] == "On the Way"
    finally:
        _cleanup(rider.id)


def test_delivered(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(
        db_session, restaurant, customer, address,
        status="On the Way", rider=rider,
    )

    try:
        result = service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Delivered"
        )
        assert result["status"] == "Delivered"
        assert result["rider_earning"] == 110
    finally:
        _cleanup(rider.id)


# --- invalid transitions ---


def test_skip_transition_rejected(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_advance_delivery_status(
                db_session, rider.id, order.id, "Picked Up"
            )
        assert exc_info.value.status_code == 400
        db_session.refresh(order)
        assert order.status == "Accepted by Rider"  # unchanged
    finally:
        _cleanup(rider.id)


def test_backward_transition_rejected(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(
        db_session, restaurant, customer, address,
        status="On the Way", rider=rider,
    )

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_advance_delivery_status(
                db_session, rider.id, order.id, "Picked Up"
            )
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


def test_skip_to_delivered_rejected(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_advance_delivery_status(
                db_session, rider.id, order.id, "Delivered"
            )
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


# --- wrong rider ---


def test_wrong_rider_rejected_404(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider_a = _make_rider(db_session)
    rider_b = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider_a)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_advance_delivery_status(
                db_session, rider_b.id, order.id, "Arrived at Restaurant"
            )
        assert exc_info.value.status_code == 404
        db_session.refresh(order)
        assert order.status == "Accepted by Rider"  # unchanged
    finally:
        _cleanup(rider_a.id)
        _cleanup(rider_b.id)


# --- unauthorized user ---


def test_unauthorized_user_rejected_404(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        with pytest.raises(HTTPException) as exc_info:
            service.rider_advance_delivery_status(
                db_session, customer.id, order.id, "Arrived at Restaurant"
            )
        assert exc_info.value.status_code == 404
    finally:
        _cleanup(rider.id)


# --- duplicate request ---


def test_duplicate_request_rejected(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        service.rider_advance_delivery_status(
            db_session, rider.id, order.id, "Arrived at Restaurant"
        )
        with pytest.raises(HTTPException) as exc_info:
            service.rider_advance_delivery_status(
                db_session, rider.id, order.id, "Arrived at Restaurant"
            )
        assert exc_info.value.status_code == 400
    finally:
        _cleanup(rider.id)


# --- route-level tests ---


def _make_client(db_session):
    app = FastAPI()
    app.include_router(wallet_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def test_route_arrived(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, rider=rider)

    try:
        client = _make_client(db_session)
        token = create_access_token(rider.id, "rider")
        response = client.patch(
            f"/wallet/deliveries/{order.id}/status/arrived",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "Arrived at Restaurant"
    finally:
        _cleanup(rider.id)


def test_route_picked_up(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(
        db_session, restaurant, customer, address,
        status="Arrived at Restaurant", rider=rider,
    )

    try:
        client = _make_client(db_session)
        token = create_access_token(rider.id, "rider")
        response = client.patch(
            f"/wallet/deliveries/{order.id}/status/picked-up",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "Picked Up"
    finally:
        _cleanup(rider.id)


def test_route_on_the_way(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(
        db_session, restaurant, customer, address,
        status="Picked Up", rider=rider,
    )

    try:
        client = _make_client(db_session)
        token = create_access_token(rider.id, "rider")
        response = client.patch(
            f"/wallet/deliveries/{order.id}/status/on-the-way",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "On the Way"
    finally:
        _cleanup(rider.id)


def test_route_delivered(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(
        db_session, restaurant, customer, address,
        status="On the Way", rider=rider,
    )

    try:
        client = _make_client(db_session)
        token = create_access_token(rider.id, "rider")
        response = client.patch(
            f"/wallet/deliveries/{order.id}/status/delivered",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "Delivered"
        assert body["rider_earning"] == 110
    finally:
        _cleanup(rider.id)


def test_route_missing_token_rejected(db_session):
    client = _make_client(db_session)
    response = client.patch(
        f"/wallet/deliveries/{uuid.uuid4()}/status/arrived",
    )
    assert response.status_code == 403


def test_route_wrong_role_rejected(db_session):
    client = _make_client(db_session)
    restaurant = _make_restaurant(db_session)
    token = create_access_token(restaurant.id, "restaurant")
    response = client.patch(
        f"/wallet/deliveries/{uuid.uuid4()}/status/arrived",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403

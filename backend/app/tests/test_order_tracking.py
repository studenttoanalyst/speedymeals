"""
Phase 7, Step 1 — customer order tracking tests.

Orders are built directly against the Order/OrderItem models (not through
the Phase 5 cart/checkout flow) — tracking only reads an existing order,
so it doesn't need the full checkout pipeline to exercise it.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.modules.food_delivery import service
from app.modules.food_delivery.models import MenuItem, Order, OrderItem, Restaurant
from app.modules.food_delivery.routes import customer_orders_router
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import Address, User
from app.platform.wallet_payment.models import Rider


def _make_customer(db):
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92327{unique}", name="Tracking Customer", country_code="+92")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_address(db, customer):
    a = Address(user_id=customer.id, label="Home", latitude=31.5, longitude=74.3, full_address="St")
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def _make_restaurant(db):
    unique = uuid.uuid4().hex[:8]
    r = Restaurant(
        name="Tracking Cafe", email=f"rest-{unique}@t.com", password_hash="x",
        phone_number=f"+92300{unique}", commission_rate=10, status="active",
        latitude=31.53, longitude=74.36, country_code="+92", currency="PKR",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _make_menu_item(db, restaurant):
    item = MenuItem(
        restaurant_id=restaurant.id, name="Biryani", description="x", price=1000,
        category="Main", is_available=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _make_rider(db):
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92301{unique}", name=f"Rider {unique}", cnic_number=f"cnic-{unique}",
        approval_status="approved", wallet_balance=1000, pending_cash_owed=0,
        is_online=True, country_code="+92", is_active=True,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _make_order(db, customer, restaurant, address, rider=None, order_status="Accepted"):
    order = Order(
        user_id=customer.id, restaurant_id=restaurant.id, rider_id=rider.id if rider else None,
        delivery_address_id=address.id, status=order_status, payment_method="COD",
        food_subtotal=1000, delivery_distance_km=3, delivery_fee=110, total_amount=1110,
        commission_amount=100, restaurant_payable=900, rider_earning=110,
        country_code="+92", currency="PKR", placed_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture
def customer(db_session):
    return _make_customer(db_session)


@pytest.fixture
def address(db_session, customer):
    return _make_address(db_session, customer)


@pytest.fixture
def restaurant(db_session):
    return _make_restaurant(db_session)


@pytest.fixture
def menu_item(db_session, restaurant):
    return _make_menu_item(db_session, restaurant)


@pytest.fixture
def tracking_client(db_session):
    app = FastAPI()
    app.include_router(customer_orders_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


# --- service-level tests ---


def test_tracking_returns_status_and_totals(db_session, customer, address, restaurant, menu_item):
    order = _make_order(db_session, customer, restaurant, address)
    db_session.add(OrderItem(
        order_id=order.id, menu_item_id=menu_item.id, quantity=2,
        selected_variant=None, price_at_order=1000,
    ))
    db_session.commit()

    result = service.get_order_tracking(db_session, customer.id, order.id)

    assert result["status"] == "Accepted"
    assert result["total_amount"] == 1110
    assert len(result["items"]) == 1
    assert result["items"][0]["name"] == "Biryani"
    assert result["items"][0]["quantity"] == 2


def test_tracking_no_rider_fields_before_assignment(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address, rider=None)

    result = service.get_order_tracking(db_session, customer.id, order.id)

    assert result["rider_name"] is None
    assert result["rider_phone"] is None


def test_tracking_shows_rider_once_assigned(db_session, customer, address, restaurant):
    rider = _make_rider(db_session)
    order = _make_order(db_session, customer, restaurant, address, rider=rider, order_status="Rider Assigned")

    result = service.get_order_tracking(db_session, customer.id, order.id)

    assert result["rider_name"] == rider.name
    assert result["rider_phone"] == rider.phone_number


def test_tracking_other_customers_order_is_404(db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address)
    other_customer = _make_customer(db_session)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.get_order_tracking(db_session, other_customer.id, order.id)
    assert exc_info.value.status_code == 404


def test_tracking_nonexistent_order_is_404(db_session, customer):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        service.get_order_tracking(db_session, customer.id, uuid.uuid4())
    assert exc_info.value.status_code == 404


# --- route-level tests ---


def test_tracking_route_returns_200_for_owner(tracking_client, db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address)
    token = create_access_token(customer.id, "customer")

    response = tracking_client.get(
        f"/orders/{order.id}/track", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Accepted"


def test_tracking_route_missing_token_rejected(tracking_client):
    response = tracking_client.get(f"/orders/{uuid.uuid4()}/track")
    assert response.status_code == 403


def test_tracking_route_wrong_role_rejected(tracking_client, db_session, customer, address, restaurant):
    order = _make_order(db_session, customer, restaurant, address)
    restaurant_token = create_access_token(restaurant.id, "restaurant")

    response = tracking_client.get(
        f"/orders/{order.id}/track", headers={"Authorization": f"Bearer {restaurant_token}"}
    )
    assert response.status_code == 403

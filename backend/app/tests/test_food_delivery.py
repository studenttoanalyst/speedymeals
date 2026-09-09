"""
Phase 4 Steps 6-7 — unit tests.

Covers the restaurant order status state machine (valid transitions, every
rejected direction, ownership, DB unchanged on rejection) and the commission
calculation helper (spec Sec 11 examples + money precision + edge cases).

Reuses the shared `db_session` fixture from conftest.py (real Postgres,
transaction rolled back after each test) — same pattern as
test_wallet_payment.py. Service-level tests (no HTTP), matching how
Phase 3 Step 9 tested the wallet service.
"""
import uuid
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.modules.food_delivery import service
from app.modules.food_delivery.models import Order, Restaurant
from app.platform.users.models import Address, User


@pytest.fixture
def restaurant(db_session):
    unique = uuid.uuid4().hex[:8]
    r = Restaurant(
        name="Test Restaurant",
        email=f"rest-{unique}@t.com",
        password_hash="x",
        phone_number=f"+92300{unique}",
        commission_rate=10,
        status="active",
        country_code="+92",
        currency="PKR",
    )
    db_session.add(r)
    db_session.commit()
    db_session.refresh(r)
    return r


def _make_order(db, restaurant, status="Accepted", user=None, address=None):
    """Build a user + address + order row (same required fields as Phase 1's
    orders table). Fresh user/address per call so repeated tests never
    collide on unique constraints."""
    unique = uuid.uuid4().hex[:8]
    if user is None:
        user = User(phone_number=f"+92319{unique}", name="Test Customer", country_code="+92")
        db.add(user)
        db.flush()
    if address is None:
        address = Address(user_id=user.id, latitude=31.5, longitude=74.3,
                          full_address="Street A", label="Home")
        db.add(address)
        db.flush()

    order = Order(
        user_id=user.id,
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
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


# --- Step 7: commission helper ---


def test_commission_1000_at_10_percent(db_session):
    result = service.calculate_commission(1000, 10)
    assert result["commission_amount"] == Decimal("100.00")
    assert result["restaurant_payable"] == Decimal("900.00")


def test_commission_2500_at_15_percent(db_session):
    result = service.calculate_commission(2500, 15)
    assert result["commission_amount"] == Decimal("375.00")
    assert result["restaurant_payable"] == Decimal("2125.00")


def test_commission_accepts_decimal_inputs_like_db_numeric_columns(db_session):
    # DB Numeric columns come back as Decimal from SQLAlchemy — helper must
    # handle them directly, not just floats.
    result = service.calculate_commission(Decimal("1000"), Decimal("10"))
    assert result["commission_amount"] == Decimal("100.00")
    assert result["restaurant_payable"] == Decimal("900.00")


def test_commission_keeps_paisa_precision(db_session):
    # 333.33 @ 10% = 33.333 -> rounded to 33.33, payable 300.00
    result = service.calculate_commission(333.33, 10)
    assert result["commission_amount"] == Decimal("33.33")
    assert result["restaurant_payable"] == Decimal("300.00")


def test_commission_zero_rate_is_valid(db_session):
    result = service.calculate_commission(1000, 0)
    assert result["commission_amount"] == Decimal("0.00")
    assert result["restaurant_payable"] == Decimal("1000.00")


def test_commission_100_percent_rate_is_valid(db_session):
    result = service.calculate_commission(1000, 100)
    assert result["commission_amount"] == Decimal("1000.00")
    assert result["restaurant_payable"] == Decimal("0.00")


def test_commission_rejects_negative_subtotal(db_session):
    with pytest.raises(ValueError):
        service.calculate_commission(-100, 10)


def test_commission_rejects_zero_subtotal(db_session):
    with pytest.raises(ValueError):
        service.calculate_commission(0, 10)


def test_commission_rejects_negative_rate(db_session):
    with pytest.raises(ValueError):
        service.calculate_commission(1000, -5)


def test_commission_rejects_rate_above_100(db_session):
    with pytest.raises(ValueError):
        service.calculate_commission(1000, 101)


# --- Step 6: order status transition ---


def test_status_accepted_to_preparing(db_session, restaurant):
    order = _make_order(db_session, restaurant, status="Accepted")
    result = service.update_order_status(db_session, restaurant.id, order.id, "Preparing")
    assert result["status"] == "Preparing"
    db_session.refresh(order)
    assert order.status == "Preparing"


def test_status_preparing_to_ready_for_pickup(db_session, restaurant):
    order = _make_order(db_session, restaurant, status="Preparing")
    result = service.update_order_status(db_session, restaurant.id, order.id, "Ready for Pickup")
    assert result["status"] == "Ready for Pickup"
    db_session.refresh(order)
    assert order.status == "Ready for Pickup"


def test_status_skip_transition_rejected(db_session, restaurant):
    order = _make_order(db_session, restaurant, status="Accepted")
    with pytest.raises(HTTPException) as exc_info:
        service.update_order_status(db_session, restaurant.id, order.id, "Ready for Pickup")
    assert exc_info.value.status_code == 400
    db_session.refresh(order)
    assert order.status == "Accepted"  # DB untouched after rejection


def test_status_backward_transition_rejected(db_session, restaurant):
    order = _make_order(db_session, restaurant, status="Preparing")
    with pytest.raises(HTTPException) as exc_info:
        service.update_order_status(db_session, restaurant.id, order.id, "Accepted")
    assert exc_info.value.status_code == 400
    db_session.refresh(order)
    assert order.status == "Preparing"


def test_status_no_further_transition_from_ready_for_pickup(db_session, restaurant):
    order = _make_order(db_session, restaurant, status="Ready for Pickup")
    with pytest.raises(HTTPException) as exc_info:
        service.update_order_status(db_session, restaurant.id, order.id, "Preparing")
    assert exc_info.value.status_code == 400
    db_session.refresh(order)
    assert order.status == "Ready for Pickup"


def test_status_arbitrary_value_rejected(db_session, restaurant):
    order = _make_order(db_session, restaurant, status="Accepted")
    with pytest.raises(HTTPException) as exc_info:
        service.update_order_status(db_session, restaurant.id, order.id, "Delivered")
    assert exc_info.value.status_code == 400
    db_session.refresh(order)
    assert order.status == "Accepted"


def test_status_unknown_source_status_rejected(db_session, restaurant):
    order = _make_order(db_session, restaurant, status="Placed")
    with pytest.raises(HTTPException) as exc_info:
        service.update_order_status(db_session, restaurant.id, order.id, "Preparing")
    assert exc_info.value.status_code == 400
    db_session.refresh(order)
    assert order.status == "Placed"


def test_status_ownership_enforced(db_session, restaurant):
    # Second restaurant owns a separate order; the first must not touch it.
    other = Restaurant(
        name="Other Restaurant",
        email=f"other-{uuid.uuid4().hex[:8]}@t.com",
        password_hash="x",
        phone_number=f"+92301{uuid.uuid4().hex[:8]}",
        commission_rate=10,
        status="active",
        country_code="+92",
        currency="PKR",
    )
    db_session.add(other)
    db_session.commit()
    other_order = _make_order(db_session, other, status="Accepted")

    with pytest.raises(HTTPException) as exc_info:
        service.update_order_status(db_session, restaurant.id, other_order.id, "Preparing")
    assert exc_info.value.status_code == 404
    db_session.refresh(other_order)
    assert other_order.status == "Accepted"  # owner's order unchanged
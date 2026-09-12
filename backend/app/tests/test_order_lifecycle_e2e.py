"""
Phase 11 gap fix — true end-to-end order lifecycle test.

Every existing test exercises one phase's slice in isolation, usually
against a hand-built Order row (bypassing place_order/checkout) or a
hand-built rider-assignment state. This file chains the REAL functions
in the REAL order: place_order (checkout) -> restaurant Preparing ->
Ready for Pickup (auto rider-assignment) -> rider accept -> Arrived ->
Picked Up -> On the Way -> Delivered, for both COD and Digital, and
asserts the Sec 11 money numbers hold at every stage including the
final wallet/cash-owed side effects.
"""
import uuid
from datetime import datetime, timezone

import pytest

from app.core import maps_client
from app.core.redis_client import redis_client
from app.modules.food_delivery import service as food_service
from app.modules.food_delivery.models import MenuItem, Restaurant
from app.modules.food_delivery.schemas import CartAddItemSchema
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service as wallet_service
from app.platform.wallet_payment.models import Rider


# --- helpers (self-contained, same pattern as other test files) ---


def _make_restaurant(db):
    unique = uuid.uuid4().hex[:8]
    r = Restaurant(
        name=f"E2E Rest {unique}",
        email=f"e2e-{unique}@t.com",
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


def _make_menu_item(db, restaurant, price=1000):
    item = MenuItem(
        restaurant_id=restaurant.id, name="Biryani", description="Biryani", price=price,
        category="Main", photo_url=None, variants=None, is_available=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _make_customer(db):
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92329{unique}", name="E2E Customer", country_code="+92")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_address(db, customer):
    a = Address(user_id=customer.id, latitude=31.52, longitude=74.35, full_address="Home")
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def _make_eligible_rider(db, wallet=1000):
    """Online, approved, funded, with a fresh live location — everything
    rider_eligible_for_assignment() checks for."""
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique}",
        name=f"E2E Rider {unique}",
        cnic_number=f"cnic-{unique}",
        approval_status="approved",
        wallet_balance=wallet,
        pending_cash_owed=0,
        is_online=True,
        country_code="+92",
        is_active=True,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    wallet_service.update_rider_location(db, r.id, 31.531, 74.361)  # near the restaurant
    return r


def _cleanup_rider_location(rider_id):
    redis_client.delete(wallet_service._rider_location_key(rider_id))


def _run_full_lifecycle(db_session, monkeypatch, payment_method: str):
    """Shared driver: place -> Preparing -> Ready for Pickup (auto-assign)
    -> rider accept -> Arrived -> Picked Up -> On the Way -> Delivered.
    Returns (order_row, rider_row) after delivery for the caller to assert on.
    """
    restaurant = _make_restaurant(db_session)
    item = _make_menu_item(db_session, restaurant, price=1000)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_eligible_rider(db_session)

    monkeypatch.setattr(maps_client, "get_road_distance_km", lambda *a: 3.0)

    try:
        food_service.add_cart_item(
            db_session, customer.id, restaurant.id, CartAddItemSchema(item_id=item.id, qty=1)
        )

        placed = food_service.place_order(
            db_session, customer.id, restaurant.id, address.id, payment_method
        )
        order_id = placed["id"]
        assert placed["status"] == "Accepted"

        # Sec 11 exact numbers hold at placement time regardless of payment method.
        assert placed["food_subtotal"] == 1000
        assert placed["delivery_fee"] == 110
        assert placed["commission_amount"] == 100
        assert placed["restaurant_payable"] == 900
        assert placed["rider_earning"] == 110
        assert placed["total_amount"] == 1110

        food_service.update_order_status(db_session, restaurant.id, order_id, "Preparing")

        ready = food_service.update_order_status(db_session, restaurant.id, order_id, "Ready for Pickup")
        assert ready["status"] == "Rider Assigned"
        db_session.expire_all()
        assigned_order = db_session.query(food_service.Order).filter(food_service.Order.id == order_id).first()
        assert assigned_order.rider_id == rider.id  # only eligible rider -> auto-assigned to them

        accepted = food_service.rider_respond_to_assignment(db_session, rider.id, order_id, "accept")
        assert accepted["status"] == "Accepted by Rider"

        for step in ("Arrived at Restaurant", "Picked Up", "On the Way", "Delivered"):
            result = food_service.rider_advance_delivery_status(db_session, rider.id, order_id, step)
            assert result["status"] == step

        db_session.refresh(rider)
        order = (
            db_session.query(food_service.Order)
            .filter(food_service.Order.id == order_id)
            .first()
        )
        return order, rider
    finally:
        _cleanup_rider_location(rider.id)


# --- COD path ---


def test_full_lifecycle_cod(db_session, monkeypatch):
    order, rider = _run_full_lifecycle(db_session, monkeypatch, "COD")

    assert order.status == "Delivered"
    assert order.delivered_at is not None

    # Rs. 10 flat deduction, exactly once (spec Sec 3.1).
    assert float(rider.wallet_balance) == 990  # started at 1000

    # COD: full order total added to pending_cash_owed (spec Sec 3.4).
    assert float(rider.pending_cash_owed) == 1110


# --- Digital path ---


def test_full_lifecycle_digital(db_session, monkeypatch):
    order, rider = _run_full_lifecycle(db_session, monkeypatch, "Digital")

    assert order.status == "Delivered"
    assert order.delivered_at is not None

    # Same Rs. 10 deduction regardless of payment method (spec Sec 3.1/11).
    assert float(rider.wallet_balance) == 990

    # Digital: no cash exchanged, pending_cash_owed untouched.
    assert float(rider.pending_cash_owed) == 0
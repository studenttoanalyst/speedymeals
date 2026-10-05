"""
Post-paid rider COD ledger, 10% delivery commission & Rs. 15 platform fee.

Covers the finalized SpeedyMeals business model:
  - 10% platform / 90% rider split of the delivery fee on Delivered orders
    (COD debits the 10% from the wallet; Digital credits the 90% share).
  - COD cash tracking: pending_cash_owed accrues food + delivery fee.
  - Rs. 5,000 COD cap: assignment is blocked, the rider is forced offline,
    and going online is rejected until an admin approves their cash deposit.

Follows the same self-contained helper/fixture pattern as
test_delivered_side_effects.py / test_rider_assignment.py.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.core.redis_client import redis_client
from app.modules.food_delivery import service as food_service
from app.modules.food_delivery.models import Order, Restaurant
from app.modules.food_delivery.schemas import CartAddItemSchema
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service as wallet_service
from app.platform.wallet_payment.models import Rider, WalletTransaction

COD_CAP = wallet_service.settings.CASH_COLLECTION_CAP  # 5000


# --- helpers ---


def _make_restaurant(db, latitude=31.53, longitude=74.36):
    unique = uuid.uuid4().hex[:8]
    r = Restaurant(
        name=f"Payout Rest {unique}",
        email=f"rest-{unique}@t.com",
        password_hash="x",
        phone_number=f"+92300{unique}",
        commission_rate=10,
        status="active",
        latitude=latitude,
        longitude=longitude,
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


def _make_order(db, restaurant, customer, address, rider=None, payment_method="COD", status="On the Way"):
    """Food 500 + delivery fee for 3 km (175) — total includes the Rs.15
    platform fee so the frozen row matches real checkout output."""
    delivery_fee = food_service.calculate_delivery_fee(3)
    order = Order(
        user_id=customer.id,
        restaurant_id=restaurant.id,
        delivery_address_id=address.id,
        status=status,
        payment_method=payment_method,
        food_subtotal=500,
        delivery_distance_km=3,
        delivery_fee=delivery_fee,
        total_amount=500 + delivery_fee + food_service.PLATFORM_FEE,
        commission_amount=50,
        restaurant_payable=450,
        rider_earning=(delivery_fee * wallet_service.RIDER_DELIVERY_SHARE),
        rider_id=rider.id if rider else None,
        country_code="+92",
        currency="PKR",
        placed_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _make_rider(db, wallet=1000, pending_cash_owed=0, is_online=True):
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique}",
        name=f"Payout Rider {unique}",
        cnic_number=f"cnic-{unique}",
        approval_status="approved",
        wallet_balance=wallet,
        pending_cash_owed=pending_cash_owed,
        is_online=is_online,
        country_code="+92",
        is_active=True,
        kit_completed=True,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _cleanup(rider_id):
    redis_client.delete(wallet_service._rider_location_key(rider_id))


# --- 10% commission split ---


def test_cod_delivery_debits_platform_10_percent_from_wallet(db_session):
    """COD: the platform's 10% delivery-fee cut comes out of the wallet."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, rider, "COD")

    food_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 982.50  # 1000 - 10% of 175

    txn = (
        db_session.query(WalletTransaction)
        .filter(
            WalletTransaction.rider_id == rider.id,
            WalletTransaction.order_id == order.id,
        )
        .one()
    )
    assert txn.type == "deduction"
    assert float(txn.amount) == 17.50
    assert float(txn.balance_after) == 982.50


def test_digital_delivery_credits_rider_90_percent_share(db_session):
    """Digital: the platform holds the money, so the rider's 90% is credited."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, rider, "Digital")

    food_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 1157.50  # 1000 + 90% of 175

    txn = (
        db_session.query(WalletTransaction)
        .filter(
            WalletTransaction.rider_id == rider.id,
            WalletTransaction.order_id == order.id,
        )
        .one()
    )
    assert txn.type == "earning"
    assert float(txn.amount) == 157.50


def test_delivery_commission_rates_sum_to_one():
    assert wallet_service.DELIVERY_COMMISSION_RATE == Decimal("0.10")
    assert wallet_service.RIDER_DELIVERY_SHARE == Decimal("0.90")
    assert (
        wallet_service.DELIVERY_COMMISSION_RATE + wallet_service.RIDER_DELIVERY_SHARE
        == Decimal("1.00")
    )


# --- COD cash ledger ---


def test_cod_pending_cash_tracks_food_plus_delivery_only(db_session):
    """pending_cash_owed accrues food + delivery fee, excluding the Rs.15 fee."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=100)
    order = _make_order(db_session, restaurant, customer, address, rider, "COD")

    food_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(rider)
    # 100 + 500 (food) + 175 (delivery) — the 15 platform fee is NOT included.
    assert float(rider.pending_cash_owed) == 775


def test_digital_delivery_leaves_pending_cash_untouched(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=300)
    order = _make_order(db_session, restaurant, customer, address, rider, "Digital")

    food_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(rider)
    assert float(rider.pending_cash_owed) == 300  # unchanged


# --- Rs. 5,000 COD cap ---


def test_cod_delivery_forces_rider_offline_at_cap(db_session):
    """Crossing the cap on a COD delivery switches the rider offline."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    start = COD_CAP - 100  # one more COD accrual tips the rider over the cap
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=start, is_online=True)
    order = _make_order(db_session, restaurant, customer, address, rider, "COD")

    food_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(rider)
    assert float(rider.pending_cash_owed) == start + 675
    assert float(rider.pending_cash_owed) >= COD_CAP
    assert rider.is_online is False


def test_cod_delivery_below_cap_keeps_rider_online(db_session):
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=1000, is_online=True)
    order = _make_order(db_session, restaurant, customer, address, rider, "COD")

    food_service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(rider)
    assert float(rider.pending_cash_owed) == 1675
    assert rider.is_online is True


def test_cod_rider_at_cap_is_not_assigned(db_session):
    """A rider at the COD cap is skipped by the nearest-rider search."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(
        db_session, restaurant, customer, address, rider=None, payment_method="COD",
        status="Preparing",
    )
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=COD_CAP, is_online=True)
    wallet_service.update_rider_location(db_session, rider.id, 31.531, 74.361)

    try:
        result = food_service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Ready for Pickup"  # capped rider skipped
        db_session.refresh(order)
        assert order.rider_id is None
    finally:
        _cleanup(rider.id)


def test_digital_order_ignores_cod_cap_in_assignment(db_session):
    """The cap only blocks COD — a capped rider can still take Digital work."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    order = _make_order(
        db_session, restaurant, customer, address, rider=None, payment_method="Digital",
        status="Preparing",
    )
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=COD_CAP, is_online=True)
    wallet_service.update_rider_location(db_session, rider.id, 31.531, 74.361)

    try:
        result = food_service.update_order_status(
            db_session, restaurant.id, order.id, "Ready for Pickup"
        )
        assert result["status"] == "Rider Assigned"
        db_session.refresh(order)
        assert order.rider_id == rider.id
    finally:
        _cleanup(rider.id)


def test_going_online_blocked_while_over_cod_cap(db_session):
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=COD_CAP, is_online=False)

    with pytest.raises(HTTPException) as exc_info:
        wallet_service.set_online_status(db_session, rider.id, True)
    assert exc_info.value.status_code == 400
    assert "cap" in exc_info.value.detail.lower()


# --- admin approval gate ---


def test_deposit_does_not_restore_cod_until_admin_approves(db_session):
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=COD_CAP, is_online=False)

    deposit = wallet_service.create_cash_deposit(db_session, rider.id, COD_CAP, "bank_transfer")
    assert deposit.verified_by_admin is False
    db_session.refresh(rider)
    assert wallet_service.can_assign_cod(db_session, rider.id) is False

    wallet_service.approve_cash_deposit(db_session, deposit.id)
    db_session.refresh(rider)
    assert float(rider.pending_cash_owed) == 0
    assert wallet_service.can_assign_cod(db_session, rider.id) is True

    # ...and the rider can go back online.
    assert wallet_service.set_online_status(db_session, rider.id, True).is_online is True


def test_deposit_never_overdrops_pending_cash(db_session):
    rider = _make_rider(db_session, wallet=1000, pending_cash_owed=100, is_online=True)

    deposit = wallet_service.create_cash_deposit(db_session, rider.id, 1000, "hub")
    wallet_service.approve_cash_deposit(db_session, deposit.id)

    db_session.refresh(rider)
    assert float(rider.pending_cash_owed) == 0  # floored, never negative

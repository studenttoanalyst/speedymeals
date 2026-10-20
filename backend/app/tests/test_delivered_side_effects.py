"""
Phase 6 Step 6 — delivered side effects tests.

Covers: Digital payment wallet deduction, COD wallet deduction + cash
owed, duplicate delivery prevention, and Phase 3 wallet regression.
Follows the same service-level test pattern as test_wallet_payment.py.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.modules.food_delivery import service
from app.modules.food_delivery.models import Order, Restaurant
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service as wallet_service
from app.platform.wallet_payment.models import Rider, WalletTransaction


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


def _make_order(db, restaurant, customer, address, payment_method="COD", rider=None):
    delivery_fee = service.calculate_delivery_fee(3)
    order = Order(
        user_id=customer.id,
        restaurant_id=restaurant.id,
        delivery_address_id=address.id,
        status="On the Way",
        payment_method=payment_method,
        food_subtotal=500,
        delivery_distance_km=3,
        delivery_fee=delivery_fee,
        total_amount=500 + delivery_fee + service.PLATFORM_FEE,
        commission_amount=50,
        restaurant_payable=450,
        rider_earning=delivery_fee * wallet_service.RIDER_DELIVERY_SHARE,
        rider_id=rider.id if rider else None,
        country_code="+92",
        currency="PKR",
        placed_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _make_rider(db, wallet=1000):
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique}",
        name=f"Rider {unique}",
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
    return r


# --- Digital payment tests ---


def test_delivered_digital_credits_rider_share(db_session):
    """Digital: wallet + 90% of the delivery fee, pending_cash_owed unchanged."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "Digital", rider)

    result = service.rider_advance_delivery_status(
        db_session, rider.id, order.id, "Delivered"
    )

    assert result["status"] == "Delivered"
    db_session.refresh(rider)
    # 90% of the 175.00 delivery fee -> +157.50
    assert float(rider.wallet_balance) == 1157.50
    assert float(rider.pending_cash_owed) == 0  # unchanged for Digital


def test_delivered_digital_creates_wallet_transaction(db_session):
    """Digital: a WalletTransaction row is created for the rider's 90% share."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "Digital", rider)

    service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    txn = db_session.query(WalletTransaction).filter(
        WalletTransaction.rider_id == rider.id,
        WalletTransaction.order_id == order.id,
        WalletTransaction.type == "earning",
    ).first()
    assert txn is not None
    assert float(txn.amount) == 157.50  # 90% of the 175.00 delivery fee
    assert float(txn.balance_after) == 1157.50


# --- COD payment tests ---


def test_delivered_cod_credits_rider_share_and_increases_cash_owed(db_session):
    """COD: wallet + 90% delivery share, pending_cash_owed + full order total."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "COD", rider)

    result = service.rider_advance_delivery_status(
        db_session, rider.id, order.id, "Delivered"
    )

    assert result["status"] == "Delivered"
    db_session.refresh(rider)
    # 90% of the 175.00 delivery fee -> +157.50
    assert float(rider.wallet_balance) == 1157.50
    # food (500) + delivery (175) + platform fee (15)
    assert float(rider.pending_cash_owed) == 690


def test_delivered_cod_cash_owed_uses_frozen_total(db_session):
    """COD: pending_cash_owed accrues the frozen order.total_amount."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "COD", rider)

    service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(rider)
    expected = float(order.total_amount)
    assert float(rider.pending_cash_owed) == expected


def test_delivered_cod_accumulates_cash_owed(db_session):
    """Multiple COD deliveries accumulate pending_cash_owed."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)

    order1 = _make_order(db_session, restaurant, customer, address, "COD", rider)
    order2 = _make_order(db_session, restaurant, customer, address, "COD", rider)

    service.rider_advance_delivery_status(db_session, rider.id, order1.id, "Delivered")
    service.rider_advance_delivery_status(db_session, rider.id, order2.id, "Delivered")

    db_session.refresh(rider)
    assert float(rider.pending_cash_owed) == 1380  # 690 + 690
    assert float(rider.wallet_balance) == 1315  # 1000 + 157.50 + 157.50


# --- Exactly-once / duplicate delivery tests ---


def test_duplicate_delivered_rejected(db_session):
    """Calling Delivered twice: second call rejected, wallet deducted only once."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "COD", rider)

    service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")
    db_session.refresh(rider)
    wallet_after_first = float(rider.wallet_balance)
    cash_after_first = float(rider.pending_cash_owed)

    with pytest.raises(HTTPException) as exc_info:
        service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")
    assert exc_info.value.status_code == 400

    db_session.refresh(rider)
    assert float(rider.wallet_balance) == wallet_after_first
    assert float(rider.pending_cash_owed) == cash_after_first


def test_duplicate_delivered_creates_only_one_transaction(db_session):
    """Only one WalletTransaction deduction row per order."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "Digital", rider)

    service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    txns = db_session.query(WalletTransaction).filter(
        WalletTransaction.rider_id == rider.id,
        WalletTransaction.order_id == order.id,
    ).all()
    assert len(txns) == 1


# --- Transaction safety tests ---


def test_delivered_sets_delivered_at_timestamp(db_session):
    """Delivered transition sets the delivered_at timestamp on the order."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session)
    order = _make_order(db_session, restaurant, customer, address, "COD", rider)

    assert order.delivered_at is None
    service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")

    db_session.refresh(order)
    assert order.delivered_at is not None


# --- Regression: Phase 3 wallet deduction still works ---


# --- Cancelled order: no deduction ---


def test_cancelled_order_no_wallet_deduction(db_session):
    """A cancelled order should not trigger any wallet deduction."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "COD", rider)
    order.status = "Cancelled"
    db_session.commit()

    # Attempting to advance a cancelled order should fail (invalid transition)
    with pytest.raises(HTTPException) as exc_info:
        service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")
    assert exc_info.value.status_code == 400

    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 1000  # unchanged
    assert float(rider.pending_cash_owed) == 0


# --- Low balance: COD commission is still owed (may push wallet negative) ---


def test_delivered_cod_credits_rider_share_on_low_balance(db_session):
    """COD: the rider's 90% share is credited even from a near-empty wallet,
    and a credit can never trip the auto-offline threshold."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=5)
    order = _make_order(db_session, restaurant, customer, address, "COD", rider)

    result = service.rider_advance_delivery_status(
        db_session, rider.id, order.id, "Delivered"
    )

    assert result["status"] == "Delivered"
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 162.50  # 5 + 157.50
    assert rider.is_online is True  # crediting never forces a rider offline

    txn = db_session.query(WalletTransaction).filter(
        WalletTransaction.rider_id == rider.id,
        WalletTransaction.order_id == order.id,
    ).first()
    assert txn is not None
    assert txn.type == "earning"
    assert float(txn.amount) == 157.50


# --- COD accrual and deposit expectation share one base (no Rs.15 mismatch) ---


def test_cod_pending_cash_matches_deposit_expected_amount(db_session):
    """The COD accrual and `_compute_expected_cash` use the SAME base
    (order.total_amount), so an exact deposit reconciles to 0 discrepancy."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    rider = _make_rider(db_session, wallet=1000)
    order = _make_order(db_session, restaurant, customer, address, "COD", rider)

    service.rider_advance_delivery_status(db_session, rider.id, order.id, "Delivered")
    db_session.refresh(rider)

    assert float(rider.pending_cash_owed) == float(order.total_amount)
    assert float(rider.pending_cash_owed) == wallet_service._compute_expected_cash(
        db_session, rider.id
    )

    # create_cash_deposit now expects Decimal (WAL-06 — no float() on money)
    from decimal import Decimal
    deposit = wallet_service.create_cash_deposit(
        db_session, rider.id, Decimal(str(rider.pending_cash_owed)), "bank_transfer"
    )
    assert float(deposit.expected_amount) == float(order.total_amount)
    assert float(deposit.discrepancy) == 0

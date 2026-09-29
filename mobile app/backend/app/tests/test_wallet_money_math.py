"""
Phase 11 gap fix — money-math coverage for the 3 wallet_payment/service.py
functions left as TODO in test_wallet_payment.py ("needs real `orders`
rows, Phase 5 doesn't exist yet"). Phase 5 (orders) is done now, so this
fills that gap: _compute_expected_cash (via create_cash_deposit),
create_cash_deposit's discrepancy math, and get_rider_earnings_summary.
Same helper/fixture pattern as test_delivered_side_effects.py.
"""
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.modules.food_delivery.models import Order, Restaurant
from app.modules.food_delivery.service import calculate_delivery_fee
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service
from app.platform.wallet_payment.models import CashDeposit, Rider, RiderPayout


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


def _make_order(
    db, restaurant, customer, address, rider,
    payment_method="COD", total_amount=675, rider_earning=175, delivered_at=None,
):
    order = Order(
        user_id=customer.id,
        restaurant_id=restaurant.id,
        delivery_address_id=address.id,
        rider_id=rider.id,
        status="Delivered",
        payment_method=payment_method,
        food_subtotal=500,
        delivery_distance_km=3,
        delivery_fee=calculate_delivery_fee(3),
        total_amount=total_amount,
        commission_amount=50,
        restaurant_payable=450,
        rider_earning=rider_earning,
        country_code="+92",
        currency="PKR",
        placed_at=datetime.now(timezone.utc),
        delivered_at=delivered_at or datetime.now(timezone.utc),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture
def scenario(db_session, rider):
    """rider fixture (conftest) + a restaurant/customer/address to hang
    orders off of."""
    restaurant = _make_restaurant(db_session)
    customer = _make_customer(db_session)
    address = _make_address(db_session, customer)
    return {"restaurant": restaurant, "customer": customer, "address": address}


# --- _compute_expected_cash (via create_cash_deposit) ---


def test_expected_cash_sums_cod_delivered_orders_only(db_session, rider, scenario):
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, payment_method="COD", total_amount=675)
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, payment_method="Digital", total_amount=999)  # must NOT count

    deposit = service.create_cash_deposit(db_session, rider.id, 675, "bank_transfer")
    assert deposit.expected_amount == 675  # Digital order excluded


def test_expected_cash_only_counts_orders_after_last_deposit(db_session, rider, scenario):
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, total_amount=500)
    first = service.create_cash_deposit(db_session, rider.id, 500, "bank_transfer")
    assert first.expected_amount == 500

    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, total_amount=300)
    second = service.create_cash_deposit(db_session, rider.id, 300, "hub")
    # only the order placed after the first deposit counts, not the
    # already-deposited-for first order again
    assert second.expected_amount == 300


# --- create_cash_deposit: discrepancy math + pending_cash_owed update ---


def test_cash_deposit_discrepancy_positive_when_overage(db_session, rider, scenario):
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, total_amount=500)
    deposit = service.create_cash_deposit(db_session, rider.id, 550, "bank_transfer")
    assert deposit.discrepancy == 50  # submitted more than expected


def test_cash_deposit_discrepancy_negative_when_shortfall(db_session, rider, scenario):
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, total_amount=500)
    deposit = service.create_cash_deposit(db_session, rider.id, 400, "bank_transfer")
    assert deposit.discrepancy == -100  # submitted less than expected


def test_cash_deposit_reduces_pending_cash_owed_floored_at_zero(db_session, rider):
    rider.pending_cash_owed = 300
    db_session.add(rider)
    db_session.commit()

    service.create_cash_deposit(db_session, rider.id, 1000, "bank_transfer")  # over-deposit
    db_session.refresh(rider)
    assert float(rider.pending_cash_owed) == 0  # never goes negative


def test_cash_deposit_invalid_method_rejected(db_session, rider):
    with pytest.raises(HTTPException) as exc_info:
        service.create_cash_deposit(db_session, rider.id, 100, "cash_in_hand")
    assert exc_info.value.status_code == 400


# --- get_cod_eligibility ---


def test_cod_eligibility_shape_and_values(db_session, rider):
    rider.pending_cash_owed = 500
    db_session.add(rider)
    db_session.commit()

    result = service.get_cod_eligibility(db_session, rider.id)
    assert result == {
        "can_accept_cod": True,
        "pending_cash_owed": 500.0,
        "cap": service.settings.CASH_COLLECTION_CAP,
    }


def test_cod_eligibility_false_at_cap(db_session, rider):
    rider.pending_cash_owed = service.settings.CASH_COLLECTION_CAP
    db_session.add(rider)
    db_session.commit()

    result = service.get_cod_eligibility(db_session, rider.id)
    assert result["can_accept_cod"] is False


# --- get_rider_earnings_summary ---


def test_earnings_summary_sums_delivered_orders(db_session, rider, scenario):
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, rider_earning=110)
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, rider_earning=70)
    rider.wallet_balance = 250
    rider.pending_cash_owed = 40
    db_session.add(rider)
    db_session.commit()

    summary = service.get_rider_earnings_summary(db_session, rider.id)
    assert summary["earnings_balance"] == 180  # 110 + 70
    assert summary["wallet_balance"] == 250
    assert summary["pending_cash_owed"] == 40


def test_earnings_summary_excludes_orders_already_paid_out(db_session, rider, scenario):
    old_delivery = datetime.now(timezone.utc) - timedelta(days=10)
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, rider_earning=110, delivered_at=old_delivery)

    payout = RiderPayout(
        rider_id=rider.id,
        period_start=date.today() - timedelta(days=9),
        period_end=date.today() - timedelta(days=2),
        total_earning=110,
        status="paid",
    )
    db_session.add(payout)
    db_session.commit()

    # new order, delivered after the payout's period_end
    _make_order(db_session, scenario["restaurant"], scenario["customer"], scenario["address"],
                rider, rider_earning=70)

    summary = service.get_rider_earnings_summary(db_session, rider.id)
    assert summary["earnings_balance"] == 70  # old, already-paid-out 110 excluded


def test_earnings_summary_zero_when_no_delivered_orders(db_session, rider):
    summary = service.get_rider_earnings_summary(db_session, rider.id)
    assert summary["earnings_balance"] == 0
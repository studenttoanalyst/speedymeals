"""
Unit tests for wallet_payment/service.py.

Covers: first-recharge validation, recharge, go-online gates (kit + balance),
delivery deduction (correct amount, auto-offline at Rs.100, negative balance
prevention), cash-collection-cap boundary, and the GET /wallet/profile +
GET /wallet/assignments read views (service-level + route-level auth).
"""
import uuid
from datetime import date, datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.modules.food_delivery.models import Order, Restaurant
from app.modules.food_delivery.service import calculate_delivery_fee
from app.platform.auth.jwt_utils import create_access_token
from app.platform.users.models import Address, User
from app.platform.wallet_payment import service
from app.platform.wallet_payment.models import Rider, RiderPayout
from app.platform.wallet_payment.routes import router as wallet_router


def _make_active_rider(db, wallet=0):
    """Helper: create a rider with kit_completed=True for go-online tests."""
    import uuid
    unique = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique}", name=f"Rider {unique}",
        cnic_number=f"cnic-{unique}", approval_status="approved",
        wallet_balance=wallet, pending_cash_owed=0, is_online=False,
        country_code="+92", is_active=True, kit_completed=True,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


# --- Recharge ---


def test_recharge_wallet_credits_balance(db_session, rider):
    txn = service.recharge_wallet(db_session, rider.id, 500, "bank_transfer")
    assert txn.type == "recharge"
    assert txn.balance_after == 500
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 500


def test_recharge_wallet_invalid_method_rejected(db_session, rider):
    with pytest.raises(HTTPException) as exc_info:
        service.recharge_wallet(db_session, rider.id, 100, "paypal")
    assert exc_info.value.status_code == 400


def test_first_recharge_must_be_exactly_500(db_session, rider):
    with pytest.raises(HTTPException) as exc_info:
        service.recharge_wallet(db_session, rider.id, 300, "bank_transfer")
    assert exc_info.value.status_code == 400
    assert "First wallet recharge" in exc_info.value.detail


def test_first_recharge_exactly_500_succeeds(db_session, rider):
    txn = service.recharge_wallet(db_session, rider.id, 500, "bank_transfer")
    assert txn.amount == 500
    assert float(rider.wallet_balance) == 500


def test_subsequent_recharge_any_amount_allowed(db_session, rider):
    service.recharge_wallet(db_session, rider.id, 500, "bank_transfer")
    txn = service.recharge_wallet(db_session, rider.id, 200, "jazzcash")
    assert txn.amount == 200
    assert float(rider.wallet_balance) == 700


# --- Go-online: kit_completed gate ---


def test_set_online_blocks_without_kit(db_session, rider):
    service.recharge_wallet(db_session, rider.id, 500, "bank_transfer")
    with pytest.raises(HTTPException) as exc_info:
        service.set_online_status(db_session, rider.id, True)
    assert exc_info.value.status_code == 400
    assert "Kit" in exc_info.value.detail


def test_set_online_blocks_below_min(db_session):
    rider = _make_active_rider(db_session, wallet=0)
    with pytest.raises(HTTPException) as exc_info:
        service.set_online_status(db_session, rider.id, True)
    assert exc_info.value.status_code == 400
    assert "wallet balance" in exc_info.value.detail.lower()


def test_set_online_allows_above_min(db_session):
    rider = _make_active_rider(db_session, wallet=500)
    updated = service.set_online_status(db_session, rider.id, True)
    assert updated.is_online is True


def test_set_online_offline_always_allowed(db_session, rider):
    updated = service.set_online_status(db_session, rider.id, False)
    assert updated.is_online is False


# --- Delivery deduction ---


def test_deduct_delivery_fee_correct_amount(db_session):
    rider = _make_active_rider(db_session, wallet=1000)
    txn = service.deduct_delivery_fee(db_session, rider.id, None)

    assert txn.type == "deduction"
    assert float(txn.amount) == service.DELIVERY_WALLET_DEDUCTION
    assert float(txn.balance_after) == 990

    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 990


def test_deduct_delivery_fee_no_negative_balance(db_session):
    rider = _make_active_rider(db_session, wallet=5)
    txn = service.deduct_delivery_fee(db_session, rider.id, None)

    assert txn is None  # deduction skipped
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 5  # unchanged


def test_deduct_delivery_fee_does_not_force_offline_at_490(db_session):
    """Balance 500 -> deduction -> 490: rider stays online (offline only at <100)."""
    rider = _make_active_rider(db_session, wallet=500)
    service.set_online_status(db_session, rider.id, True)

    service.deduct_delivery_fee(db_session, rider.id, None)
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 490
    assert rider.is_online is True  # still online


def test_deduct_delivery_fee_triggers_reminder_at_100(db_session):
    """Balance 110 -> deduction -> 100: crosses reminder threshold."""
    rider = _make_active_rider(db_session, wallet=500)
    service.set_online_status(db_session, rider.id, True)
    rider.wallet_balance = 110
    db_session.commit()

    txn = service.deduct_delivery_fee(db_session, rider.id, None)
    assert txn is not None
    assert float(txn.balance_after) == 100
    db_session.refresh(rider)
    assert rider.is_online is True  # still online at exactly 100


def test_deduct_delivery_fee_forces_offline_below_100(db_session):
    """Balance 100 -> deduction -> 90: auto-offline."""
    rider = _make_active_rider(db_session, wallet=500)
    service.set_online_status(db_session, rider.id, True)
    rider.wallet_balance = 100
    db_session.commit()
    db_session.refresh(rider)
    assert rider.is_online is True

    service.deduct_delivery_fee(db_session, rider.id, None)
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 90
    assert rider.is_online is False


def test_deduct_delivery_fee_still_online_at_100(db_session):
    """Balance 120 -> two deductions -> 100: still online."""
    rider = _make_active_rider(db_session, wallet=500)
    service.set_online_status(db_session, rider.id, True)
    rider.wallet_balance = 120
    db_session.commit()

    service.deduct_delivery_fee(db_session, rider.id, None)
    service.deduct_delivery_fee(db_session, rider.id, None)
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 100
    assert rider.is_online is True


# --- COD cap ---


def test_can_assign_cod_true_below_cap(db_session, rider):
    rider.pending_cash_owed = service.settings.CASH_COLLECTION_CAP - 1
    db_session.add(rider)
    db_session.commit()
    assert service.can_assign_cod(db_session, rider.id) is True


def test_can_assign_cod_false_at_or_above_cap(db_session, rider):
    rider.pending_cash_owed = service.settings.CASH_COLLECTION_CAP
    db_session.add(rider)
    db_session.commit()
    assert service.can_assign_cod(db_session, rider.id) is False


# --- Rider wallet profile + assignment history (GET endpoints) ---


def _make_delivery_order(db, rider, status="Delivered", earning=175):
    """Helper: minimal Order + required FK rows assigned to `rider`
    (same shape as test_rider_accept_reject.py's _make_order)."""
    unique = uuid.uuid4().hex[:8]
    user = User(phone_number=f"+92329{unique}", name="Customer", country_code="+92")
    restaurant = Restaurant(
        name=f"Rest {unique}",
        email=f"rest-{unique}@t.com",
        password_hash="x",
        phone_number=f"+92301{unique}",
        commission_rate=10,
        status="active",
        country_code="+92",
        currency="PKR",
    )
    db.add_all([user, restaurant])
    db.commit()
    address = Address(user_id=user.id, latitude=31.52, longitude=74.35, full_address="Home")
    db.add(address)
    db.commit()

    now = datetime.now(timezone.utc)
    order = Order(
        user_id=user.id,
        restaurant_id=restaurant.id,
        rider_id=rider.id,
        delivery_address_id=address.id,
        status=status,
        payment_method="COD",
        food_subtotal=500,
        delivery_distance_km=3,
        delivery_fee=calculate_delivery_fee(3),
        total_amount=675,
        commission_amount=50,
        restaurant_payable=450,
        rider_earning=earning,
        country_code="+92",
        currency="PKR",
        placed_at=now,
        delivered_at=now if status == "Delivered" else None,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture
def wallet_read_client(db_session):
    app = FastAPI()
    app.include_router(wallet_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


# --- get_rider_wallet_profile (service-level) ---


def test_wallet_profile_sums_delivered_earnings_only(db_session, rider):
    _make_delivery_order(db_session, rider, status="Delivered", earning=110)
    _make_delivery_order(db_session, rider, status="Delivered", earning=130)
    _make_delivery_order(db_session, rider, status="Picked Up", earning=999)  # not delivered -> not counted
    rider.wallet_balance = 500
    db_session.add(rider)
    db_session.commit()

    result = service.get_rider_wallet_profile(db_session, rider.id)
    assert result["total_earnings"] == 240
    assert result["current_balance"] == 500
    assert result["pending_payouts"] == 0
    assert result["is_online"] is False


def test_wallet_profile_sums_only_pending_payouts(db_session, rider):
    db_session.add_all([
        RiderPayout(
            rider_id=rider.id, period_start=date(2026, 9, 1),
            period_end=date(2026, 9, 8), total_earning=240, status="Pending",
        ),
        RiderPayout(
            rider_id=rider.id, period_start=date(2026, 8, 25),
            period_end=date(2026, 8, 31), total_earning=100, status="Paid",
        ),
    ])
    db_session.commit()

    result = service.get_rider_wallet_profile(db_session, rider.id)
    assert result["pending_payouts"] == 240  # Paid payout excluded


def test_wallet_profile_unknown_rider_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        service.get_rider_wallet_profile(db_session, uuid.uuid4())
    assert exc_info.value.status_code == 404


# --- get_rider_assignments (service-level) ---


def test_rider_assignments_split_active_and_past(db_session, rider):
    active = _make_delivery_order(db_session, rider, status="Picked Up")
    past = _make_delivery_order(db_session, rider, status="Delivered")

    result = service.get_rider_assignments(db_session, rider.id)
    assert [a["id"] for a in result["active"]] == [active.id]
    assert [p["id"] for p in result["past"]] == [past.id]
    # payout details come from the frozen per-order snapshot columns
    assert result["past"][0]["rider_earning"] == 175
    assert result["past"][0]["delivered_at"] is not None
    assert result["active"][0]["delivered_at"] is None


def test_rider_assignments_excludes_other_riders(db_session, rider):
    other = _make_active_rider(db_session, wallet=500)
    _make_delivery_order(db_session, other, status="Delivered")
    mine = _make_delivery_order(db_session, rider, status="On the Way")

    result = service.get_rider_assignments(db_session, rider.id)
    assert [a["id"] for a in result["active"]] == [mine.id]
    assert result["past"] == []


def test_rider_assignments_unknown_rider_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        service.get_rider_assignments(db_session, uuid.uuid4())
    assert exc_info.value.status_code == 404


# --- route-level tests (GET /wallet/profile, GET /wallet/assignments) ---


def test_profile_route_returns_200_for_rider(wallet_read_client, db_session, rider):
    rider.wallet_balance = 500
    rider.is_online = True
    db_session.add(rider)
    db_session.commit()

    token = create_access_token(rider.id, "rider")
    response = wallet_read_client.get(
        "/wallet/profile", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "total_earnings": 0.0,
        "current_balance": 500.0,
        "pending_payouts": 0.0,
        "is_online": True,
    }


def test_profile_route_missing_token_rejected(wallet_read_client):
    assert wallet_read_client.get("/wallet/profile").status_code == 403


def test_profile_route_invalid_token_401(wallet_read_client):
    response = wallet_read_client.get(
        "/wallet/profile", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401


def test_profile_route_wrong_role_rejected(wallet_read_client):
    token = create_access_token(uuid.uuid4(), "customer")
    response = wallet_read_client.get(
        "/wallet/profile", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_assignments_route_returns_riders_orders(wallet_read_client, db_session, rider):
    active = _make_delivery_order(db_session, rider, status="Picked Up")
    past = _make_delivery_order(db_session, rider, status="Delivered")

    token = create_access_token(rider.id, "rider")
    response = wallet_read_client.get(
        "/wallet/assignments", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert [a["id"] for a in body["active"]] == [str(active.id)]
    assert [p["id"] for p in body["past"]] == [str(past.id)]
    assert body["past"][0]["rider_earning"] == 175.0


def test_assignments_route_missing_token_rejected(wallet_read_client):
    assert wallet_read_client.get("/wallet/assignments").status_code == 403


def test_assignments_route_wrong_role_rejected(wallet_read_client):
    token = create_access_token(uuid.uuid4(), "customer")
    response = wallet_read_client.get(
        "/wallet/assignments", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403

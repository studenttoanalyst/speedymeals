"""
Unit tests for wallet_payment/service.py.

Covers: first-recharge validation, recharge, go-online gates (kit + balance),
delivery deduction (correct amount, auto-offline at Rs.100, negative balance
prevention), cash-collection-cap boundary.
"""
import pytest
from fastapi import HTTPException

from app.platform.wallet_payment import service
from app.platform.wallet_payment.models import Rider


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

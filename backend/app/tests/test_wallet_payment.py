"""
Phase 3 Step 9 — unit tests for wallet_payment/service.py.

Covers: recharge, go-online min-balance gate, delivery deduction (fires
once, correct amount, correct transaction row), auto-force-offline,
cash-collection-cap boundary. Cash-deposit discrepancy calc and earnings
summary (Step 6/8) need real `orders` rows to be meaningful — Phase 5
(orders) isn't built yet, so those two are left as TODO here, to be
filled in once Phase 5 exists (not skipped silently — flagged below).
"""
import pytest
from fastapi import HTTPException

from app.platform.wallet_payment import service


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


def test_set_online_status_blocks_below_min(db_session, rider):
    # rider fixture starts at wallet_balance=0
    with pytest.raises(HTTPException) as exc_info:
        service.set_online_status(db_session, rider.id, True)
    assert exc_info.value.status_code == 400


def test_set_online_status_allows_above_min(db_session, rider):
    service.recharge_wallet(db_session, rider.id, 500, "bank_transfer")
    updated = service.set_online_status(db_session, rider.id, True)
    assert updated.is_online is True


def test_set_online_status_offline_always_allowed(db_session, rider):
    # never recharged, still allowed to go offline (already offline, but
    # the point is it doesn't raise even though balance is 0)
    updated = service.set_online_status(db_session, rider.id, False)
    assert updated.is_online is False


def test_deduct_delivery_fee_fires_once_correct_amount(db_session, rider):
    service.recharge_wallet(db_session, rider.id, 1000, "bank_transfer")
    txn = service.deduct_delivery_fee(db_session, rider.id, None)

    assert txn.type == "deduction"
    assert float(txn.amount) == service.DELIVERY_DEDUCTION_AMOUNT
    assert float(txn.balance_after) == 990

    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 990  # exactly one deduction, not two


def test_deduct_delivery_fee_forces_offline_below_min(db_session, rider):
    # recharge to exactly 505 -> one Rs.10 deduction drops it to 495, below
    # the Rs.500 minimum -> should auto force is_online to False
    service.recharge_wallet(db_session, rider.id, 505, "bank_transfer")
    service.set_online_status(db_session, rider.id, True)
    db_session.refresh(rider)
    assert rider.is_online is True  # confirm it was online before the deduction

    service.deduct_delivery_fee(db_session, rider.id, None)
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 495
    assert rider.is_online is False  # Step 4 fired


def test_deduct_delivery_fee_does_not_force_offline_when_still_above_min(db_session, rider):
    service.recharge_wallet(db_session, rider.id, 1000, "bank_transfer")
    service.set_online_status(db_session, rider.id, True)

    service.deduct_delivery_fee(db_session, rider.id, None)
    db_session.refresh(rider)
    assert float(rider.wallet_balance) == 990
    assert rider.is_online is True  # still well above 500, untouched


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


# TODO (Phase 5 dependency, not skipped silently — flagged here):
# test_create_cash_deposit_discrepancy_calc and
# test_get_rider_earnings_summary need real `orders` rows (payment_method,
# status="Delivered", total_amount, rider_earning) to exercise the
# time-window sum logic. Phase 5 (orders) doesn't exist yet, so these are
# written once that phase lands, not faked with a mock Order row now.

"""
Wallet business logic.
Step 2: recharge + balance read.
Step 3/4: go-online toggle with min-balance check + auto-force-offline.
Step 5: delivery-fee deduction (standalone function, NOT an endpoint —
real trigger is order "Delivered" status change, Phase 6's job. Phase 6
will call `deduct_delivery_fee()` directly; nothing here needs to change
when that wiring happens).
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.platform.wallet_payment.models import Rider, WalletTransaction

MIN_WALLET_BALANCE = 500  # spec Sec 3.1 / Sec 8 Step 4 — required to go online
DELIVERY_DEDUCTION_AMOUNT = 10  # spec Sec 3.1 — flat Rs. 10 per completed delivery

VALID_RECHARGE_METHODS = {"bank_transfer", "jazzcash", "easypaisa", "card"}


def _get_rider_or_404(db: Session, rider_id: uuid.UUID) -> Rider:
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider not found.",
        )
    return rider


def _force_offline_if_below_min(rider: Rider) -> None:
    """
    Step 4 — shared helper, called after ANY balance decrease (currently
    only Step 5's deduction; recharge only increases balance so never
    needs this). Does not commit — caller controls the transaction so this
    stays part of the same atomic write as the deduction/balance change.
    """
    if float(rider.wallet_balance) < MIN_WALLET_BALANCE:
        rider.is_online = False


def recharge_wallet(db: Session, rider_id: uuid.UUID, amount: float, method: str) -> WalletTransaction:
    """
    Step 2 — manual-entry recharge (MVP: no real gateway call, just record
    + credit). Real JazzCash/EasyPaisa/card gateway integration is a stub
    for a later step — this trusts `amount` as already-received money,
    matching how the spec describes MVP-stage manual reconciliation.
    """
    if method not in VALID_RECHARGE_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid recharge method. Must be one of: {sorted(VALID_RECHARGE_METHODS)}.",
        )

    rider = _get_rider_or_404(db, rider_id)

    rider.wallet_balance = float(rider.wallet_balance) + amount
    db.add(rider)

    txn = WalletTransaction(
        rider_id=rider.id,
        order_id=None,  # recharge has no order — only a delivery deduction does
        type="recharge",
        amount=amount,
        balance_after=rider.wallet_balance,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def get_wallet_summary(db: Session, rider_id: uuid.UUID) -> Rider:
    """Step 2 — read-only balance view (Sec 8 Step 13, minus earnings_balance
    which needs orders table, Phase 6 scope). Returns the Rider row itself;
    the route's response_model picks the 3 fields it needs off it."""
    return _get_rider_or_404(db, rider_id)


def set_online_status(db: Session, rider_id: uuid.UUID, is_online: bool) -> Rider:
    """
    Step 3 — go-online toggle. Going online requires wallet_balance >= 500
    (spec Sec 8 Step 4-5); going offline always allowed, no balance check
    needed (that direction never needs guarding).
    """
    rider = _get_rider_or_404(db, rider_id)

    if is_online and float(rider.wallet_balance) < MIN_WALLET_BALANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Minimum wallet balance of Rs. {MIN_WALLET_BALANCE} required to go online. "
                f"Current balance: Rs. {rider.wallet_balance}. Please recharge."
            ),
        )

    rider.is_online = is_online
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


def deduct_delivery_fee(db: Session, rider_id: uuid.UUID, order_id: uuid.UUID) -> WalletTransaction:
    """
    Step 5 — the Rs. 10 auto-deduction on order "Delivered" (spec Sec 3.1 /
    Sec 8 Step 10). Standalone function, not wired to any route here — this
    file only builds + will be unit-tested (Step 9) against it; Phase 6's
    "mark Delivered" endpoint is the actual caller once that phase exists.
    Deduction fires regardless of resulting balance going below 0 or below
    the Rs. 500 minimum — the minimum is only enforced at the go-online
    gate (Step 3), never blocks a deduction from happening.
    Step 4's force-offline check runs right after, same DB transaction.
    """
    rider = _get_rider_or_404(db, rider_id)

    rider.wallet_balance = float(rider.wallet_balance) - DELIVERY_DEDUCTION_AMOUNT
    _force_offline_if_below_min(rider)
    db.add(rider)

    txn = WalletTransaction(
        rider_id=rider.id,
        order_id=order_id,
        type="deduction",
        amount=DELIVERY_DEDUCTION_AMOUNT,
        balance_after=rider.wallet_balance,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn

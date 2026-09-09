"""
Wallet business logic — Phase 3 Step 2: recharge + balance read.

Delivery-fee deduction (Rs. 10 auto-deduct on "Delivered") is Step 5,
NOT here yet — that needs to be called from Phase 6's status-change flow,
so it lives in this same module but is added in a later step, kept
separate from recharge so this file stays single-responsibility for now.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.platform.wallet_payment.models import Rider, WalletTransaction

MIN_WALLET_BALANCE = 500  # spec Sec 3.1 / Sec 8 Step 4 — required to go online

VALID_RECHARGE_METHODS = {"bank_transfer", "jazzcash", "easypaisa", "card"}


def _get_rider_or_404(db: Session, rider_id: uuid.UUID) -> Rider:
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider not found.",
        )
    return rider


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

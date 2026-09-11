"""
Wallet business logic.
Step 2: recharge + balance read.
Step 3/4: go-online toggle with min-balance check + auto-force-offline.
Step 5: delivery-fee deduction (standalone function, NOT an endpoint —
real trigger is order "Delivered" status change, Phase 6's job. Phase 6
will call `deduct_delivery_fee()` directly; nothing here needs to change
when that wiring happens).
Step 6: cash deposit tracking (expected vs actual, discrepancy flag).
Step 7: cash collection cap check (reusable, called by Phase 6 assignment).
Step 8: rider earnings summary read.

Step 6/7/8 note (flagged, not silently assumed): `orders` table (Phase 1,
schema.jpeg) has no "already reconciled / already paid out" flag column —
adding one now would be a schema change outside Phase 3 scope. Instead,
"already counted" is derived from time windows: cash-deposit expected
amount = COD orders delivered since the rider's LAST cash_deposit
(all-time if none yet); earnings balance = delivered orders' rider_earning
since the rider's LAST rider_payout period_end (all-time if none yet).
Correct for MVP single-admin-run settlement cycles; revisit if settlements
ever run out of strict chronological order.
"""
import json
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redis_client import redis_client
from app.modules.food_delivery.models import Order
from app.platform.wallet_payment.models import CashDeposit, Rider, RiderPayout, WalletTransaction

MIN_WALLET_BALANCE = 500  # spec Sec 3.1 / Sec 8 Step 4 — required to go online
DELIVERY_DEDUCTION_AMOUNT = 10  # spec Sec 3.1 — flat Rs. 10 per completed delivery

VALID_RECHARGE_METHODS = {"bank_transfer", "jazzcash", "easypaisa", "card"}
VALID_DEPOSIT_METHODS = {"bank_transfer", "mobile_wallet", "hub"}
DELIVERED_STATUS = "Delivered"  # spec Sec 7 Step 10 status flow wording

# Phase 6, Step 1 — rider live location in Redis
LOCATION_TTL_SECONDS = 45  # ~30-60s window; stale locations auto-expire


def _rider_location_key(rider_id: uuid.UUID) -> str:
    return f"rider_location:{rider_id}"


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

    Does NOT commit — the caller commits (Phase 6 review fix, see
    ADR/Backend_development.md Phase 6 note). This function used to call
    db.commit() itself; when Phase 6's rider_advance_delivery_status()
    started chaining a second write (COD pending_cash_owed) after this
    call and then committing again, that was two separate DB transactions
    instead of one, so a crash between them could leave the wallet
    deducted but the COD cash-owed update lost. flush() is enough here —
    it assigns the transaction's id and makes the row visible to the rest
    of the same session (db.refresh() below works on a flush, it doesn't
    require a commit) without closing the transaction early.
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
    db.flush()
    db.refresh(txn)
    return txn


def _compute_expected_cash(db: Session, rider_id: uuid.UUID) -> float:
    """
    Step 6 helper — sum of COD `Delivered` order totals since the rider's
    last cash deposit (all-time if this is their first deposit ever).
    """
    last_deposit = (
        db.query(CashDeposit)
        .filter(CashDeposit.rider_id == rider_id)
        .order_by(CashDeposit.created_at.desc())
        .first()
    )

    query = db.query(Order).filter(
        Order.rider_id == rider_id,
        Order.payment_method == "COD",
        Order.status == DELIVERED_STATUS,
    )
    if last_deposit is not None:
        query = query.filter(Order.delivered_at > last_deposit.created_at)

    total = query.with_entities(func.coalesce(func.sum(Order.total_amount), 0)).scalar()
    return float(total)


def create_cash_deposit(
    db: Session, rider_id: uuid.UUID, amount_submitted: float, submission_method: str
) -> CashDeposit:
    """
    Step 6 — rider submits daily COD cash. `expected_amount` is computed
    server-side (never trusted from the rider), `discrepancy` = submitted -
    expected, flagged for Admin review if non-zero (Admin review UI itself
    is Phase 8, not here — this just records the number).
    On a successful deposit, `pending_cash_owed` is reduced by the amount
    submitted (floored at 0 — can't go negative from a deposit).
    """
    if submission_method not in VALID_DEPOSIT_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid submission method. Must be one of: {sorted(VALID_DEPOSIT_METHODS)}.",
        )

    rider = _get_rider_or_404(db, rider_id)
    expected_amount = _compute_expected_cash(db, rider_id)
    discrepancy = amount_submitted - expected_amount

    rider.pending_cash_owed = max(float(rider.pending_cash_owed) - amount_submitted, 0)
    db.add(rider)

    deposit = CashDeposit(
        rider_id=rider.id,
        amount_submitted=amount_submitted,
        expected_amount=expected_amount,
        discrepancy=discrepancy,
        submission_method=submission_method,
        verified_by_admin=False,
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


def can_assign_cod(db: Session, rider_id: uuid.UUID) -> bool:
    """
    Step 7 — reusable check, called by Phase 6's assignment logic before
    handing a rider a new COD order. Digital orders are never affected by
    this (spec Sec 3.4) — that filtering happens on the Phase 6 caller
    side, not here.
    """
    rider = _get_rider_or_404(db, rider_id)
    return float(rider.pending_cash_owed) < settings.CASH_COLLECTION_CAP


def get_cod_eligibility(db: Session, rider_id: uuid.UUID) -> dict:
    """Step 7 — read view backing GET /wallet/cod-eligibility, so the cap
    logic is testable via an endpoint (Phase 6 will call can_assign_cod()
    directly instead of hitting this route)."""
    rider = _get_rider_or_404(db, rider_id)
    return {
        "can_accept_cod": float(rider.pending_cash_owed) < settings.CASH_COLLECTION_CAP,
        "pending_cash_owed": float(rider.pending_cash_owed),
        "cap": settings.CASH_COLLECTION_CAP,
    }


def get_rider_earnings_summary(db: Session, rider_id: uuid.UUID) -> dict:
    """
    Step 8 — spec Sec 8 Step 13's full 3-number view. `earnings_balance` =
    sum of `rider_earning` on Delivered orders since the rider's last
    RiderPayout period_end (all-time if never paid out yet) — same
    time-window pattern as Step 6's cash-deposit calc, for the same reason
    (no "already paid out" flag column on `orders`).
    """
    rider = _get_rider_or_404(db, rider_id)

    last_payout = (
        db.query(RiderPayout)
        .filter(RiderPayout.rider_id == rider_id)
        .order_by(RiderPayout.period_end.desc())
        .first()
    )

    query = db.query(Order).filter(Order.rider_id == rider_id, Order.status == DELIVERED_STATUS)
    if last_payout is not None:
        query = query.filter(Order.delivered_at > last_payout.period_end)

    earnings_balance = query.with_entities(func.coalesce(func.sum(Order.rider_earning), 0)).scalar()

    return {
        "earnings_balance": float(earnings_balance),
        "wallet_balance": float(rider.wallet_balance),
        "pending_cash_owed": float(rider.pending_cash_owed),
    }


# --- Phase 6, Step 1: rider live location update ---


def update_rider_location(
    db: Session, rider_id: uuid.UUID, latitude: float, longitude: float
) -> dict:
    """
    Phase 6 Step 1 — store the rider's GPS coordinates in Redis with a
    short TTL (~45s). Stale locations auto-expire so the system never
    considers a rider whose phone went silent.

    Does NOT touch the DB — rider current_latitude/current_longitude
    columns on the Rider model are a separate (optional) concern; this
    function writes only to Redis for the live-location use case.

    Raises 404 if the rider doesn't exist (ownership check — we verify
    the rider row exists even though Redis doesn't need it, so a
    deleted/deactivated rider can't silently push stale locations).
    """
    _get_rider_or_404(db, rider_id)

    now = datetime.now(timezone.utc).isoformat()
    payload = json.dumps({
        "lat": latitude,
        "lng": longitude,
        "updated_at": now,
    })

    try:
        redis_client.set(_rider_location_key(rider_id), payload, ex=LOCATION_TTL_SECONDS)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Location service temporarily unavailable. Please try again.",
        )

    return {
        "rider_id": rider_id,
        "lat": latitude,
        "lng": longitude,
        "updated_at": now,
    }


# --- Phase 6, Step 2: rider assignment eligibility ---


def rider_eligible_for_assignment(db: Session, rider_id: uuid.UUID) -> bool:
    """
    Phase 6 Step 2 — three-gate eligibility check for rider assignment.
    All three conditions must hold simultaneously:

      1. is_online = true   (reuses Phase 3 field)
      2. wallet_balance >= MIN_WALLET_BALANCE  (reuses Phase 3 constant)
      3. valid non-expired Redis location key  (from Phase 6 Step 1)

    Reuses: _get_rider_or_404, MIN_WALLET_BALANCE, _rider_location_key,
    redis_client — no duplicate business logic.

    Phase 6's assignment logic will call this directly (no route needed);
    same pattern as can_assign_cod() (Step 7).
    """
    rider = _get_rider_or_404(db, rider_id)

    if not rider.is_online:
        return False

    if float(rider.wallet_balance) < MIN_WALLET_BALANCE:
        return False

    # A non-existent key means either never set or TTL expired — both
    # mean the rider's location is stale/absent.
    if not redis_client.exists(_rider_location_key(rider_id)):
        return False

    return True

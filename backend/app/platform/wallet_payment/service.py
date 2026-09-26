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
from app.core import storage
from app.core.redis_client import redis_client
from app.modules.food_delivery.models import Order
from app.platform.wallet_payment.models import CashDeposit, Rider, RiderPayout, WalletTransaction

# Wallet thresholds
MIN_WALLET_BALANCE_TO_GO_ONLINE = 500
WALLET_REMINDER_THRESHOLD = 100
WALLET_AUTO_OFFLINE_THRESHOLD = 100
DELIVERY_WALLET_DEDUCTION = 10
INITIAL_WALLET_RECHARGE = 500
KIT_DEPOSIT_AMOUNT = 5000

VALID_RECHARGE_METHODS = {"bank_transfer", "jazzcash", "easypaisa", "card"}
VALID_DEPOSIT_METHODS = {"bank_transfer", "mobile_wallet", "hub"}
DELIVERED_STATUS = "Delivered"

# Gap 2 fix — rider document upload (spec Sec 8 Step 1, Sec 6 Step 1).
# Same 5MB/JPG/PNG-only validation as the menu photo upload in
# food_delivery/service.py; duplicated rather than imported since it's a
# small self-contained check and the two modules shouldn't depend on each
# other's private helpers.
MAX_RIDER_DOC_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_RIDER_DOC_CONTENT_TYPES = {"image/jpeg", "image/png"}
ALLOWED_RIDER_DOC_EXTENSIONS = {"jpg", "jpeg", "png"}
RIDER_DOC_COLUMNS = {
    "cnic": "cnic_photo_url",
    "license": "license_photo_url",
    "vehicle": "vehicle_photo_url",
}

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
    """Force rider offline when wallet balance drops below the auto-offline
    threshold. Does not commit — caller controls the transaction."""
    if float(rider.wallet_balance) < WALLET_AUTO_OFFLINE_THRESHOLD:
        rider.is_online = False


def recharge_wallet(db: Session, rider_id: uuid.UUID, amount: float, method: str) -> WalletTransaction:
    """Recharge the rider's wallet. First recharge must be exactly Rs. 500."""
    if method not in VALID_RECHARGE_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid recharge method. Must be one of: {sorted(VALID_RECHARGE_METHODS)}.",
        )

    rider = _get_rider_or_404(db, rider_id)

    existing_recharges = db.query(WalletTransaction).filter(
        WalletTransaction.rider_id == rider_id,
        WalletTransaction.type == "recharge",
    ).count()

    if existing_recharges == 0 and amount != INITIAL_WALLET_RECHARGE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"First wallet recharge must be exactly Rs. {INITIAL_WALLET_RECHARGE}.",
        )

    rider.wallet_balance = float(rider.wallet_balance) + amount
    db.add(rider)

    txn = WalletTransaction(
        rider_id=rider.id,
        order_id=None,
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
    """Go-online/offline toggle. Going online requires kit_completed and
    wallet_balance >= MIN_WALLET_BALANCE_TO_GO_ONLINE. Going offline is always allowed."""
    rider = _get_rider_or_404(db, rider_id)

    if is_online:
        if not rider.kit_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kit deposit and handover must be completed before going online.",
            )
        if float(rider.wallet_balance) < MIN_WALLET_BALANCE_TO_GO_ONLINE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Minimum wallet balance of Rs. {MIN_WALLET_BALANCE_TO_GO_ONLINE} required to go online. "
                    f"Current balance: Rs. {rider.wallet_balance}. Please recharge."
                ),
            )

    rider.is_online = is_online
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


def deduct_delivery_fee(db: Session, rider_id: uuid.UUID, order_id: uuid.UUID) -> WalletTransaction | None:
    """Deduct Rs. 10 from rider wallet on order Delivered. Returns the
    WalletTransaction, or None if balance was insufficient (delivery still
    completes, deduction skipped to prevent negative balance).

    Does NOT commit — caller controls the transaction.
    """
    rider = _get_rider_or_404(db, rider_id)

    if float(rider.wallet_balance) < DELIVERY_WALLET_DEDUCTION:
        return None

    rider.wallet_balance = float(rider.wallet_balance) - DELIVERY_WALLET_DEDUCTION
    _force_offline_if_below_min(rider)
    db.add(rider)

    txn = WalletTransaction(
        rider_id=rider.id,
        order_id=order_id,
        type="deduction",
        amount=DELIVERY_WALLET_DEDUCTION,
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
        
        # Publish to active order Pub/Sub channel if rider has an active delivery
        active_order = (
            db.query(Order)
            .filter(
                Order.rider_id == rider_id,
                Order.status.notin_(["Delivered", "Cancelled", "Rejected"]),
            )
            .first()
        )
        if active_order is not None:
            pub_payload = json.dumps({
                "order_id": str(active_order.id),
                "latitude": latitude,
                "longitude": longitude,
                "updated_at": now,
            })
            redis_client.publish(f"order:location:{active_order.id}", pub_payload)
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
    """Three-gate eligibility: is_online, wallet above auto-offline threshold,
    and valid Redis location."""
    rider = _get_rider_or_404(db, rider_id)

    if not rider.is_online:
        return False

    if float(rider.wallet_balance) < WALLET_AUTO_OFFLINE_THRESHOLD:
        return False

    if not redis_client.exists(_rider_location_key(rider_id)):
        return False

    return True


# --- Kit deposit & handover ---


def record_kit_completion(
    db: Session, rider_id: uuid.UUID, admin_id: uuid.UUID,
    kit_deposit_paid: bool, kit_shirts_issued: int, kit_box_issued: bool,
    shirt_serial_number: str | None = None,
    shirt_serial_numbers: list[str] | None = None,
    box_serial_number: str | None = None,
    helmet_serial_number: str | None = None,
) -> Rider:
    """Admin records kit deposit and handover. Kit is considered completed
    when deposit is paid, at least 2 shirts issued, and delivery box issued."""
    rider = _get_rider_or_404(db, rider_id)

    rider.kit_deposit_paid = kit_deposit_paid
    if kit_deposit_paid and rider.kit_deposit_date is None:
        rider.kit_deposit_date = datetime.now(timezone.utc)
    rider.kit_shirts_issued = kit_shirts_issued
    rider.kit_box_issued = kit_box_issued
    rider.kit_verified_by = admin_id

    if shirt_serial_number is not None:
        rider.shirt_serial_number = shirt_serial_number
    if shirt_serial_numbers is not None:
        rider.shirt_serial_numbers = shirt_serial_numbers
        if not rider.shirt_serial_number and shirt_serial_numbers:
            rider.shirt_serial_number = ", ".join(shirt_serial_numbers)
    elif shirt_serial_number and not rider.shirt_serial_numbers:
        rider.shirt_serial_numbers = [s.strip() for s in shirt_serial_number.split(",") if s.strip()]

    if box_serial_number is not None:
        rider.box_serial_number = box_serial_number
    if helmet_serial_number is not None:
        rider.helmet_serial_number = helmet_serial_number

    rider.kit_completed = (
        rider.kit_deposit_paid
        and rider.kit_shirts_issued >= 2
        and rider.kit_box_issued
    )
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


# --- Gap 2 fix: rider document upload (spec Sec 8 Step 1, Sec 6 Step 1) ---


def _validate_rider_document(data: bytes, content_type: str | None, filename: str | None) -> str:
    """
    Same validation shape as food_delivery's _validate_menu_photo: size
    cap, declared content-type, extension, and a magic-bytes check so the
    client's claimed content-type can't be trusted on its own. Returns the
    canonical extension for the S3 key.
    """
    if len(data) > MAX_RIDER_DOC_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum allowed size is 5 MB.",
        )

    if content_type not in ALLOWED_RIDER_DOC_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Only JPG/JPEG and PNG are allowed.",
        )

    extension = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    if extension not in ALLOWED_RIDER_DOC_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Only JPG/JPEG and PNG are allowed.",
        )

    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="File content does not match a valid JPG/PNG image.",
    )


def upload_rider_document(
    db: Session,
    rider_id: uuid.UUID,
    doc_type: str,
    data: bytes,
    content_type: str | None,
    filename: str | None,
) -> Rider:
    """
    POST /wallet/documents/{doc_type} — a rider uploads their CNIC,
    license, or vehicle photo (spec Sec 8 Step 1: collected at onboarding;
    this is the previously-missing upload path for the columns that
    already existed on the `riders` table). Own account only — no
    ownership param needed beyond rider_id, since a rider can only ever
    upload their own doc (route passes current_user.id).

    Order of operations matches upload_menu_item_photo: S3 upload happens
    BEFORE the DB write, so a failed upload never leaves a half-updated
    row. Re-uploading the same doc_type overwrites the previous file (same
    S3 key) and the previous URL is simply replaced, not archived.
    """
    if doc_type not in RIDER_DOC_COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="doc_type must be one of: cnic, license, vehicle.",
        )

    rider = _get_rider_or_404(db, rider_id)
    extension = _validate_rider_document(data, content_type, filename)

    try:
        photo_url = storage.upload_rider_document(rider.id, doc_type, data, content_type, extension)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document upload failed. Please try again.",
        )

    setattr(rider, RIDER_DOC_COLUMNS[doc_type], photo_url)
    db.commit()
    db.refresh(rider)
    return rider


# --- Rider wallet profile + assignment history (GET read views) ---

# Mirrors admin/service.py's RIDER_PAYOUT_STATUS_PENDING — duplicated as a
# local constant instead of imported because admin/service.py imports this
# module at import time (a reverse import would be circular).
RIDER_PAYOUT_STATUS_PENDING = "Pending"


def get_rider_wallet_profile(db: Session, rider_id: uuid.UUID) -> dict:
    """
    GET /wallet/profile — combined rider wallet view, all numbers read
    from real rows:

    - total_earnings: all-time sum of `rider_earning` on Delivered orders
      (same sum pattern as get_rider_earnings_summary(), minus its payout
      time-window — this is lifetime earnings, not the unpaid balance).
    - current_balance: rider.wallet_balance (same source as
      get_wallet_summary()).
    - pending_payouts: sum of generated RiderPayout rows still Pending
      (admin marks them Paid, admin/service.py Step 6).
    - is_online: the wallet-gated online status from PATCH /wallet/status.

    Raises 404 if the rider row doesn't exist (same ownership helper as
    every other wallet read).
    """
    rider = _get_rider_or_404(db, rider_id)

    total_earnings = (
        db.query(func.coalesce(func.sum(Order.rider_earning), 0))
        .filter(Order.rider_id == rider_id, Order.status == DELIVERED_STATUS)
        .scalar()
    )

    pending_payouts = (
        db.query(func.coalesce(func.sum(RiderPayout.total_earning), 0))
        .filter(
            RiderPayout.rider_id == rider_id,
            RiderPayout.status == RIDER_PAYOUT_STATUS_PENDING,
        )
        .scalar()
    )

    return {
        "total_earnings": float(total_earnings),
        "current_balance": float(rider.wallet_balance),
        "pending_payouts": float(pending_payouts),
        "is_online": rider.is_online,
    }


def get_rider_assignments(db: Session, rider_id: uuid.UUID) -> dict:
    """
    GET /wallet/assignments — this rider's assigned orders, newest first,
    split into active (still in flight) and past (Delivered). Payout
    details are the frozen per-order snapshot columns, never recomputed.

    Own assignments only (WHERE rider_id == rider_id — same no-leak-by-
    omission pattern as everywhere else; ownership comes from the
    authenticated token, never from the request). A rejected order drops
    rider_id to NULL on reject, so it disappears from this list
    automatically. Raises 404 if the rider row doesn't exist.
    """
    _get_rider_or_404(db, rider_id)

    orders = (
        db.query(Order)
        .filter(Order.rider_id == rider_id)
        .order_by(Order.placed_at.desc())
        .all()
    )

    active: list[dict] = []
    past: list[dict] = []
    for order in orders:
        item = {
            "id": order.id,
            "status": order.status,
            "payment_method": order.payment_method,
            "delivery_distance_km": float(order.delivery_distance_km),
            "delivery_fee": float(order.delivery_fee),
            "total_amount": float(order.total_amount),
            "rider_earning": float(order.rider_earning),
            "placed_at": order.placed_at,
            "delivered_at": order.delivered_at,
        }
        (past if order.status == DELIVERED_STATUS else active).append(item)

    return {"active": active, "past": past}

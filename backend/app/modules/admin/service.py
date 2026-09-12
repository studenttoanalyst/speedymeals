"""
Admin business logic — Phase 8.

Step 1: dashboard summary (read-only aggregates, spec Sec 11 formula).
Step 2: restaurant management (onboarding, approve/deactivate, commission,
credential reset) — spec Sec 9 Steps 1-2 + Sec 10 Steps 3, 6.
"""
import uuid
from datetime import date, datetime, time, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.food_delivery.models import Order, Restaurant
from app.platform.users.models import User
from app.platform.wallet_payment.models import Rider, Settlement
from app.platform.wallet_payment.service import DELIVERED_STATUS, DELIVERY_DEDUCTION_AMOUNT

ACTIVE_RESTAURANT_STATUS = "active"
INACTIVE_RESTAURANT_STATUS = "inactive"
SETTLEMENT_STATUS_SETTLED = "Settled"


# --- Step 1: dashboard ---


def _today_utc_bounds() -> tuple[datetime, datetime]:
    """Start/end of "today" as UTC calendar day — every timestamp column
    in this project is stored timezone-aware UTC (base_model.py), so the
    dashboard's "today" is UTC, not the admin's local day."""
    today = date.today()
    start = datetime.combine(today, time.min, tzinfo=timezone.utc)
    end = datetime.combine(today, time.max, tzinfo=timezone.utc)
    return start, end


def get_dashboard_summary(db: Session) -> dict:
    """GET /admin/dashboard — Step 1. Gross/net revenue and order count are
    scoped to today; wallet/pending-cash/settlement totals are current
    running balances (not day-scoped — they're standing exposure, not a
    daily flow)."""
    start, end = _today_utc_bounds()

    todays_orders = (
        db.query(Order)
        .filter(Order.placed_at >= start, Order.placed_at <= end)
        .all()
    )
    total_orders_today = len(todays_orders)
    gross_revenue_today = sum(float(o.total_amount) for o in todays_orders)
    commission_today = sum(float(o.commission_amount) for o in todays_orders)

    delivered_today_count = sum(
        1 for o in todays_orders if o.status == DELIVERED_STATUS
    )
    wallet_deductions_today = delivered_today_count * DELIVERY_DEDUCTION_AMOUNT
    net_revenue_today = commission_today + wallet_deductions_today

    pending_restaurant_settlements = (
        db.query(func.coalesce(func.sum(Settlement.net_payable), 0))
        .filter(Settlement.status != SETTLEMENT_STATUS_SETTLED)
        .scalar()
    )
    total_rider_wallet_balance = (
        db.query(func.coalesce(func.sum(Rider.wallet_balance), 0)).scalar()
    )
    total_pending_cod_cash = (
        db.query(func.coalesce(func.sum(Rider.pending_cash_owed), 0)).scalar()
    )

    return {
        "date": date.today(),
        "total_orders_today": total_orders_today,
        "gross_revenue_today": gross_revenue_today,
        "net_revenue_today": net_revenue_today,
        "pending_restaurant_settlements": float(pending_restaurant_settlements),
        "total_rider_wallet_balance": float(total_rider_wallet_balance),
        "total_pending_cod_cash": float(total_pending_cod_cash),
    }


# --- Step 2: restaurant management ---


def create_restaurant(db: Session, payload) -> Restaurant:
    """POST /admin/restaurants — spec Sec 9 Step 1-2: admin manually
    onboards a restaurant and sets up login creds in the same step. Email
    and phone must be unique (schema-level constraint) — checked here
    first so a duplicate is a clean 400, not a raw DB integrity error."""
    if db.query(Restaurant).filter(Restaurant.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
    if db.query(Restaurant).filter(Restaurant.phone_number == payload.phone_number).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already in use.")

    restaurant = Restaurant(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone_number=payload.phone_number,
        country_code=payload.country_code,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        commission_rate=payload.commission_rate,
        status=ACTIVE_RESTAURANT_STATUS,
        currency=payload.currency,
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant


def list_restaurants(db: Session, status_filter: str | None) -> list[Restaurant]:
    """GET /admin/restaurants — optional ?status=active|inactive filter."""
    query = db.query(Restaurant)
    if status_filter:
        query = query.filter(Restaurant.status == status_filter)
    return query.order_by(Restaurant.created_at.desc()).all()


def _get_restaurant_or_404(db: Session, restaurant_id: uuid.UUID) -> Restaurant:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if restaurant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found.")
    return restaurant


def get_restaurant(db: Session, restaurant_id: uuid.UUID) -> Restaurant:
    return _get_restaurant_or_404(db, restaurant_id)


def set_restaurant_status(db: Session, restaurant_id: uuid.UUID, is_active: bool) -> Restaurant:
    """PATCH /admin/restaurants/{id}/status — approve (is_active=true) or
    deactivate (is_active=false). "Approve" for a restaurant has no
    separate pending state in the locked spec (unlike riders) — admin
    onboards it directly active; this toggle is for later deactivation
    and re-activation."""
    restaurant = _get_restaurant_or_404(db, restaurant_id)
    restaurant.status = ACTIVE_RESTAURANT_STATUS if is_active else INACTIVE_RESTAURANT_STATUS
    db.commit()
    db.refresh(restaurant)
    return restaurant


def update_restaurant_commission(db: Session, restaurant_id: uuid.UUID, commission_rate: float) -> Restaurant:
    """PATCH /admin/restaurants/{id}/commission — per-restaurant override
    of the spec Sec 3.2 10% default. Only affects orders placed AFTER this
    change (place_order() freezes commission_amount on the order row at
    placement time — history is never rewritten)."""
    restaurant = _get_restaurant_or_404(db, restaurant_id)
    restaurant.commission_rate = commission_rate
    db.commit()
    db.refresh(restaurant)
    return restaurant


def reset_restaurant_credentials(db: Session, restaurant_id: uuid.UUID, payload) -> Restaurant:
    """POST /admin/restaurants/{id}/reset-credentials — Step 2. Each field
    is optional independently (schema enforces at least one is present);
    email/phone uniqueness is re-checked against every OTHER restaurant."""
    restaurant = _get_restaurant_or_404(db, restaurant_id)

    if payload.new_email is not None:
        clash = (
            db.query(Restaurant)
            .filter(Restaurant.email == payload.new_email, Restaurant.id != restaurant_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
        restaurant.email = payload.new_email

    if payload.new_phone_number is not None:
        clash = (
            db.query(Restaurant)
            .filter(Restaurant.phone_number == payload.new_phone_number, Restaurant.id != restaurant_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already in use.")
        restaurant.phone_number = payload.new_phone_number

    if payload.new_password is not None:
        restaurant.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(restaurant)
    return restaurant


# --- Step 3: rider management ---


def list_riders(db: Session, approval_status_filter: str | None) -> list[Rider]:
    """GET /admin/riders — optional ?approval_status=pending|approved|rejected
    filter, matching the same filter pattern as list_restaurants."""
    query = db.query(Rider)
    if approval_status_filter:
        query = query.filter(Rider.approval_status == approval_status_filter)
    return query.order_by(Rider.created_at.desc()).all()


def _get_rider_or_404(db: Session, rider_id: uuid.UUID) -> Rider:
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if rider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found.")
    return rider


def get_rider(db: Session, rider_id: uuid.UUID) -> Rider:
    """GET /admin/riders/{id} — full detail including wallet_balance and
    pending_cash_owed (spec Sec 10 Step 4)."""
    return _get_rider_or_404(db, rider_id)


def update_rider_approval(db: Session, rider_id: uuid.UUID, approval_status: str) -> Rider:
    """PATCH /admin/riders/{id}/approval — spec Sec 8 Step 2: admin
    manually reviews CNIC/license/vehicle docs and approves or rejects.
    A rejected rider can be re-approved later (no terminal lock) — the
    documents don't change, only the admin's decision on them."""
    rider = _get_rider_or_404(db, rider_id)
    rider.approval_status = approval_status
    db.commit()
    db.refresh(rider)
    return rider


def set_rider_status(db: Session, rider_id: uuid.UUID, is_active: bool) -> Rider:
    """PATCH /admin/riders/{id}/status — deactivate for fraud/repeated
    violations (spec Sec 6, Sec 10 Step 4). Deactivating also forces the
    rider offline so they stop receiving new assignments immediately,
    mirroring the same is_online=false path set_online_status() uses."""
    rider = _get_rider_or_404(db, rider_id)
    rider.is_active = is_active
    if not is_active:
        rider.is_online = False
    db.commit()
    db.refresh(rider)
    return rider


# --- Step 4: order management ---


def list_orders(
    db: Session,
    status_filter: str | None,
    restaurant_id: uuid.UUID | None,
    date_from,
    date_to,
) -> list[dict]:
    """GET /admin/orders — spec Sec 10 Step 5: view all orders (live +
    history), filter by status/date/restaurant. Same filter shape as the
    restaurant dashboard's list_restaurant_orders(), just unscoped by
    restaurant ownership (admin sees everything)."""
    query = db.query(Order, Restaurant.name).join(Restaurant, Order.restaurant_id == Restaurant.id)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if restaurant_id:
        query = query.filter(Order.restaurant_id == restaurant_id)
    if date_from:
        query = query.filter(func.date(Order.placed_at) >= date_from)
    if date_to:
        query = query.filter(func.date(Order.placed_at) <= date_to)

    rows = query.order_by(Order.placed_at.desc()).all()
    return [
        {
            "id": order.id,
            "restaurant_id": order.restaurant_id,
            "restaurant_name": restaurant_name,
            "rider_id": order.rider_id,
            "status": order.status,
            "payment_method": order.payment_method,
            "total_amount": order.total_amount,
            "placed_at": order.placed_at,
        }
        for order, restaurant_name in rows
    ]


def _get_order_or_404(db: Session, order_id: uuid.UUID) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order


def get_order(db: Session, order_id: uuid.UUID) -> dict:
    """GET /admin/orders/{id} — full detail incl. distance/fee breakdown
    (spec Sec 10 Step 5)."""
    order = _get_order_or_404(db, order_id)
    restaurant = db.query(Restaurant).filter(Restaurant.id == order.restaurant_id).first()
    customer = db.query(User).filter(User.id == order.user_id).first()
    rider = db.query(Rider).filter(Rider.id == order.rider_id).first() if order.rider_id else None

    return {
        "id": order.id,
        "restaurant_id": order.restaurant_id,
        "restaurant_name": restaurant.name if restaurant else "",
        "customer_name": customer.name if customer else "",
        "rider_id": order.rider_id,
        "rider_name": rider.name if rider else None,
        "status": order.status,
        "payment_method": order.payment_method,
        "food_subtotal": order.food_subtotal,
        "delivery_distance_km": order.delivery_distance_km,
        "delivery_fee": order.delivery_fee,
        "total_amount": order.total_amount,
        "commission_amount": order.commission_amount,
        "restaurant_payable": order.restaurant_payable,
        "rider_earning": order.rider_earning,
        "cancellation_reason": order.cancellation_reason,
        "cancelled_by": order.cancelled_by,
        "placed_at": order.placed_at,
        "delivered_at": order.delivered_at,
    }


# Terminal states an order can never be moved out of by an admin action.
_ORDER_LOCKED_STATUSES = {DELIVERED_STATUS, "Cancelled"}


def cancel_order(db: Session, order_id: uuid.UUID, reason: str) -> dict:
    """POST /admin/orders/{id}/cancel — spec Sec 10 Step 5 manual
    intervention. Admin can force-cancel from ANY non-terminal status
    (unlike the restaurant/rider state machine in food_delivery/service.py,
    which only allows forward steps) — a stuck order is exactly the case
    this exists for. Delivered/already-cancelled orders are terminal."""
    order = _get_order_or_404(db, order_id)
    if order.status in _ORDER_LOCKED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order in status '{order.status}' cannot be cancelled.",
        )
    order.status = "Cancelled"
    order.cancellation_reason = reason
    order.cancelled_by = "admin"
    db.commit()
    return get_order(db, order_id)


def reassign_order_rider(db: Session, order_id: uuid.UUID, rider_id: uuid.UUID) -> dict:
    """PATCH /admin/orders/{id}/reassign — spec Sec 10 Step 5. Admin
    override, so it deliberately skips the normal nearest-rider-search +
    online/wallet eligibility checks in food_delivery/service.py's
    _find_nearest_rider() — this is for the "the automatic match is stuck,
    manually put a specific rider on it" case. Still requires the target
    rider to be an approved, active account (not a fake/rejected one)."""
    order = _get_order_or_404(db, order_id)
    if order.status in _ORDER_LOCKED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order in status '{order.status}' cannot be reassigned.",
        )

    rider = _get_rider_or_404(db, rider_id)
    if rider.approval_status != "approved" or not rider.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rider must be approved and active to be assigned.",
        )

    order.rider_id = rider.id
    if order.status in {"Ready for Pickup", "Rejected"}:
        order.status = "Rider Assigned"
    db.commit()
    return get_order(db, order_id)

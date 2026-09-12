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

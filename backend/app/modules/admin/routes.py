"""
Admin endpoints — Phase 8, Step 1 (dashboard) and Step 2 (restaurant
management). All routes require an "admin" role token, same require_role
RBAC pattern as restaurant/rider routes elsewhere in the project.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admin import service
from app.modules.admin.schemas import (
    AdminOrderDetailResponseSchema,
    AdminOrderSummaryResponseSchema,
    DashboardSummaryResponseSchema,
    OrderCancelSchema,
    OrderReassignSchema,
    RestaurantAdminResponseSchema,
    RestaurantCommissionUpdateSchema,
    RestaurantCreateSchema,
    RestaurantCredentialsResetSchema,
    RestaurantStatusUpdateSchema,
    RiderAdminResponseSchema,
    RiderApprovalUpdateSchema,
    RiderStatusUpdateSchema,
)
from app.platform.auth.dependencies import CurrentUser, require_role

router = APIRouter(prefix="/admin", tags=["admin"])

require_admin = require_role(["admin"])


@router.get("/dashboard", response_model=DashboardSummaryResponseSchema)
def get_dashboard(
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 1 — today's orders/revenue plus current standing balances
    (pending settlements, rider wallets, pending COD cash), per spec
    Sec 10 Step 2 and Sec 11's revenue formula."""
    return service.get_dashboard_summary(db)


@router.post("/restaurants", response_model=RestaurantAdminResponseSchema, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    payload: RestaurantCreateSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 2 — onboard a new restaurant (spec Sec 9 Steps 1-2): admin
    sets up the restaurant's name, login credentials (email+password,
    phone for OTP), and commission rate in one call."""
    return service.create_restaurant(db, payload)


@router.get("/restaurants", response_model=list[RestaurantAdminResponseSchema])
def list_restaurants(
    restaurant_status: str | None = Query(default=None, alias="status", pattern="^(active|inactive)$"),
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 2 — list all restaurants, optionally filtered by ?status=."""
    return service.list_restaurants(db, restaurant_status)


@router.get("/restaurants/{restaurant_id}", response_model=RestaurantAdminResponseSchema)
def get_restaurant(
    restaurant_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 2 — single restaurant detail."""
    return service.get_restaurant(db, restaurant_id)


@router.patch("/restaurants/{restaurant_id}/status", response_model=RestaurantAdminResponseSchema)
def set_restaurant_status(
    restaurant_id: uuid.UUID,
    payload: RestaurantStatusUpdateSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 2 — approve/deactivate toggle."""
    return service.set_restaurant_status(db, restaurant_id, payload.is_active)


@router.patch("/restaurants/{restaurant_id}/commission", response_model=RestaurantAdminResponseSchema)
def update_restaurant_commission(
    restaurant_id: uuid.UUID,
    payload: RestaurantCommissionUpdateSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 2 — per-restaurant commission_rate override (spec Sec 3.2)."""
    return service.update_restaurant_commission(db, restaurant_id, payload.commission_rate)


@router.post("/restaurants/{restaurant_id}/reset-credentials", response_model=RestaurantAdminResponseSchema)
def reset_restaurant_credentials(
    restaurant_id: uuid.UUID,
    payload: RestaurantCredentialsResetSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 2 — reset a restaurant's email/phone/password (any subset)."""
    return service.reset_restaurant_credentials(db, restaurant_id, payload)


# --- Step 3: rider management ---


@router.get("/riders", response_model=list[RiderAdminResponseSchema])
def list_riders(
    approval_status: str | None = Query(default=None, pattern="^(pending|approved|rejected)$"),
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 3 — list riders, optionally filtered by ?approval_status=."""
    return service.list_riders(db, approval_status)


@router.get("/riders/{rider_id}", response_model=RiderAdminResponseSchema)
def get_rider(
    rider_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 3 — rider detail incl. wallet_balance and pending_cash_owed."""
    return service.get_rider(db, rider_id)


@router.patch("/riders/{rider_id}/approval", response_model=RiderAdminResponseSchema)
def update_rider_approval(
    rider_id: uuid.UUID,
    payload: RiderApprovalUpdateSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 3 — approve/reject a rider's onboarding documents."""
    return service.update_rider_approval(db, rider_id, payload.approval_status)


@router.patch("/riders/{rider_id}/status", response_model=RiderAdminResponseSchema)
def set_rider_status(
    rider_id: uuid.UUID,
    payload: RiderStatusUpdateSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 3 — deactivate/reactivate a rider (e.g. fraud, violations)."""
    return service.set_rider_status(db, rider_id, payload.is_active)


# --- Step 4: order management ---


@router.get("/orders", response_model=list[AdminOrderSummaryResponseSchema])
def list_orders(
    order_status: str | None = Query(default=None, alias="status"),
    restaurant_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 4 — view all orders (live + history), filter by status,
    restaurant, and date range."""
    return service.list_orders(db, order_status, restaurant_id, date_from, date_to)


@router.get("/orders/{order_id}", response_model=AdminOrderDetailResponseSchema)
def get_order(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 4 — full order detail incl. distance/fee breakdown."""
    return service.get_order(db, order_id)


@router.post("/orders/{order_id}/cancel", response_model=AdminOrderDetailResponseSchema)
def cancel_order(
    order_id: uuid.UUID,
    payload: OrderCancelSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 4 — force-cancel a stuck order (any non-terminal status)."""
    return service.cancel_order(db, order_id, payload.reason)


@router.patch("/orders/{order_id}/reassign", response_model=AdminOrderDetailResponseSchema)
def reassign_order_rider(
    order_id: uuid.UUID,
    payload: OrderReassignSchema,
    current_user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Step 4 — manually assign a specific rider to a stuck order,
    bypassing the automatic nearest-rider search."""
    return service.reassign_order_rider(db, order_id, payload.rider_id)

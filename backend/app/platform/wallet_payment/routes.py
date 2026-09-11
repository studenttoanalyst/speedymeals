"""
Wallet endpoints — Phase 3 Step 2. Rider-only (require_role(["rider"])),
same guard pattern as users/routes.py Step 11 for customer.
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth.dependencies import CurrentUser, require_role
from app.platform.wallet_payment import service
from app.platform.wallet_payment.schemas import (
    CashDepositRequestSchema,
    CashDepositResponseSchema,
    CODEligibilityResponseSchema,
    DeliveryStatusUpdateSchema,
    DeliveryStatusResponseSchema,
    OnlineStatusToggleSchema,
    RiderAssignmentActionSchema,
    RiderAssignmentResponseSchema,
    RiderEarningsResponseSchema,
    RiderLocationResponseSchema,
    RiderLocationUpdateSchema,
    WalletBalanceResponseSchema,
    WalletRechargeRequestSchema,
    WalletTransactionResponseSchema,
)

router = APIRouter(prefix="/wallet", tags=["wallet"])

require_rider = require_role(["rider"])


@router.post(
    "/recharge",
    response_model=WalletTransactionResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
def recharge_wallet(
    payload: WalletRechargeRequestSchema,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    return service.recharge_wallet(db, current_user.id, payload.amount, payload.method)


@router.get("/balance", response_model=WalletBalanceResponseSchema)
def get_wallet_balance(
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    return service.get_wallet_summary(db, current_user.id)


@router.patch("/status", response_model=WalletBalanceResponseSchema)
def set_online_status(
    payload: OnlineStatusToggleSchema,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """
    Step 3 — go-online/offline toggle. Going online (is_online=true) is
    rejected with 400 if wallet_balance < Rs. 500. Going offline
    (is_online=false) is always allowed.
    """
    return service.set_online_status(db, current_user.id, payload.is_online)


@router.post(
    "/cash-deposit",
    response_model=CashDepositResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_cash_deposit(
    payload: CashDepositRequestSchema,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Step 6 — rider's daily COD cash submit. Server computes expected
    amount and discrepancy; never trusts a client-supplied expected value."""
    return service.create_cash_deposit(
        db, current_user.id, payload.amount_submitted, payload.submission_method
    )


@router.get("/cod-eligibility", response_model=CODEligibilityResponseSchema)
def get_cod_eligibility(
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Step 7 — read view over `can_assign_cod()`, mainly for testing;
    Phase 6's real assignment logic calls the service function directly."""
    return service.get_cod_eligibility(db, current_user.id)


@router.get("/earnings", response_model=RiderEarningsResponseSchema)
def get_rider_earnings(
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Step 8 — full 3-number rider earnings view (spec Sec 8 Step 13)."""
    return service.get_rider_earnings_summary(db, current_user.id)


@router.patch("/location", response_model=RiderLocationResponseSchema)
def update_location(
    payload: RiderLocationUpdateSchema,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Phase 6 Step 1 — rider pushes GPS location. Stored in Redis with
    a short TTL (~45s) so stale locations auto-expire. Ownership is the
    authenticated rider — never taken from the request body."""
    return service.update_rider_location(
        db, current_user.id, payload.latitude, payload.longitude
    )


# --- Phase 6, Step 4: rider accept/reject assignment ---

from app.modules.food_delivery import service as food_service


@router.post(
    "/assignments/{order_id}/respond",
    response_model=RiderAssignmentResponseSchema,
)
def respond_to_assignment(
    order_id: uuid.UUID,
    payload: RiderAssignmentActionSchema,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Phase 6 Step 4 — rider accepts or rejects an assigned order.
    Only the assigned rider can respond; ownership is enforced via
    the authenticated rider_id, never from the request body."""
    return food_service.rider_respond_to_assignment(
        db, current_user.id, order_id, payload.action
    )


# --- Phase 6, Step 5: delivery status flow ---


@router.patch(
    "/deliveries/{order_id}/status/arrived",
    response_model=DeliveryStatusResponseSchema,
)
def mark_arrived_at_restaurant(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Phase 6 Step 5 — rider arrived at restaurant."""
    return food_service.rider_advance_delivery_status(
        db, current_user.id, order_id, "Arrived at Restaurant"
    )


@router.patch(
    "/deliveries/{order_id}/status/picked-up",
    response_model=DeliveryStatusResponseSchema,
)
def mark_picked_up(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Phase 6 Step 5 — rider picked up the order."""
    return food_service.rider_advance_delivery_status(
        db, current_user.id, order_id, "Picked Up"
    )


@router.patch(
    "/deliveries/{order_id}/status/on-the-way",
    response_model=DeliveryStatusResponseSchema,
)
def mark_on_the_way(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Phase 6 Step 5 — rider is on the way."""
    return food_service.rider_advance_delivery_status(
        db, current_user.id, order_id, "On the Way"
    )


@router.patch(
    "/deliveries/{order_id}/status/delivered",
    response_model=DeliveryStatusResponseSchema,
)
def mark_delivered(
    order_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Phase 6 Step 5 — order delivered."""
    return food_service.rider_advance_delivery_status(
        db, current_user.id, order_id, "Delivered"
    )

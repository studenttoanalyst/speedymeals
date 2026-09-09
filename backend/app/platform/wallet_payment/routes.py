"""
Wallet endpoints — Phase 3 Step 2. Rider-only (require_role(["rider"])),
same guard pattern as users/routes.py Step 11 for customer.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth.dependencies import CurrentUser, require_role
from app.platform.wallet_payment import service
from app.platform.wallet_payment.schemas import (
    CashDepositRequestSchema,
    CashDepositResponseSchema,
    CODEligibilityResponseSchema,
    OnlineStatusToggleSchema,
    RiderEarningsResponseSchema,
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

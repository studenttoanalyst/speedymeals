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

"""
Request/response shapes for the wallet_payment module.

Phase 3 Step 1 — defines the contract every wallet endpoint below is built
against, before any logic (same pattern as auth/schemas.py Step 1).
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WalletRechargeRequestSchema(BaseModel):
    """
    Body for POST /wallet/recharge — manual entry MVP (no real payment
    gateway call yet, see Phase 3 task list — gateway stub for
    JazzCash/EasyPaisa/card comes later, this just records the recharge).
    """
    amount: float = Field(..., gt=0, description="Amount being added to the wallet.")
    method: str = Field(..., description="'bank_transfer' | 'jazzcash' | 'easypaisa' | 'card'")


class OnlineStatusToggleSchema(BaseModel):
    """Body for PATCH /wallet/status — Step 3 go-online/offline toggle."""
    is_online: bool


class WalletBalanceResponseSchema(BaseModel):
    """Response for GET /wallet/balance — the 3 numbers from spec Sec 8 Step 13
    (minus earnings_balance, which needs the orders table — Phase 6 scope)."""
    wallet_balance: float
    pending_cash_owed: float
    is_online: bool


class WalletTransactionResponseSchema(BaseModel):
    """Response after a recharge (or, later, a delivery deduction) —
    matches the `wallet_transactions` table (schema.jpeg / Phase 1)."""
    id: uuid.UUID
    type: str
    amount: float
    balance_after: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CashDepositRequestSchema(BaseModel):
    """Body for POST /wallet/cash-deposit — Step 6, rider's daily COD cash submit."""
    amount_submitted: float = Field(..., gt=0)
    submission_method: str = Field(..., description="'bank_transfer' | 'mobile_wallet' | 'hub'")


class CashDepositResponseSchema(BaseModel):
    """Matches the `cash_deposits` table (schema.jpeg / Phase 1)."""
    id: uuid.UUID
    amount_submitted: float
    expected_amount: float
    discrepancy: float
    submission_method: str | None
    verified_by_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CODEligibilityResponseSchema(BaseModel):
    """Response for GET /wallet/cod-eligibility — Step 7 cash-cap check,
    exposed as a read endpoint mainly so it's testable; the real caller
    is Phase 6's assignment logic calling `can_assign_cod()` directly."""
    can_accept_cod: bool
    pending_cash_owed: float
    cap: float


class RiderEarningsResponseSchema(BaseModel):
    """Response for GET /wallet/earnings — Step 8, spec Sec 8 Step 13's
    full 3-number view (Step 2's /wallet/balance only had 2 of the 3)."""
    earnings_balance: float
    wallet_balance: float
    pending_cash_owed: float

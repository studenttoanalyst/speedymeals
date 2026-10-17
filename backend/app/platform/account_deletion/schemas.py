"""
Request/response shapes for account deletion.

Split by audience on purpose:

- `DeletionRequestResponseSchema` + `DeletionRequestStatusSchema` are what the
  account holder sees. They carry no admin ids, no admin notes written for
  staff only... except `hold_reason`, which the rider must see (the app shows
  "on hold" together with the reason) - so it is included and worded for the
  user by the admin.
- `AdminDeletionRequestItemSchema` is the staff view: it adds the money and
  active-delivery checks that decide whether an approval is even possible.
- The public (web) schemas never reveal whether a phone number has an account
  until the caller proves control of that number via OTP.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.platform.account_deletion.models import ALL_KYC_ACTIONS


class DeletionRequestResponseSchema(BaseModel):
    """One deletion request, as shown to the account holder."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    status: str
    requested_at: datetime
    grace_ends_at: datetime
    requested_via: str
    reviewed_at: datetime | None = None
    admin_note: str | None = None
    hold_reason: str | None = None
    kyc_action: str | None = None
    kyc_retain_until: datetime | None = None
    kyc_purged_at: datetime | None = None
    # True while the holder can still call POST /users/me/deletion-request/cancel.
    can_cancel: bool = False
    # Whole days left before the request reaches admin review (0 once it has).
    days_until_review: int = 0


class DeletionRequestStatusSchema(BaseModel):
    """Body of GET /users/me/deletion-request.

    Always 200 with `request: null` when nothing is open or completed, so the
    app never has to treat "no request" as an error case.
    """

    request: DeletionRequestResponseSchema | None = None


class DeletionRequestCancelResponseSchema(BaseModel):
    """Body of POST /users/me/deletion-request/cancel."""

    message: str
    request: DeletionRequestResponseSchema


class RiderDeletionRequestedResponseSchema(BaseModel):
    """Body of `DELETE /users/me` for a rider (deferred flow)."""

    message: str
    request: DeletionRequestResponseSchema


# --------------------------------------------------------------------- public


class PublicDeletionRequestSchema(BaseModel):
    """Body of POST /account-deletion/request (web form, step 1)."""

    country_code: str = Field(min_length=2, max_length=6)
    phone_number: str = Field(min_length=9, max_length=20)


class PublicDeletionConfirmSchema(BaseModel):
    """Body of POST /account-deletion/confirm (web form, step 2)."""

    country_code: str = Field(min_length=2, max_length=6)
    phone_number: str = Field(min_length=9, max_length=20)
    otp_code: str = Field(min_length=4, max_length=8)


class PublicDeletionRequestedResponseSchema(BaseModel):
    """Deliberately identical for "OTP sent" and "no such account"."""

    message: str


class PublicDeletionConfirmResponseSchema(BaseModel):
    """Result of a verified web deletion request.

    `result`:
      - "deleted"    customer account deleted immediately
      - "pending"    rider request created (or already open), admin review next
      - "no_account" the OTP was valid for a number with no account here
    """

    result: str
    message: str
    grace_ends_at: datetime | None = None
    requires_admin_review: bool = False


# ---------------------------------------------------------------------- admin


class AdminDeletionRequestItemSchema(BaseModel):
    """One row in the admin deletion queue, with the facts that gate approval."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    subject_name: str
    subject_phone: str  # masked by the service, e.g. +9230*****89
    status: str
    requested_at: datetime
    grace_ends_at: datetime
    requested_via: str
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    admin_note: str | None = None
    hold_reason: str | None = None
    kyc_action: str | None = None
    kyc_retain_until: datetime | None = None
    kyc_purged_at: datetime | None = None

    # Re-checked live on every read and again at approval time.
    wallet_balance: float = 0
    pending_cash_owed: float = 0
    has_active_delivery: bool = False
    can_approve: bool = True
    blocking_reason: str | None = None

    # Admin SLA: a request sitting in ready_for_review longer than
    # DELETION_REQUEST_OVERDUE_DAYS is flagged so it cannot be forgotten.
    days_in_ready_for_review: int = 0
    is_overdue: bool = False


class AdminDeletionRequestListSchema(BaseModel):
    items: list[AdminDeletionRequestItemSchema]
    total: int
    page: int
    page_size: int


class AdminDeletionApproveSchema(BaseModel):
    """Body of POST /admin/deletion-requests/{id}/approve."""

    kyc_action: str
    kyc_retain_until: datetime | None = None
    admin_note: str | None = None

    @field_validator("kyc_action")
    @classmethod
    def _known_kyc_action(cls, value: str) -> str:
        if value not in ALL_KYC_ACTIONS:
            raise ValueError(f"kyc_action must be one of {list(ALL_KYC_ACTIONS)}.")
        return value


class AdminDeletionHoldSchema(BaseModel):
    """Body of POST /admin/deletion-requests/{id}/hold."""

    reason: str = Field(min_length=3, max_length=1000)

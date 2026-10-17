"""
Account deletion endpoints - three routers, three audiences.

  user_router   /users/...                 account holder (mobile app)
  public_router /account-deletion/...      signed-out web form (phone + OTP)
  admin_router  /admin/deletion-requests   staff review queue

Authentication decisions (spec point 2, "how does a deactivated rider auth?"):
  - Deactivation does NOT revoke sessions. Revocation happens only at execution
    time (spec point 5), so during the grace period the rider's own access
    token still works for GET status + cancel. That is what the app uses.
  - A rider who lost the device uses the public web form instead: the same
    phone + OTP flow as /account-deletion/request, which is why cancel is also
    reachable from speedymealservices.com/delete-account.
  - Nothing here trusts an id from the body: subject id always comes from the
    token, or from the OTP-verified phone number.
"""
import uuid

from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limiter import enforce_rate_limit
from app.platform.account_deletion import models, service
from app.platform.account_deletion.schemas import (
    AdminDeletionApproveSchema,
    AdminDeletionHoldSchema,
    AdminDeletionRequestListSchema,
    AdminDeletionRequestItemSchema,
    DeletionRequestCancelResponseSchema,
    DeletionRequestStatusSchema,
    PublicDeletionConfirmResponseSchema,
    PublicDeletionConfirmSchema,
    PublicDeletionRequestSchema,
    PublicDeletionRequestedResponseSchema,
    RiderDeletionRequestedResponseSchema,
)
from app.platform.auth import service as auth_service
from app.platform.auth.dependencies import (
    CurrentUser,
    get_current_user,
    require_permission,
    require_role,
)
from app.platform.users.models import User
from app.platform.wallet_payment.models import Rider

user_router = APIRouter(prefix="/users", tags=["account-deletion"])
public_router = APIRouter(prefix="/account-deletion", tags=["account-deletion"])
admin_router = APIRouter(prefix="/admin", tags=["account-deletion"])

require_rider = require_role(["rider"])
require_manage_deletion = require_permission("manage_deletion_requests")

# Global daily OTP cap for the public deletion request endpoint.
# Exceeding this signals a scraping/abuse attempt; adjust via settings if needed.
_GLOBAL_DAILY_CAP_KEY_PREFIX = "deletion_otp_global_daily"
_GLOBAL_DAILY_CAP = 500         # total OTPs sent per calendar day across all callers
_PER_PHONE_MAX = 5              # per phone number per minute
_PER_IP_MAX = 10                # per IP address per 10 minutes
_PER_IP_WINDOW = 600            # seconds (10 min)


def _full_number(country_code: str, phone_number: str) -> str:
    """country_code + local number -> E.164, same guard as /auth/otp/request."""
    phone_number = phone_number.strip()
    country_code = country_code.strip()
    if phone_number.startswith(country_code) or phone_number.startswith("+"):
        return phone_number
    return f"{country_code}{phone_number}"


def _phone_has_account(db: Session, full_number: str) -> bool:
    """Return True when at least one User or Rider row exists for this phone.

    This is the ONLY place we probe the DB in the /request endpoint.  The result
    drives whether an OTP is actually sent; the HTTP response to the caller is
    always the same 202, so knowledge of the return value is never exposed.
    """
    if db.query(User).filter(User.phone_number == full_number).first():
        return True
    if db.query(Rider).filter(Rider.phone_number == full_number).first():
        return True
    return False


def _enforce_global_daily_cap() -> None:
    """Raise 429 once the global daily OTP send budget for this endpoint is exhausted.

    Key: deletion_otp_global_daily:<YYYY-MM-DD>  (resets at midnight UTC).
    Fails open if Redis is down - the in-memory fallback still tracks within the
    process lifetime but cannot coordinate across multiple API workers.
    """
    from app.core.redis_client import redis_client  # local import to avoid circulars
    key = f"{_GLOBAL_DAILY_CAP_KEY_PREFIX}:{date.today().isoformat()}"
    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, 86_400)  # expires after 24 h
        if count > _GLOBAL_DAILY_CAP:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Daily verification limit reached. Please try again tomorrow.",
            )
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001  - Redis unavailable; fail open
        pass


def _get_client_ip(request: Request) -> str:
    """Best-effort client IP extraction (supports common reverse-proxy headers)."""
    for header in ("x-forwarded-for", "x-real-ip"):
        value = request.headers.get(header)
        if value:
            return value.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ------------------------------------------------------------------ holder


@user_router.delete(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Request account deletion",
)
def delete_my_account(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Two different outcomes by role:

    customer -> immediate deletion (204), refused with 409 while an order is
                still active/pending.
    rider    -> deferred: pending request + grace_ends_at, account deactivated
                at once, 409 while an active delivery exists. Data is removed
                only after an admin approves.
    """
    if current_user.role == "customer":
        customer = service.get_customer_or_404(db, current_user.id)
        service.delete_customer_now(db, customer, via=models.REQUESTED_VIA_APP)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if current_user.role == "rider":
        rider = service.get_rider_or_404(db, current_user.id)
        request = service.request_rider_deletion(db, rider, via=models.REQUESTED_VIA_APP)
        return {
            "message": (
                "Your account has been deactivated. After "
                f"{max(settings.RIDER_DELETION_GRACE_DAYS, 1)} days your request goes to admin review. "
                "Deletion happens only after approval and only if you have no "
                "pending dues. You can cancel before then."
            ),
            "request": service.get_status_payload(db, request),
        }

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Account deletion from the app is only supported for customers and riders.",
    )


@user_router.get(
    "/me/deletion-request",
    response_model=DeletionRequestStatusSchema,
    summary="Read my deletion request",
)
def get_my_deletion_request(
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """200 with `request: null` when there is none - "no request" is a normal
    answer for the status screen, not an error."""
    request = service.get_latest_request(db, current_user.id, "rider")
    if request is None:
        return {"request": None}
    return {"request": service.get_status_payload(db, request)}


@user_router.post(
    "/me/deletion-request/cancel",
    response_model=DeletionRequestCancelResponseSchema,
    summary="Cancel my deletion request",
)
def cancel_my_deletion_request(
    current_user: CurrentUser = Depends(require_rider),
    db: Session = Depends(get_db),
):
    """Allowed while `pending` or `ready_for_review`; reactivates the account.
    Once an admin has approved it (or put it on hold), cancel returns 409 and
    the rider must contact support instead."""
    request = service.get_latest_request(db, current_user.id, "rider")
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have no deletion request to cancel.",
        )

    request = service.cancel_deletion_request(db, request)
    return {
        "message": "Your deletion request has been cancelled and your account is active again.",
        "request": service.get_status_payload(db, request),
    }


# ------------------------------------------------------------- public (web)


@public_router.post(
    "/request",
    response_model=PublicDeletionRequestedResponseSchema,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start a signed-out deletion request (sends OTP only if account exists)",
)
def request_public_deletion(
    request: Request,
    payload: PublicDeletionRequestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Step 1 of the hosted deletion page.

    Security design (no user-enumeration):
    - The HTTP response is ALWAYS the same 202 body, regardless of whether the
      phone number has an account.  The caller learns nothing from the response.
    - An OTP is only generated and sent when an account actually exists.  The
      send is offloaded to a FastAPI BackgroundTask so response timing is roughly
      equal for known and unknown numbers (both return immediately).
    - Three independent rate limits guard this endpoint:
        1. Per phone number:   _PER_PHONE_MAX attempts per 60 s.
        2. Per IP address:     _PER_IP_MAX attempts per _PER_IP_WINDOW s.
        3. Global daily cap:   _GLOBAL_DAILY_CAP OTPs per calendar day (UTC).
           Intended to cap the total SMS spend, not to gate legitimate users.
    - Limits 1 & 2 are enforced before the DB lookup and before any OTP is
      generated, so the counter increments only on rate-limit-clean requests.
    - If Redis is down all three limits fail open; the in-process fallback
      (ResilientRedisClient) still tracks within a single worker process.
    """
    _STATIC_202 = PublicDeletionRequestedResponseSchema(
        message=(
            "If an account is registered with this number, a verification code "
            "has been sent. Enter it to continue."
        )
    )

    full_number = _full_number(payload.country_code, payload.phone_number)
    auth_service.validate_pakistan_mobile_number(full_number)

    # --- Rate limits (applied before any DB work or OTP generation) ----------
    enforce_rate_limit(full_number, action="deletion_request", max_attempts=_PER_PHONE_MAX)
    client_ip = _get_client_ip(request)
    enforce_rate_limit(
        client_ip,
        action="deletion_request_ip",
        max_attempts=_PER_IP_MAX,
        window_seconds=_PER_IP_WINDOW,
    )

    # --- Existence check (result is NEVER revealed in the response) ----------
    if not _phone_has_account(db, full_number):
        # No account - return the identical 202 immediately.  No OTP is sent,
        # no counter is incremented towards the daily cap.
        return _STATIC_202

    # --- Account exists: apply global daily cap and enqueue OTP send ---------
    _enforce_global_daily_cap()

    def _send_otp_background():
        """Runs after the 202 is already on the wire - timing parity.

        `respect_cooldown=False`: this endpoint has its own per-phone / per-IP /
        daily limits, and the shared login cooldown would otherwise make this
        send fail (429) for anyone who asked for a login code in the last 45s -
        the caller has already been told a code was sent, so a silent drop is
        the one outcome we must never produce. Failures are logged instead.
        """
        import asyncio
        import logging

        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(
                auth_service.generate_and_send_otp_async(
                    full_number, respect_cooldown=False
                )
            )
        except Exception as exc:  # noqa: BLE001 - never break the 202 contract
            logging.getLogger(__name__).error(
                "Deletion OTP dispatch failed for %s: %s", full_number, exc
            )
        finally:
            loop.close()

    background_tasks.add_task(_send_otp_background)
    return _STATIC_202


@public_router.post(
    "/confirm",
    response_model=PublicDeletionConfirmResponseSchema,
    summary="Confirm a signed-out deletion request with the OTP",
)
def confirm_public_deletion(
    payload: PublicDeletionConfirmSchema,
    db: Session = Depends(get_db),
):
    """Step 2 of the hosted deletion page: verify the OTP, then act.

    The OTP is only checked against this phone's stored code - it is never
    re-issued here, so a wrong code is a plain 400 and tells nothing about
    which accounts exist. Only after a verified code is the account state
    returned to (and only to) the person who controls that number.
    """
    full_number = _full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="deletion_confirm", max_attempts=5)
    auth_service.verify_otp(full_number, payload.otp_code)
    return service.verified_phone_deletion(db, full_number, via=models.REQUESTED_VIA_WEB)


# -------------------------------------------------------------------- admin


@admin_router.get(
    "/deletion-requests",
    response_model=AdminDeletionRequestListSchema,
    summary="List account deletion requests",
)
def list_deletion_requests(
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_manage_deletion),
    db: Session = Depends(get_db),
):
    """Staff queue. Every row carries the live dues and active-delivery facts
    plus `is_overdue` (ready_for_review for longer than
    DELETION_REQUEST_OVERDUE_DAYS, default 30)."""
    return service.list_admin_requests(db, status_filter, page, page_size)


@admin_router.post(
    "/deletion-requests/{request_id}/approve",
    response_model=AdminDeletionRequestItemSchema,
    summary="Approve a deletion request (executes it)",
)
def approve_deletion_request(
    request_id: uuid.UUID,
    payload: AdminDeletionApproveSchema,
    current_user: CurrentUser = Depends(require_manage_deletion),
    db: Session = Depends(get_db),
):
    """The only path that removes data. Dues and active deliveries are
    re-checked right now: if either exists the request flips to `on_hold` with
    the reason and this call answers 409. Dues are never overridden."""
    request = service.admin_approve(
        db,
        current_user.id,
        request_id,
        kyc_action=payload.kyc_action,
        kyc_retain_until=payload.kyc_retain_until,
        admin_note=payload.admin_note,
    )
    return service.admin_item(db, request)


@admin_router.post(
    "/deletion-requests/{request_id}/hold",
    response_model=AdminDeletionRequestItemSchema,
    summary="Put a deletion request on hold",
)
def hold_deletion_request(
    request_id: uuid.UUID,
    payload: AdminDeletionHoldSchema,
    current_user: CurrentUser = Depends(require_manage_deletion),
    db: Session = Depends(get_db),
):
    request = service.admin_hold(db, current_user.id, request_id, payload.reason)
    return service.admin_item(db, request)


@admin_router.post(
    "/deletion-requests/{request_id}/release",
    response_model=AdminDeletionRequestItemSchema,
    summary="Release a held deletion request back into the queue",
)
def release_deletion_request(
    request_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_manage_deletion),
    db: Session = Depends(get_db),
):
    """Back to `ready_for_review` when the grace period already ended, else
    back to `pending` so the remaining days still run."""
    request = service.admin_release(db, current_user.id, request_id)
    return service.admin_item(db, request)


@admin_router.post(
    "/deletion-requests/{request_id}/purge-kyc",
    response_model=AdminDeletionRequestItemSchema,
    summary="Purge KYC documents retained at approval time",
)
def purge_deletion_kyc(
    request_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_manage_deletion),
    db: Session = Depends(get_db),
):
    request = service.admin_purge_kyc(db, current_user.id, request_id)
    return service.admin_item(db, request)

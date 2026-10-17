"""
Business logic for account deletion (Google Play compliance).

The rules this file implements, in one place:

1. A customer is deleted immediately, but only with no active/pending order
   (409 otherwise).
2. A rider is never deleted by a request. A request deactivates the account
   and starts the grace period; execution happens only after an admin approves.
3. Execution is refused, even by an admin, while the rider has unsettled dues
   (wallet balance or collected COD cash) or an in-flight delivery. An approval
   attempt in that state sets the request to `on_hold` with the reason and
   returns 409. Dues can never be overridden.
4. Orders, wallet transactions and payouts are financial history: they are
   anonymised, never deleted.
5. KYC files (CNIC/license/vehicle photos) are removed only on the admin's
   explicit `delete_now`, or later via `purge-kyc` when the admin chose
   `retain_until`.
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redis_client import redis_client
from app.core.storage import delete_rider_document_url
from app.modules.admin_roles.models import AdminAuditLog
from app.modules.food_delivery.models import Order
from app.platform.account_deletion import models
from app.platform.auth.models import RefreshToken
from app.platform.notification.models import DeviceToken
from app.platform.users.models import Address, User
from app.platform.wallet_payment.models import Rider

logger = logging.getLogger(__name__)

ANONYMIZED_NAME = "Deleted User"
# Shown to restaurant/rider/admin staff on the order history of a deleted
# customer. The order keeps its address row (see _release_customer_addresses)
# but must not keep the street address the customer typed.
ANONYMIZED_ADDRESS = "Address removed"
AUDIT_DOMAIN = "account_deletion"

# An order in any of these states means the account is still in use. Delivered
# and Cancelled are terminal history, so they never block deletion.
ACTIVE_ORDER_STATUSES = {
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Rider Assigned",
    "Rejected",
    "Accepted by Rider",
    "Arrived at Restaurant",
    "Picked Up",
    "On the Way",
}

RIDER_KYC_URL_FIELDS = ("cnic_photo_url", "license_photo_url", "vehicle_photo_url")


# ------------------------------------------------------------------ helpers


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _access_denylist_ttl_seconds() -> int:
    """Long enough to outlive any access token issued before the deletion."""
    return settings.JWT_EXPIRE_MINUTES * 60 + 60


def _mask_phone(phone: str | None) -> str:
    """Mask a phone number for staff-facing output. Never log or return it raw.

    +923001234567 -> +9230*****567
    """
    if not phone:
        return ""
    if phone.startswith("deleted:"):
        # Already anonymised: show a stable placeholder, never the leftover id.
        return "(deleted)"
    if len(phone) <= 7:
        return "*" * len(phone)
    return f"{phone[:5]}{'*' * (len(phone) - 8)}{phone[-3:]}"


def _days_between(start: datetime, end: datetime) -> int:
    """Whole days, floored at 0. `start`/`end` are both timezone-aware UTC."""
    if end <= start:
        return 0
    return int((end - start).total_seconds() // 86400)


def _grace_deadline(from_moment: datetime) -> datetime:
    return from_moment + timedelta(days=max(settings.RIDER_DELETION_GRACE_DAYS, 1))


def _revoke_refresh_tokens(db: Session, subject_id: uuid.UUID, role: str) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.subject_id == subject_id,
        RefreshToken.role == role,
        RefreshToken.status == "valid",
    ).update({"status": "revoked"}, synchronize_session=False)


def _delete_device_tokens(db: Session, subject_id: uuid.UUID, role: str) -> None:
    """A deleted account must not keep receiving pushes."""
    db.query(DeviceToken).filter(
        DeviceToken.subject_id == subject_id, DeviceToken.role == role
    ).delete(synchronize_session=False)


def _denylist_access_tokens(subject_id: uuid.UUID) -> None:
    """Access tokens are stateless JWTs. The denylist key (read by
    auth.dependencies.get_current_user) makes the ones already issued stop
    working now instead of at their natural expiry."""
    try:
        redis_client.setex(
            f"deleted:{subject_id}", _access_denylist_ttl_seconds(), "1"
        )
    except Exception:  # noqa: BLE001 - refresh tokens are already revoked
        logger.exception("Could not write deletion denylist entry")


def _purge_redis_keys(*keys: str) -> None:
    for key in keys:
        if not key:
            continue
        try:
            redis_client.delete(key)
        except Exception:  # noqa: BLE001
            logger.warning("Could not clear cached key during deletion")


def _purge_customer_carts(user_id: uuid.UUID) -> None:
    """Drop any cart still cached for this customer (best effort)."""
    try:
        for key in redis_client.keys(f"cart:{user_id}:*"):
            redis_client.delete(key)
    except Exception:  # noqa: BLE001
        logger.warning("Could not clear cart cache during deletion")


# ------------------------------------------------------------------ lookups


def _get_request_or_404(db: Session, request_id: uuid.UUID) -> models.DeletionRequest:
    request = (
        db.query(models.DeletionRequest)
        .filter(models.DeletionRequest.id == request_id)
        .first()
    )
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deletion request not found."
        )
    return request


def get_rider_or_404(db: Session, rider_id: uuid.UUID) -> Rider:
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found."
        )
    return rider


def get_customer_or_404(db: Session, user_id: uuid.UUID) -> User:
    customer = db.query(User).filter(User.id == user_id).first()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    return customer


def get_latest_request(
    db: Session, subject_id: uuid.UUID, role: str
) -> models.DeletionRequest | None:
    """Most recent request for this account, whatever its status.

    The account holder's status screen shows a completed/cancelled request too,
    so they can see what happened after the fact.
    """
    return (
        db.query(models.DeletionRequest)
        .filter(
            models.DeletionRequest.user_id == subject_id,
            models.DeletionRequest.role == role,
        )
        .order_by(models.DeletionRequest.requested_at.desc())
        .first()
    )


def _find_open_request(
    db: Session, subject_id: uuid.UUID, role: str
) -> models.DeletionRequest | None:
    """An existing request that still needs a decision (pending/ready/on_hold)."""
    return (
        db.query(models.DeletionRequest)
        .filter(
            models.DeletionRequest.user_id == subject_id,
            models.DeletionRequest.role == role,
            models.DeletionRequest.status.in_(models.OPEN_STATUSES),
        )
        .order_by(models.DeletionRequest.requested_at.desc())
        .first()
    )


# --------------------------------------------------------------- eligibility


def active_delivery_count(db: Session, rider_id: uuid.UUID) -> int:
    return (
        db.query(Order)
        .filter(Order.rider_id == rider_id, Order.status.in_(ACTIVE_ORDER_STATUSES))
        .count()
    )


def active_order_count(db: Session, user_id: uuid.UUID) -> int:
    return (
        db.query(Order)
        .filter(Order.user_id == user_id, Order.status.in_(ACTIVE_ORDER_STATUSES))
        .count()
    )


def rider_dues(db: Session, rider_id: uuid.UUID) -> tuple[float, float]:
    """(wallet_balance, pending_cash_owed) as plain floats.

    Numeric columns come back as Decimal; comparing those to the int 0 works
    but arithmetic with them alongside floats does not, so normalise here.
    """
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if rider is None:
        return 0.0, 0.0
    return float(rider.wallet_balance or 0), float(rider.pending_cash_owed or 0)


def blocking_reason(db: Session, request: models.DeletionRequest) -> str | None:
    """Why this request may not be executed, or None when it may.

    This is the single source of truth for "can this account be deleted": every
    read, every approve and the API's `can_approve` flag all come from here.
    """
    if request.role == "rider":
        rider = db.query(Rider).filter(Rider.id == request.user_id).first()
        if rider is None:
            # Already executed or removed by hand: nothing is left to protect.
            return None
        active = active_delivery_count(db, request.user_id)
        if active:
            return (
                f"Rider has {active} active delivery. Wait for it to be delivered "
                "or cancelled before deleting this account."
            )
        wallet, cash = rider_dues(db, request.user_id)
        if wallet != 0 or cash != 0:
            return (
                "Rider has unsettled dues "
                f"(wallet balance Rs. {wallet:.2f}, collected cash Rs. {cash:.2f}). "
                "These must be settled to zero before deletion."
            )
        return None

    active = active_order_count(db, request.user_id)
    if active:
        return (
            f"Customer has {active} active or pending order. Wait for it to be "
            "delivered or cancelled before deleting this account."
        )
    return None


# ------------------------------------------------------------- request flows


def request_rider_deletion(
    db: Session, rider: Rider, via: str = models.REQUESTED_VIA_APP
) -> models.DeletionRequest:
    """Start (or return) the deferred deletion request for a rider.

    - 409 while an active delivery exists: a rider mid-delivery cannot abandon
      the customer's order.
    - Unsettled dues do NOT block the request (the app's dialog tells the rider
      deletion needs approval and zero dues); they block execution instead, so
      an admin sees the case and the rider sees why it is on hold.
    - Deactivates the account immediately and takes the rider offline.
    - Idempotent: an already-open request is returned unchanged.
    """
    active = active_delivery_count(db, rider.id)
    if active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "You still have an active delivery. Complete it, then request "
                "account deletion again."
            ),
        )

    existing = _find_open_request(db, rider.id, "rider")
    if existing is not None:
        if rider.is_active or rider.is_online:
            rider.is_active = False
            rider.is_online = False
            db.commit()
        return existing

    now = _now()
    request = models.DeletionRequest(
        user_id=rider.id,
        role="rider",
        status=models.STATUS_PENDING,
        requested_at=now,
        grace_ends_at=_grace_deadline(now),
        requested_via=via,
    )
    db.add(request)

    # Deactivated at once (spec point 2), so dispatch stops immediately. The
    # session is deliberately NOT revoked yet: the rider needs to read the
    # status and cancel during the grace period. Revocation happens at
    # execution time.
    rider.is_active = False
    rider.is_online = False

    db.commit()
    db.refresh(request)
    logger.info(
        "Deletion request %s created for rider (grace until %s)",
        request.id,
        request.grace_ends_at.isoformat(),
    )
    return request


def cancel_deletion_request(db: Session, request: models.DeletionRequest) -> models.DeletionRequest:
    """Cancel a pending/ready_for_review request and reactivate the account.

    Refused once an admin has approved (or after completion), and refused while
    the request is `on_hold` - that state exists precisely because staff need to
    talk to the account holder first.
    """
    if request.status not in models.CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"A request in status '{request.status}' can no longer be "
                "cancelled. Contact support."
            ),
        )

    request.status = models.STATUS_CANCELLED
    request.reviewed_at = _now()
    request.admin_note = "Cancelled by the account holder."

    if request.role == "rider":
        rider = db.query(Rider).filter(Rider.id == request.user_id).first()
        if rider is not None and not rider.name == ANONYMIZED_NAME:
            rider.is_active = True

    db.commit()
    db.refresh(request)
    logger.info("Deletion request %s cancelled by the account holder", request.id)
    return request


def delete_customer_now(
    db: Session, customer: User, via: str = models.REQUESTED_VIA_APP
) -> models.DeletionRequest:
    """Immediate customer deletion (spec: customer is never deferred).

    409 while an order is still active/pending. The request row is written as
    `completed` so staff have an audit trail of the deletion.
    """
    active = active_order_count(db, customer.id)
    if active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "You have an active or pending order. Please wait until it is "
                "delivered or cancelled, then delete your account."
            ),
        )

    now = _now()
    request = models.DeletionRequest(
        user_id=customer.id,
        role="customer",
        status=models.STATUS_APPROVED,
        requested_at=now,
        grace_ends_at=now,  # no grace period for customers
        requested_via=via,
        reviewed_at=now,
        admin_note="Immediate customer deletion (no admin review).",
    )
    db.add(request)

    _anonymize_customer(db, customer)
    request.status = models.STATUS_COMPLETED
    db.commit()
    db.refresh(request)
    logger.info("Customer account deleted immediately (request %s)", request.id)
    return request


# --------------------------------------------------------------- execution


def _anonymize_customer(db: Session, customer: User) -> None:
    """Anonymise in place: the row stays because orders/payments point at it."""
    customer.name = ANONYMIZED_NAME
    customer.email = None
    # The phone is the identity and must stay usable: releasing it lets the same
    # person sign up again later (unique column).
    customer.phone_number = f"deleted:{customer.id}"
    customer.is_active = False

    _release_customer_addresses(db, customer.id)
    _revoke_refresh_tokens(db, customer.id, "customer")
    _delete_device_tokens(db, customer.id, "customer")
    _denylist_access_tokens(customer.id)
    _purge_customer_carts(customer.id)


def _release_customer_addresses(db: Session, user_id: uuid.UUID) -> None:
    """Remove the customer's saved addresses without breaking order history.

    `orders.delivery_address_id` is NOT NULL and points at `addresses.id`, so a
    blanket DELETE raises a ForeignKeyViolation (HTTP 500) for every customer
    who has ever ordered - which is the normal case for a deletion request.

    Addresses no order points at are deleted outright (nothing needs them).
    The ones an order still references are scrubbed in place: label, street
    address and default flag - the personal payload - are removed, while the
    row (and its coordinates, which the order already froze on its own
    snapshot columns) survives to keep the FK valid.
    """
    address_ids = [
        row[0]
        for row in db.query(Address.id).filter(Address.user_id == user_id).all()
    ]
    if not address_ids:
        return

    referenced = {
        row[0]
        for row in db.query(Order.delivery_address_id)
        .filter(Order.delivery_address_id.in_(address_ids))
        .all()
    }
    unreferenced = [address_id for address_id in address_ids if address_id not in referenced]
    if unreferenced:
        db.query(Address).filter(Address.id.in_(unreferenced)).delete(
            synchronize_session=False
        )
    if referenced:
        db.query(Address).filter(Address.id.in_(list(referenced))).update(
            {
                "label": None,
                "full_address": ANONYMIZED_ADDRESS,
                "is_default": False,
            },
            synchronize_session=False,
        )


def _anonymize_rider(db: Session, rider: Rider) -> None:
    """Anonymise the rider and clear identity/location data.

    KYC document URLs are NOT cleared here: the admin's `delete_now` /
    `retain_until` decision is applied by [_apply_kyc_decision].
    """
    rider.name = ANONYMIZED_NAME
    rider.phone_number = f"deleted:{rider.id}"
    # cnic_number is unique and not nullable: keep the row valid without
    # keeping the real document number.
    rider.cnic_number = f"deleted:{rider.id}"
    rider.vehicle_type = None
    rider.vehicle_registration = None
    rider.current_latitude = None
    rider.current_longitude = None
    rider.is_online = False
    rider.is_active = False

    _revoke_refresh_tokens(db, rider.id, "rider")
    _delete_device_tokens(db, rider.id, "rider")
    _denylist_access_tokens(rider.id)
    _purge_redis_keys(f"rider:location:{rider.id}")


def _apply_kyc_decision(db: Session, rider: Rider, kyc_action: str) -> datetime | None:
    """Handle the rider's KYC files per the admin's decision.

    delete_now   -> remove the objects from storage, clear the DB references
                    and return the purge timestamp.
    retain_until -> touch nothing: the files stay in the private `rider-docs`
                    bucket, no URL for them is ever returned by a user-facing
                    API (rider profile only exposes `has_*_photo` booleans),
                    and they wait for an explicit `purge-kyc`.
    """
    if kyc_action == models.KYC_DELETE_NOW:
        _purge_rider_kyc_files(db, rider)
        return _now()
    return None


def _purge_rider_kyc_files(db: Session, rider: Rider) -> int:
    """Delete every stored KYC object for this rider and clear the DB URLs."""
    removed = 0
    for field in RIDER_KYC_URL_FIELDS:
        url = getattr(rider, field, None)
        if not url:
            continue
        if delete_rider_document_url(url):
            removed += 1
        setattr(rider, field, None)
    return removed


def execute_deletion(
    db: Session,
    request: models.DeletionRequest,
    *,
    kyc_action: str = models.KYC_DELETE_NOW,
    kyc_retain_until: datetime | None = None,
    admin_id: uuid.UUID | None = None,
) -> models.DeletionRequest:
    """The one function that actually removes data for an approved request.

    Reached only from `admin_approve` (spec point 5: execution on approval).
    Customer requests go through `delete_customer_now`, which shares the same
    `_anonymize_customer` / revoke helpers - there is no second, independent
    implementation of "remove an account".

    It never deletes orders, wallet transactions, cash deposits or payouts;
    those are anonymised by clearing the account's identifying columns.
    """
    now = _now()

    if request.role == "rider":
        rider = db.query(Rider).filter(Rider.id == request.user_id).first()
        blocking = blocking_reason(db, request)
        if blocking:
            # Callers must pre-check; this is the last line of defence so no
            # code path can ever delete a rider who still owes the platform.
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=blocking)
        if rider is not None:
            _anonymize_rider(db, rider)
            request.kyc_action = kyc_action
            request.kyc_purged_at = _apply_kyc_decision(db, rider, kyc_action)
            if kyc_action == models.KYC_RETAIN_UNTIL:
                request.kyc_retain_until = kyc_retain_until
    else:
        customer = db.query(User).filter(User.id == request.user_id).first()
        if customer is not None:
            _anonymize_customer(db, customer)

    request.status = models.STATUS_COMPLETED
    request.reviewed_by = admin_id
    request.reviewed_at = now
    request.hold_reason = None

    _write_audit(
        db,
        admin_id=admin_id,
        action="DELETION_REQUEST_COMPLETED",
        request=request,
        changes={
            "role": request.role,
            "kyc_action": request.kyc_action,
            "kyc_retain_until": (
                request.kyc_retain_until.isoformat()
                if request.kyc_retain_until
                else None
            ),
        },
    )
    db.commit()
    db.refresh(request)
    logger.info(
        "Deletion request %s completed (role=%s kyc_action=%s)",
        request.id,
        request.role,
        request.kyc_action,
    )
    return request


# ----------------------------------------------------------- daily review job


def mark_pending_ready_for_review(db: Session, now: datetime | None = None) -> int:
    """Move every pending request whose grace period has ended to review.

    THE JOB NEVER DELETES ANYTHING. It only flips `pending` -> `ready_for_review`
    and tells admins. Safe to re-run: the WHERE clause matches only rows still
    in `pending`, so a second run in the same minute moves zero rows.
    """
    moment = now or _now()
    due = (
        db.query(models.DeletionRequest)
        .filter(
            models.DeletionRequest.status == models.STATUS_PENDING,
            models.DeletionRequest.grace_ends_at <= moment,
        )
        .all()
    )
    if not due:
        return 0

    for request in due:
        request.status = models.STATUS_READY_FOR_REVIEW
        _write_audit(
            db,
            admin_id=None,
            action="DELETION_REQUEST_READY_FOR_REVIEW",
            request=request,
            changes={"grace_ends_at": request.grace_ends_at.isoformat()},
        )
    db.commit()

    logger.info(
        "Deletion review job: %s request(s) moved to ready_for_review (%s)",
        len(due),
        ", ".join(str(request.id) for request in due),
    )
    _notify_admins(
        db,
        title="Account deletions awaiting review",
        body=(
            f"{len(due)} rider account deletion request(s) completed their grace "
            "period and need a decision."
        ),
    )
    return len(due)


def _notify_admins(db: Session, title: str, body: str) -> None:
    """Log always, push when FCM is configured.

    Notification failures must never fail the job (or a deletion), so every
    send is best effort - same contract as order_notifications.
    """
    logger.warning("ADMIN ALERT: %s - %s", title, body)
    try:
        from app.platform.auth.models import Admin
        from app.platform.notification import service as push_service

        admin_ids = [
            admin_id
            for (admin_id,) in db.query(Admin.id)
            .filter(Admin.is_active.is_(True))
            .limit(50)
            .all()
        ]
        for admin_id in admin_ids:
            push_service.dispatch_push(
                admin_id,
                "admin",
                title=title,
                body=body,
                data={"type": "deletion_request"},
                click_path="/admin/deletion-requests",
            )
    except Exception:  # noqa: BLE001
        logger.exception("Could not notify admins about deletion requests")


# ------------------------------------------------------------------- admin


def _write_audit(
    db: Session,
    *,
    admin_id: uuid.UUID | None,
    action: str,
    request: models.DeletionRequest,
    changes: dict | None = None,
) -> None:
    """Admin audit trail. Only ids/statuses are recorded - never phone numbers,
    CNIC values or document URLs."""
    db.add(
        AdminAuditLog(
            admin_id=admin_id,
            action=action,
            domain=AUDIT_DOMAIN,
            target_type="deletion_request",
            target_id=str(request.id),
            changes_diff=changes or {},
        )
    )


def admin_item(db: Session, request: models.DeletionRequest, now: datetime | None = None) -> dict:
    """Staff view of a request: identity is masked, money/delivery facts live.

    Exposed because routes.py returns it as the response body of every admin
    action, so approve/hold/release/purge answer with the same shape the list
    shows (one refetch, no divergent views of the same row).
    """
    now = now or _now()
    wallet, cash = (0.0, 0.0)
    name = ANONYMIZED_NAME
    phone = ""

    if request.role == "rider":
        rider = db.query(Rider).filter(Rider.id == request.user_id).first()
        if rider is not None:
            name = rider.name
            phone = _mask_phone(rider.phone_number)
            wallet, cash = rider_dues(db, request.user_id)
        active_delivery = active_delivery_count(db, request.user_id) > 0
    else:
        customer = db.query(User).filter(User.id == request.user_id).first()
        if customer is not None:
            name = customer.name
            phone = _mask_phone(customer.phone_number)
            wallet = float(customer.wallet_balance or 0)
        active_delivery = active_order_count(db, request.user_id) > 0

    reason = blocking_reason(db, request)
    days_in_review = (
        _days_between(request.grace_ends_at, now)
        if request.status == models.STATUS_READY_FOR_REVIEW
        else 0
    )

    return {
        "id": request.id,
        "user_id": request.user_id,
        "role": request.role,
        "subject_name": name,
        "subject_phone": phone,
        "status": request.status,
        "requested_at": request.requested_at,
        "grace_ends_at": request.grace_ends_at,
        "requested_via": request.requested_via,
        "reviewed_by": request.reviewed_by,
        "reviewed_at": request.reviewed_at,
        "admin_note": request.admin_note,
        "hold_reason": request.hold_reason,
        "kyc_action": request.kyc_action,
        "kyc_retain_until": request.kyc_retain_until,
        "kyc_purged_at": request.kyc_purged_at,
        "wallet_balance": wallet,
        "pending_cash_owed": cash,
        "has_active_delivery": active_delivery,
        "can_approve": reason is None
        and request.status
        in (
            models.STATUS_READY_FOR_REVIEW,
            models.STATUS_ON_HOLD,
            models.STATUS_PENDING,
        ),
        "blocking_reason": reason,
        "days_in_ready_for_review": days_in_review,
        "is_overdue": days_in_review >= max(settings.DELETION_REQUEST_OVERDUE_DAYS, 1),
    }


def list_admin_requests(
    db: Session,
    status_filter: str | None,
    page: int,
    page_size: int,
) -> dict:
    """GET /admin/deletion-requests - newest first, filterable, paginated."""
    if status_filter and status_filter not in models.ALL_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status must be one of {list(models.ALL_STATUSES)}.",
        )

    query = db.query(models.DeletionRequest)
    if status_filter:
        query = query.filter(models.DeletionRequest.status == status_filter)

    total = query.count()
    rows = (
        query.order_by(models.DeletionRequest.requested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    now = _now()
    return {
        "items": [admin_item(db, request, now) for request in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def admin_approve(
    db: Session,
    admin_id: uuid.UUID,
    request_id: uuid.UUID,
    kyc_action: str,
    kyc_retain_until: datetime | None,
    admin_note: str | None,
) -> models.DeletionRequest:
    """POST /admin/deletion-requests/{id}/approve - the only path to execution.

    Order of checks matters:
      1. state must be approvable (not cancelled/completed/already running)
      2. before the grace period ends only with ALLOW_EARLY_ADMIN_APPROVAL
      3. dues and active deliveries are re-checked HERE, at the moment of
         approval. If either appeared, the request goes `on_hold` with the
         reason and the caller gets 409. Dues are never overridden.
    """
    request = _get_request_or_404(db, request_id)

    if request.status == models.STATUS_COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This deletion request is already completed.",
        )
    if request.status == models.STATUS_CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This deletion request was cancelled and cannot be approved.",
        )
    if request.status == models.STATUS_APPROVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This deletion request is already being executed.",
        )

    now = _now()
    if (
        request.status == models.STATUS_PENDING
        and request.grace_ends_at > now
        and not settings.ALLOW_EARLY_ADMIN_APPROVAL
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The grace period has not ended. Early approval requires "
                "ALLOW_EARLY_ADMIN_APPROVAL=true."
            ),
        )

    request.reviewed_by = admin_id
    request.reviewed_at = now
    request.admin_note = admin_note

    reason = blocking_reason(db, request)
    if reason:
        request.status = models.STATUS_ON_HOLD
        request.hold_reason = reason
        _write_audit(
            db,
            admin_id=admin_id,
            action="DELETION_REQUEST_ON_HOLD",
            request=request,
            changes={"reason": reason, "triggered_by": "approve"},
        )
        db.commit()
        # Committed on purpose: the 409 must leave the request on hold so staff
        # see why, rather than rolling the hold back with the error response.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Deletion blocked: {reason}",
        )

    request.status = models.STATUS_APPROVED
    _write_audit(
        db,
        admin_id=admin_id,
        action="DELETION_REQUEST_APPROVED",
        request=request,
        changes={
            "kyc_action": kyc_action,
            "kyc_retain_until": (
                kyc_retain_until.isoformat() if kyc_retain_until else None
            ),
        },
    )
    db.commit()

    return execute_deletion(
        db,
        request,
        kyc_action=kyc_action,
        kyc_retain_until=kyc_retain_until,
        admin_id=admin_id,
    )


def admin_hold(
    db: Session, admin_id: uuid.UUID, request_id: uuid.UUID, reason: str
) -> models.DeletionRequest:
    """POST /admin/deletion-requests/{id}/hold - pause a request with a reason."""
    request = _get_request_or_404(db, request_id)
    if request.status in (models.STATUS_COMPLETED, models.STATUS_CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A '{request.status}' request cannot be put on hold.",
        )

    request.status = models.STATUS_ON_HOLD
    request.hold_reason = reason
    request.reviewed_by = admin_id
    request.reviewed_at = _now()
    _write_audit(
        db,
        admin_id=admin_id,
        action="DELETION_REQUEST_HOLD",
        request=request,
        changes={"reason": reason},
    )
    db.commit()
    db.refresh(request)
    return request


def admin_release(
    db: Session, admin_id: uuid.UUID, request_id: uuid.UUID
) -> models.DeletionRequest:
    """POST /admin/deletion-requests/{id}/release - un-pause.

    Back to `ready_for_review` when the grace period is over, otherwise back to
    `pending` so the remaining days still run.
    """
    request = _get_request_or_404(db, request_id)
    if request.status != models.STATUS_ON_HOLD:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a request that is on hold can be released.",
        )

    now = _now()
    previous_reason = request.hold_reason
    request.status = (
        models.STATUS_READY_FOR_REVIEW
        if request.grace_ends_at <= now
        else models.STATUS_PENDING
    )
    request.hold_reason = None
    request.reviewed_by = admin_id
    request.reviewed_at = now
    _write_audit(
        db,
        admin_id=admin_id,
        action="DELETION_REQUEST_RELEASED",
        request=request,
        changes={"released_status": request.status, "previous_reason": previous_reason},
    )
    db.commit()
    db.refresh(request)
    return request


def admin_purge_kyc(
    db: Session, admin_id: uuid.UUID, request_id: uuid.UUID
) -> models.DeletionRequest:
    """POST /admin/deletion-requests/{id}/purge-kyc.

    Removes KYC files that were deliberately retained at approval
    (`kyc_action = retain_until`) and stamps `kyc_purged_at`. Refused when the
    files were already purged, so the timestamp stays trustworthy.
    """
    request = _get_request_or_404(db, request_id)
    if request.kyc_purged_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC documents for this request were already purged.",
        )

    removed = 0
    if request.role == "rider":
        rider = db.query(Rider).filter(Rider.id == request.user_id).first()
        if rider is not None:
            removed = _purge_rider_kyc_files(db, rider)

    request.kyc_purged_at = _now()
    _write_audit(
        db,
        admin_id=admin_id,
        action="DELETION_REQUEST_PURGE_KYC",
        request=request,
        changes={"files_removed": removed, "kyc_action": request.kyc_action},
    )
    db.commit()
    db.refresh(request)
    logger.info(
        "KYC purge for request %s removed %s stored file(s)", request.id, removed
    )
    return request


def get_status_payload(db: Session, request: models.DeletionRequest) -> dict:
    """Shape a request for the account holder (see DeletionRequestResponseSchema)."""
    now = _now()
    return {
        "id": request.id,
        "role": request.role,
        "status": request.status,
        "requested_at": request.requested_at,
        "grace_ends_at": request.grace_ends_at,
        "requested_via": request.requested_via,
        "reviewed_at": request.reviewed_at,
        "admin_note": request.admin_note,
        "hold_reason": request.hold_reason,
        "kyc_action": request.kyc_action,
        "kyc_retain_until": request.kyc_retain_until,
        "kyc_purged_at": request.kyc_purged_at,
        "can_cancel": request.status in models.CANCELLABLE_STATUSES,
        "days_until_review": _days_between(now, request.grace_ends_at),
    }


# ------------------------------------------------------------------ web flow


def verified_phone_deletion(
    db: Session, full_phone_number: str, via: str = models.REQUESTED_VIA_WEB
) -> dict:
    """Shared body of POST /account-deletion/confirm, after OTP verification.

    Called only once the caller has proven control of the phone number, so
    revealing whether that number has an account (and its grace date) is safe:
    it is the account holder asking about their own account. `no_account` keeps
    the response useful without leaking anything about other numbers.
    """
    rider = db.query(Rider).filter(Rider.phone_number == full_phone_number).first()
    if rider is not None:
        request = request_rider_deletion(db, rider, via=via)
        return {
            "result": "pending",
            "message": (
                "Your account has been deactivated. After "
                f"{max(settings.RIDER_DELETION_GRACE_DAYS, 1)} days your request goes "
                "to admin review. Deletion happens only after approval and only if "
                "you have no pending dues."
            ),
            "grace_ends_at": request.grace_ends_at,
            "requires_admin_review": True,
        }

    customer = db.query(User).filter(User.phone_number == full_phone_number).first()
    if customer is not None:
        delete_customer_now(db, customer, via=via)
        return {
            "result": "deleted",
            "message": (
                "Your account and personal data have been deleted. Order and payment "
                "records are kept in anonymised form for accounting and legal reasons."
            ),
            "grace_ends_at": None,
            "requires_admin_review": False,
        }

    return {
        "result": "no_account",
        "message": (
            "No SpeedyMeals account is registered with this phone number. If you "
            "think this is a mistake, contact support."
        ),
        "grace_ends_at": None,
        "requires_admin_review": False,
    }

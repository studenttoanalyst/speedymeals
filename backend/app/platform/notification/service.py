"""
Push notification service: device registry + fire-and-forget delivery.

Contract with callers (order/delivery services):
  - Call dispatch_push() only AFTER db.commit() of the business change.
  - dispatch_push() never raises and never blocks: delivery runs on a small
    background thread pool with its own DB session, so FCM latency or failure
    can never slow down or roll back an order.
  - When Firebase is not configured it returns immediately (no-op).
"""
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.platform.notification import fcm
from app.platform.notification.fcm import PushMessage
from app.platform.notification.models import DeviceToken

logger = logging.getLogger(__name__)

VALID_ROLES = {"customer", "rider", "restaurant", "admin"}
# Bound the registry per account so abandoned installs cannot grow it forever.
MAX_TOKENS_PER_SUBJECT = 10

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="push")


def normalise_role(role: str) -> str:
    """Admin tokens may carry role super_admin/superadmin; both are 'admin' here."""
    if role in ("super_admin", "superadmin"):
        return "admin"
    return role


# --------------------------------------------------------------- registry

def register_device(
    db: Session, subject_id: uuid.UUID, role: str, token: str, platform: str
) -> DeviceToken:
    """
    Upsert a device token for the authenticated account.

    Token is globally unique: if it already exists (same device, new login) the
    row is re-pointed at the current account.
    """
    role = normalise_role(role)
    now = datetime.now(timezone.utc)

    def _upsert() -> DeviceToken:
        row = db.query(DeviceToken).filter(DeviceToken.token == token).first()
        if row is None:
            row = DeviceToken(
                subject_id=subject_id, role=role, token=token, platform=platform, last_seen_at=now
            )
            db.add(row)
        else:
            row.subject_id = subject_id
            row.role = role
            row.platform = platform
            row.last_seen_at = now
        db.commit()
        return row

    try:
        row = _upsert()
    except IntegrityError:
        # Two concurrent registrations of the same new token: second one updates.
        db.rollback()
        row = _upsert()

    _prune_old_tokens(db, subject_id, role)
    db.refresh(row)
    return row


def _prune_old_tokens(db: Session, subject_id: uuid.UUID, role: str) -> None:
    count = (
        db.query(func.count(DeviceToken.id))
        .filter(DeviceToken.subject_id == subject_id, DeviceToken.role == role)
        .scalar()
    )
    if count <= MAX_TOKENS_PER_SUBJECT:
        return
    keep_ids = [
        row_id
        for (row_id,) in db.query(DeviceToken.id)
        .filter(DeviceToken.subject_id == subject_id, DeviceToken.role == role)
        .order_by(DeviceToken.last_seen_at.desc())
        .limit(MAX_TOKENS_PER_SUBJECT)
        .all()
    ]
    db.query(DeviceToken).filter(
        DeviceToken.subject_id == subject_id,
        DeviceToken.role == role,
        DeviceToken.id.notin_(keep_ids),
    ).delete(synchronize_session=False)
    db.commit()


def unregister_device(db: Session, subject_id: uuid.UUID, token: str) -> bool:
    """Remove a token. Ownership in WHERE: another account's token is a no-op."""
    deleted = (
        db.query(DeviceToken)
        .filter(DeviceToken.token == token, DeviceToken.subject_id == subject_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted > 0


# --------------------------------------------------------------- delivery

def deliver_to_subject(
    db: Session, subject_id: uuid.UUID, role: str, message: PushMessage
) -> int:
    """
    Synchronously send `message` to every device of one account and prune
    tokens FCM says are dead. Returns the number of devices attempted.
    Separated from dispatch_push so it is directly testable with a session.
    """
    role = normalise_role(role)
    tokens = [
        t
        for (t,) in db.query(DeviceToken.token).filter(
            DeviceToken.subject_id == subject_id, DeviceToken.role == role
        )
    ]
    if not tokens:
        return 0

    invalid = fcm.send_multicast(tokens, message)
    if invalid:
        db.query(DeviceToken).filter(DeviceToken.token.in_(invalid)).delete(
            synchronize_session=False
        )
        db.commit()
    return len(tokens)


def _deliver_in_worker(subject_id: uuid.UUID, role: str, message: PushMessage) -> None:
    db = SessionLocal()
    try:
        deliver_to_subject(db, subject_id, role, message)
    except Exception:  # noqa: BLE001
        logger.exception("Push delivery failed (subject=%s role=%s)", subject_id, role)
    finally:
        db.close()


def dispatch_push(
    subject_id: uuid.UUID,
    role: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
    channel_id: str = "order_updates",
    click_path: str | None = None,
) -> None:
    """Fire-and-forget push. Safe to call from any service after commit."""
    if not fcm.is_enabled():
        return
    message = PushMessage(
        title=title,
        body=body,
        data={k: str(v) for k, v in (data or {}).items()},
        channel_id=channel_id,
        click_path=click_path,
    )
    try:
        _executor.submit(_deliver_in_worker, subject_id, role, message)
    except Exception:  # noqa: BLE001 - e.g. executor shut down
        logger.exception("Could not queue push")

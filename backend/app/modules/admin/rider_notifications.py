"""
Pushes to a rider when an admin changes their account (approval, kit, status).

Every push carries data {"type": "rider_account", "change": ...}; the rider
app refetches its profile on receipt, so the dashboard updates live instead of
waiting for a manual refresh. Same contract as order_notifications.py:
  - call AFTER the change is committed,
  - no-op when Firebase is not configured,
  - never raises: a push failure must not fail the admin action.
"""
import logging
import uuid

from app.platform.notification.service import dispatch_push

logger = logging.getLogger(__name__)

RIDER_ACCOUNT_EVENT = "rider_account"


def _send(rider_id: uuid.UUID, change: str, title: str, body: str) -> None:
    try:
        dispatch_push(
            rider_id,
            "rider",
            title,
            body,
            data={"type": RIDER_ACCOUNT_EVENT, "change": change},
        )
    except Exception:  # noqa: BLE001
        logger.exception("rider account push failed (%s) for rider %s", change, rider_id)


def notify_rider_approval(rider_id: uuid.UUID, approval_status: str) -> None:
    if approval_status == "approved":
        _send(rider_id, "approval", "You're approved",
              "Your rider account is approved. Complete your kit at the outlet to go online.")
    elif approval_status == "rejected":
        _send(rider_id, "approval", "Application update",
              "Your rider application was not approved. Contact support for details.")
    else:
        _send(rider_id, "approval", "Application update", "Your application status changed.")


def notify_rider_kit(rider_id: uuid.UUID, kit_completed: bool) -> None:
    if kit_completed:
        _send(rider_id, "kit", "Kit verified", "Your kit is complete. You can go online now.")
    else:
        _send(rider_id, "kit", "Kit updated", "Your kit record was updated. Open the app to see what's left.")


def notify_rider_status(rider_id: uuid.UUID, is_active: bool | None, is_online: bool | None) -> None:
    if is_active is False:
        _send(rider_id, "status", "Account suspended", "Your rider account was suspended. Contact support.")
    elif is_active is True:
        _send(rider_id, "status", "Account reactivated", "Your rider account is active again.")
    if is_online is True:
        _send(rider_id, "status", "You're online", "SpeedyMeals set you online. You can receive deliveries.")
    elif is_online is False and is_active is not False:
        _send(rider_id, "status", "You're offline", "SpeedyMeals set you offline. New deliveries are paused.")

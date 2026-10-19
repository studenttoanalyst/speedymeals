"""
Device-token endpoints. Any authenticated role may register its own devices
(customers and riders from the Flutter app, restaurant/admin from the web
portals). Tokens are always bound to the identity in the access token, never
to anything the client sends.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limiter import enforce_rate_limit
from app.platform.auth.dependencies import CurrentUser, get_current_user
from app.platform.notification import service
from app.platform.notification.schemas import (
    DeviceRegisterResponseSchema,
    DeviceRegisterSchema,
    DeviceUnregisterResponseSchema,
)

router = APIRouter(prefix="/devices", tags=["notifications"])


@router.post("", response_model=DeviceRegisterResponseSchema)
def register_my_device(
    payload: DeviceRegisterSchema,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register (or refresh) this device's FCM token for the signed-in account."""
    enforce_rate_limit(str(current_user.id), "device_register", max_attempts=20, window_seconds=60)
    row = service.register_device(db, current_user.id, current_user.role, payload.token, payload.platform)
    return DeviceRegisterResponseSchema(registered=True, platform=row.platform)


@router.delete("", response_model=DeviceUnregisterResponseSchema)
def unregister_my_device(
    token: str = Query(..., min_length=20, max_length=512),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove this device's token (call on logout, before the session is cleared)."""
    removed = service.unregister_device(db, current_user.id, token)
    return DeviceUnregisterResponseSchema(removed=removed)

"""
JWT creation and decoding helpers - shared by every login path
(customer/rider OTP, restaurant, admin) so token format stays identical
across all 4 roles.
"""
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings

REFRESH_TOKEN_EXPIRE_DAYS = 30


def create_access_token(
    subject_id: uuid.UUID,
    role: str,
    permissions: list[str] | None = None,
    must_change_password: bool = False,
    scope: str = "full_access",
) -> str:
    """
    Short-lived token (settings.JWT_EXPIRE_MINUTES) sent with every
    protected request. `role` is embedded so require_role()
    can check it without a DB lookup. Optional permissions list and
    must_change_password flag embedded for granular RBAC.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject_id),
        "role": role,
        "type": "access",
        "exp": expire,
        "jti": str(uuid.uuid4()),
        "scope": scope,
        "must_change_password": must_change_password,
    }
    if permissions is not None:
        payload["permissions"] = permissions
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject_id: uuid.UUID, role: str) -> tuple[str, datetime]:
    """
    Long-lived token used only to mint new access tokens. Returns the
    encoded token AND its expiry - the expiry is stored in the DB
    so we know when to stop honoring it even before decode.
    """
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject_id),
        "role": role,
        "type": "refresh",
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expire


def decode_token(token: str) -> dict:
    """
    Decode + verify signature/expiry. Raises jose.JWTError if invalid/expired -
    callers catch this and turn it into a proper 401.
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

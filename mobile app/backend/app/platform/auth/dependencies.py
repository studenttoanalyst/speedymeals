"""
Step 7 — Role-Based Access Control.

Every protected route (restaurant dashboard, admin panel, profile, etc.)
depends on `get_current_user` (or `require_role([...])` when only certain
roles are allowed). This is the ONLY place a request is trusted as "logged
in as X" — enforced here at the API layer, never left to the frontend to
hide a button.
"""
import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.platform.auth import jwt_utils

bearer_scheme = HTTPBearer()


@dataclass
class CurrentUser:
    """Minimal identity extracted from a verified access token.
    id/role come straight from the JWT — no DB lookup needed here, since
    Step 5 embedded both at token-issue time."""
    id: uuid.UUID
    role: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Decodes the Bearer access token from the Authorization header.
    Raises 401 if the token is missing, malformed, expired, or wrong type
    (a refresh token can never be used here — only "type": "access" is accepted).
    """
    token = credentials.credentials

    try:
        payload = jwt_utils.decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A refresh token cannot be used to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(id=uuid.UUID(payload["sub"]), role=payload["role"])


def require_role(allowed_roles: list[str]):
    """
    Factory — returns a dependency that also checks the role, not just that
    the token is valid. Usage:

        @router.get("/admin/dashboard")
        def dashboard(user: CurrentUser = Depends(require_role(["admin"]))):
            ...

    A customer/rider/restaurant token hitting an admin-only route gets a 403,
    not a 401 — the token IS valid, it's just not allowed here.
    """
    def _check_role(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {allowed_roles}.",
            )
        return user

    return _check_role

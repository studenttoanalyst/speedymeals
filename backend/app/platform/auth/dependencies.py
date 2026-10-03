"""
Role-Based Access Control and Permission-Based Access Control dependencies.

Every protected route depends on get_current_user, require_role([...]),
or require_permission(key). Enforced at the API layer.
Zero em-dash compliant.
"""
import uuid
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth import jwt_utils
from app.platform.auth.models import Admin

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    """Minimal identity extracted from a verified access token."""
    id: uuid.UUID
    role: str
    permissions: list[str] = field(default_factory=list)
    must_change_password: bool = False
    scope: str = "full_access"

    @property
    def is_superadmin(self) -> bool:
        return self.role in ("super_admin", "superadmin")


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Decodes the Bearer access token from the Authorization header.
    Raises 401 if the token is missing, malformed, expired, or wrong type
    (a refresh token can never be used here - only type: access is accepted).
    Every request must present a cryptographically valid access token -
    there are no demo or fallback identities.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

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

    user = CurrentUser(
        id=uuid.UUID(payload["sub"]),
        role=payload.get("role", "customer"),
        permissions=payload.get("permissions", []),
        must_change_password=payload.get("must_change_password", False),
        scope=payload.get("scope", "full_access"),
    )

    if user.must_change_password and not request.url.path.endswith("/auth/admin/change-initial-password"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Temporary password in use. Mandatory password rotation required before accessing this endpoint.",
        )

    return user


def require_role(allowed_roles: list[str]):
    """
    Factory - returns a dependency that checks the user role.
    Superadmin bypasses checks for any admin-level route.
    """
    def _check_role(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles and not (user.is_superadmin and "admin" in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {allowed_roles}.",
            )
        return user

    return _check_role


def require_permission(permission_key: str):
    """
    Fine-grained permission check for admin endpoints.
    Superadmin bypasses checks automatically.
    """
    def _check_permission(
        user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> CurrentUser:
        if user.role not in ("admin", "super_admin", "superadmin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin token required for this action.",
            )

        if user.is_superadmin:
            return user

        # Check permissions in token payload
        if user.permissions and permission_key in user.permissions:
            return user

        # Fresh database check
        admin = db.query(Admin).filter(Admin.id == user.id, Admin.is_active == True).first()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin account not found or deactivated.",
            )

        if admin.role in ("super_admin", "superadmin"):
            return user

        if admin.admin_role:
            role_perm_keys = {p.key for p in admin.admin_role.permissions}
            if permission_key in role_perm_keys:
                return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing required permission: '{permission_key}'",
        )

    return _check_permission

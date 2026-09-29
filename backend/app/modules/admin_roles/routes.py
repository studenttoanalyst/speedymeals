"""
FastAPI routes for dynamic Admin Roles and Permissions management.
Gated with require_permission("admins.roles.manage").
Zero em-dash compliant.
"""
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth.dependencies import require_permission, CurrentUser
from app.modules.admin_roles import service
from app.modules.admin_roles.schemas import (
    AdminRoleCreateSchema,
    AdminRoleUpdateSchema,
    AdminRoleResponseSchema,
    PermissionResponseSchema,
)

router = APIRouter(prefix="/admin", tags=["admin_roles"])


@router.get(
    "/permissions",
    response_model=list[PermissionResponseSchema],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("admins.roles.manage"))],
)
def list_permissions(db: Session = Depends(get_db)):
    """List all seeded permissions across all 8 operational domains."""
    return service.list_permissions(db)


@router.get(
    "/roles",
    response_model=list[AdminRoleResponseSchema],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("admins.roles.manage"))],
)
def list_roles(db: Session = Depends(get_db)):
    """List all custom and system roles with active admin counts."""
    return service.list_roles(db)


@router.post(
    "/roles",
    response_model=AdminRoleResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_role(
    payload: AdminRoleCreateSchema,
    current_user: CurrentUser = Depends(require_permission("admins.roles.manage")),
    db: Session = Depends(get_db),
):
    """Create a new custom admin role with custom color, icon, and permissions."""
    role = service.create_role(db, payload, creator_id=current_user.id)
    return service.get_role_or_404(db, role.id)


@router.get(
    "/roles/{role_id}",
    response_model=AdminRoleResponseSchema,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("admins.roles.manage"))],
)
def get_role_detail(role_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get single role details and assigned admin accounts."""
    return service.get_role_or_404(db, role_id)


@router.patch(
    "/roles/{role_id}",
    response_model=AdminRoleResponseSchema,
    status_code=status.HTTP_200_OK,
)
def update_role(
    role_id: uuid.UUID,
    payload: AdminRoleUpdateSchema,
    current_user: CurrentUser = Depends(require_permission("admins.roles.manage")),
    db: Session = Depends(get_db),
):
    """Update role configuration, colors, or assigned permission set."""
    role = service.update_role(db, role_id, payload, updater_id=current_user.id)
    return service.get_role_or_404(db, role.id)


@router.delete(
    "/roles/{role_id}",
    status_code=status.HTTP_200_OK,
)
def delete_role(
    role_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("admins.roles.manage")),
    db: Session = Depends(get_db),
):
    """Delete a custom role. System roles and actively assigned roles cannot be deleted."""
    return service.delete_role(db, role_id, deleter_id=current_user.id)

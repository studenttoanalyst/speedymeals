"""
FastAPI routes for Admin Staff Account Provisioning and Profile Management.
Gated with granular permissions: admins.accounts.*
Zero em-dash compliant.
"""
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.platform.auth.dependencies import require_permission, CurrentUser
from app.modules.admin_accounts import service
from app.modules.admin_accounts.schemas import (
    AdminAccountCreateSchema,
    AdminAccountUpdateSchema,
    AdminRoleAssignSchema,
    AdminAccountResponseSchema,
    AdminAccountProvisionResultSchema,
    AdminCredentialResetResultSchema,
)

router = APIRouter(prefix="/admin/accounts", tags=["admin_accounts"])


@router.get(
    "",
    response_model=list[AdminAccountResponseSchema],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("admins.accounts.view"))],
)
def list_accounts(db: Session = Depends(get_db)):
    """List all internal staff admin profiles with roles, statuses, and login timestamps."""
    return service.list_admin_accounts(db)


@router.post(
    "",
    response_model=AdminAccountProvisionResultSchema,
    status_code=status.HTTP_201_CREATED,
)
def provision_account(
    payload: AdminAccountCreateSchema,
    current_user: CurrentUser = Depends(require_permission("admins.accounts.create")),
    db: Session = Depends(get_db),
):
    """
    Provision a new staff account, auto-generate corporate email or assign custom email,
    generate secure temporary password, and issue invitation link.
    """
    return service.provision_admin_account(db, payload, creator_id=current_user.id)


@router.get(
    "/{admin_id}",
    response_model=AdminAccountResponseSchema,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("admins.accounts.view"))],
)
def get_account_detail(admin_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve full staff admin profile details."""
    return service.get_admin_account_or_404(db, admin_id)


@router.patch(
    "/{admin_id}",
    response_model=AdminAccountResponseSchema,
    status_code=status.HTTP_200_OK,
)
def update_account(
    admin_id: uuid.UUID,
    payload: AdminAccountUpdateSchema,
    current_user: CurrentUser = Depends(require_permission("admins.accounts.manage")),
    db: Session = Depends(get_db),
):
    """Update staff contact details or toggle account active status."""
    return service.update_admin_account(db, admin_id, payload, updater_id=current_user.id)


@router.patch(
    "/{admin_id}/role",
    response_model=AdminAccountResponseSchema,
    status_code=status.HTTP_200_OK,
)
def assign_role(
    admin_id: uuid.UUID,
    payload: AdminRoleAssignSchema,
    current_user: CurrentUser = Depends(require_permission("admins.accounts.manage")),
    db: Session = Depends(get_db),
):
    """Reassign staff to a different role and immediately invalidate existing active sessions."""
    return service.assign_admin_role(db, admin_id, payload.role_id, updater_id=current_user.id)


@router.post(
    "/{admin_id}/reset-password",
    response_model=AdminCredentialResetResultSchema,
    status_code=status.HTTP_200_OK,
)
def force_reset_password(
    admin_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("admins.accounts.reset_credentials")),
    db: Session = Depends(get_db),
):
    """Force-reset staff credentials, generate new temporary password, and revoke active sessions."""
    return service.reset_admin_credentials(db, admin_id, resetter_id=current_user.id)

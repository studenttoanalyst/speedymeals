"""
Business logic for Admin Account Provisioning and Staff Management.
Zero em-dash compliant.
"""
import re
import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.platform.auth.models import Admin, RefreshToken
from app.modules.admin_roles.models import AdminRole, AdminAuditLog
from app.modules.admin_accounts.schemas import (
    AdminAccountCreateSchema,
    AdminAccountUpdateSchema,
)


def _generate_high_entropy_password(length: int = 16) -> str:
    """
    Generate an industry-standard, high-entropy temporary password.
    Guarantees at least 2 uppercase, 2 lowercase, 2 digits, and 2 symbols.
    """
    specials = "!@#$%^&*()-_=+"
    required_chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.digits),
        secrets.choice(specials),
        secrets.choice(specials),
    ]
    all_alphabet = string.ascii_letters + string.digits + specials
    remaining_chars = [secrets.choice(all_alphabet) for _ in range(length - len(required_chars))]
    pwd_list = required_chars + remaining_chars
    secrets.SystemRandom().shuffle(pwd_list)
    return "".join(pwd_list)


def _format_admin_response(admin: Admin) -> dict:
    """Helper to convert Admin ORM instance to schema-compatible dict."""
    return {
        "id": admin.id,
        "email": admin.email,
        "first_name": admin.first_name,
        "last_name": admin.last_name,
        "phone": admin.phone,
        "role_id": admin.role_id,
        "role_name": admin.admin_role.name if admin.admin_role else ("Superadmin" if admin.role == "super_admin" else None),
        "role_slug": admin.admin_role.slug if admin.admin_role else ("superadmin" if admin.role == "super_admin" else None),
        "role_color": admin.admin_role.color if admin.admin_role else "#DC2626",
        "is_active": admin.is_active,
        "must_change_password": admin.must_change_password,
        "last_login_at": admin.last_login_at,
        "created_at": admin.created_at,
    }


def list_admin_accounts(db: Session) -> list[dict]:
    """Retrieve all admin staff accounts ordered by creation date."""
    admins = db.query(Admin).order_by(Admin.created_at.desc()).all()
    return [_format_admin_response(a) for a in admins]


def get_admin_account_or_404(db: Session, admin_id: uuid.UUID) -> dict:
    """Retrieve single admin staff profile."""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Admin account with ID {admin_id} not found.",
        )
    return _format_admin_response(admin)


def provision_admin_account(
    db: Session,
    payload: AdminAccountCreateSchema,
    creator_id: uuid.UUID | None = None,
) -> dict:
    """
    Provision a new internal admin profile with auto-generated or custom email,
    cryptographic temporary password, and mandatory first-login password rotation.
    """
    # 1. Validate assigned role exists
    role = db.query(AdminRole).filter(AdminRole.id == payload.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified admin role does not exist.",
        )

    # 2. Determine and format email address
    if payload.email:
        final_email = payload.email.strip().lower()
        if db.query(Admin).filter(Admin.email == final_email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An admin account with email '{final_email}' already exists.",
            )
    else:
        # Auto-generate corporate email
        clean_first = re.sub(r"[^a-zA-Z0-9]", "", payload.first_name).lower()
        clean_last = re.sub(r"[^a-zA-Z0-9]", "", payload.last_name).lower()
        base_email = f"{clean_first}.{clean_last}@speedymeals.pk"
        final_email = base_email

        counter = 1
        while db.query(Admin).filter(Admin.email == final_email).first():
            counter += 1
            final_email = f"{clean_first}.{clean_last}{counter}@speedymeals.pk"

    # 3. Generate credentials and invitation tokens
    temp_password = _generate_high_entropy_password(16)
    hashed_pass = hash_password(temp_password)
    invitation_token = secrets.token_urlsafe(32)
    invitation_expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

    # 4. Create Admin record
    new_admin = Admin(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=final_email,
        password_hash=hashed_pass,
        role="admin" if not role.is_system or role.slug != "superadmin" else "super_admin",
        role_id=role.id,
        phone=payload.phone.strip() if payload.phone else None,
        is_active=True,
        must_change_password=True,
        invitation_token=invitation_token,
        invitation_expires_at=invitation_expires_at,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    # 5. Log audit trail
    audit = AdminAuditLog(
        admin_id=creator_id,
        action="PROVISION_ADMIN",
        domain="admins",
        target_type="admin",
        target_id=str(new_admin.id),
        changes_diff={
            "email": new_admin.email,
            "role_id": str(role.id),
            "role_name": role.name,
        },
    )
    db.add(audit)
    db.commit()

    invitation_url = f"https://speedymeals.pk/admin/setup-password?token={invitation_token}"
    print(f"[ADMIN-ONBOARDING] Account provisioned for <{final_email}>. Temp pass: {temp_password}, Invite URL: {invitation_url}")

    return {
        "admin": _format_admin_response(new_admin),
        "temporary_password": temp_password,
        "invitation_url": invitation_url,
        "message": f"Admin profile successfully created for {final_email}. Temporary credentials have been issued.",
    }


def update_admin_account(
    db: Session,
    admin_id: uuid.UUID,
    payload: AdminAccountUpdateSchema,
    updater_id: uuid.UUID | None = None,
) -> dict:
    """Update admin profile details or status."""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")

    changes = {}
    if payload.first_name is not None:
        changes["first_name"] = {"from": admin.first_name, "to": payload.first_name}
        admin.first_name = payload.first_name

    if payload.last_name is not None:
        changes["last_name"] = {"from": admin.last_name, "to": payload.last_name}
        admin.last_name = payload.last_name

    if payload.phone is not None:
        changes["phone"] = {"from": admin.phone, "to": payload.phone}
        admin.phone = payload.phone

    if payload.is_active is not None and payload.is_active != admin.is_active:
        changes["is_active"] = {"from": admin.is_active, "to": payload.is_active}
        admin.is_active = payload.is_active
        if not payload.is_active:
            # Revoke all active sessions on deactivation
            db.query(RefreshToken).filter(
                RefreshToken.subject_id == admin.id,
                RefreshToken.role == "admin",
            ).update({"status": "revoked"})

    db.commit()
    db.refresh(admin)

    # Log audit event
    audit = AdminAuditLog(
        admin_id=updater_id,
        action="UPDATE_ADMIN_PROFILE",
        domain="admins",
        target_type="admin",
        target_id=str(admin.id),
        changes_diff=changes,
    )
    db.add(audit)
    db.commit()

    return _format_admin_response(admin)


def assign_admin_role(
    db: Session,
    admin_id: uuid.UUID,
    role_id: uuid.UUID,
    updater_id: uuid.UUID | None = None,
) -> dict:
    """
    Reassign an admin account to a different role and immediately revoke active sessions.
    """
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")

    new_role = db.query(AdminRole).filter(AdminRole.id == role_id).first()
    if not new_role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected admin role does not exist.")

    old_role_name = admin.admin_role.name if admin.admin_role else admin.role
    admin.role_id = new_role.id
    admin.role = "super_admin" if new_role.slug == "superadmin" else "admin"

    # Revoke all active sessions so the admin must re-authenticate with the new permission scope
    db.query(RefreshToken).filter(
        RefreshToken.subject_id == admin.id,
        RefreshToken.role == "admin",
    ).update({"status": "revoked"})

    db.commit()
    db.refresh(admin)

    # Log audit event
    audit = AdminAuditLog(
        admin_id=updater_id,
        action="REASSIGN_ADMIN_ROLE",
        domain="admins",
        target_type="admin",
        target_id=str(admin.id),
        changes_diff={"old_role": old_role_name, "new_role": new_role.name},
    )
    db.add(audit)
    db.commit()

    return _format_admin_response(admin)


def reset_admin_credentials(
    db: Session,
    admin_id: uuid.UUID,
    resetter_id: uuid.UUID | None = None,
) -> dict:
    """
    Force-reset credentials for an admin account and issue a new temporary password.
    """
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")

    new_temp_password = _generate_high_entropy_password(16)
    admin.password_hash = hash_password(new_temp_password)
    admin.must_change_password = True

    # Revoke active sessions
    db.query(RefreshToken).filter(
        RefreshToken.subject_id == admin.id,
        RefreshToken.role == "admin",
    ).update({"status": "revoked"})

    db.commit()

    # Log audit event
    audit = AdminAuditLog(
        admin_id=resetter_id,
        action="FORCE_RESET_ADMIN_CREDENTIALS",
        domain="admins",
        target_type="admin",
        target_id=str(admin.id),
        changes_diff={"action": "password_rotated", "must_change_password": True},
    )
    db.add(audit)
    db.commit()

    print(f"[ADMIN-RESET] Credentials force-reset for <{admin.email}>. New temp pass: {new_temp_password}")

    return {
        "admin_id": admin.id,
        "email": admin.email,
        "temporary_password": new_temp_password,
        "message": f"Credentials reset for {admin.email}. A new temporary password has been issued.",
    }

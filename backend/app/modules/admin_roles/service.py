"""
Business logic for Admin Roles and Permissions management.
Zero em-dash compliant.
"""
import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.platform.auth.models import Admin, RefreshToken
from app.modules.admin_roles.models import AdminRole, Permission, AdminAuditLog
from app.modules.admin_roles.schemas import AdminRoleCreateSchema, AdminRoleUpdateSchema


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


def list_permissions(db: Session) -> list[Permission]:
    """Retrieve all available permissions sorted by domain and key."""
    return db.query(Permission).order_by(Permission.domain, Permission.key).all()


def list_roles(db: Session) -> list[dict]:
    """
    List all admin roles along with member counts and assigned permissions.
    """
    roles = db.query(AdminRole).order_by(AdminRole.is_system.desc(), AdminRole.name.asc()).all()
    results = []
    for r in roles:
        active_admins = [a for a in r.admins if a.is_active]
        results.append({
            "id": r.id,
            "name": r.name,
            "slug": r.slug,
            "color": r.color,
            "icon": r.icon,
            "is_system": r.is_system,
            "permissions": r.permissions,
            "admin_count": len(active_admins),
            "assigned_admins": [
                {
                    "id": a.id,
                    "email": a.email,
                    "first_name": a.first_name,
                    "last_name": a.last_name,
                    "is_active": a.is_active,
                }
                for a in r.admins
            ],
            "created_at": r.created_at,
        })
    return results


def get_role_or_404(db: Session, role_id: uuid.UUID) -> dict:
    """Get single role detail or raise 404."""
    role = db.query(AdminRole).filter(AdminRole.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Admin role with ID {role_id} not found.",
        )

    active_admins = [a for a in role.admins if a.is_active]
    return {
        "id": role.id,
        "name": role.name,
        "slug": role.slug,
        "color": role.color,
        "icon": role.icon,
        "is_system": role.is_system,
        "permissions": role.permissions,
        "admin_count": len(active_admins),
        "assigned_admins": [
            {
                "id": a.id,
                "email": a.email,
                "first_name": a.first_name,
                "last_name": a.last_name,
                "is_active": a.is_active,
            }
            for a in role.admins
        ],
        "created_at": role.created_at,
    }


def create_role(db: Session, payload: AdminRoleCreateSchema, creator_id: uuid.UUID | None = None) -> AdminRole:
    """
    Create a new dynamic custom admin role.
    """
    slug = _slugify(payload.name)
    existing = db.query(AdminRole).filter((AdminRole.name == payload.name) | (AdminRole.slug == slug)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A role with name '{payload.name}' already exists.",
        )

    # Fetch permissions by keys
    perms = []
    if payload.permission_keys:
        perms = db.query(Permission).filter(Permission.key.in_(payload.permission_keys)).all()

    new_role = AdminRole(
        name=payload.name,
        slug=slug,
        color=payload.color,
        icon=payload.icon,
        is_system=False,
        created_by=creator_id,
        permissions=perms,
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    # Log audit event
    audit = AdminAuditLog(
        admin_id=creator_id,
        action="CREATE_ROLE",
        domain="admins",
        target_type="admin_role",
        target_id=str(new_role.id),
        changes_diff={"name": new_role.name, "permissions": [p.key for p in perms]},
    )
    db.add(audit)
    db.commit()

    return new_role


def update_role(
    db: Session,
    role_id: uuid.UUID,
    payload: AdminRoleUpdateSchema,
    updater_id: uuid.UUID | None = None,
) -> AdminRole:
    """
    Update an existing role. Prevents deleting/renaming the Superadmin core role.
    """
    role = db.query(AdminRole).filter(AdminRole.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin role not found.",
        )

    # If it is the Superadmin system role, protect name and slug
    if role.slug == "superadmin" and payload.name and payload.name != role.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Superadmin system role name cannot be modified.",
        )

    changes = {}
    if payload.name and payload.name != role.name:
        slug = _slugify(payload.name)
        duplicate = db.query(AdminRole).filter(
            (AdminRole.name == payload.name) | (AdminRole.slug == slug),
            AdminRole.id != role.id,
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another role with name '{payload.name}' already exists.",
            )
        changes["name"] = {"from": role.name, "to": payload.name}
        role.name = payload.name
        if not role.is_system:
            role.slug = slug

    if payload.color:
        changes["color"] = {"from": role.color, "to": payload.color}
        role.color = payload.color

    if payload.icon is not None:
        changes["icon"] = {"from": role.icon, "to": payload.icon}
        role.icon = payload.icon

    if payload.permission_keys is not None:
        # Superadmin system role must retain all permissions
        if role.slug == "superadmin":
            all_perms = db.query(Permission).all()
            role.permissions = all_perms
        else:
            perms = db.query(Permission).filter(Permission.key.in_(payload.permission_keys)).all()
            changes["permissions"] = {"from": [p.key for p in role.permissions], "to": payload.permission_keys}
            role.permissions = perms

    db.commit()
    db.refresh(role)

    # Invalidate sessions for all admins with this role to ensure fresh permissions
    admin_ids = [a.id for a in role.admins]
    if admin_ids:
        db.query(RefreshToken).filter(
            RefreshToken.subject_id.in_(admin_ids),
            RefreshToken.role == "admin",
        ).update({"status": "revoked"}, synchronize_session=False)
        db.commit()

    # Log audit event
    audit = AdminAuditLog(
        admin_id=updater_id,
        action="UPDATE_ROLE",
        domain="admins",
        target_type="admin_role",
        target_id=str(role.id),
        changes_diff=changes,
    )
    db.add(audit)
    db.commit()

    return role


def delete_role(db: Session, role_id: uuid.UUID, deleter_id: uuid.UUID | None = None) -> dict:
    """
    Delete a custom role. Fails if is_system=True or if any admins are currently assigned.
    """
    role = db.query(AdminRole).filter(AdminRole.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin role not found.",
        )

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"System role '{role.name}' cannot be deleted.",
        )

    assigned_count = len(role.admins)
    if assigned_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role '{role.name}' because {assigned_count} admin(s) are currently assigned to it. Please reassign them first.",
        )

    role_name = role.name
    db.delete(role)
    db.commit()

    # Log audit event
    audit = AdminAuditLog(
        admin_id=deleter_id,
        action="DELETE_ROLE",
        domain="admins",
        target_type="admin_role",
        target_id=str(role_id),
        changes_diff={"deleted_role_name": role_name},
    )
    db.add(audit)
    db.commit()

    return {"message": f"Role '{role_name}' successfully deleted."}

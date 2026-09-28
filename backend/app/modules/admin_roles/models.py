"""
Admin roles, permissions catalog, and administrative audit logging models.
Follows the Discord-style dynamic role creation architecture.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Table, String, Boolean, Text, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_model import BaseModel, UpdatedAtMixin
from app.core.database import Base


admin_role_permissions = Table(
    "admin_role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("admin_roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(BaseModel):
    __tablename__ = "permissions"

    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    domain: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="low", nullable=False)

    roles: Mapped[list["AdminRole"]] = relationship(
        "AdminRole",
        secondary=admin_role_permissions,
        back_populates="permissions",
    )


class AdminRole(BaseModel, UpdatedAtMixin):
    __tablename__ = "admin_roles"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    color: Mapped[str] = mapped_column(String(7), default="#6366F1", nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
    )

    permissions: Mapped[list[Permission]] = relationship(
        "Permission",
        secondary=admin_role_permissions,
        back_populates="roles",
        lazy="joined",
    )
    admins: Mapped[list["Admin"]] = relationship(
        "Admin",
        foreign_keys="Admin.role_id",
        back_populates="admin_role",
    )


class AdminAuditLog(BaseModel):
    __tablename__ = "admin_audit_logs"

    admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    changes_diff: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)

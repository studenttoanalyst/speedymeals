"""
Admin account model, RefreshToken tracking table, and PasswordResetToken table.

Matches docs/schema.jpeg -> `admins` table, extended for RBAC and credential provisioning.
No UpdatedAtMixin here - schema.jpeg does not show updated_at for admins.
"""
import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_model import BaseModel
from app.modules.admin_roles.models import AdminRole


class Admin(BaseModel):
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="admin", nullable=False)  # "super_admin" | "support" | "admin"
    role_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admin_roles.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invitation_token: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    invitation_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    admin_role = relationship("AdminRole", foreign_keys=[role_id], back_populates="admins", lazy="joined")


class RefreshToken(BaseModel):
    """
    Step 6 - tracks every issued refresh token so logout can revoke it.

    Not a per-role table: `subject_id` + `role` together identify who the
    token belongs to (users.id/riders.id/restaurants.id/admins.id - no FK
    since it can point at 4 different tables). `token_hash` stores a SHA-256
    hash of the raw token, never the raw token itself, matching how we
    never store raw passwords either.
    """
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )  # token lookup on logout/refresh (previously only in the migration)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "customer"|"rider"|"restaurant"|"admin"
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String, default="valid", nullable=False)  # "valid"|"revoked"
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PasswordResetToken(BaseModel):
    """
    Secure password reset token store for admin and restaurant portals.
    Stores SHA-256 token hash with 15-30 minute expiration window.
    """
    __tablename__ = "password_reset_tokens"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # "admin" | "restaurant"
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="valid", nullable=False)  # "valid" | "used" | "expired"
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
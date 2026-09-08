"""
Admin account model + RefreshToken tracking table.

Matches docs/schema.jpeg -> `admins` table exactly.
No UpdatedAtMixin here - schema.jpeg does not show updated_at for admins.
"""
import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import BaseModel


class Admin(BaseModel):
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "super_admin" or "support"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class RefreshToken(BaseModel):
    """
    Step 6 — tracks every issued refresh token so logout can revoke it.

    Not a per-role table: `subject_id` + `role` together identify who the
    token belongs to (users.id/riders.id/restaurants.id/admins.id — no FK
    since it can point at 4 different tables). `token_hash` stores a SHA-256
    hash of the raw token, never the raw token itself, matching how we
    never store raw passwords either.
    """
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "customer"|"rider"|"restaurant"|"admin"
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String, default="valid", nullable=False)  # "valid"|"revoked"
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
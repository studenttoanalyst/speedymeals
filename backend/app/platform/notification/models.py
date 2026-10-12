"""
Push notification device registry.

One row per (physical device / browser) FCM registration token. The token is
globally unique: if the same device signs in as a different account, the row is
re-pointed at the new account (see service.register_device) so the previous
account stops receiving that device's pushes.

`subject_id` + `role` identify the owner the same way RefreshToken does
(users.id / riders.id / restaurants.id / admins.id), so there is no FK: it can
reference four different tables.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import BaseModel


class DeviceToken(BaseModel):
    __table_args__ = (
        Index("ix_device_tokens_subject_role", "subject_id", "role"),
    )

    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # customer|rider|restaurant|admin
    token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(10), nullable=False)  # android|ios|web
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

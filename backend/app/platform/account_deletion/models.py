"""
`deletion_requests` - the deferred, admin-reviewed part of account deletion.

One row per deletion request. The row is the state machine; no data is ever
deleted by a status change alone (only approve -> execute does that).

status flow:
    pending          requested, inside the grace period, account deactivated
    cancelled        the requester (or admin) cancelled before review
    ready_for_review grace period over, waiting for an admin decision
    on_hold          admin paused it (dues appeared, fraud check, ...)
    approved         admin approved, execution in progress
    completed        execution finished (data anonymised, KYC handled)

`cancelled` and `completed` are terminal. `approved` is a transient state
that only exists for the duration of one execution transaction.

KYC files are handled separately from the row: `kyc_action` records the
admin's decision (delete_now / retain_until), `kyc_retain_until` the date
they promised to keep them until, and `kyc_purged_at` the moment the files
were actually removed from object storage.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import BaseModel

STATUS_PENDING = "pending"
STATUS_CANCELLED = "cancelled"
STATUS_READY_FOR_REVIEW = "ready_for_review"
STATUS_ON_HOLD = "on_hold"
STATUS_APPROVED = "approved"
STATUS_COMPLETED = "completed"

ALL_STATUSES = (
    STATUS_PENDING,
    STATUS_CANCELLED,
    STATUS_READY_FOR_REVIEW,
    STATUS_ON_HOLD,
    STATUS_APPROVED,
    STATUS_COMPLETED,
)

# Statuses a requester may still cancel from (spec: pending + ready_for_review).
CANCELLABLE_STATUSES = (STATUS_PENDING, STATUS_READY_FOR_REVIEW)
# Statuses that mean "a decision is still owed": a second request while one of
# these is open returns the existing row instead of creating a duplicate.
OPEN_STATUSES = (STATUS_PENDING, STATUS_READY_FOR_REVIEW, STATUS_ON_HOLD)

KYC_DELETE_NOW = "delete_now"
KYC_RETAIN_UNTIL = "retain_until"
ALL_KYC_ACTIONS = (KYC_DELETE_NOW, KYC_RETAIN_UNTIL)

REQUESTED_VIA_APP = "app"
REQUESTED_VIA_WEB = "web"


class DeletionRequest(BaseModel):
    __table_args__ = (
        # The daily job scans exactly this pair: status = pending AND
        # grace_ends_at <= now.
        Index("ix_deletion_requests_status_grace", "status", "grace_ends_at"),
        # "does this account already have an open request?" on every request.
        Index("ix_deletion_requests_user_role", "user_id", "role"),
    )

    # users.id for customers, riders.id for riders. No FK on purpose: the same
    # column points at two tables, exactly like RefreshToken.subject_id. The
    # row is never deleted, so a dangling reference cannot happen.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # customer | rider
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    grace_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    requested_via: Mapped[str] = mapped_column(String(10), nullable=False)  # app | web

    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    hold_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    kyc_action: Mapped[str | None] = mapped_column(String(20), nullable=True)
    kyc_retain_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    kyc_purged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

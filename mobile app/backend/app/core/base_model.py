"""
Shared base pieces for every database table (model).

Design follows docs/schema.jpeg (the locked ERD), not a generic guess:
- Every table's id is a UUID (matches schema.jpeg on every table).
- created_at is on every table (matches schema.jpeg).
- updated_at is NOT automatic on every table - only tables that actually
  need it in schema.jpeg (users, riders, restaurants, orders) declare it
  themselves via the UpdatedAtMixin below. Forcing it everywhere was my
  mistake in the first version of this file - fixed here to match the
  real, approved design instead of guessing.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, declared_attr

from app.core.database import Base


class BaseModel(Base):
    """
    Abstract base - does NOT create a table itself.
    Every real table (User, Rider, Order, ...) inherits from this and gets
    id + created_at for free, matching every table in schema.jpeg.
    """
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """
        Auto-generate table name from class name so we don't type it
        manually in every model. E.g. class User -> table "users".
        """
        import re
        name = re.sub(r"(?<!^)(?=[A-Z])", "_", cls.__name__).lower()
        return name if name.endswith("s") else name + "s"


class UpdatedAtMixin:
    """
    Optional mixin - only mix this into models that actually need
    updated_at per schema.jpeg (currently: User, Rider, Restaurant, Order).
    Usage: class User(BaseModel, UpdatedAtMixin): ...
    """
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

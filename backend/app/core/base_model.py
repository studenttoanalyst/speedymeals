"""
Shared base class for every database table (model).

Every table (User, Rider, Order, Restaurant, etc.) inherits from BaseModel
instead of the raw SQLAlchemy Base directly - this way id, created_at,
and updated_at are defined once, here, and every table gets them for free.
"""
from datetime import datetime, timezone

from sqlalchemy import Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, declared_attr

from app.core.database import Base


class BaseModel(Base):
    """
    Abstract base - this itself does NOT create a table.
    Only classes that inherit from this (User, Rider, Order, ...) become
    real tables.
    """
    __abstract__ = True

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """
        Auto-generate table name from class name, so we don't have to
        type __tablename__ manually in every single model.
        E.g. class User -> table "users", class MenuItem -> table "menu_items".
        """
        import re
        name = re.sub(r"(?<!^)(?=[A-Z])", "_", cls.__name__).lower()
        return name if name.endswith("s") else name + "s"

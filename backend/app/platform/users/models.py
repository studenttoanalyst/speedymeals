"""
Customer (User) and their saved Address models.

Matches docs/schema.jpeg -> `users` and `addresses` tables exactly.
- User has updated_at (via UpdatedAtMixin) - schema.jpeg shows it.
- Address does NOT have updated_at - schema.jpeg does not show it there.
"""
import uuid

from sqlalchemy import String, Boolean, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import BaseModel, UpdatedAtMixin


class User(BaseModel, UpdatedAtMixin):
    phone_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    wallet_balance: Mapped[float] = mapped_column(Numeric, default=0, nullable=False)
    country_code: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Address(BaseModel):
    __tablename__ = "addresses"  # explicit override: auto-pluralize logic
    # incorrectly treats "address" as already plural since it ends in "s"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    label: Mapped[str | None] = mapped_column(String, nullable=True)  # "Home"/"Work"/"Other"
    latitude: Mapped[float] = mapped_column(Numeric, nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric, nullable=False)
    full_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

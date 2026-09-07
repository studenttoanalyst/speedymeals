"""
Admin account model.

Matches docs/schema.jpeg -> `admins` table exactly.
No UpdatedAtMixin here - schema.jpeg does not show updated_at for admins.
"""
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import BaseModel


class Admin(BaseModel):
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "super_admin" or "support"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
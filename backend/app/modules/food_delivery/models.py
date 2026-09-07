"""
Restaurant and MenuItem models.

Matches docs/schema.jpeg -> `restaurants` and `menu_items` tables exactly.
- Restaurant has updated_at (via UpdatedAtMixin) - schema.jpeg shows it.
- MenuItem does NOT have updated_at - schema.jpeg only shows created_at there.

Note: `settlements` and `rider_payouts` live in wallet_payment/models.py
(Step 3d) - they depend on Restaurant/Rider which live here and there
respectively, so they're placed with the module that owns their FK target.
"""
import uuid

from sqlalchemy import String, Boolean, Numeric, Text, Time, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import BaseModel, UpdatedAtMixin


class Restaurant(BaseModel, UpdatedAtMixin):
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    phone_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    commission_rate: Mapped[float] = mapped_column(Numeric, default=10.00, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    opening_time: Mapped[str | None] = mapped_column(Time, nullable=True)
    closing_time: Mapped[str | None] = mapped_column(Time, nullable=True)
    country_code: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False)


class MenuItem(BaseModel):
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric, nullable=False)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    variants: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Order(BaseModel):
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False
    )
    rider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("riders.id"), nullable=True
    )  # nullable: no rider assigned yet when order is first placed
    delivery_address_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("addresses.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String, nullable=False)
    payment_method: Mapped[str] = mapped_column(String, nullable=False)  # "COD" or "Digital"
    food_subtotal: Mapped[float] = mapped_column(Numeric, nullable=False)
    delivery_distance_km: Mapped[float] = mapped_column(Numeric, nullable=False)
    delivery_fee: Mapped[float] = mapped_column(Numeric, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    commission_amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    restaurant_payable: Mapped[float] = mapped_column(Numeric, nullable=False)
    rider_earning: Mapped[float] = mapped_column(Numeric, nullable=False)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    country_code: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False)
    cancellation_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    cancelled_by: Mapped[str | None] = mapped_column(String, nullable=True)
    placed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)


class OrderItem(BaseModel):
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_items.id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    selected_variant: Mapped[str | None] = mapped_column(String, nullable=True)
    price_at_order: Mapped[float] = mapped_column(Numeric, nullable=False)


class Rating(BaseModel):
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    restaurant_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rider_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
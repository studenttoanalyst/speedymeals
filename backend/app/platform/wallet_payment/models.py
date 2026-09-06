"""
Rider, WalletTransaction, and CashDeposit models.

Matches docs/schema.jpeg -> `riders`, `wallet_transactions`, `cash_deposits`
tables exactly.
- Rider has updated_at (via UpdatedAtMixin) - schema.jpeg shows it
  (status/location change often).
- WalletTransaction and CashDeposit do NOT have updated_at - they are
  write-once records (a transaction/deposit is never edited after creation).

Settlement (restaurant weekly payout) and RiderPayout (rider weekly payout)
are added here in Step 3d - both depend on tables that already exist
(Restaurant, Rider), so no ordering issue.
"""
import uuid

from sqlalchemy import String, Boolean, Numeric, Text, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_model import BaseModel, UpdatedAtMixin


class Rider(BaseModel, UpdatedAtMixin):
    phone_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    cnic_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    vehicle_type: Mapped[str | None] = mapped_column(String, nullable=True)
    vehicle_registration: Mapped[str | None] = mapped_column(String, nullable=True)
    cnic_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    license_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    vehicle_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    approval_status: Mapped[str] = mapped_column(String, nullable=False)  # pending/approved/rejected
    wallet_balance: Mapped[float] = mapped_column(Numeric, default=0, nullable=False)
    pending_cash_owed: Mapped[float] = mapped_column(Numeric, default=0, nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_latitude: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    current_longitude: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    country_code: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class WalletTransaction(BaseModel):
    rider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("riders.id"), nullable=False
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True
    )  # nullable: a wallet recharge has no order, only a per-delivery deduction does
    type: Mapped[str] = mapped_column(String, nullable=False)  # "recharge" or "deduction"
    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    balance_after: Mapped[float] = mapped_column(Numeric, nullable=False)


class CashDeposit(BaseModel):
    rider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("riders.id"), nullable=False
    )
    amount_submitted: Mapped[float] = mapped_column(Numeric, nullable=False)
    expected_amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    discrepancy: Mapped[float] = mapped_column(Numeric, default=0, nullable=False)
    submission_method: Mapped[str | None] = mapped_column(String, nullable=True)
    verified_by_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Settlement(BaseModel):
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False
    )
    period_start: Mapped[object] = mapped_column(Date, nullable=False)
    period_end: Mapped[object] = mapped_column(Date, nullable=False)
    total_sales: Mapped[float] = mapped_column(Numeric, nullable=False)
    commission_deducted: Mapped[float] = mapped_column(Numeric, nullable=False)
    net_payable: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    paid_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RiderPayout(BaseModel):
    rider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("riders.id"), nullable=False
    )
    period_start: Mapped[object] = mapped_column(Date, nullable=False)
    period_end: Mapped[object] = mapped_column(Date, nullable=False)
    total_earning: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    paid_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
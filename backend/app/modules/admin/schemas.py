"""
Request/response shapes for the admin module — Phase 8.
Step 1: dashboard summary. Step 2: restaurant management (create/onboard,
list, approve-deactivate, commission, credential reset).
"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class DashboardSummaryResponseSchema(BaseModel):
    """GET /admin/dashboard — Step 1. All money figures per spec Sec 11's
    formula (commission + flat Rs. 10 wallet deduction = SpeedyMeals'
    revenue), scoped to "today" (UTC calendar day) except the three
    running totals which are always current, not day-scoped."""
    date: date
    total_orders_today: int
    gross_revenue_today: float
    net_revenue_today: float
    pending_restaurant_settlements: float
    total_rider_wallet_balance: float
    total_pending_cod_cash: float


class RestaurantCreateSchema(BaseModel):
    """Body for POST /admin/restaurants — Step 2. Spec Sec 9 Step 1-2:
    admin manually onboards a restaurant and sets up its login
    credentials (email+password, phone for OTP) in the same step."""
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    phone_number: str
    country_code: str = "+92"
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    commission_rate: float = Field(default=10.00, gt=0, le=100)
    currency: str = "PKR"


class RestaurantAdminResponseSchema(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone_number: str
    status: str
    commission_rate: float
    created_at: datetime


class RestaurantStatusUpdateSchema(BaseModel):
    """Body for PATCH /admin/restaurants/{id}/status — Step 2
    approve/deactivate toggle."""
    is_active: bool


class RestaurantCommissionUpdateSchema(BaseModel):
    """Body for PATCH /admin/restaurants/{id}/commission — Step 2,
    per-restaurant override of the spec Sec 3.2 default (10%)."""
    commission_rate: float = Field(gt=0, le=100)


class RestaurantCredentialsResetSchema(BaseModel):
    """Body for POST /admin/restaurants/{id}/reset-credentials — Step 2.
    At least one field must be given (checked in the service layer, a
    cross-field rule); omitted fields are left untouched."""
    new_password: str | None = Field(default=None, min_length=8)
    new_email: str | None = None
    new_phone_number: str | None = None

    @model_validator(mode="after")
    def _at_least_one_field(self):
        if self.new_password is None and self.new_email is None and self.new_phone_number is None:
            raise ValueError("Provide at least one of new_password, new_email, new_phone_number.")
        return self

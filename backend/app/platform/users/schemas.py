"""
Request/response shapes for Step 11 — User Profile + Address module.
"""
import uuid

from pydantic import BaseModel, ConfigDict


class UserProfileSchema(BaseModel):
    """Response for GET /users/me. phone_number is read-only (identity,
    locked to OTP verification) — deliberately not in the update schema."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone_number: str
    name: str
    email: str | None
    wallet_balance: float
    country_code: str
    is_active: bool


class UserProfileUpdateSchema(BaseModel):
    """Body for PUT /users/me. Only name/email are editable — phone_number
    and wallet_balance are never customer-writable (wallet is system-managed,
    phone is the OTP-verified identity)."""
    name: str | None = None
    email: str | None = None


class AddressCreateSchema(BaseModel):
    """Body for POST /users/me/addresses."""
    label: str | None = None
    latitude: float
    longitude: float
    full_address: str | None = None
    is_default: bool = False


class AddressUpdateSchema(BaseModel):
    """Body for PUT /users/me/addresses/{id}. All fields optional — partial
    update, same pattern as UserProfileUpdateSchema."""
    label: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    full_address: str | None = None
    is_default: bool | None = None


class AddressResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str | None
    latitude: float
    longitude: float
    full_address: str | None
    is_default: bool

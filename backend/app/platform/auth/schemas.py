"""
Request/response shapes for the auth module.

Step 1 of Phase 2 — defines the contract every OTP endpoint below
(and later, restaurant/admin login) is built against. Kept minimal:
only what Steps 2-4 (OTP request/verify/resend) need right now.
"""
from pydantic import BaseModel, Field


class OTPRequestSchema(BaseModel):
    """Body for POST /auth/otp/request — ask for a new OTP."""
    phone_number: str = Field(..., description="Phone number without country code, e.g. '3001234567'")
    country_code: str = Field(default="+92", description="E.g. '+92' for Pakistan")


class OTPVerifySchema(BaseModel):
    """Body for POST /auth/otp/verify — submit the code the user received."""
    phone_number: str
    country_code: str = "+92"
    otp_code: str = Field(..., min_length=6, max_length=6)


class OTPResponseSchema(BaseModel):
    """Generic response for OTP request — just a status message."""
    message: str


class TokenResponseSchema(BaseModel):
    """
    Step 5 — returned by OTP verify (and later, restaurant/admin login).
    Same shape across all 4 roles so frontend handles login uniformly.
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LogoutSchema(BaseModel):
    """Body for POST /auth/logout — Step 6."""
    refresh_token: str


class RefreshTokenRequestSchema(BaseModel):
    """Body for POST /auth/refresh — Phase 10 hardening. Same shape as
    logout (both just need the raw refresh token) but kept as its own
    schema since the two endpoints do opposite things and may diverge."""
    refresh_token: str


class RestaurantLoginSchema(BaseModel):
    """Step 9, Path A — restaurant email+password login."""
    email: str
    password: str


class AdminLoginSchema(BaseModel):
    """Step 10 — admin email+password login. Same shape as restaurant login;
    kept as its own schema (not reused) since the two roles are semantically
    different subjects even though the fields happen to match today."""
    email: str
    password: str


class RiderSignupOTPVerifySchema(BaseModel):
    """
    Phase 3 Step 0 (prerequisite) — rider phone+OTP verify, combined with
    signup details in one call. First-time phone -> creates a new Rider row
    (approval_status="pending"). Existing phone -> plain login, signup
    fields are ignored (rider already on file, no re-submit needed).
    """
    phone_number: str
    country_code: str = "+92"
    otp_code: str = Field(..., min_length=6, max_length=6)
    name: str
    cnic_number: str
    vehicle_type: str | None = None
    vehicle_registration: str | None = None


class RestaurantOTPVerifySchema(BaseModel):
    """
    Step 9, Path B — restaurant phone+OTP login. Separate from the
    customer/rider OTPVerifySchema because the restaurant must already
    exist (created by Admin onboarding) — no auto-create like customers get.
    """
    phone_number: str
    country_code: str = "+92"
    otp_code: str = Field(..., min_length=6, max_length=6)
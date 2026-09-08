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
    """Generic response for OTP request/verify — just a status message.
    JWT tokens are NOT issued here (that's Step 5), this is OTP-mechanism only."""
    message: str

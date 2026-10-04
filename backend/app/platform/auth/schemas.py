"""
Request/response shapes for the auth module.

Defines the contract for OTP endpoints, logins, and password reset flows.
Zero em-dash compliant.
"""
from pydantic import BaseModel, Field


class OTPRequestSchema(BaseModel):
    """Body for POST /auth/otp/request - ask for a new OTP."""
    phone_number: str = Field(..., description="Phone number without country code, e.g. '3001234567'")
    country_code: str = Field(default="+92", description="E.g. '+92' for Pakistan")


class OTPVerifySchema(BaseModel):
    """Body for POST /auth/otp/verify - submit the code the user received."""
    phone_number: str
    country_code: str = "+92"
    otp_code: str = Field(..., min_length=6, max_length=6)


class OTPResponseSchema(BaseModel):
    """Generic response for OTP request - just a status message."""
    message: str


class TokenResponseSchema(BaseModel):
    """
    Returned by OTP verify, restaurant/admin login, and token refresh.
    Includes must_change_password indicator for admin initial onboarding.
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
    message: str | None = None


class LogoutSchema(BaseModel):
    """Body for POST /auth/logout."""
    refresh_token: str


class RefreshTokenRequestSchema(BaseModel):
    """Body for POST /auth/refresh."""
    refresh_token: str


class RestaurantLoginSchema(BaseModel):
    """Restaurant email+password login."""
    email: str
    password: str


class AdminLoginSchema(BaseModel):
    """Admin email+password login."""
    email: str
    password: str


class RiderLoginOTPVerifySchema(BaseModel):
    """Rider phone+OTP login."""
    phone_number: str
    country_code: str = "+92"
    otp_code: str = Field(..., min_length=6, max_length=6)


class RiderRegisterSchema(BaseModel):
    """
    Rider phone+OTP verify for new registration.
    """
    phone_number: str
    country_code: str = "+92"
    otp_code: str = Field(..., min_length=6, max_length=6)
    name: str
    cnic_number: str
    vehicle_type: str | None = None
    vehicle_registration: str | None = None


class RestaurantOTPVerifySchema(BaseModel):
    """Restaurant phone+OTP login."""
    phone_number: str
    country_code: str = "+92"
    otp_code: str = Field(..., min_length=6, max_length=6)


class ForgotPasswordRequestSchema(BaseModel):
    """Request for initiating password reset for admin or restaurant."""
    email: str = Field(..., description="Registered account email address")


class ResetPasswordRequestSchema(BaseModel):
    """Submission of secure password reset token along with new password."""
    token: str = Field(..., min_length=16, description="One-time password reset token")
    new_password: str = Field(..., min_length=8, description="New secret password (minimum 8 characters)")


class ChangeInitialPasswordSchema(BaseModel):
    """Mandatory first-login password rotation schema."""
    new_password: str = Field(..., min_length=8, description="New secret password (minimum 8 characters)")
"""
Auth endpoints — Steps 2-4 of Phase 2: OTP request (with resend cooldown)
and OTP verify. JWT issuing (Step 5) and role-based login (restaurant/admin,
Steps 9-10) are NOT in this file yet — added on top of this in later steps.
"""
from fastapi import APIRouter, status

from app.platform.auth import service
from app.platform.auth.schemas import OTPRequestSchema, OTPVerifySchema, OTPResponseSchema

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_full_number(country_code: str, phone_number: str) -> str:
    """
    Combine country_code + phone_number into one E.164-style string.
    Guards against the caller accidentally already including the country
    code in phone_number (e.g. phone_number="+923001234567", country_code="+92"),
    which would otherwise double up into "+92+923001234567".
    """
    phone_number = phone_number.strip()
    if phone_number.startswith(country_code):
        return phone_number
    if phone_number.startswith("+"):
        # Caller sent a full international number with a different/no country_code use — trust it as-is.
        return phone_number
    return f"{country_code}{phone_number}"


@router.post("/otp/request", response_model=OTPResponseSchema, status_code=status.HTTP_200_OK)
def request_otp(payload: OTPRequestSchema):
    """
    Step 2 + Step 4 — generate a new OTP and send it (console mode).
    Rejects with 429 if called again before the resend cooldown (45s) expires.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    service.generate_and_send_otp(full_number)
    return OTPResponseSchema(message="OTP sent.")


@router.post("/otp/verify", response_model=OTPResponseSchema, status_code=status.HTTP_200_OK)
def verify_otp(payload: OTPVerifySchema):
    """
    Step 3 — verify the OTP the user submitted.
    NOTE: this only confirms the OTP is correct. It does not issue a JWT and
    does not create/look up a User row yet — that's Step 5, built on top of this.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    service.verify_otp(full_number, payload.otp_code)
    return OTPResponseSchema(message="OTP verified.")

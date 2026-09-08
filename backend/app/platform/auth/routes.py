"""
Auth endpoints — Steps 2-6 of Phase 2: OTP request/verify (with resend
cooldown), JWT issuing on successful verify, and logout (refresh token
revocation). Role-based login (restaurant/admin, Steps 9-10) is NOT in
this file yet — added on top of this in later steps.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limiter import enforce_rate_limit
from app.platform.auth import service
from app.platform.auth.dependencies import get_current_user, CurrentUser
from app.platform.auth.schemas import (
    OTPRequestSchema,
    OTPVerifySchema,
    OTPResponseSchema,
    TokenResponseSchema,
    LogoutSchema,
)

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
    Step 8 — also rate-limited (max 5/min) as a second layer independent of
    the cooldown, in case cooldown is ever bypassed/changed.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="otp_request")
    service.generate_and_send_otp(full_number)
    return OTPResponseSchema(message="OTP sent.")


@router.post("/otp/verify", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def verify_otp(payload: OTPVerifySchema, db: Session = Depends(get_db)):
    """
    Step 3 (verify) + Step 5 (issue tokens). On a correct OTP: find-or-create
    the customer's User row, then issue an access + refresh token pair.
    Step 8 — rate-limited (max 5/min per phone) so an attacker can't brute-force
    the 6-digit code by spamming this endpoint with guesses.
    Role is hardcoded to "customer" here — rider OTP verify will reuse the
    same service functions with role="rider" once the rider signup fields
    (CNIC, vehicle info) are wired in a later step.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="otp_verify")
    service.verify_otp(full_number, payload.otp_code)

    user = service.get_or_create_customer(db, full_number, payload.country_code)
    tokens = service.issue_tokens(db, user.id, role="customer")
    return TokenResponseSchema(**tokens)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(payload: LogoutSchema, db: Session = Depends(get_db)):
    """
    Step 6 — revoke a refresh token so it can't be used again to mint new
    access tokens. Does not touch already-issued access tokens (those
    simply expire naturally within JWT_EXPIRE_MINUTES).
    """
    service.revoke_refresh_token(db, payload.refresh_token)
    return {"message": "Logged out."}


@router.get("/me", status_code=status.HTTP_200_OK)
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Step 7 test/utility endpoint — proves the guard works: send an access
    token in the Authorization header (Bearer <token>) and get back who
    the server thinks you are. No token / bad token / expired token → 401.
    """
    return {"id": str(current_user.id), "role": current_user.role}
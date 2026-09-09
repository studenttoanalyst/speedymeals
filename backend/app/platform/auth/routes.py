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
    RestaurantLoginSchema,
    RestaurantOTPVerifySchema,
    AdminLoginSchema,
    RiderSignupOTPVerifySchema,
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


@router.post("/rider/otp/verify", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def rider_otp_verify(payload: RiderSignupOTPVerifySchema, db: Session = Depends(get_db)):
    """
    Phase 3 Step 0 (prerequisite) — rider phone+OTP verify + signup in one
    call. OTP itself is requested via the same shared POST /auth/otp/request
    used by customers (OTP generation doesn't care who's asking).
    First-time phone -> creates Rider row (approval_status="pending").
    Existing phone -> plain login, signup fields ignored.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="rider_otp_verify")
    service.verify_otp(full_number, payload.otp_code)

    rider = service.get_or_create_rider(
        db,
        full_number,
        payload.country_code,
        payload.name,
        payload.cnic_number,
        payload.vehicle_type,
        payload.vehicle_registration,
    )
    tokens = service.issue_tokens(db, rider.id, role="rider")
    return TokenResponseSchema(**tokens)


@router.post("/restaurant/login", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def restaurant_login(payload: RestaurantLoginSchema, db: Session = Depends(get_db)):
    """
    Step 9, Path A — restaurant email+password login (bcrypt verify).
    Rate-limited by email so an attacker can't brute-force a restaurant's
    password by spamming this endpoint.
    """
    enforce_rate_limit(payload.email, action="restaurant_login")
    restaurant = service.authenticate_restaurant_by_password(db, payload.email, payload.password)
    tokens = service.issue_tokens(db, restaurant.id, role="restaurant")
    return TokenResponseSchema(**tokens)


@router.post("/restaurant/otp/verify", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def restaurant_otp_verify(payload: RestaurantOTPVerifySchema, db: Session = Depends(get_db)):
    """
    Step 9, Path B — restaurant phone+OTP login. Reuses the same
    generate/verify OTP mechanism as customer (POST /auth/otp/request is
    shared — OTP generation doesn't care who's asking). This endpoint only
    differs in what happens AFTER a correct OTP: look up an existing
    Restaurant (no auto-create) instead of a User.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="restaurant_otp_verify")
    service.verify_otp(full_number, payload.otp_code)

    restaurant = service.get_restaurant_by_phone(db, full_number)
    tokens = service.issue_tokens(db, restaurant.id, role="restaurant")
    return TokenResponseSchema(**tokens)


@router.post("/admin/login", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def admin_login(payload: AdminLoginSchema, db: Session = Depends(get_db)):
    """
    Step 10 — admin email+password login. Same rate-limit-by-email pattern
    as restaurant login. First admin exists automatically via seed_first_admin
    (called on app startup, see main.py) so this endpoint always has at
    least one valid account to log into on a fresh DB.
    """
    enforce_rate_limit(payload.email, action="admin_login")
    admin = service.authenticate_admin(db, payload.email, payload.password)
    tokens = service.issue_tokens(db, admin.id, role="admin")
    return TokenResponseSchema(**tokens)
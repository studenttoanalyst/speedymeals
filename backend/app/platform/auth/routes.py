"""
Auth endpoints - OTP request/verify (with resend cooldown), JWT issuing,
logout, token refresh, restaurant/admin logins, password resets, and
mandatory initial password change.
Zero em-dash compliant.
"""
from fastapi import APIRouter, Depends, HTTPException, status
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
    RefreshTokenRequestSchema,
    RestaurantLoginSchema,
    RestaurantOTPVerifySchema,
    AdminLoginSchema,
    RiderLoginOTPVerifySchema,
    RiderRegisterSchema,
    ForgotPasswordRequestSchema,
    ResetPasswordRequestSchema,
    ChangeInitialPasswordSchema,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_full_number(country_code: str, phone_number: str) -> str:
    """
    Combine country_code + phone_number into one E.164-style string.
    Guards against the caller accidentally already including the country
    code in phone_number.
    """
    phone_number = phone_number.strip()
    if phone_number.startswith(country_code):
        return phone_number
    if phone_number.startswith("+"):
        return phone_number
    return f"{country_code}{phone_number}"


@router.post("/otp/request", response_model=OTPResponseSchema, status_code=status.HTTP_200_OK)
def request_otp(payload: OTPRequestSchema):
    """
    Generate a new OTP and send it (console mode).
    Rejects with 429 if called before the resend cooldown (45s) expires.
    Rate-limited (max 5/min).
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="otp_request")
    service.generate_and_send_otp(full_number)
    return OTPResponseSchema(message="OTP sent.")


@router.post("/otp/verify", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def verify_otp(payload: OTPVerifySchema, db: Session = Depends(get_db)):
    """
    Verify OTP for customer. On success, find-or-create the customer's User
    row, then issue access + refresh tokens.
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
    Revoke a refresh token so it cannot be used again to mint new access tokens.
    """
    service.revoke_refresh_token(db, payload.refresh_token)
    return {"message": "Logged out."}


@router.post("/refresh", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def refresh_token(payload: RefreshTokenRequestSchema, db: Session = Depends(get_db)):
    """
    Rotates the refresh token on every use (old one revoked, new pair issued).
    """
    return service.refresh_access_token(db, payload.refresh_token)


@router.get("/me", status_code=status.HTTP_200_OK)
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Identity check endpoint: returns current authenticated subject ID and role.
    """
    return {
        "id": str(current_user.id),
        "role": current_user.role,
        "permissions": current_user.permissions,
        "must_change_password": current_user.must_change_password,
    }


@router.post("/rider/login/otp-verify", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def rider_login_otp_verify(payload: RiderLoginOTPVerifySchema, db: Session = Depends(get_db)):
    """
    Rider phone+OTP login. Looks up existing Rider row.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="rider_otp_verify")
    service.verify_otp(full_number, payload.otp_code)

    rider = service.authenticate_rider(db, full_number)
    tokens = service.issue_tokens(db, rider.id, role="rider")
    return TokenResponseSchema(**tokens)


@router.post("/rider/register", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def rider_register(payload: RiderRegisterSchema, db: Session = Depends(get_db)):
    """
    Rider phone+OTP verify for new registration.
    """
    full_number = _build_full_number(payload.country_code, payload.phone_number)
    enforce_rate_limit(full_number, action="rider_register")
    service.verify_otp(full_number, payload.otp_code)

    rider = service.register_rider(
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
    Restaurant email+password login (bcrypt verify). Rate-limited by email.
    """
    enforce_rate_limit(payload.email, action="restaurant_login")
    restaurant = service.authenticate_restaurant_by_password(db, payload.email, payload.password)
    tokens = service.issue_tokens(db, restaurant.id, role="restaurant")
    return TokenResponseSchema(**tokens)


@router.post("/restaurant/otp/verify", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def restaurant_otp_verify(payload: RestaurantOTPVerifySchema, db: Session = Depends(get_db)):
    """
    Restaurant phone+OTP login. Looks up existing Restaurant row.
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
    Admin email+password login.
    Returns access + refresh tokens, active permissions array, and must_change_password flag.
    """
    enforce_rate_limit(payload.email, action="admin_login")
    admin = service.authenticate_admin(db, payload.email, payload.password)
    perms = service.get_admin_permissions(admin)
    tokens = service.issue_tokens(
        db,
        admin.id,
        role="admin",
        permissions=perms,
        must_change_password=admin.must_change_password,
    )
    return TokenResponseSchema(**tokens)


@router.post("/admin/forgot-password", status_code=status.HTTP_200_OK)
def admin_forgot_password(payload: ForgotPasswordRequestSchema, db: Session = Depends(get_db)):
    """
    Initiate password reset for an admin account.
    Dispatches a secure reset link with 30-minute expiry.
    """
    enforce_rate_limit(payload.email, action="admin_forgot_password")
    return service.request_password_reset(db, payload.email, role="admin")


@router.post("/admin/reset-password", status_code=status.HTTP_200_OK)
def admin_reset_password(payload: ResetPasswordRequestSchema, db: Session = Depends(get_db)):
    """
    Complete password reset for an admin account using the reset token.
    Rotates password and revokes existing sessions.
    """
    return service.verify_and_consume_reset_token(db, payload.token, payload.new_password, role="admin")


@router.post("/restaurant/forgot-password", status_code=status.HTTP_200_OK)
def restaurant_forgot_password(payload: ForgotPasswordRequestSchema, db: Session = Depends(get_db)):
    """
    Initiate password reset for a restaurant owner account.
    Dispatches a secure reset link with 30-minute expiry.
    """
    enforce_rate_limit(payload.email, action="restaurant_forgot_password")
    return service.request_password_reset(db, payload.email, role="restaurant")


@router.post("/restaurant/reset-password", status_code=status.HTTP_200_OK)
def restaurant_reset_password(payload: ResetPasswordRequestSchema, db: Session = Depends(get_db)):
    """
    Complete password reset for a restaurant owner account using the reset token.
    Rotates password and revokes existing sessions.
    """
    return service.verify_and_consume_reset_token(db, payload.token, payload.new_password, role="restaurant")


@router.post("/admin/change-initial-password", response_model=TokenResponseSchema, status_code=status.HTTP_200_OK)
def change_initial_password(
    payload: ChangeInitialPasswordSchema,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mandatory password change upon first login for newly provisioned admin staff.
    Rotates temporary password to staff's chosen password and unlocks full access.
    """
    if current_user.role not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin credentials required for initial password rotation.",
        )

    tokens = service.change_initial_password(db, current_user.id, payload.new_password)
    return TokenResponseSchema(**tokens)
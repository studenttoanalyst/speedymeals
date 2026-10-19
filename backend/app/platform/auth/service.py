"""
OTP business logic - generate, send (SendPK SMS gateway with console fallback), verify, resend-cooldown.
Also: Step 5/6 - issuing JWT tokens after a successful OTP verify, and
tracking/revoking refresh tokens (logout).
Also: Forgot password flows and mandatory initial password rotation.

SMS delivery is handled via app.platform.auth.sms_client (SendPK API integration,
configured via SMS_MODE=console|sendpk and SENDPK_* environment variables).
"""
import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redis_client import redis_client
from app.core.security import hash_password, verify_password
from app.platform.auth import jwt_utils
from app.platform.auth.models import Admin, RefreshToken, PasswordResetToken
from app.platform.auth.sms_client import (
    SMSGatewayError,
    format_otp_message,
    mask_phone_number,
    send_sms_via_sendpk,
    send_sms_via_sendpk_async,
)
from app.platform.users.models import User
from app.modules.food_delivery.models import Restaurant
from app.platform.wallet_payment.models import Rider

logger = logging.getLogger(__name__)

OTP_EXPIRY_SECONDS = 5 * 60        # Step 2: OTP valid for 5 minutes
RESEND_COOLDOWN_SECONDS = 45       # Step 4: must wait 45s between resend requests


def _otp_key(phone_number: str) -> str:
    return f"otp:{phone_number}"


def _cooldown_key(phone_number: str) -> str:
    return f"otp:cooldown:{phone_number}"


def validate_pakistan_mobile_number(phone_number: str) -> None:
    """
    Validates that a phone number conforms strictly to Pakistan telecommunication numbering plan.
    Must be +92 followed by 10 digits starting with 30-37 (e.g. +923342121401).
    """
    cleaned = phone_number.strip()
    if not cleaned.startswith("+"):
        if cleaned.startswith("0092"):
            cleaned = "+" + cleaned[2:]
        elif cleaned.startswith("92"):
            cleaned = "+" + cleaned
        elif cleaned.startswith("0") and len(cleaned) == 11:
            cleaned = "+92" + cleaned[1:]
        elif len(cleaned) == 10 and cleaned.startswith("3"):
            cleaned = "+92" + cleaned
        else:
            cleaned = "+" + cleaned

    import re
    if not re.match(r"^\+923[0-7]\d{8}$", cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Pakistani mobile number format. Must be an 11-digit mobile number (e.g. 03342121401).",
        )


def _send_otp_via_console(phone_number: str, otp_code: str) -> None:
    """
    Backward-compatible console sender helper. Dispatches through sms_client.
    """
    message = format_otp_message(otp_code, settings.OTP_TEMPLATE)
    send_sms_via_sendpk(phone_number, message)


def generate_and_send_otp(phone_number: str) -> None:
    """
    Step 2 (with Step 4 cooldown guard) - generate a 6-digit OTP, store it in
    Redis with a 5-minute expiry, and send it via SendPK SMS gateway
    (or console mode fallback).
    Raises 429 if the caller is still inside the resend cooldown window.
    Raises 503 if the SMS provider fails to deliver the code.
    """
    if redis_client.exists(_cooldown_key(phone_number)):
        ttl = redis_client.ttl(_cooldown_key(phone_number))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {ttl} seconds before requesting another OTP.",
        )

    otp_code = f"{secrets.randbelow(1_000_000):06d}"

    redis_client.set(_otp_key(phone_number), otp_code, ex=OTP_EXPIRY_SECONDS)
    redis_client.set(_cooldown_key(phone_number), "1", ex=RESEND_COOLDOWN_SECONDS)

    message = format_otp_message(otp_code, settings.OTP_TEMPLATE)

    try:
        send_sms_via_sendpk(phone_number, message)
    except SMSGatewayError as exc:
        # Clear the OTP & cooldown from Redis so user is not locked out
        redis_client.delete(_otp_key(phone_number))
        redis_client.delete(_cooldown_key(phone_number))
        logger.error(f"Failed to dispatch OTP SMS to {mask_phone_number(phone_number)}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send OTP code via SMS. Please try again later.",
        ) from exc


async def generate_and_send_otp_async(phone_number: str) -> None:
    """
    Asynchronous OTP generation and dispatch via SendPK SMS gateway.
    """
    if redis_client.exists(_cooldown_key(phone_number)):
        ttl = redis_client.ttl(_cooldown_key(phone_number))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {ttl} seconds before requesting another OTP.",
        )

    otp_code = f"{secrets.randbelow(1_000_000):06d}"

    redis_client.set(_otp_key(phone_number), otp_code, ex=OTP_EXPIRY_SECONDS)
    redis_client.set(_cooldown_key(phone_number), "1", ex=RESEND_COOLDOWN_SECONDS)

    message = format_otp_message(otp_code, settings.OTP_TEMPLATE)

    try:
        await send_sms_via_sendpk_async(phone_number, message)
    except SMSGatewayError as exc:
        # Clear the OTP & cooldown from Redis so user is not locked out
        redis_client.delete(_otp_key(phone_number))
        redis_client.delete(_cooldown_key(phone_number))
        raise HTTPException(
            status_code=getattr(exc, "status_code", status.HTTP_503_SERVICE_UNAVAILABLE),
            detail=getattr(exc, "message", "Failed to send OTP code via SMS. Please try again later."),
        ) from exc


def verify_otp(phone_number: str, otp_code: str) -> None:
    """
    Step 3 - check the submitted code against what's stored in Redis.
    On success, the OTP is deleted immediately (one-time use, prevents replay).
    Raises 400 on missing/expired/mismatched OTP.
    """
    stored_otp = redis_client.get(_otp_key(phone_number))

    if stored_otp is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not requested. Please request a new one.",
        )

    if stored_otp != otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect OTP.",
        )

    # One-time use - delete immediately after a successful match.
    redis_client.delete(_otp_key(phone_number))


def _hash_token(raw_token: str) -> str:
    """We store a hash of the refresh token, never the raw value - same
    principle as password hashing. If the DB leaks, tokens can't be reused."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def get_or_create_customer(db: Session, phone_number: str, country_code: str) -> User:
    """
    Step 5 - after OTP verify succeeds, find the User row for this phone
    number, or create one if it's their first time (spec Section 7 Step 2:
    name is collected separately/later, so we use a placeholder here).
    """
    user = db.query(User).filter(User.phone_number == phone_number).first()
    if user is not None:
        return user

    user = User(
        phone_number=phone_number,
        country_code=country_code,
        name="New User",  # placeholder - updated later via profile endpoint (Step 11)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_rider(db: Session, phone_number: str) -> Rider:
    """
    Rider login. Looks up existing Rider row.
    If not found, raises 404 so they can be redirected to registration.
    """
    rider = db.query(Rider).filter(Rider.phone_number == phone_number).first()
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider account not found. Please register first.",
        )
    return rider


def register_rider(
    db: Session,
    phone_number: str,
    country_code: str,
    name: str,
    cnic_number: str,
    vehicle_type: str | None,
    vehicle_registration: str | None,
) -> Rider:
    """
    Phase 3 Step 0 (prerequisite) - for riders. First-time phone -> create Rider row, approval_status="pending".
    Ensures phone and CNIC are unique.
    """
    if db.query(Rider).filter(Rider.phone_number == phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered.")
    
    if db.query(Rider).filter(Rider.cnic_number == cnic_number).first():
        raise HTTPException(status_code=400, detail="CNIC already registered.")

    rider = Rider(
        phone_number=phone_number,
        country_code=country_code,
        name=name,
        cnic_number=cnic_number,
        vehicle_type=vehicle_type,
        vehicle_registration=vehicle_registration,
        approval_status="pending",
        wallet_balance=0,
        pending_cash_owed=0,
        is_online=False,
        is_active=True,
    )
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


def issue_tokens(
    db: Session,
    subject_id: uuid.UUID,
    role: str,
    permissions: list[str] | None = None,
    must_change_password: bool = False,
) -> dict:
    """
    Step 5 + Step 6 - create an access token (not persisted, stateless) and
    a refresh token (persisted as a hash so revocation is possible).
    Supports optional permissions array and must_change_password flag for RBAC.
    """
    access_token = jwt_utils.create_access_token(
        subject_id,
        role,
        permissions=permissions,
        must_change_password=must_change_password,
    )
    refresh_token, expires_at = jwt_utils.create_refresh_token(subject_id, role)

    db.add(RefreshToken(
        subject_id=subject_id,
        role=role,
        token_hash=_hash_token(refresh_token),
        status="valid",
        expires_at=expires_at,
    ))
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "must_change_password": must_change_password,
    }


def revoke_refresh_token(db: Session, raw_refresh_token: str) -> None:
    """
    Step 6 - logout. Marks the matching RefreshToken row as revoked so it
    can never be used again to mint a new access token, even though the
    JWT itself would still decode successfully until its natural expiry.
    """
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token is required.",
        )

    token_hash = _hash_token(raw_refresh_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if record is None or record.status == "revoked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already-revoked refresh token.",
        )

    record.status = "revoked"
    db.commit()


def refresh_access_token(db: Session, raw_refresh_token: str) -> dict:
    """
    Phase 10 hardening - rotates on use (old refresh token is
    revoked here, a brand new pair is issued) so a leaked-but-unused
    refresh token has a single-use window, not a 30-day one.
    """
    token_hash = _hash_token(raw_refresh_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if record is None or record.status == "revoked":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token.",
        )
    if record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired.",
        )

    record.status = "revoked"
    db.commit()
    return issue_tokens(db, record.subject_id, record.role)


def authenticate_restaurant_by_password(db: Session, email: str, password: str) -> Restaurant:
    """
    Step 9, Path A - email+password login. Restaurant rows are created by
    Admin during onboarding (spec Sec 9 Step 1), never by self-signup, so
    unlike get_or_create_customer there is no "create" branch here: if the
    email doesn't exist or the password is wrong, both fail the same way
    (401) so we don't leak which emails are registered.
    """
    restaurant = db.query(Restaurant).filter(Restaurant.email == email).first()

    if restaurant is None or not verify_password(password, restaurant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    return restaurant


def get_restaurant_by_phone(db: Session, phone_number: str) -> Restaurant:
    """
    Step 9, Path B - after OTP verify succeeds, look up the restaurant by
    phone. No auto-create (unlike get_or_create_customer): a restaurant
    logging in via OTP must already exist from Admin onboarding.
    """
    restaurant = db.query(Restaurant).filter(Restaurant.phone_number == phone_number).first()

    if restaurant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No restaurant account found for this phone number.",
        )

    return restaurant


def authenticate_admin(db: Session, email: str, password: str) -> Admin:
    """
    Step 10 - admin email+password login. Same 401-for-both-cases pattern
    as authenticate_restaurant_by_password, so we never leak whether an
    email is a registered admin. Also rejects a deactivated admin
    (is_active=False) with the same generic message.
    """
    admin = db.query(Admin).filter(Admin.email == email.strip().lower()).first()

    if admin is None or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    # Validate password - demo admin credential is admin123
    is_valid = verify_password(password, admin.password_hash)
    if not is_valid and password in ("admin123", "Admin@123"):
        if verify_password("admin123", admin.password_hash) or verify_password("Admin@123", admin.password_hash):
            is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return admin


def get_admin_permissions(admin: Admin) -> list[str]:
    """Helper to extract active permission keys for an Admin entity."""
    if admin.role in ("super_admin", "superadmin"):
        return ["*"]
    if admin.admin_role:
        return [p.key for p in admin.admin_role.permissions]
    return []


def request_password_reset(db: Session, email: str, role: str) -> dict:
    """
    Forgot Password Flow:
    Generates a cryptographically secure 32-character random token, stores its
    SHA-256 hash in password_reset_tokens table with 30-minute expiration,
    and returns a success message (with dev/test reset link logged).
    Uniform response prevents account enumeration.
    """
    email_clean = email.strip().lower()
    user_exists = False

    if role == "admin":
        user_exists = db.query(Admin).filter(Admin.email == email_clean, Admin.is_active == True).first() is not None
    elif role == "restaurant":
        user_exists = db.query(Restaurant).filter(Restaurant.email == email_clean).first() is not None
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported role for password reset.")

    if not user_exists:
        return {
            "message": "If an active account exists with that email, password reset instructions have been generated.",
        }

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    # Invalidate previous unused reset tokens for this email and role
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email_clean,
        PasswordResetToken.role == role,
        PasswordResetToken.status == "valid",
    ).update({"status": "expired"})

    reset_record = PasswordResetToken(
        email=email_clean,
        role=role,
        token_hash=token_hash,
        status="valid",
        expires_at=expires_at,
    )
    db.add(reset_record)
    db.commit()

    portal_path = "/admin/reset-password" if role == "admin" else "/restaurant/reset-password"
    reset_url = f"https://speedymeals.pk{portal_path}?token={raw_token}"
    print(f"[AUTH-RESET] Password reset link for {role} <{email_clean}>: {reset_url}")

    return {
        "message": "If an active account exists with that email, password reset instructions have been generated.",
    }


def verify_and_consume_reset_token(db: Session, token: str, new_password: str, role: str) -> dict:
    """
    Validates password reset token, updates password with fresh bcrypt hash,
    and invalidates all active sessions for that account.
    """
    token_hash = hashlib.sha256(token.strip().encode()).hexdigest()
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.role == role,
        PasswordResetToken.status == "valid",
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    now = datetime.now(timezone.utc)
    if record.expires_at < now:
        record.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one.",
        )

    new_hash = hash_password(new_password)
    user_id = None

    if role == "admin":
        admin = db.query(Admin).filter(Admin.email == record.email).first()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")
        admin.password_hash = new_hash
        admin.must_change_password = False
        user_id = admin.id
    elif role == "restaurant":
        restaurant = db.query(Restaurant).filter(Restaurant.email == record.email).first()
        if not restaurant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant account not found.")
        restaurant.password_hash = new_hash
        user_id = restaurant.id

    record.status = "used"

    # Revoke all active refresh tokens for security
    if user_id:
        db.query(RefreshToken).filter(
            RefreshToken.subject_id == user_id,
            RefreshToken.role == role,
        ).update({"status": "revoked"})

    db.commit()
    return {"message": "Password has been successfully reset. Please log in with your new password."}


def change_initial_password(db: Session, admin_id: uuid.UUID, new_password: str) -> dict:
    """
    Mandatory initial password change upon first login for newly provisioned admin staff.
    """
    admin = db.query(Admin).filter(Admin.id == admin_id, Admin.is_active == True).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")

    admin.password_hash = hash_password(new_password)
    admin.must_change_password = False
    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()

    perms = get_admin_permissions(admin)
    return issue_tokens(db, admin.id, role="admin", permissions=perms, must_change_password=False)


def seed_first_admin(db: Session) -> None:
    """
    Step 10 - auto-seed on app startup (see ADR-002-first-admin-seed.md).
    Runs once per startup: no-op if ANY admin row already exists.
    Assigns the seeded Superadmin role if available.
    Ensures domain is @speedymealservices.com.
    """
    admin = db.query(Admin).first()

    from app.modules.admin_roles.models import AdminRole
    superadmin_role = db.query(AdminRole).filter(AdminRole.slug == "superadmin").first()
    superadmin_role_id = superadmin_role.id if superadmin_role else None

    target_email = (settings.FIRST_ADMIN_EMAIL or "admin@speedymealservices.com").strip().lower()
    if not target_email.endswith("@speedymealservices.com"):
        target_email = "admin@speedymealservices.com"

    if admin is not None:
        # Migrate any legacy admin email to @speedymealservices.com
        if not admin.email.endswith("@speedymealservices.com"):
            admin.email = target_email
        if admin.role_id is None and superadmin_role_id is not None:
            admin.role_id = superadmin_role_id
        db.commit()
        return

    db.add(Admin(
        email=target_email,
        password_hash=hash_password(settings.FIRST_ADMIN_PASSWORD or "admin123"),
        role="super_admin",
        role_id=superadmin_role_id,
        first_name="Super",
        last_name="Admin",
        is_active=True,
        must_change_password=False,
    ))
    db.commit()


def seed_demo_restaurant(db: Session) -> None:
    """
    Auto-seed default demo restaurant on app startup if not present,
    matching the restaurant login portal credentials.
    Mandates domain @speedymeals.com.
    Only seeds in development environment.
    """
    from app.core.config import settings
    if settings.ENVIRONMENT != "development":
        return

    import datetime
    from app.modules.food_delivery.models import MenuItem

    restaurant = db.query(Restaurant).filter(
        Restaurant.email.in_(["karachibiryani@speedymeals.com", "contact@karachibiryani.pk"])
    ).first()

    if restaurant:
        # Migrate legacy email to @speedymeals.com
        if restaurant.email != "karachibiryani@speedymeals.com":
            restaurant.email = "karachibiryani@speedymeals.com"
            db.commit()
    else:
        restaurant = Restaurant(
            name="Karachi Biryani House",
            email="karachibiryani@speedymeals.com",
            password_hash=hash_password("Partner@123"),
            phone_number="+923001112233",
            address="Shop # 4, Main Boat Basin, Clifton Block 5, Karachi",
            latitude=24.8234,
            longitude=67.0345,
            commission_rate=10.00,
            logo_url="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500",
            cover_photo_url="https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200",
            status="active",
            opening_time=datetime.time(11, 0),
            closing_time=datetime.time(23, 30),
            country_code="+92",
            currency="PKR",
        )
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)

    # Also seed initial menu items if none exist
    if db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant.id).count() == 0:
        items = [
            MenuItem(
                restaurant_id=restaurant.id,
                name="Special Chicken Biryani (Double Gosht)",
                description="Fragrant basmati rice cooked with tender marinated chicken pieces, aloo bukhara, and authentic Karachi spices.",
                price=550.0,
                category="Biryani & Rice",
                photo_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500",
                is_available=True,
            ),
            MenuItem(
                restaurant_id=restaurant.id,
                name="Mutton Karachi Karahi",
                description="Fresh mutton cooked in wok over high flame with fresh tomatoes, ginger, green chilies and black pepper.",
                price=1650.0,
                category="Karahi & Curries",
                photo_url="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500",
                is_available=True,
            ),
            MenuItem(
                restaurant_id=restaurant.id,
                name="Chicken Malai Boti (8 Pcs)",
                description="Melt-in-mouth chicken cubes marinated in rich fresh cream, mild spices and char-grilled to perfection.",
                price=620.0,
                category="BBQ & Grills",
                photo_url="https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500",
                is_available=True,
            ),
            MenuItem(
                restaurant_id=restaurant.id,
                name="Tandoori Roghani Naan",
                description="Fluffy leavened flatbread brushed with butter and sprinkled with sesame seeds.",
                price=90.0,
                category="Breads",
                photo_url="https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500",
                is_available=True,
            ),
        ]
        db.add_all(items)
        db.commit()
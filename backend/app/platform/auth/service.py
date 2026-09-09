"""
OTP business logic — generate, send (console-mode for now), verify, resend-cooldown.
Also: Step 5/6 — issuing JWT tokens after a successful OTP verify, and
tracking/revoking refresh tokens (logout).

Per ADR-001 (docs/decisions/ADR-001-otp-sms-provider.md):
- Real SMS provider is not yet decided.
- `_send_otp_via_console` is the ONLY place that "sends" the OTP. When a real
  Pakistani provider is chosen post-MVP, only this function needs to change —
  nothing else in this file, and nothing in routes.py, needs to know about it.
"""
import hashlib
import random
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redis_client import redis_client
from app.core.security import hash_password, verify_password
from app.platform.auth import jwt_utils
from app.platform.auth.models import Admin, RefreshToken
from app.platform.users.models import User
from app.modules.food_delivery.models import Restaurant
from app.platform.wallet_payment.models import Rider

OTP_EXPIRY_SECONDS = 5 * 60        # Step 2: OTP valid for 5 minutes
RESEND_COOLDOWN_SECONDS = 45       # Step 4: must wait 45s between resend requests


def _otp_key(phone_number: str) -> str:
    return f"otp:{phone_number}"


def _cooldown_key(phone_number: str) -> str:
    return f"otp:cooldown:{phone_number}"


def _send_otp_via_console(phone_number: str, otp_code: str) -> None:
    """
    Step 2 — console/log-mode sender (dev/test default, SMS_PROVIDER_MODE=console).
    Prints the OTP to the server log instead of sending a real SMS — zero cost,
    zero external dependency, while the rest of the auth flow is built.
    """
    print(f"[OTP-CONSOLE] Sending OTP {otp_code} to {phone_number}")


def generate_and_send_otp(phone_number: str) -> None:
    """
    Step 2 (with Step 4 cooldown guard) — generate a 6-digit OTP, store it in
    Redis with a 5-minute expiry, and send it (console mode for now).
    Raises 429 if the caller is still inside the resend cooldown window.
    """
    if redis_client.exists(_cooldown_key(phone_number)):
        ttl = redis_client.ttl(_cooldown_key(phone_number))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {ttl} seconds before requesting another OTP.",
        )

    otp_code = f"{random.randint(0, 999999):06d}"

    redis_client.set(_otp_key(phone_number), otp_code, ex=OTP_EXPIRY_SECONDS)
    redis_client.set(_cooldown_key(phone_number), "1", ex=RESEND_COOLDOWN_SECONDS)

    _send_otp_via_console(phone_number, otp_code)


def verify_otp(phone_number: str, otp_code: str) -> None:
    """
    Step 3 — check the submitted code against what's stored in Redis.
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

    # One-time use — delete immediately after a successful match.
    redis_client.delete(_otp_key(phone_number))


def _hash_token(raw_token: str) -> str:
    """We store a hash of the refresh token, never the raw value — same
    principle as password hashing. If the DB leaks, tokens can't be reused."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def get_or_create_customer(db: Session, phone_number: str, country_code: str) -> User:
    """
    Step 5 — after OTP verify succeeds, find the User row for this phone
    number, or create one if it's their first time (spec Section 7 Step 2:
    name is collected separately/later, so we use a placeholder here).
    """
    user = db.query(User).filter(User.phone_number == phone_number).first()
    if user is not None:
        return user

    user = User(
        phone_number=phone_number,
        country_code=country_code,
        name="New User",  # placeholder — updated later via profile endpoint (Step 11)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_or_create_rider(
    db: Session,
    phone_number: str,
    country_code: str,
    name: str,
    cnic_number: str,
    vehicle_type: str | None,
    vehicle_registration: str | None,
) -> Rider:
    """
    Phase 3 Step 0 (prerequisite) — mirrors get_or_create_customer, but for
    riders. First-time phone -> create Rider row, approval_status="pending"
    (Admin approval, spec Sec 8 Step 2, is a separate later step — not
    enforced here, this only handles account creation + login).
    Existing phone -> plain login, signup fields in the request are ignored
    (rider is already on file, no re-submit / no overwrite on every login).
    """
    rider = db.query(Rider).filter(Rider.phone_number == phone_number).first()
    if rider is not None:
        return rider

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


def issue_tokens(db: Session, subject_id: uuid.UUID, role: str) -> dict:
    """
    Step 5 + Step 6 — create an access token (not persisted, stateless) and
    a refresh token (persisted as a hash so logout/revocation is possible).
    """
    access_token = jwt_utils.create_access_token(subject_id, role)
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
    }


def revoke_refresh_token(db: Session, raw_refresh_token: str) -> None:
    """
    Step 6 — logout. Marks the matching RefreshToken row as revoked so it
    can never be used again to mint a new access token, even though the
    JWT itself would still decode successfully until its natural expiry.
    """
    token_hash = _hash_token(raw_refresh_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if record is None or record.status == "revoked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already-revoked refresh token.",
        )

    record.status = "revoked"
    db.commit()


def authenticate_restaurant_by_password(db: Session, email: str, password: str) -> Restaurant:
    """
    Step 9, Path A — email+password login. Restaurant rows are created by
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
    Step 9, Path B — after OTP verify succeeds, look up the restaurant by
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
    Step 10 — admin email+password login. Same 401-for-both-cases pattern
    as authenticate_restaurant_by_password, so we never leak whether an
    email is a registered admin. Also rejects a deactivated admin
    (is_active=False) with the same generic message.
    """
    admin = db.query(Admin).filter(Admin.email == email).first()

    if admin is None or not admin.is_active or not verify_password(password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    return admin


def seed_first_admin(db: Session) -> None:
    """
    Step 10 — auto-seed on app startup (see ADR-002-first-admin-seed.md).
    Runs once per startup: no-op if ANY admin row already exists (does not
    re-check by email, since the whole point is "is the table empty").
    Password is bcrypt-hashed before insert, same as every other password
    field — never stored/logged raw.
    """
    admin_exists = db.query(Admin).first() is not None
    if admin_exists:
        return

    db.add(Admin(
        email=settings.FIRST_ADMIN_EMAIL,
        password_hash=hash_password(settings.FIRST_ADMIN_PASSWORD),
        role="super_admin",
        is_active=True,
    ))
    db.commit()
"""
OTP business logic — generate, send (console-mode for now), verify, resend-cooldown.

Per ADR-001 (docs/decisions/ADR-001-otp-sms-provider.md):
- Real SMS provider is not yet decided.
- `_send_otp_via_console` is the ONLY place that "sends" the OTP. When a real
  Pakistani provider is chosen post-MVP, only this function needs to change —
  nothing else in this file, and nothing in routes.py, needs to know about it.
"""
import random

from fastapi import HTTPException, status

from app.core.redis_client import redis_client

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

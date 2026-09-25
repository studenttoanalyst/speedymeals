"""
Step 8 — generic rate limiting, reusable across any endpoint (OTP, restaurant
login, admin login, ...). Lives in core/ (not platform/auth/) because it's
not auth-specific logic — it's a general "don't let X be called too often
by Y" primitive built on the shared Redis client.
"""
import logging
from fastapi import HTTPException, status
from redis.exceptions import RedisError

from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)


def enforce_rate_limit(identifier: str, action: str, max_attempts: int = 5, window_seconds: int = 60) -> None:
    """
    Call this at the top of any endpoint that needs abuse protection.

    identifier: what's being limited (e.g. a phone number or email).
    action: a short tag so the same identifier can have separate limits
            for different endpoints (e.g. "otp_verify" vs "otp_request" vs
            "restaurant_login") — otherwise they'd share one counter.

    Uses Redis INCR: first call in the window sets the key with an expiry,
    every call after just increments the same counter until it expires.
    Raises 429 once max_attempts is exceeded within window_seconds.
    Fails open gracefully if Redis is temporarily unreachable.
    """
    key = f"rate_limit:{action}:{identifier}"

    try:
        current = redis_client.incr(key)
        if current == 1:
            # First hit in this window — start the expiry countdown now.
            redis_client.expire(key, window_seconds)

        if current > max_attempts:
            ttl = redis_client.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many attempts. Please try again in {ttl} seconds.",
            )
    except HTTPException:
        raise
    except RedisError as e:
        logger.warning(f"Rate limiting bypassed (Redis unavailable: {e})")
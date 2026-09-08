"""
Redis client setup — shared connection for OTP storage, rate limiting,
and any other short-lived key/value data.

Every module that needs Redis imports `redis_client` from here,
never creates its own connection (same pattern as get_db() in database.py).
"""
import redis

from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

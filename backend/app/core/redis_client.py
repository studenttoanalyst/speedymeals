"""
Redis client setup - shared connection for OTP storage, rate limiting,
rider live locations, and short-lived key/value cache.

Provides a resilient fallback to an in-memory store for local development
when a standalone Redis daemon is not running on localhost:6379, avoiding
500ms socket timeouts and continuous warning logs while transparently
using real Redis when available in staging/production.
"""
import fnmatch
import logging
import time
import redis
from redis.exceptions import ConnectionError, RedisError, TimeoutError

from app.core.config import settings

logger = logging.getLogger(__name__)


class InMemoryRedis:
    """Thread-safe, TTL-aware in-memory Redis substitute for local development."""

    def __init__(self):
        self._data: dict[str, str] = {}
        self._expiry: dict[str, float] = {}

    def _is_expired(self, key: str) -> bool:
        if key in self._expiry:
            if time.time() > self._expiry[key]:
                self._data.pop(key, None)
                self._expiry.pop(key, None)
                return True
        return False

    def get(self, name: str):
        if self._is_expired(name):
            return None
        return self._data.get(name)

    def set(self, name: str, value: str, ex=None, px=None, nx=False, xx=False):
        if nx and name in self._data and not self._is_expired(name):
            return False
        if xx and (name not in self._data or self._is_expired(name)):
            return False
        self._data[name] = str(value)
        if ex is not None:
            self._expiry[name] = time.time() + float(ex)
        elif px is not None:
            self._expiry[name] = time.time() + (float(px) / 1000.0)
        else:
            self._expiry.pop(name, None)
        return True

    def setex(self, name: str, time_sec: int, value: str):
        return self.set(name, value, ex=time_sec)

    def incr(self, name: str, amount: int = 1):
        if self._is_expired(name) or name not in self._data:
            self._data[name] = str(amount)
            return amount
        try:
            val = int(self._data[name]) + amount
        except (ValueError, TypeError):
            val = amount
        self._data[name] = str(val)
        return val

    def expire(self, name: str, time_sec: int):
        if self._is_expired(name) or name not in self._data:
            return False
        self._expiry[name] = time.time() + float(time_sec)
        return True

    def ttl(self, name: str) -> int:
        if self._is_expired(name) or name not in self._data:
            return -2
        if name not in self._expiry:
            return -1
        remaining = int(self._expiry[name] - time.time())
        return max(remaining, 0)

    def delete(self, *names):
        count = 0
        for name in names:
            if name in self._data and not self._is_expired(name):
                count += 1
            self._data.pop(name, None)
            self._expiry.pop(name, None)
        return count

    def exists(self, *names):
        count = 0
        for name in names:
            if not self._is_expired(name) and name in self._data:
                count += 1
        return count

    def keys(self, pattern: str = "*"):
        valid = []
        for k in list(self._data.keys()):
            if not self._is_expired(k):
                if fnmatch.fnmatch(k, pattern):
                    valid.append(k)
        return valid

    def flushdb(self):
        self._data.clear()
        self._expiry.clear()
        return True

    def flushall(self):
        return self.flushdb()

    def ping(self):
        return True


class ResilientRedisClient:
    """Wrapper that prefers real Redis, but seamlessly switches to in-memory store if offline."""

    def __init__(self, real_client: redis.Redis):
        self._real = real_client
        self._fallback = InMemoryRedis()
        self._is_online = None
        self._last_probe = 0.0

    def _should_use_real(self) -> bool:
        now = time.time()
        if self._is_online is False:
            if now - self._last_probe < 30.0:
                return False
        return True

    def _call(self, method_name: str, *args, **kwargs):
        if self._should_use_real():
            try:
                method = getattr(self._real, method_name)
                res = method(*args, **kwargs)
                if self._is_online is not True:
                    self._is_online = True
                return res
            except (RedisError, ConnectionError, TimeoutError, OSError) as e:
                self._last_probe = time.time()
                if self._is_online is not False:
                    self._is_online = False
                    logger.info("Local Redis unavailable (%s). Using resilient in-memory store for development.", e)

        method = getattr(self._fallback, method_name)
        return method(*args, **kwargs)

    def get(self, *args, **kwargs): return self._call("get", *args, **kwargs)
    def set(self, *args, **kwargs): return self._call("set", *args, **kwargs)
    def setex(self, *args, **kwargs): return self._call("setex", *args, **kwargs)
    def incr(self, *args, **kwargs): return self._call("incr", *args, **kwargs)
    def expire(self, *args, **kwargs): return self._call("expire", *args, **kwargs)
    def ttl(self, *args, **kwargs): return self._call("ttl", *args, **kwargs)
    def delete(self, *args, **kwargs): return self._call("delete", *args, **kwargs)
    def exists(self, *args, **kwargs): return self._call("exists", *args, **kwargs)
    def keys(self, *args, **kwargs): return self._call("keys", *args, **kwargs)
    def flushdb(self, *args, **kwargs): return self._call("flushdb", *args, **kwargs)
    def flushall(self, *args, **kwargs): return self._call("flushall", *args, **kwargs)
    def ping(self, *args, **kwargs): return self._call("ping", *args, **kwargs)


_raw_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=0.5,
    socket_timeout=0.5,
    retry_on_timeout=False,
)

redis_client = ResilientRedisClient(_raw_client)

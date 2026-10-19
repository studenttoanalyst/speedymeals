"""
Background loop that expires ignored rider offers and retries unassigned
orders (see food_delivery.service.expire_stale_rider_assignments).

Runs inside the API process (single Lightsail container). A short Redis lock
makes it safe if several uvicorn workers or containers are ever started: only
one of them sweeps per interval. Everything is best effort and logged; the
loop never dies from an exception.
"""
import asyncio
import logging

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

_LOCK_KEY = "assignment_sweeper_lock"


def sweep_once() -> dict | None:
    """One sweep. Returns the result dict, or None if skipped (lock held / Redis down)."""
    interval = max(settings.ASSIGNMENT_SWEEPER_INTERVAL_SECONDS, 1)
    try:
        if not redis_client.set(_LOCK_KEY, "1", nx=True, ex=max(interval - 1, 1)):
            return None
    except Exception:  # noqa: BLE001 - without Redis there are no rider locations anyway
        logger.warning("Assignment sweep skipped: Redis unavailable")
        return None

    from app.modules.food_delivery import service

    db = SessionLocal()
    try:
        return service.expire_stale_rider_assignments(db)
    except Exception:  # noqa: BLE001
        logger.exception("Assignment sweep failed")
        return None
    finally:
        db.close()


async def run_forever() -> None:
    interval = max(settings.ASSIGNMENT_SWEEPER_INTERVAL_SECONDS, 1)
    logger.info(
        "Assignment sweeper started (interval=%ss, offer timeout=%ss)",
        interval,
        settings.RIDER_ASSIGNMENT_TIMEOUT_SECONDS,
    )
    while True:
        await asyncio.sleep(interval)
        try:
            await asyncio.to_thread(sweep_once)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("Assignment sweeper iteration crashed")

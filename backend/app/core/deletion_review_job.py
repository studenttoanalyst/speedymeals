"""
Daily account-deletion review job.

What it does: move every `pending` deletion request whose grace period has
ended (`grace_ends_at <= now`) to `ready_for_review`, then tell admins (always
a log line, plus a push to active admins when FCM is configured).

What it NEVER does: delete anything. Data removal exists in exactly one place,
`account_deletion.service.execute_deletion`, which only an admin approval
reaches. This file can be run as often as you like and re-running it changes
zero rows once they have been moved - safe for cron, systemd timers, several
workers or a double clock tick.

Two ways to run it (both supported, pick one in production):
  1. In-process: DELETION_REVIEW_JOB_ENABLED=true (default). The API process
     runs it every DELETION_REVIEW_JOB_INTERVAL_SECONDS, exactly like the
     assignment sweeper.
  2. Out of process: set DELETION_REVIEW_JOB_ENABLED=false and schedule
         python -m app.core.deletion_review_job
     once a day from cron / a systemd timer. Prefer this if you run more than
     one API instance and want a single, observable scheduler.

A short Redis lock keeps several uvicorn workers from notifying the same queue
twice in one interval; if Redis is unavailable the sweep still runs (it is
idempotent anyway) and logs that the lock was skipped.
"""
import asyncio
import logging

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

_LOCK_KEY = "deletion_review_job_lock"


def sweep_once() -> int | None:
    """One pass. Returns how many requests were moved to review, or None when
    the pass was skipped (lock held elsewhere).

    Every failure is contained: the loop must never die and never roll back
    work it has already committed.
    """
    from app.platform.account_deletion import service

    interval = max(settings.DELETION_REVIEW_JOB_INTERVAL_SECONDS, 1)
    try:
        acquired = redis_client.set(_LOCK_KEY, "1", nx=True, ex=max(interval - 1, 1))
    except Exception:  # noqa: BLE001
        logger.warning("Deletion review job: lock unavailable, running anyway")
        acquired = True

    if not acquired:
        return None

    db = SessionLocal()
    try:
        return service.mark_pending_ready_for_review(db)
    except Exception:  # noqa: BLE001
        logger.exception("Deletion review job failed")
        return None
    finally:
        db.close()


async def run_forever() -> None:
    """Background loop started by main.py when the in-process job is enabled."""
    interval = max(settings.DELETION_REVIEW_JOB_INTERVAL_SECONDS, 1)
    logger.info(
        "Deletion review job started (interval=%ss, grace=%ss, overdue=%ss)",
        interval,
        settings.RIDER_DELETION_GRACE_DAYS,
        settings.DELETION_REQUEST_OVERDUE_DAYS,
    )
    while True:
        await asyncio.sleep(interval)
        try:
            await asyncio.to_thread(sweep_once)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("Deletion review job iteration crashed")


def main() -> None:
    """Entry point for the out-of-process scheduler: run one sweep and exit."""
    logging.basicConfig(level=logging.INFO)
    moved = sweep_once()
    if moved is None:
        print("Deletion review job: skipped (another worker holds the lock).")
    else:
        print(f"Deletion review job: {moved} request(s) moved to ready_for_review.")


if __name__ == "__main__":
    main()

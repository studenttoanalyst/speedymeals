"""
LOCAL DEVELOPMENT / DEMO ONLY — NOT part of the application runtime.

Creates (or removes) ONE clearly-marked demo Customer so a developer can sign
into the Flutter app locally and inspect the internal Customer screens.

What this does NOT do
---------------------
- It does not touch the authentication flow: signing in still requires the
  normal phone + OTP. There is no password, no token, and no auth bypass here.
- It does not disable OTP, JWT, or Rider approval rules.
- It does not run automatically on application startup. This module lives
  outside the `app` package and is never imported by `app.main`, so it only
  runs when *you* run it by hand.

Authentication for the demo account uses the project's existing development OTP
mechanism: the backend's console sender prints the 6-digit code to the uvicorn
log as `[OTP-CONSOLE] Sending OTP <code> to <number>` (see
`app/platform/auth/service.py`). Redis must be running for that to work.

Usage (run from the backend/ directory, in the backend virtualenv):

    python scripts/seed_demo_customer.py            # create if missing (idempotent)
    python scripts/seed_demo_customer.py --delete   # remove the demo account + its demo rows

Only rows whose phone number is exactly the DEMO number below are ever created
or deleted. Real user data is never touched.
"""
import argparse
import sys
from pathlib import Path

# Make the backend/ directory importable so `app.*` resolves no matter where
# this file is invoked from, without adding anything to the app package.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.platform.users.models import Address, User  # noqa: E402
from app.platform.auth.models import RefreshToken  # noqa: E402

# --- Clearly fake DEMO identity. Local development only. -------------------
# Full E.164 form, exactly matching what the login flow's
# _build_full_number("+92", "3000000001") produces, so the existing
# get_or_create_customer lookup finds this row.
DEMO_PHONE_NUMBER = "+923000000001"
DEMO_COUNTRY_CODE = "+92"
DEMO_NAME = "Speedy Meals Demo Customer"
DEMO_EMAIL = "demo@speedymeals.local"
DEMO_ROLE = "customer"


def _find_demo_user(db):
    return db.query(User).filter(User.phone_number == DEMO_PHONE_NUMBER).first()


def create_demo_customer(db, out=print) -> None:
    existing = _find_demo_user(db)
    if existing is not None:
        out(
            f"DEMO customer already exists (id={existing.id}, "
            f"phone={existing.phone_number}). Nothing to do."
        )
        return

    user = User(
        phone_number=DEMO_PHONE_NUMBER,
        country_code=DEMO_COUNTRY_CODE,
        name=DEMO_NAME,
        email=DEMO_EMAIL,
        wallet_balance=0,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    out(
        f"Created DEMO customer id={user.id} phone={user.phone_number} "
        f"email={user.email}"
    )


def delete_demo_customer(db, out=print) -> None:
    existing = _find_demo_user(db)
    if existing is None:
        out("No DEMO customer found; nothing to delete.")
        return

    # Only rows that belong to this exact demo user are removed.
    db.query(Address).filter(Address.user_id == existing.id).delete()
    db.query(RefreshToken).filter(
        RefreshToken.subject_id == existing.id, RefreshToken.role == DEMO_ROLE
    ).delete()
    db.delete(existing)
    db.commit()
    out("Removed DEMO customer and its demo addresses/tokens.")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="LOCAL DEVELOPMENT ONLY — create/remove one demo Customer."
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Remove the demo customer instead of creating it.",
    )
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        if args.delete:
            delete_demo_customer(db)
        else:
            create_demo_customer(db)
    except Exception as exc:  # noqa: BLE001 - dev tool: report and stop cleanly
        db.rollback()
        print(f"FAILED: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

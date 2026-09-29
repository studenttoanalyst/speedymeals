# Speedy Meals Demo Account

> **LOCAL DEVELOPMENT / DEMO ONLY.** This is a hand-run developer tool, not
> production behavior. It does not bypass or weaken authentication: signing in
> still requires the normal phone + OTP. No secrets are listed here.

**Role:** Customer
**Name:** Speedy Meals Demo Customer
**Phone:** `+923000000001` (national form to type in the app: `3000000001`)
**Email:** `demo@speedymeals.local`

---

## Authentication method

Existing **phone + OTP** only (there is no password anywhere for customers).
No auth bypass, no permanent token, no disabled OTP/JWT.

This project already has a safe development OTP mechanism: the backend prints the
6-digit code to the **uvicorn console** as
`[OTP-CONSOLE] Sending OTP <code> to <number>`
(see `backend/app/platform/auth/service.py`). Redis must be running for the OTP
store/verify to work. That is the mechanism to use — nothing new was invented.

---

## How to start backend

Prerequisites (see `AUTH_DATABASE_FIX_REPORT.md` for current status): Python 3.12
virtualenv with `requirements.txt` installed, working PostgreSQL credentials, and
Redis running.

```bash
# 1) Redis must be running on localhost:6379  (start your Redis server / service)

# 2) From the backend directory, with the venv active:
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

Confirm the API is up (expect `{"status":"ok"}`): `http://127.0.0.1:8000/health`

---

## How to access the account

```bash
# From backend/, venv active — creates the demo customer if missing (idempotent):
python scripts/seed_demo_customer.py
```

Then, in the Flutter app:

1. Open **Customer Login** and enter `3000000001`, tap Continue.
2. Watch the **uvicorn console** and read the `[OTP-CONSOLE] Sending OTP ...` line.
3. Enter that 6-digit code and verify. You land on the Customer home.

Notes:
- The demo script `backend/scripts/seed_demo_customer.py` creates the `users` row
  with the demo name/email. Without it, the OTP flow still find-or-creates the
  customer but with the placeholder name `New User`.
- The script never runs on application startup (it lives outside the `app`
  package and is not imported by `app.main`).

---

## How to remove the demo account

```bash
# From backend/, venv active:
python scripts/seed_demo_customer.py --delete
```

This deletes **only** the row whose phone number is exactly `+923000000001`, plus
that user's demo addresses/refresh tokens. No other data is touched.

---

## What data was created

**Intended (by the seed script):** exactly one row in the existing `users` table:

| Table | Column | Value |
|-------|--------|-------|
| `users` | `phone_number` | `+923000000001` |
| `users` | `name` | `Speedy Meals Demo Customer` |
| `users` | `email` | `demo@speedymeals.local` |
| `users` | `country_code` | `+92` |
| `users` | `wallet_balance` | `0` |
| `users` | `is_active` | `true` |
| `users` | `role` column | *(none — customers have no role column; role lives in the JWT)* |

No addresses, orders, wallet transactions, refresh tokens, restaurants, or menu
data are created. `created_at`/`updated_at` are set automatically by the model.

**Actually created so far: NOT VERIFIED — nothing was created.** The seed could not
run because the local backend environment is unavailable (`sqlalchemy` and the
other dependencies are not installed; Python 3.12 is missing; PostgreSQL
credentials fail; Redis is not running). See "Remaining blocker" below.

### Minimum extra data needed to open the internal Customer UI

| Screen | Needs | Notes |
|--------|-------|-------|
| Login / home after login | The demo `users` row only | `GET /users/me` |
| Dashboard / restaurant browse | `restaurants` (+ `menu_items`) rows | If empty, the app shows its empty state; no crash |
| Profile → My Orders | `orders` rows | Empty is fine |
| Profile → Saved Addresses | `addresses` rows | Can be added from inside the app |
| Checkout | At least one address | Create it in the app |

No fake production-like restaurant/menu/order data was created. If you want to
browse real menus, seed restaurants through the normal (Admin/onboarding) path
rather than inventing data.

---

## Remaining blocker

The demo account is **NOT yet created or verified**. To finish, the developer must
manually:

1. Install **Python 3.12**, create `backend/app/.venv`, and `pip install -r requirements.txt`.
2. Fix the **PostgreSQL** credential for user/database `speedymeals` on `localhost:5432`.
3. Install and start **Redis** on `localhost:6379`.
4. Then run `alembic upgrade head`, start uvicorn, and run
   `python scripts/seed_demo_customer.py`; finally sign in via OTP as described above.

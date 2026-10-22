# QA Onboarding — SpeedyMeals

For: a QA engineer joining the project. Verified against `main` code on 2026-10-22.
Repo layout reference: [`docs/AGENT_MAP.md`](../AGENT_MAP.md). Paths below are relative to the repo root (`speedymeals/`).

> **The code is the source of truth.** Most other files in `docs/` (MVP spec, plans, audits) describe the vision and are often outdated. Never take fees, thresholds or flows from them. If this doc and the code disagree, the code wins: file a doc bug.
> Items marked **ask dev** could not be confirmed from code.

## 1. Product and roles

SpeedyMeals is a food-delivery platform for Pakistan (PKR, `+92` numbers). It has three apps on one backend:

| App | Tech | Users | Where |
|---|---|---|---|
| Backend API | FastAPI, Python 3.11, Postgres (Supabase in prod), Redis | all | `backend/` → `api.speedymealservices.com` |
| Website | Next.js, Bun (hosted on Vercel) | **Admin** portal `/admin/*`, **Restaurant** portal `/restaurant/*`, public pages | `website/` |
| Mobile app | Flutter (Android first) | **Customer** and **Rider** | `mobile_app/` |

| Role | Logs in with | Main jobs |
|---|---|---|
| Customer | Phone + OTP (`/auth/otp/request`, `/auth/otp/verify`) | Browse, cart, checkout (COD), track, rate, reorder, delete account |
| Rider | Phone + OTP (`/auth/rider/register`, `/auth/rider/login/otp-verify`) | Go online, accept or reject offers, deliver, wallet, cash deposit, KYC docs |
| Restaurant | Email + password (`/auth/restaurant/login`) or OTP | Menu, accept, prepare and reject orders, profile, metrics, settlements |
| Admin | Email + password (`/auth/admin/login`) | Approve riders and kits, manage restaurants, cancel and reassign orders, settlements, payouts, cash approvals, roles |

OTP rules (`backend/app/platform/auth/service.py:37-38`): the code is valid for **5 min** and there is a **45 s** resend cooldown.

## 2. Environments and running locally

| Env | Backend | Website | DB |
|---|---|---|---|
| Production | `https://api.speedymealservices.com` (Lightsail, Docker) | Vercel | Supabase Postgres |
| Staging | **none exists** | Vercel previews (**ask dev** which backend they call) | **none** |
| Local | `localhost:8000` | `localhost:3000` | your own Postgres |

### ⚠️ Rule zero: never point local tools at the production database
`backend/app/.env` on dev machines can hold the **production** Supabase `DATABASE_URL`. The backend container runs `alembic upgrade head` on start (`backend/Dockerfile`), and the tests write to whatever DB is configured (`backend/app/tests/conftest.py`). A local migration once took production down for about 2 days (AGENT_MAP §6 #1). Before you run anything, check that `DATABASE_URL` points at a local DB.

### Backend (Docker)
`backend/docker-compose.yml` defines `api`, `db` (postgres:15, user/pass/db `speedymeals`) and `redis` (redis:7). The `api` service loads `app/.env`.
```bash
cd backend
cp app/.env.example app/.env       # .env.example is missing ~15 vars; ask dev for a complete local .env
# in app/.env set at least:
#   DATABASE_URL=postgresql://speedymeals:speedymeals@db:5432/speedymeals
#   REDIS_URL=redis://redis:6379/0
#   SMS_MODE=console        (OTP is printed in the API log instead of sent)
#   JWT_SECRET=<anything>   GOOGLE_MAPS_API_KEY=<dev key or dummy>  AWS_* (dummy ok unless testing uploads)
docker compose up --build
docker compose logs -f api         # OTP codes appear here in console mode
curl localhost:8000/health         # {"status":"ok"}
```
With a dummy Maps key, checkout distance falls back to straight-line (Haversine) distance, so fees will differ slightly from prod (`service.py` `_build_checkout_context`).

### Website
```bash
cd website
bun install
cp .env.example .env.local        # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
bun run dev                        # http://localhost:3000/admin , /restaurant
```
`NEXT_PUBLIC_USE_MOCKS=true` makes the API client return mock data (`lib/api/client.ts`). Keep it **false** for real testing.

### Mobile
```bash
cd mobile_app
flutter run                                                        # emulator → http://10.0.2.2:8000
flutter run --dart-define=API_BASE_URL=http://<your-LAN-IP>:8000   # physical device
```
Release builds **require** `--dart-define=API_BASE_URL=...` or they throw (`lib/core/config/api_config.dart`). Which URL the official release APK uses: **ask dev** (AGENT_MAP §7 Q3).

## 3. Test data and seeding

On every backend start, `seed_bootstrap_data` (`backend/app/main.py:162`) runs:

| Seed | Credentials | Condition |
|---|---|---|
| First admin (Superadmin role) | `FIRST_ADMIN_EMAIL` (default `admin@speedymealservices.com`) / `FIRST_ADMIN_PASSWORD` (default `admin123`) | Created only if **no** admin exists. If one exists, its email domain and role are rewritten on each start (`platform/auth/service.py:557`). |
| Demo restaurant "Karachi Biryani House" + menu items | `karachibiryani@speedymeals.com` / `Partner@123` | Only when `ENVIRONMENT=development`, which is the default (`platform/auth/service.py:596`) |

Note: the website currently **auto-logs in** with these hardcoded credentials (`website/lib/api/client.ts:148,177`). This is known and accepted for test data only.

Everything else you create by hand. There is **no seed script** for customers, riders or orders (**ask dev** whether one is wanted):
- **Customer:** OTP login with any `+92` number; read the code from the API log.
- **Rider ready to deliver:**
  1. Register by OTP.
  2. Admin approves the rider: `PATCH /admin/riders/{id}/approval`.
  3. Admin records the kit: `PATCH /admin/riders/{id}/kit` (sets `kit_completed`).
  4. Rider goes online: `PATCH /wallet/status`.
  5. The app sends location pings: `PATCH /wallet/location`. A location expires after **45 s**, and a rider without a fresh location is **not eligible** (`wallet_payment/service.py:79,434`).
- **Restaurant:** created by admin (`POST /admin/restaurants`). It needs lat/lng, or checkout returns 400 "Restaurant location is not configured".

## 4. Order lifecycle

State machine: `ORDER_STATUS_TRANSITIONS` (`backend/app/modules/food_delivery/service.py:567`). Each call moves **one step**. Anything else returns `400 Cannot transition order from 'X' to 'Y'`.

```
(checkout) ─▶ Accepted ─▶ Preparing ─▶ Ready for Pickup ─▶ Rider Assigned ─▶ Accepted by Rider
                 │            │              │                  │  ▲
                 ▼            ▼              ▼                  ▼  │ (re-dispatch)
             Cancelled    Cancelled      Cancelled            Rejected
Accepted by Rider ─▶ Arrived at Restaurant ─▶ Picked Up ─▶ On the Way ─▶ Delivered
Admin: Cancel from any status except Delivered/Cancelled. Reassign from any non-terminal status.
```

| # | Transition | Triggered by | Endpoint | Side effects / rules |
|---|---|---|---|---|
| 1 | cart → **Accepted** | Customer | `POST /restaurants/{id}/cart/checkout` (header `Idempotency-Key`: UUID) | Repriced from DB; money values frozen on the order; cart cleared only after commit. `Digital` → 400 while online payments are off. If `expected_total` is sent and the price changed → **409**. Same key replays the response for 24 h. |
| 2 | Accepted → **Cancelled** | Restaurant (reject with reason) | `POST /restaurants/me/orders/{id}/reject` | Only from `Accepted`; `cancelled_by=restaurant` |
| 3 | Accepted → **Preparing** → **Ready for Pickup** | Restaurant | `PATCH /restaurants/me/orders/{id}/status` | — |
| 4 | Ready for Pickup → **Rider Assigned** | System (automatic) | same call as #3 | Nearest eligible rider: approved, active, online, fresh location, and for COD under the cash cap. If none is found, the order **stays** in Ready for Pickup and the sweeper retries. |
| 5 | Rider Assigned → **Accepted by Rider** / **Rejected** | Rider | `POST /wallet/assignments/{id}/respond` (`accept`/`reject`) | Reject → re-dispatch to the next rider; a rider who rejected never gets the same order again |
| 6 | Rider Assigned → offer expires | System (sweeper) | — | Timeout `RIDER_ASSIGNMENT_TIMEOUT_SECONDS` (default **60**); the offer moves to the next rider |
| 7 | → Arrived → Picked Up → On the Way → **Delivered** | Rider | `PATCH /wallet/deliveries/{id}/status/{arrived,picked-up,on-the-way,delivered}` | On Delivered: rider wallet +90% of the delivery fee; COD adds `total_amount` to `pending_cash_owed` (see §5) |
| 8 | any non-terminal → **Cancelled** | Admin | `POST /admin/orders/{id}/cancel` | `cancelled_by=admin` |
| 9 | reassign | Admin | `PATCH /admin/orders/{id}/reassign` | Skips the online/location checks; the rider must be approved and active |
| — | rate / reorder | Customer | `POST /orders/{id}/rating`, `/reorder` | Rating allowed only when Delivered, **once**, with at least one of restaurant or rider rating |

**There is no customer cancel endpoint.** Expected behaviour: **ask dev**.
**Known defect (AGENT_MAP §6 #4):** the restaurant status endpoint uses the same transition table, so a restaurant can push an order to `Rider Assigned` without a rider, or walk it to `Delivered` and skip the wallet and COD side effects. Test this as a negative case (§7).

## 5. Money rules (all from code)

| Rule | Value | Source |
|---|---|---|
| Delivery fee | `100 + 25 × km` (route km rounded to 2 dp; **no cap**) | `food_delivery/service.py:1520-1534` |
| Platform fee | flat **Rs 15** per order, not stored on the order (already inside `total_amount`) | `service.py:1527` |
| GST | per restaurant `gst_rate` (0–30%) on **food only**. Inclusive: tax is carved out of the menu price. Exclusive: tax is added on top. Rounding is ROUND_HALF_UP to paisa. | `food_delivery/tax.py` |
| Customer total | `food_total (after GST) + delivery_fee + 15` | `service.py:1637` |
| Commission | `net (ex-GST) food × restaurant.commission_rate%` (default 10) | `service.py:1130,1795` |
| Restaurant payable | `net − commission + GST` | `service.py:1796` |
| Rider earning | `delivery_fee × 0.90` (platform keeps 10%), credited to the wallet **on Delivered**, for COD and Digital alike | `wallet_payment/service.py:56,142` |
| COD cash owed | on Delivered (COD): `pending_cash_owed += total_amount` | `service.py:1071` |
| COD cap | `CASH_COLLECTION_CAP` = **5000**. At or above it the rider is forced offline, can't go online, and is skipped for COD offers (Digital offers are still allowed). | `config.py:113`, `wallet_payment/service.py:131,187`, `service.py:643` |
| Cash deposit | Rider submits; `expected_amount` is computed by the server (COD totals since the last deposit); discrepancy = submitted − expected. **Only admin approval** lowers `pending_cash_owed` (floored at 0); approving twice → 400. Methods: `bank_transfer`, `mobile_wallet`, `hub`. | `wallet_payment/service.py:212-300` |
| Go online | needs `kit_completed` **and** cash owed under the cap. **No minimum wallet balance.** | `wallet_payment/service.py:131` |
| Wallet recharge | `POST /wallet/recharge`: any positive amount, credited **instantly, with no payment check** (methods `bank_transfer`, `jazzcash`, `easypaisa`, `card`) | `wallet_payment/service.py:97` |
| Online payment | `Digital` is rejected (400) unless `ONLINE_PAYMENTS_ENABLED` (default **false**) | `config.py:128`, `service.py:1757` |

### Worked examples
Computed by running the real functions (`calculate_gst`, `calculate_delivery_fee`, `calculate_commission`). Commission is 10% unless noted.

| Case | Food (menu) | GST | km | GST amt | Food total | Delivery fee | **Customer total** | Commission | Restaurant payable | Rider earning | Platform keeps of fee |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A: exclusive | 1000 | 16% excl | 4.2 | 160.00 | 1160.00 | 205.00 | **1380.00** | 100.00 | 1060.00 | 184.50 | 20.50 |
| B: inclusive | 1160 | 16% incl | 4.2 | 160.00 | 1160.00 | 205.00 | **1380.00** | 100.00 | 1060.00 | 184.50 | 20.50 |
| C: no GST | 500 | 0% | 2.0 | 0.00 | 500.00 | 150.00 | **665.00** | 50.00 | 450.00 | 135.00 | 15.00 |
| D: long trip, 15% comm | 800 | 0% | 25.0 | 0.00 | 800.00 | 725.00 | **1540.00** | 120.00 | 680.00 | 652.50 | 72.50 |

Platform revenue for case A = commission 100 + 10% of fee 20.50 + platform fee 15 = **135.50**.

**COD cap example:** a rider has `pending_cash_owed` = 4500 and delivers case C (COD, 665). Cash owed becomes 5165 ≥ 5000, so the rider is forced offline in the same transaction. `PATCH /wallet/status` online → 400 "COD cash cap of Rs. 5000 reached". The rider submits a deposit of 5165. Expected = the sum of COD totals since their last deposit. Admin approves → cash owed is 0 and the rider can go online again.

## 6. Automated tests

| Suite | Location | How to run | Runs in CI? |
|---|---|---|---|
| Backend (pytest) | `backend/app/tests/` (30 test files) | `cd backend && python -m pytest app/tests -q` | **No.** CI only deploys (`.github/workflows/deploy-backend.yaml`) |
| Mobile (flutter test) | `mobile_app/test/` (12 files) | `cd mobile_app && flutter test` | No |
| Website | **no tests**; only `bun run lint` and `bun run typecheck` | — | No (Vercel build only) |

**Backend tests need a real Postgres.** Every test runs in a rolled-back transaction against `DATABASE_URL` (SQLite can't be used because of the UUID types). Point it at a **local** DB only (see Rule zero).

Backend files (test-function counts from source):

| File | # | Covers |
|---|---|---|
| test_account_deletion | 38 | In-app and web deletion, rider grace period, admin review |
| test_admin | 50 | Dashboard, restaurant/rider/order management, settlements |
| test_assignment_timeout | 11 | Offer timeout sweeper, restaurant reject |
| test_auth / test_auth_refresh | 21 / 6 | OTP, logins, logout, refresh rotation |
| test_rbac_and_password_reset | 4 | Admin RBAC, staff provisioning, forgot password |
| test_cart / test_checkout | 24 / 46 | Redis multi-cart; checkout preview, fees, idempotency, placement |
| test_gst | 13 | Inclusive/exclusive GST math and totals |
| test_food_delivery | 18 | Menu CRUD, restaurant status machine, commission |
| test_restaurant_browse | 21 | Customer browse and menu |
| test_rider_assignment / test_rider_accept_reject | 12 / 14 | Nearest-rider dispatch; accept, reject and re-dispatch |
| test_delivery_status / test_delivered_side_effects | 17 / 11 | Delivery steps; wallet credit and COD accrual on Delivered |
| test_delivery_payouts / test_wallet_money_math / test_wallet_payment | 12 / 13 / 23 | 90/10 split, platform fee, COD ledger, cap, deposits |
| test_location / test_rider_location | 25 / 26 | Location endpoints, rider location TTL |
| test_rider_documents | 12 | KYC upload (JPG/PNG, ≤5 MB) |
| test_order_tracking / test_websocket_track_auth | 23 / 4 | Tracking REST and WebSocket auth (close 4003) |
| test_order_history_rating | 11 | History, reorder, rating |
| test_order_lifecycle_e2e | 2 | Full checkout → delivered flow |
| test_notification / test_sms_client | 21 / 19 | FCM device registry and push; SendPK and console SMS |
| test_cors / test_security_headers / test_migration_drift | 5 / 3 / 1 | CORS, headers, models vs Alembic |

Mobile files: `account_deletion_test` (18), `critical_flows_test` (6), `location_disclosure_test` (4), `online_payments_flag_test` (4), `phase2_release_test` (6), `widget_test` (1), and `maps_m1`–`m5` plus `maps_backend_integration` (101 in total).

**Last actual run (2026-10-22, during onboarding prep): 511 tests collected → 84 passed, 426 errors, 1 failed (158 s).** Run with `DATABASE_URL` deliberately pointed at an unreachable host so no shared or production DB could be touched. All 427 non-passes are `OperationalError: could not translate host name` (no DB), including the 1 "failed" (`test_migration_drift`). **No assertion failures** were seen, but the DB-backed 427 have **not** been run against a real DB. That needs a local or CI Postgres (§11). Mobile `flutter test`: **not run** (Flutter wasn't installed on the prep machine). Ask dev for the last green run.

## 7. Manual test matrix

P = positive, N = negative, S = security/permission. Expected HTTP codes come from code.

### Customer (mobile)
| ID | Type | Case | Expected |
|---|---|---|---|
| C1 | P | OTP login, new number | User created, lands on home |
| C2 | N | Wrong or expired OTP (>5 min) | Error, no login |
| C3 | N | Resend OTP within 45 s | 4xx "Please wait N seconds" |
| C4 | P | Add address (map pin), browse, add items, preview | Fees match §5 formula |
| C5 | P | Place COD order | Status `Accepted`, cart cleared, one order only |
| C6 | N | Double-tap Place order (same Idempotency-Key) | One order; replayed response |
| C7 | N | Restaurant changes a price between preview and place | 409 "Order total has changed" |
| C8 | N | Item marked sold out / deleted while in cart | 400 sold-out / no longer on menu |
| C9 | N | Pay Online | Option hidden; API returns 400 if forced |
| C10 | S | Use another customer's `address_id` or `order_id` | 404 (not 403, no data leak) |
| C11 | P | Track: steps advance, rider marker shows; socket down → polling | — |
| C12 | S | WebSocket with a bad or other user's token | `auth_failed`, close 4003 |
| C13 | P/N | Rate after Delivered; rate before Delivered; rate twice; empty rating | 200 / 400 / 400 / 400 |
| C14 | P | Reorder | Cart refilled |
| C15 | P/N | Delete account; with an active order | 204 and signed out / 409 |
| C16 | N | Airplane mode on cart, checkout, tracking | Friendly error, no infinite spinner |

### Rider (mobile)
| ID | Type | Case | Expected |
|---|---|---|---|
| R1 | P | Register by OTP | Pending approval banner |
| R2 | N | Go online before kit completed | 400 "Kit deposit and handover must be completed" |
| R3 | N | Go online with cash owed ≥ 5000 | 400 COD cash cap |
| R4 | P | Online with fresh location → order Ready for Pickup | Offer received |
| R5 | N | Location stale >45 s or offline | Not offered |
| R6 | P | Reject offer | Goes to the next rider; never re-offered to you |
| R7 | P | Ignore offer for 60 s | Offer expires, moves on |
| R8 | N | Skip a step (e.g. Accepted → Delivered) or repeat Delivered | 400 transition error; wallet credited once |
| R9 | S | Act on an order assigned to another rider | 404 |
| R10 | P | Deliver COD order | Wallet +90% of fee; cash owed += total |
| R11 | P | Submit cash deposit | Expected amount computed by server; owed unchanged until admin approves |
| R12 | P/N | KYC upload: JPG/PNG ≤ 5 MB; PDF or >5 MB | 200 / clear 4xx message |
| R13 | P | Screen off during delivery | Customer map keeps updating; foreground notification shown |
| R14 | P | Request account deletion, then cancel | Grace date shown (7 days); cancel works |

### Restaurant (website `/restaurant`)
| ID | Type | Case | Expected |
|---|---|---|---|
| T1 | P | Login; menu CRUD; toggle availability; photo upload (JPG/PNG ≤ 5 MB) | Saved |
| T2 | P | Accepted → Preparing → Ready for Pickup | Auto-assigns a rider if one is eligible |
| T3 | N | Skip (Accepted → Ready for Pickup) or go backwards | 400 |
| T4 | P/N | Reject an `Accepted` order; reject a `Preparing` one | Cancelled / 400 |
| T5 | S | Open or patch another restaurant's order by ID | 404 |
| T6 | S | **Known defect:** PATCH status `Rider Assigned` or walk to `Delivered` | Currently allowed; log it, should be 400 |
| T7 | S | Login to a suspended restaurant (admin set status) | **Currently succeeds** (login ignores status). Expected behaviour: **ask dev** |
| T8 | P | Change GST mode or rate, then a customer checks out | New totals (§5 A/B) |
| T9 | P | Metrics and settlements pages match DB order values | — |

### Admin (website `/admin`)
| ID | Type | Case | Expected |
|---|---|---|---|
| A1 | P | Seed admin login; change initial password flow | — |
| A2 | P | Approve rider; record kit | Rider can go online |
| A3 | P/N | Cancel an order in progress; cancel a Delivered or Cancelled one | Cancelled, customer notified / 400 |
| A4 | P/N | Reassign to an approved rider; to an unapproved one; on a terminal order | OK / 400 / 400 |
| A5 | P/N | Approve cash deposit; approve again | Owed reduced (floor 0) / 400 "already verified" |
| A6 | P | Generate settlements and rider payouts, mark paid | Only the status flips; no money moves |
| A7 | S | Staff admin without `riders.commission.edit` edits rider commission | 403 |
| A8 | S | Staff admin with **no** permissions hits other `/admin/*` routes | Currently allowed (only role is checked). Log the intended RBAC: **ask dev** |
| A9 | S | Customer or rider token on `/admin/*`; no token | 403 / 401 |
| A10 | S | Token refresh, then a permission-gated action | Refresh drops `permissions`, so the action works only via the DB re-check. Verify. |
| A11 | P | Suspend a customer | Customer requests rejected (`is_active` check) |
| A12 | P | Promotions | Stored in memory only and **lost on restart** |

## 8. Known gaps (don't file as new bugs; link to these)

1. **Digital payment is a stub.** `Digital` is disabled by `ONLINE_PAYMENTS_ENABLED=false`, and no gateway exists.
2. **SMS:** `SMS_MODE=console` is the default and prints the OTP to the log. Production uses `sendpk`. **Ask dev** for a test number policy in prod.
3. **Wallet recharge gives free money:** any amount is credited instantly (`wallet_payment/service.py:97`).
4. **Payout rails:** `mark-paid` only flips a status. Riders may be paid twice (wallet credit plus a payout record). Open question, AGENT_MAP §7 Q1.
5. **Restaurant can drive rider states** (T6). Login ignores restaurant status (T7). Most admin routes are role-gated, not permission-gated (A8). Refresh drops admin claims (A10).
6. **No frontend CI and no website tests.** Backend tests don't run in CI. Deploy has no health check or rollback.
7. **No staging environment;** tests and migrations run against whatever `DATABASE_URL` is set.
8. **No `/delete-account` web page on `main`**, while the app links to it: 404, a Play Store risk (AGENT_MAP §5 #9).
9. **No customer-side cancel.** **No delivery-distance cap.** Opening hours enforcement at checkout: **ask dev**.
10. Promotions are in memory only. `logistics`, `medicine` and `ride_hailing` modules are empty stubs.
11. Push notifications: the FCM key is verified with a dry run only; end-to-end delivery to a device is **untested**.

## 9. Bug report template

```
Title: [Area][Role] short symptom — e.g. [Checkout][Customer] total off by Rs 15 when GST inclusive
Env: local / prod   Build: app versionCode | website commit | backend commit (GET /health ok?)
Account: role + id/phone/email (test data only, never real customer data)
Order id(s):
Preconditions: (rider online? COD? GST mode/rate? distance?)
Steps:
1.
2.
Expected: (cite the rule — e.g. QA_ONBOARDING §5 / file:line)
Actual: (include HTTP status + response body)
Evidence: screenshot/video, API log lines (`docker compose logs api`), `adb logcat` for mobile
Severity: Blocker / Critical (money, security, data) / Major / Minor
Frequency: always / intermittent (x of y)
Known gap? link §8 item if related
```

## 10. Release smoke test
Mobile release checklist (real device, signed release build): [`docs/release-smoke-test.md`](../release-smoke-test.md). Any failing row blocks Play submission.
Add these for backend and website releases:
- `GET /health` returns 200.
- Admin login works.
- Run one COD order end to end (cases C5 → T2 → R10 → A5).
- Totals match §5.

## 11. What QA needs from devs
- A **separate dev or staging database and backend** so QA never touches prod. This blocks safe testing.
- A complete local `backend/app/.env` template (the `.env.example` is missing about 15 vars) and a seed script for riders, customers and orders.
- Decisions on the "ask dev" items: customer cancel, opening hours, suspended-restaurant login, intended admin RBAC, rider double pay, wallet recharge policy, prod OTP test numbers.
- The exact release build command and `API_BASE_URL` for each APK; build numbers in release notes.
- Backend tests wired into CI (against a throwaway Postgres), plus website lint and typecheck in CI.
- A heads-up on any change to fees, GST, the commission formula or the status machine, so §5 and §7 stay current.

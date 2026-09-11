# SpeedyMeals Backend — Development Plan

Repo state: Phase 0 ✅ done. Phase 1 ✅ done. Phase 2 ✅ done (all 13 steps, see below). Phase 3 ✅ done (Step 0-9, 2 tests deferred pending Phase 5 — see below). Phase 4 ✅ done (all 8 steps, see below). Structure below builds on top, step by step, no jump ahead.

Stack lock: Python + FastAPI, PostgreSQL, Alembic, Redis, AWS S3, JWT auth, Google Maps Distance Matrix.

Tag meaning:
- **NOW** = build this phase, MVP scope (spec Sec 13).
- **PREPARE** = folder/interface ready, no full logic yet.
- **LATER** = skip, excluded MVP (spec Sec 14).

---

## Phase 0 — Environment & Project Setup (NOW) ✅ DONE

Goal: repo runnable, empty but alive.

Tasks:
- `requirements.txt`: fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, pydantic, python-jose (JWT), passlib[bcrypt], redis, boto3 (S3), httpx (Google Maps call), python-dotenv, pytest.
- `.env.example`: DB_URL, JWT_SECRET, JWT_EXPIRE_MIN, REDIS_URL, AWS_ACCESS_KEY, AWS_SECRET_KEY, S3_BUCKET, GOOGLE_MAPS_API_KEY, SMS_PROVIDER_MODE, SMS_API_KEY, FIRST_ADMIN_EMAIL, FIRST_ADMIN_PASSWORD.
- `.gitignore`: `.env`, `__pycache__`, `.venv`.
- `app/core/config.py`: Pydantic Settings, load `.env` (resolved relative to the file's own folder, not the launch CWD — fixes a real bug hit during Phase 2 testing).
- `app/core/database.py`: SQLAlchemy engine + session, `get_db()` dependency.
- `app/core/redis_client.py`: shared Redis connection, same pattern as `get_db()`.
- `app/main.py`: FastAPI app init, health check route `GET /health`.
- Docker: `Dockerfile` + `docker-compose.yml` (api + postgres + redis).

Exit check: `docker-compose up` → `GET /health` return 200. ✅ Confirmed.

---

## Phase 1 — Database Schema & Migrations (NOW) ✅ DONE

Goal: full DB structure match `docs/schema.jpeg` (the locked, approved ERD), before any endpoint logic.

**Authoritative source for table design: `docs/schema.jpeg`** — not a guess derived from the spec doc alone. Spec doc (Sec 12) gives the business intent; schema.jpeg is the actual finalized column-level design. Where the two agree (they do, on every money/business field), no conflict. Where schema.jpeg has more detail (UUID ids, extra tables like `addresses` and `ratings`, selective `updated_at`), schema.jpeg wins.

Tasks:
- Alembic init (`alembic init migrations`). ✅ done.
- Base model (`app/core/base_model.py`) — matches schema.jpeg exactly:
  - `id`: UUID on every table (not integer — corrected after schema.jpeg review).
  - `created_at`: on every table.
  - `updated_at`: NOT automatic on every table — only mixed in via `UpdatedAtMixin` on tables that have it in schema.jpeg (`users`, `riders`, `restaurants`, `orders`).
- Tables (13 total, per schema.jpeg, one model file per module):
  - `admins` — email (unique), password_hash, role, is_active.
  - `users` — phone_number (unique), name, email, wallet_balance, country_code, is_active.
  - `addresses` — user_id FK, label, latitude, longitude, full_address, is_default.
  - `riders` — phone_number (unique), cnic_number (unique), vehicle info, doc photo URLs, approval_status, wallet_balance, pending_cash_owed, is_online, current_latitude/longitude.
  - `restaurants` — email (unique), password_hash, phone_number, address, lat/long, commission_rate default 10.00, logo/cover URLs, opening/closing time, status.
  - `menu_items` — restaurant_id FK, name, description, price, category, photo_url, variants (jsonb), is_available.
  - `orders` — user_id FK, restaurant_id FK, rider_id FK, delivery_address_id FK, status, payment_method, food_subtotal, delivery_distance_km, delivery_fee, total_amount, commission_amount, restaurant_payable, rider_earning, cancellation fields, placed_at, delivered_at.
  - `order_items` — order_id FK, menu_item_id FK, quantity, selected_variant, price_at_order.
  - `ratings` — order_id FK, user_id FK, restaurant_rating, rider_rating, comment.
  - `wallet_transactions` — rider_id FK, order_id FK, type, amount, balance_after.
  - `cash_deposits` — rider_id FK, amount_submitted, expected_amount, discrepancy, submission_method, verified_by_admin.
  - `settlements` — restaurant_id FK, period_start/end, total_sales, commission_deducted, net_payable, status, paid_at.
  - `rider_payouts` — rider_id FK, period_start/end, total_earning, status, paid_at.
- **No `carts` table.** Cart is temporary, pre-order state (customer still editing quantities/items) — lives in Redis (`cart:{customer_id}:{restaurant_id}`), not Postgres. It converts into a real `orders` + `order_items` row only at checkout. See Phase 5 note for detail — this keeps Postgres for finalized, permanent data only, and gives fast read/write for a state that changes constantly before checkout.
- **Decision: `created_at` kept on every table, including `orders`, `order_items`, `settlements`, `rider_payouts`** even though schema.jpeg's diagram doesn't draw it there (those 4 only show domain-specific timestamps like `placed_at`/`paid_at`). Treated as a harmless generic audit column, not a business field — flagged to and approved by project owner rather than silently added.
- Run migration, verify tables in Postgres.

Exit check: `alembic upgrade head` clean, all 13 tables exist matching schema.jpeg exactly (types, FKs, nullability), no drift. ✅ Confirmed.

---

## Phase 2 — Auth & Users (NOW) ✅ DONE

Folder: `app/platform/auth`, `app/platform/users`.

### Step-by-step breakdown (build order, do not skip ahead):

- [x] **Step 1 — Auth Schemas** (`schemas.py`): `OTPRequestSchema`, `OTPVerifySchema`, request/response contracts fixed before any logic.
- [x] **Step 2 — OTP Generate + Console Sender** (`service.py`): 6-digit OTP, stored in Redis (5 min expiry).
  - SMS provider: **not yet decided** (see ADR-001). Dev/test uses console/log-mode sender (OTP printed to server log, no real SMS sent, zero cost). SMS-sending isolated behind a single function (`_send_otp_via_console`) so swapping in a real Pakistani provider later is a one-file change, not a rewrite.
- [x] **Step 3 — OTP Verify Endpoint**: matches submitted code against Redis, one-time use (deleted on success).
- [x] **Step 4 — OTP Resend Cooldown**: 45 sec enforced server-side (not just a disabled frontend button) before a new OTP can be requested for the same phone.
- [x] **Step 5 — JWT Access + Refresh Token**: on successful OTP verify, find-or-create the `User` row, issue short-lived access token (~30 min) + long-lived refresh token (30 days).
- [x] **Step 6 — Refresh Token Tracking (`refresh_tokens` table) + Logout**: every issued refresh token stored as a SHA-256 hash with `valid`/`revoked` status. Logout sets it `revoked`. Reusing a revoked refresh token is rejected. (Without this, logout would not actually invalidate a session — token still works until natural JWT expiry.)
- [x] **Step 7 — Role-Based Access Control** (`get_current_user`, `require_role([...])`): decode JWT, attach user, reject 401/403 — enforced at API layer, not frontend hide. Confirmed in `app/platform/auth/dependencies.py`.
- [x] **Step 8 — Rate Limiting**: Redis counter, max 5 attempts/min per phone/email on OTP + login endpoints. Confirmed in `app/core/rate_limiter.py`, wired into all OTP/login routes.
- [x] **Step 9 — Restaurant Login**: email+password (bcrypt) OR phone+OTP (spec Sec 9 Step 2), reusing Step 1-4's OTP mechanism. Restaurant accounts are created by Admin during manual onboarding (spec Sec 9 Step 1) — no restaurant self-signup in MVP. Confirmed: both `/auth/restaurant/login` and `/auth/restaurant/otp/verify` in `routes.py`.
- [x] **Step 10 — Admin Login + Auto-Seed**: first admin account **auto-seeded on app startup** (see ADR-002), not a manually-run script. On startup, check if any admin row exists; if none, create one from `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` env vars (password bcrypt-hashed before insert). No-op if an admin already exists. Then email+password login endpoint. Confirmed: `seed_first_admin` wired in `main.py` startup event, `/auth/admin/login` in `routes.py`.
- [x] **Step 11 — User Profile + Address Module**: profile get/update, saved addresses CRUD (Home/Work/Other, multiple) — needed before Phase 5 checkout. Confirmed: full CRUD in `app/platform/users/routes.py` (`/users/me`, `/users/me/addresses` GET/POST/PUT/DELETE), guarded by `require_role(["customer"])`.
- [x] **Step 12 — Password Reset (confirmation only, no code)**: customer/rider have no password (always re-auth via OTP) — reset concept doesn't apply. Restaurant/Admin: no self-serve reset endpoint in MVP; Admin resets credentials manually from Admin Panel (spec Sec 10 Step 3 already covers this). No code change needed — decision stands as-is.
- [x] **Step 13 — Manual Testing (Exit Check)**: all 4 roles login/logout via Postman/Swagger, rate limit fires, seed works on fresh DB. Confirmed done manually (no automated test in `app/tests/` yet — automated coverage is Phase 11 scope, not Phase 2).

Exit check: signup→OTP→login works all 4 roles (customer, rider, restaurant, admin) via Postman/Swagger; logout invalidates the refresh token (reuse attempt is rejected); 6th rapid OTP/login attempt is rate-limited; first admin exists automatically on a fresh database with no manual step. ✅ Confirmed.

**Related decision records:** `docs/decisions/ADR-001-otp-sms-provider.md`, `docs/decisions/ADR-002-first-admin-seed.md`.

---

## Phase 3 — Wallet & Payment Core (NOW) ✅ DONE

Folder: `app/platform/wallet_payment`.

### Step-by-step breakdown (build order, do not skip ahead):

- [x] **Step 0 — Rider Signup + OTP Verify (prerequisite, not in original task list)**: added in `app/platform/auth/` (`schemas.py`, `service.py`, `routes.py`), not `wallet_payment/`.
  - **Why**: repo check before Step 2 found rider signup/login was never built in Phase 2 (only customer OTP flow existed — rider path was left as "later step" per an old comment in `routes.py`). Without it, no real rider JWT token exists, so Step 2's `require_role(["rider"])` endpoints have no way to be tested end-to-end.
  - **What**: `POST /auth/rider/otp/verify` — reuses the same shared `POST /auth/otp/request` OTP mechanism as customer (Phase 2 Step 2-4). First-time phone + signup fields (name, cnic_number, vehicle_type, vehicle_registration) → creates `Rider` row, `approval_status="pending"`. Existing phone → plain login, signup fields ignored (no overwrite on repeat login).
  - Confirmed working: OTP request → rider verify → JWT issued → used to authorize Step 2 endpoints (manual test pass).

- [x] **Step 1 — Wallet Schemas** (`schemas.py`): `WalletRechargeRequestSchema` (amount, method), `WalletBalanceResponseSchema` (wallet_balance, pending_cash_owed, is_online), `WalletTransactionResponseSchema` (id, type, amount, balance_after, created_at). Contract fixed before any logic — same pattern as Phase 2 Step 1.

- [x] **Step 2 — Wallet Recharge Endpoint** (`service.py`, `routes.py`): `POST /wallet/recharge` (rider-only, manual entry MVP — amount + method validated against `{bank_transfer, jazzcash, easypaisa, card}`, no real gateway call yet — gateway stub is a later task, this only records + credits). Writes `WalletTransaction` type="recharge", updates `rider.wallet_balance`. Also added `GET /wallet/balance` here (not split into its own numbered step — both are trivial reads/writes on the same `Rider` row, and the balance endpoint was needed just to verify Step 2's recharge actually worked).
  - Confirmed working: recharge credits balance correctly, balance endpoint reflects it, invalid amount/method rejected with 400 (manual test pass).

- [x] **Step 3 — Min-Balance Check on Go-Online** (`schemas.py`, `service.py`, `routes.py`): `PATCH /wallet/status` body `{"is_online": bool}`. Going online rejected (400) if `wallet_balance < 500`; going offline always allowed, no balance check needed that direction.
  - Confirmed working: low-balance rider rejected with clear error, recharge then retry → 200 OK, `is_online: false` always passes (manual test pass).

- [x] **Step 4 — Auto-Force-Offline Below Min** (`service.py`, `_force_offline_if_below_min()` helper): shared helper called after any balance decrease (currently only Step 5's deduction). Not committed on its own — runs inside the same DB transaction as whatever caused the decrease, so it's atomic with it.
  - Confirmed working via Step 5's test: rider force-taken-offline the moment deduction drops balance below Rs. 500, no separate toggle call needed.

- [x] **Step 5 — Delivery Deduction Service** (`service.py`, `deduct_delivery_fee(db, rider_id, order_id)`): standalone function, no route (real trigger is order "Delivered" status change — Phase 6's job, not built yet). Deducts Rs. 10 flat, writes `WalletTransaction` type="deduction", calls Step 4's force-offline check same transaction.
  - Tested via a one-off manual script (`test_step5_deduction.py`, calls the function directly against a real rider row since no endpoint/order exists to trigger it through yet) — deduction amount correct, `WalletTransaction` row correct, force-offline fires when balance drops below Rs. 500 (manual test pass). Proper automated unit test is still Step 9's job — this was a manual sanity check only, not a substitute for it.

- [x] **Step 6 — Cash Deposit Endpoint** (`schemas.py`, `service.py`, `routes.py`): `POST /wallet/cash-deposit` — rider submits daily COD cash, server computes `expected_amount` (sum of COD `Delivered` orders since rider's last deposit — no "already reconciled" flag column exists on `orders`, time-window used instead, flagged in code comment), `discrepancy` = submitted − expected, stored on `cash_deposits`. On success, `pending_cash_owed` reduced by submitted amount (floored at 0).
  - Confirmed working: deposit recorded, `expected_amount=0` correctly (no orders exist yet — Phase 5 not built), `discrepancy` = full submitted amount as expected, `pending_cash_owed` reduced correctly (manual test pass).

- [x] **Step 7 — Cash Collection Cap Check** (`service.py` `can_assign_cod()`, `get_cod_eligibility()`; `routes.py` `GET /wallet/cod-eligibility`; `config.py` `CASH_COLLECTION_CAP` setting, default Rs. 10,000): reusable function for Phase 6's future assignment logic, exposed via a read endpoint here just so it's testable now.
  - Confirmed working: below cap → `can_accept_cod: true`; at/above cap → `can_accept_cod: false` (manual test pass, boundary value included).

- [x] **Step 8 — Rider Earnings View Endpoint** (`service.py` `get_rider_earnings_summary()`, `routes.py` `GET /wallet/earnings`): full 3-number view (Sec 8 Step 13) — `earnings_balance` (sum of `rider_earning` on Delivered orders since last `rider_payout`, same time-window pattern as Step 6, same reason), `wallet_balance`, `pending_cash_owed`.
  - Confirmed working: `earnings_balance=0` correctly (no orders yet), `wallet_balance`/`pending_cash_owed` reflect prior steps' state correctly (manual test pass).

- [x] **Step 9 — Unit Tests** (`app/tests/conftest.py`, `app/tests/test_wallet_payment.py`, `backend/pytest.ini`): 9 automated tests — recharge credits balance, invalid method rejected, go-online blocked below min / allowed above min, offline always allowed, deduction fires exactly once at correct amount, force-offline triggers below min / does not trigger when still above min, cash-cap true below / false at-or-above boundary. All 9 pass.
  - **Flagged gap, not silently skipped**: cash-deposit discrepancy calc and earnings-summary time-window logic (Step 6/8) are NOT covered by an automated test — both need real `orders` rows (payment_method, status, delivered_at, total_amount, rider_earning) to exercise properly, and Phase 5 (orders) doesn't exist yet. Faking a mock `Order` row now would test against invented data, not real integration. TODO left in `test_wallet_payment.py` to write these once Phase 5 lands — Phase 3 is not glossing over this, it's an explicit known gap.

Exit check: unit test — wallet deduction fires exactly once per delivery, blocks correctly at threshold. ✅ Confirmed (Step 9, `test_deduct_delivery_fee_fires_once_correct_amount`).

---

## Phase 4 — Restaurant Side: Menu & Orders Intake (NOW) ✅ DONE (all 8 steps)

Folder: `app/modules/food_delivery`.

### Step-by-step breakdown (build order, do not skip ahead):

- [x] **Step 1 — Menu Schemas** (`schemas.py`): `MenuItemCreate/Update/ResponseSchema` (price > 0 enforced), `MenuItemAvailabilitySchema`. Photo upload kept out of the JSON schemas — it's a separate multipart endpoint (Step 4), schemas only carry `photo_url` as a plain string set after upload.
- [x] **Step 2 — Menu CRUD** (`service.py`, `routes.py`): full CRUD under `/restaurants/me/menu-items` (GET/POST/PUT/DELETE), restaurant-only via `require_role(["restaurant"])`. Every mutation goes through `_get_owned_menu_item()` — the `restaurant_id` comes from the authenticated token, never the request body/path, and a non-owned id 404s (no existence leak).
- [x] **Step 3 — Availability Toggle**: `PATCH /restaurants/me/menu-items/{id}/availability` — dedicated sold-out toggle separate from full update.
- [x] **Step 4 — Menu Photo Upload (S3)**: `POST /restaurants/me/menu-items/{id}/photo` (multipart). New minimal abstraction `app/core/storage.py` — the only S3-touching module (boto3 client singleton, same pattern as `redis_client.py`). Menu photos are customer-facing → stored under the `menu-items/{restaurant_id}/{menu_item_id}.{ext}` prefix with public-read ACL, logically separated from private rider docs (CNIC/license/vehicle, reserved `rider-docs/` prefix, never public-read). Server-side validation: content-type + extension whitelist (JPG/JPEG/PNG), magic-byte check (client content-type not trusted), 5 MB cap enforced by reading only `MAX+1` bytes. S3 upload happens before any DB write — a failed upload leaves `photo_url` untouched; AWS errors surface as a clean 500.
- [x] **Step 5 — Restaurant Order Dashboard** (`service.py`, `routes.py`, separate `orders_router`): `GET /restaurants/me/orders` (this restaurant's orders only, enforced in the query WHERE clause; optional case-insensitive `?status=` filter and inclusive `?date_from=`/`?date_to=` range on `placed_at`) and `GET /restaurants/me/orders/{id}` (items with menu names, customer name, delivery address, payment method, totals, status — payment fields informational only, no processing). Ownership: `order.id == {id} AND order.restaurant_id == {current_user.id}` — another restaurant's order is indistinguishable from a missing one (404). No new models, no migration (all columns already exist from Phase 1).
- [x] **Step 6 — Order Status Transition** (`service.py`, `routes.py`): `PATCH /restaurants/me/orders/{id}/status`. State machine is a single transition map — `Accepted → Preparing → Ready for Pickup` — one step at a time; skips, backward moves, and arbitrary values get 400 **before any write** (DB verified unchanged after rejection). Ownership via `_get_owned_order()` (same WHERE-clause pattern as Step 5; another restaurant's order → 404). "Ready for Pickup" is the rider-assignment trigger point, but assignment itself is Phase 6 — this only updates the status. Note (flagged, not silently decided): orders arrive from Phase 5's checkout as "Accepted" — "Placed → Accepted" is not part of this step's machine; if Phase 5 seeds orders as "Placed", that transition gets added when the checkout lands.
- [x] **Step 7 — Commission Calculation Helper** (`service.py` `calculate_commission(food_subtotal, commission_rate)`): pure helper, NOT wired into order creation (Phase 5 checkout will call it and snapshot results into `orders.commission_amount` / `orders.restaurant_payable`). Formula: `commission = subtotal × rate/100`, `payable = subtotal − commission`. Money handled with `Decimal` (matches the Numeric DB columns, which SQLAlchemy returns as Decimal; inputs converted via `Decimal(str(x))` so float input can't carry binary expansion), quantized to paisa. Validation minimal + mathematically safe: subtotal > 0, rate in [0, 100] (above 100 would make payable negative) — raises `ValueError` (pure helper, not a route). Confirmed vs spec Sec 11: 1000@10% → 100/900, 2500@15% → 375/2125.
- [x] **Step 8 — Manual Testing / Exit Check**: full walk-through against real Postgres (rolled-back transaction) + real Redis: restaurant login via the real endpoint (bcrypt + rate limiter, wrong creds 401, token role verified), menu CRUD + availability toggle, photo upload (JPG/PNG/415/413 — S3 network call mocked at the boto3 boundary, see note), order dashboard + filters + ownership, status transitions (2 valid, 4 rejected with DB unchanged, cross-restaurant 404), commission examples. 35/35 API checks passed. Automated tests added: `app/tests/test_food_delivery.py` — 18 tests (commission math + edge cases, every transition direction, DB-unchanged-after-rejection, ownership), reusing the Phase 3 conftest `db_session` fixture; full suite 28/28 green.
  - **Note (not skipped silently)**: the S3 network call itself was NOT executed — `.env` holds placeholder AWS credentials (no real bucket). Verified instead: the real `upload_menu_photo` key/ACL/URL logic with the boto3 `put_object` boundary mocked, plus `photo_url` persistence. Real-bucket upload remains to verify once real AWS credentials are configured (Phase 10/12 scope).

Exit check: restaurant can add menu, receive test order, mark ready, commission number correct in DB. ✅ Confirmed — commission math verified via Step 7 helper + tests; full "receive test order → mark ready" walk-through done in Step 8 (test orders inserted directly, since Phase 5 checkout doesn't exist yet — the order-placement half of the exit check is fully exercisable once Phase 5 lands).

---

## Phase 5 — Customer Side: Browse, Cart, Checkout (NOW)

Folder: `app/modules/food_delivery`.

Tasks:
- Restaurant list (nearby/sort by distance+rating), search, filter.
- Menu view by restaurant.
- Multi-cart logic (Sec 7 Step 7): cart keyed by (customer_id, restaurant_id), independent tabs, no auto-clear.
  - **Storage: Redis, not Postgres.** Key pattern `cart:{customer_id}:{restaurant_id}`, value = JSON of items/quantities. Reason: cart is temporary, pre-order, changes on every tap (add/remove/qty change) — Redis gives fast read/write without churning Postgres rows. On "Place Order" (checkout step), cart contents are read from Redis, written once as real `orders` + `order_items` rows, then the Redis key is cleared. No `carts` table exists in schema.jpeg for this reason.
- Checkout: call Google Maps Distance Matrix (restaurant→customer address) → `delivery_distance_km` → fee = 50 + (km×20).
- Price breakdown response: food subtotal + delivery fee + total.
- Place order: create `orders` row + `order_items`, compute commission_amount, restaurant_payable (90%), rider_earning (100% delivery fee) — all snapshot at placement.
- Payment method select: COD or Digital (stub digital gateway call, mark "Paid — Digital" on success).

### Step-by-step breakdown (build order, do not skip ahead):

- [x] **Step 1 — Customer Restaurant Browse** (`service.py`, `routes.py`, `schemas.py`, `tests/test_restaurant_browse.py`): `GET /restaurants` (customer-only, `require_role(["customer"])`), on a new `customer_router` in the same module (no new module created).
  - Location mandatory (owner decision): resolved from the customer's OWN address — `?address_id=` (404 if not owned; IDOR-safe via `WHERE user_id == current_user`, same pattern as addresses), else default address, else most recent; 400 when no address exists. Arbitrary client lat/long is never accepted.
  - Active restaurants only (`status == "active"` — plain string column, no enum exists in the codebase) within radius (default 5 km, `0 < r <= 50`) of `restaurants.latitude/longitude`. Radius = SQL bounding-box prefilter + Python haversine — no PostGIS (stack lock; schema.jpeg stores plain Numeric coords). NULL-coordinate restaurants can never appear (can't be "nearby").
  - Name search (`?search=`, case-insensitive contains, reuses the Phase 4 `func.lower` pattern) + sort (`?sort=distance|rating`, anything else 422). Rating = `AVG(ratings.restaurant_rating)` joined through orders — `ratings` has NO `restaurant_id` column; `Order.restaurant_id` is the link. Unrated → null, sorts below rated, ties broken by distance.
  - Response carries public fields only (no email/password_hash/phone_number/commission_rate/status). **Cuisine filter deliberately skipped (owner decision)** — no cuisine column exists on `restaurants`; adding one would mean a migration, deferred rather than invented in this step.
  - Tests: 13 new automated tests — listing with distance, radius cut-off, inactive + NULL-coords exclusion, distance sort, rating sort (unrated last), case-insensitive search + no-match, no-address 400, other-customer's address 404, and route-level auth via TestClient (customer 200 with no internal fields leaked, missing token 403 [HTTPBearer's existing behavior on every endpoint], invalid token 401, wrong-role 403, invalid sort 422). Full suite 41/41 green (28 pre-existing untouched).
- [x] **Step 2 — Customer Menu View** (`service.py`, `routes.py`, `schemas.py`, `tests/test_restaurant_browse.py`): `GET /restaurants/{restaurant_id}/menu` (customer-only, same `customer_router` as Step 1), reusing the Phase 4 `menu_items` model — no new menu model.
  - Grouped response `[{category, items}, ...]` (owner decision), categories alphabetical, unnamed (`category=NULL`) items grouped last, items sorted name-within-category. Optional case-insensitive `?category=Starters` filter (same `func.lower` exact-match pattern as the Phase 4 order-status filter).
  - Sold-out items included but flagged `is_available=false` (owner decision: Foodpanda-style visibility).
  - Only ACTIVE restaurants resolve — pending/deactivated restaurant's menu is a 404, indistinguishable from unknown id (no-leak pattern).
  - Response is customer-facing fields only — no `restaurant_id` per item (implicit in the path), no management data.
  - Tests: 8 new automated tests — alphabetical grouping, NULL-category last, case-insensitive category filter, sold-out flagged not hidden, unknown + non-active restaurant 404, route flow with no-internal-leak check, missing token 403, wrong-role 403. Full suite 49/49 green (41 pre-existing untouched).
- [x] **Step 3 — Multi-Cart Foundation (Redis)** (`schemas.py`, `service.py`, `tests/test_cart.py`): storage primitives ONLY — no endpoints yet (Step 4), **no SQL carts table** (deliberate Phase 1 decision reaffirmed).
  - Schemas: `CartItemSchema` (item_id UUID, qty > 0, variant dict), `CartSchema` (restaurant_id, items[]) — the Pydantic contract IS the JSON structure stored in Redis (`model_dump_json` / `model_validate_json`).
  - Exact key structure `cart:{customer_id}:{restaurant_id}` via `_cart_key()` (same colon-delimited key convention as OTP/rate-limit keys), built on the ONE shared `core/redis_client.py` client — no second Redis implementation. Values are UUID **strings** (project is UUID-everywhere; integer example in the task doc doesn't match the locked ERD).
  - `save_cart` / `get_cart` / `delete_cart`: full-cart read-modify-write primitives for Step 4's add/update/remove/checkout. `save_cart` FORCES the payload's restaurant_id to the key's restaurant (payload can never hijack another restaurant's cart). 7-day TTL restarted on every write (active carts never die mid-edit, abandoned ones self-expire). Read of an absent key returns the empty-cart JSON shape, not an error (404 decision deferred to Step 4's endpoint semantics).
  - Tests: 7 new automated tests against the REAL Redis (unique uuid keys + explicit cleanup — Redis has no transaction rollback): key format, absent-read, JSON round-trip (exact structure), restaurant_id-hijack prevention, 7-day TTL, delete, qty validation. Full suite 56/56 green (49 pre-existing untouched).
- [x] **Step 4 — Cart CRUD Endpoints** (`routes.py`, `service.py`, `schemas.py`, `tests/test_cart.py`): five endpoints on `customer_router`, all customer-only, `customer_id` ALWAYS from the token (never body/path):
  - `GET /{restaurant_id}/cart` (view; absent = empty), `POST /{restaurant_id}/cart/items` (add; 201), `PATCH /{restaurant_id}/cart/items/{item_id}` (set qty), `DELETE /{restaurant_id}/cart/items/{item_id}` (remove line), `DELETE /{restaurant_id}/cart` (clear; 204).
  - Validation on every mutation, BEFORE any Redis write (rejected request never touches the cart): restaurant exists AND active (404, no-leak), item exists + belongs to THIS restaurant (404 in-WHERE, no-leak), item available (400 sold-out), qty >= 1 (422 at schema), variant guard (owner decision: minimal — variant on an item that defines none → 400; items WITH variants stored as-sent, full option validation deferred to checkout when the JSONB structure is locked).
  - Same item + same variant merges qty; same item + different variant = separate lines. Remove/clear do NOT availability-check (sold-out lines stay removable). Multi-cart independence is structural (key contains customer_id + restaurant_id): no auto-clear, no merging — verified by tests.
  - Tests: 17 new automated tests — add/view, merge, variant-separate-lines, unavailable 400 + cart untouched, wrong-restaurant item 404 + no pollution, unknown item/restaurant 404, variant-on-plain-item 400, update qty, update-not-in-cart 404, qty=0 schema rejection, remove line + remove-again 404, clear isolates other restaurant's cart, customer isolation on same restaurant, route auth (missing token 403 all 5 routes, wrong role 403, add end-to-end 201 + qty=0 → 422). Full suite 73/73 green (56 pre-existing untouched).

Exit check: place order both COD + Digital, DB row has correct snapshot math (match Sec 11 example).

---

## Phase 6 — Rider Side: Assignment & Delivery Flow (NOW)

Folder: `app/modules/food_delivery`, `app/platform/location`.

Tasks:
- Nearest-online-rider assignment on "Ready for Pickup" (simple radius query using rider live location in Redis, MVP — no AI optimization per Sec 14 exclusion).
- Accept/Reject endpoint — reject → reassign to next nearest.
- Status flow endpoints: Arrived → Picked Up → On the Way → Delivered (each updates order + triggers relevant side effect, e.g. Delivered → wallet deduction Phase 3 logic).
- Live location update endpoint (rider pushes GPS, store in Redis, short TTL).
- Rider earnings view: earnings balance, wallet balance, pending cash owed (Sec 8 Step 13).

Exit check: full order lifecycle Placed→Delivered walk-through via API calls, correct status each step, correct side effects fire.

---

## Phase 7 — Order Tracking & History (NOW)

Tasks:
- Customer live tracking endpoint (poll-based MVP, no push notif per Sec 14 — in-app refresh only).
- Rider name+phone exposed once assigned.
- Order history + "Reorder" (clone previous order into new cart).
- Rating endpoint (1-5 stars + comment) on delivery complete.

Exit check: tracking reflects real status change latency < 2s poll; reorder creates valid new cart.

---

## Phase 8 — Admin Module (NOW)

Folder: `app/platform/users`, new `app/modules/admin` (create if missing).

Tasks:
- Dashboard summary endpoint: today orders, gross revenue, net revenue (commission+wallet), pending settlements, total rider wallet balance, total pending COD cash.
- Restaurant management: approve/deactivate, set commission_rate, reset login creds.
- Rider management: approve/reject docs, view wallet/pending cash, deactivate.
- Order management: view/filter, manual cancel/reassign, view distance+fee breakdown.
- Weekly settlement processing: list restaurants due, mark "Settled" (manual transfer MVP, per Sec 14 — automated payout excluded).
- Weekly rider payout processing + cash reconciliation discrepancy flag list.
- Reports endpoint: weekly/monthly trends.

Exit check: admin can run full settlement cycle end-to-end on test data, numbers match Sec 11 formula.

---

## Phase 9 — Notification & Docs (folder exist, tag per README)

- `platform/notification`: **LATER** — in-app status refresh only for MVP, real push deferred (Sec 14). Leave folder as interface stub only, no build.
- `docs/`: keep `api-contracts.md` updated as each phase ships (Rule 11).

---

## Phase 10 — Security Hardening Pass (NOW, before launch)

Tasks:
- Confirm bcrypt/argon2 on all password fields, none logged anywhere.
- JWT short expiry + refresh flow tested (web httpOnly cookie / mobile secure storage — coordinate w/ frontend).
- Re-check every endpoint has role guard, not just route existence.
- S3 buckets for CNIC/license/vehicle docs private, not public-read.
- Confirm rate limit active on all auth endpoints.
- Confirm Pydantic schema validation on every request body (no raw dict).
- SQLi check: all queries via SQLAlchemy ORM/param binding, no raw string concat.

Exit check: manual pentest checklist pass, OpenAPI docs (Swagger) accurate for every route.

---

## Phase 11 — Testing (NOW)

Folder: `app/tests`.

Tasks:
- Unit test: wallet deduction, commission math, delivery fee formula, cash cap block.
- Integration test: full order lifecycle (place→deliver) both COD/Digital.
- Integration test: settlement + payout calculation matches Sec 11 example numbers exactly.
- Auth test: OTP flow, role guard rejection on wrong role.

Exit check: `pytest` green, coverage on money-math logic 100% (this is the part that can't be wrong).

---

## Phase 12 — Deployment (NOW)

Tasks:
- Dockerfile production build (multi-stage, slim image).
- `.github/workflows/` CI: run tests on PR, build image on merge to main.
- AWS: RDS Postgres, ElastiCache Redis, ECS/EC2 for API, S3 bucket for docs.
- Env secrets via AWS Secrets Manager (per Rule 12, once live — `.env` for local only).
- Basic logging/monitoring (CloudWatch or equivalent) — errors visible, no silent fail.

Exit check: deployed API reachable, health check green, restaurant web dashboard + mobile app can hit real endpoint.

---

## Phase 13 — MVP Final Checklist (cross-check vs spec Sec 13)

Backend done when ALL below true:
- [ ] Customer: signup/login, browse, menu, multi-cart, place order (COD/Digital), fee shown, live track, history, reorder, rating.
- [ ] Rider: signup/login, doc upload, wallet min Rs.500, online/offline, accept/reject, status flow, daily cash deposit, weekly earnings view.
- [ ] Restaurant: onboarding login (email/pass + phone/OTP), 10% commission, menu mgmt, order accept/status, weekly settlement view, reports.
- [ ] Admin: dashboard, restaurant/rider/order/customer mgmt, settlement+payout processing, cash reconciliation, reports.
- [ ] All money math matches Sec 11 example exactly, in both COD and Digital paths.
- [ ] Security baseline (Rule 12) fully applied.
- [ ] Deployed, reachable, tested.

Only then → backend MVP = DONE.

---

*Doc version: 2.0 — merged from `development.md` + old `Backend_development.md` (duplicate files, same purpose, different detail level — merged per Rule 3, no content lost). Update after each phase/step ships — mark done, note deviation if any (per Rule 3, deviation = flag conflict, don't silently change).*

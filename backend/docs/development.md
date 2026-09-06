# SpeedyMeals Backend — Development Plan

Repo state check (real, not guess): all files 0 bytes. Only skeleton folder exist. Structure below build on top, step by step, no jump ahead.

Stack lock: Python + FastAPI, PostgreSQL, Alembic, Redis, AWS S3, JWT auth, Google Maps Distance Matrix.

Tag meaning:
- **NOW** = build this phase, MVP scope (spec Sec 13).
- **PREPARE** = folder/interface ready, no full logic yet.
- **LATER** = skip, excluded MVP (spec Sec 14).

---

## Phase 0 — Environment & Project Setup (NOW)

Goal: repo runnable, empty but alive.

Tasks:
- `requirements.txt`: fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, pydantic, python-jose (JWT), passlib[bcrypt], redis, boto3 (S3), httpx (Google Maps call), python-dotenv, pytest.
- `.env.example`: DB_URL, JWT_SECRET, JWT_EXPIRE_MIN, REDIS_URL, AWS_ACCESS_KEY, AWS_SECRET_KEY, S3_BUCKET, GOOGLE_MAPS_API_KEY.
- `.gitignore`: `.env`, `__pycache__`, `.venv`.
- `app/core/config.py`: Pydantic Settings, load `.env`.
- `app/core/database.py`: SQLAlchemy engine + session, `get_db()` dependency.
- `app/main.py`: FastAPI app init, health check route `GET /health`.
- Docker: `Dockerfile` + `docker-compose.yml` (api + postgres + redis).

Exit check: `docker-compose up` → `GET /health` return 200.

---

## Phase 1 — Database Schema & Migrations (NOW)

Goal: full DB structure match `docs/schema.jpeg` (the locked, approved ERD),
before any endpoint logic.

**Authoritative source for table design: `docs/schema.jpeg`** — not a
guess derived from the spec doc alone. Spec doc (Sec 12) gives the business
intent; schema.jpeg is the actual finalized column-level design. Where the
two agree (they do, on every money/business field), no conflict. Where
schema.jpeg has more detail (UUID ids, extra tables like `addresses` and
`ratings`, selective `updated_at`), schema.jpeg wins.

Tasks:
- Alembic init (`alembic init migrations`). ✅ done.
- Base model (`app/core/base_model.py`) — matches schema.jpeg exactly:
  - `id`: UUID on every table (not integer — corrected after schema.jpeg
    review, see Step 2 fix).
  - `created_at`: on every table.
  - `updated_at`: NOT automatic on every table — only mixed in via
    `UpdatedAtMixin` on tables that have it in schema.jpeg (`users`,
    `riders`, `restaurants`, `orders`).
- Tables (13 total, per schema.jpeg, one model file per module):
  - `admins` — email (unique), password_hash, role, is_active.
  - `users` — phone_number (unique), name, email, wallet_balance, is_active.
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
- **No `carts` table.** Cart is temporary, pre-order state (customer still
  editing quantities/items) — lives in Redis (`cart:{customer_id}:{restaurant_id}`),
  not Postgres. It converts into a real `orders` + `order_items` row only at
  checkout. See Phase 5 note for detail — this keeps Postgres for finalized,
  permanent data only, and gives fast read/write for a state that changes
  constantly before checkout.
- Run migration, verify tables in Postgres.

Exit check: `alembic upgrade head` clean, all 13 tables exist matching
schema.jpeg exactly (types, FKs, nullability), no drift.

---

## Phase 2 — Auth & Users (NOW)

Folder: `app/platform/auth`, `app/platform/users`.

Tasks:
- OTP flow: phone number in → generate OTP → store in Redis (expiry 5 min) → verify endpoint.
- JWT issue on OTP verify (customer/rider) — short expiry + refresh token.
- Restaurant login: email+password OR phone+OTP (spec Sec 9 Step 2) — bcrypt hash password.
- Admin login: email+password, role field (super_admin/support).
- Role-based dependency (`get_current_user`, `require_role([...])`) — enforced at API layer, not frontend only.
- Rate limit OTP + login endpoints (Redis counter, e.g. 5/min per phone).
- `users` module: profile get/update, saved addresses (customer).

Exit check: signup→OTP→login works all 4 roles (customer, rider, restaurant, admin) via Postman/Swagger.

---

## Phase 3 — Wallet & Payment Core (NOW)

Folder: `app/platform/wallet_payment`.

Tasks:
- Rider wallet recharge endpoint (manual entry MVP, gateway stub for JazzCash/EasyPaisa/card).
- Enforce min Rs. 500 before "Go Online" toggle (Sec 8 Step 4-5).
- Auto-deduct Rs. 10 wallet on order "Delivered" status change (instant, both COD/Digital) — write to `wallet_transactions`.
- Below-min-balance → auto force rider offline (background check or on-toggle check).
- Cash deposit tracking: `cash_deposits` create daily, compare expected vs actual, flag shortfall.
- Cash collection cap (e.g. Rs. 10,000) — block new COD assignment once pending_cash_owed hits cap (digital still allowed).

Exit check: unit test — wallet deduction fires exactly once per delivery, blocks correctly at threshold.

---

## Phase 4 — Restaurant Side: Menu & Orders Intake (NOW)

Folder: `app/modules/food_delivery`.

Tasks:
- Menu CRUD (name, price, description, photo→S3, category, available/sold-out toggle).
- Restaurant order dashboard endpoints: list new orders, order detail.
- Status transition: Preparing → Ready for Pickup (triggers rider assignment event).
- Commission calc at order placement time (10% default, per-restaurant override) — snapshot into `orders.commission_amount`.

Exit check: restaurant can add menu, receive test order, mark ready, commission number correct in DB.

---

## Phase 5 — Customer Side: Browse, Cart, Checkout (NOW)

Folder: `app/modules/food_delivery`.

Tasks:
- Restaurant list (nearby/sort by distance+rating), search, filter.
- Menu view by restaurant.
- Multi-cart logic (Sec 7 Step 7): cart keyed by (customer_id, restaurant_id), independent tabs, no auto-clear.
  - **Storage: Redis, not Postgres.** Key pattern `cart:{customer_id}:{restaurant_id}`, value = JSON of items/quantities. Reason: cart is temporary, pre-order, changes on every tap (add/remove/qty change) — Redis gives fast read/write without churning Postgres rows. On "Place Order" (Phase 5 checkout step), cart contents are read from Redis, written once as real `orders` + `order_items` rows, then the Redis key is cleared. No `carts` table exists in schema.jpeg for this reason.
- Checkout: call Google Maps Distance Matrix (restaurant→customer address) → `delivery_distance_km` → fee = 50 + (km×20).
- Price breakdown response: food subtotal + delivery fee + total.
- Place order: create `orders` row + `order_items`, compute commission_amount, restaurant_payable (90%), rider_earning (100% delivery fee) — all snapshot at placement.
- Payment method select: COD or Digital (stub digital gateway call, mark "Paid — Digital" on success).

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

*Doc version: 1.0. Update after each phase ship — mark phase done, note deviation if any (per Rule 3, deviation = flag conflict, don't silently change).*

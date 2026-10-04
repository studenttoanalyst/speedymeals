# SpeedyMeals - Full Repository Audit Report

**Repository:** github.com/studenttoanalyst/speedymeals
**Audited commit:** `73e649b` ("merge commit resolved", 30 Sep 2026)
**Method:** Repo cloned and read directly. Code is treated as source of truth, `report.md` is treated as a claim to verify.
**Scope:** Backend (FastAPI), Website (Next.js), Mobile app (Flutter), Supabase SQL, CI/CD, docs.
**Not done:** Test suite was NOT executed (needs Postgres + Redis, unavailable in audit sandbox). Python compile check passed on all backend files. Flutter and Next.js builds were not run. Findings are from static code reading.

---

## 1. Executive Summary

SpeedyMeals is a food-delivery platform for Pakistan with four roles (Customer, Restaurant, Rider, Admin). The repo is a monorepo with three clients/servers:

| Part | Tech | Size | Maturity |
|------|------|------|----------|
| `backend/` | FastAPI, SQLAlchemy, Postgres (Supabase), Redis | ~19.8k lines incl. ~380 tests | Core flows work end to end. Several money and security gaps. |
| `website/` | Next.js 16, React 19, Tailwind 4 | Admin + Restaurant portals, marketing site | Portals built, UI-level auth gate only |
| `mobile app/` | Flutter (customer + rider) | ~26k lines Dart | Feature-rich, some constants stale vs backend |
| `supabase/` | SQL migrations | 4 files | Marketing "partner registration" table only |

**Overall verdict:** Good MVP structure and strong test discipline. NOT production-safe yet. The biggest blockers are (a) free rider wallet money, (b) world-readable partner registration data, (c) missing payment gateway and SMS provider, (d) RBAC only half enforced, (e) no automatic retry when no rider is available.

### Top 10 problems (ranked)

| # | Severity | Problem |
|---|----------|---------|
| 1 | Critical | Rider can recharge wallet with no payment proof (`POST /wallet/recharge`) |
| 2 | Critical | Supabase `partner_registrations` readable by anyone with the public anon key (RLS `using (true)`) |
| 3 | Critical | No real SMS: OTP only printed to server console. No real login possible for customers/riders in production |
| 4 | Critical | Digital payment is a stub. No refunds on cancel |
| 5 | High | Rider cash deposit self-reported: reduces `pending_cash_owed` immediately, no admin confirmation |
| 6 | High | RBAC permissions only enforced on role/account management. Settlements, payouts, riders, orders use role-only check |
| 7 | High | `must_change_password` flag never enforced by the API. Temp-password admin gets full access |
| 8 | High | Delivery status update has no row lock. Double submit can double-deduct wallet and double-add COD owed |
| 9 | High | Hardcoded demo restaurant (`Partner@123`) seeded on every production startup |
| 10 | High | Order stuck forever if no rider online. No retry job, no timeout, no customer or restaurant cancel |

---

## 2. System Architecture (as built)

```
Flutter app (customer + rider)  --\
Next.js website (admin + restaurant portals) --> FastAPI (Docker, Lightsail Singapore, Nginx + Certbot)
                                                    |-- Postgres (Supabase pooler :6543)
                                                    |-- Redis (OTP, carts, rate limit, rider GPS, caches, pub/sub)
                                                    |-- S3 / Supabase Storage (menu photos, rider docs)
                                                    '-- Google Maps (Distance, Directions, Geocode, Places)
Website marketing form --> Next.js /api/register --> Supabase (separate DB table, bypasses FastAPI)
```

Backend layering: Route -> auth dependency -> Pydantic -> service -> SQLAlchemy. Ownership is enforced inside WHERE clauses (404 instead of 403). Good practice.

Backend modules: `platform/` (auth, users, wallet_payment, location) and `modules/` (food_delivery, admin, admin_roles, admin_accounts). Placeholders only: notification, payments, ride_hailing, logistics, medicine.

**New since `report.md`:** admin RBAC (`admin_roles`, `admin_accounts`), password reset tokens, audit log table, migrations `e6f7a8b9c0d1`, `f7a8b9c0d1e2`, merge head `d3e54e76dd8b`, Supabase partner registration, GitHub Actions deploy, mobile maps modules M1-M5, website admin/restaurant portals.

---

## 3. Detailed User Flows

### 3.1 Customer flow (who, how, what happens)

**Step 1 - Login / Signup (same screen, OTP only, no password)**
1. App calls `POST /auth/otp/request` with `country_code` + `phone_number`.
2. Backend builds E.164 number, rate-limits (5/min per number), checks 45 s resend cooldown in Redis.
3. Backend generates 6-digit OTP with Python `random`, stores `otp:{phone}` in Redis for 5 min.
4. **OTP is only `print()`-ed to server log.** No SMS is sent (see ADR-001). Real customers cannot log in on production without someone reading logs.
5. User enters OTP. App calls `POST /auth/otp/verify`.
6. Backend compares OTP, deletes it (one-time), finds or creates `users` row (name defaults to "New User").
7. Backend returns access JWT (30 min) + refresh JWT (30 days, hash stored in DB, rotated on use).
8. App stores tokens in `flutter_secure_storage`. Good.

**Step 2 - Profile and address**
- `PUT /users/me` (name, email). Addresses CRUD at `/users/me/addresses` with lat/lng, one default.
- Address picking uses Google Places proxy `/api/v1/location/*` (auth + per-user rate limit + Redis cache + daily budget cap).

**Step 3 - Browse**
- `GET /restaurants`: bounding-box SQL filter then Haversine in Python, default 5 km radius, search and sort. Menu at `GET /restaurants/{id}/menu`.
- Opening/closing hours are returned but **not enforced** at checkout. A customer can order from a closed restaurant.

**Step 4 - Cart (Redis, per restaurant, 7-day TTL)**
- Add/update/remove/clear. Validates item belongs to restaurant and is available, merges duplicates.

**Step 5 - Checkout**
- `GET .../checkout-preview` then `POST .../cart/checkout` with required `Idempotency-Key` UUID header.
- Prices re-read from DB. Distance from Google Directions (cached 10 min), fallback Haversine x 1.3.
- Delivery fee = Rs. 100 + 25/km. Commission default 10% of food subtotal. All values frozen on the order, plus coordinate snapshots.
- COD: no charge. Digital: **stub** returns fake `STUB-DIGITAL-{uuid}`.
- Order starts as `Accepted` (restaurant is NOT asked to accept or reject).
- Cart cleared after commit.

**Step 6 - Tracking**
- Poll `GET /orders/{id}/track`, REST rider GPS `GET /orders/{id}/rider-location`, or WebSocket `/orders/{id}/track?token=`.

**Step 7 - After delivery:** history, reorder, rating (`/orders`, `/orders/{id}/reorder`, `/orders/{id}/rating`).

**Missing for customer:** cancel order, refunds, promo codes at checkout, order-status push notifications, delete account, saved payment methods, tips.

### 3.2 Restaurant flow

1. **Account creation:** admin creates restaurant (`POST /admin/restaurants`) with email, password, phone. No self-signup in the backend. Website has a public "partner registration" form that writes to Supabase only (lead capture, not an account).
2. **Login:** website `/restaurant/login` calls `POST /auth/restaurant/login` (email + bcrypt password, 5/min rate limit) or phone + OTP. Forgot/reset password exists with 30-min single-use token, all sessions revoked after reset.
3. **Menu:** CRUD, availability toggle, photo upload (JPG/PNG, 5 MB, magic-bytes check) at `/restaurants/me/menu-items`.
4. **Orders:** `GET /restaurants/me/orders`, detail, `PATCH .../status`. Allowed steps: `Accepted -> Preparing -> Ready for Pickup`. When `Ready for Pickup`, nearest eligible rider is auto-assigned.
5. **Settlements:** weekly payout records generated by admin, restaurant sees them in portal.
6. **Gaps:** restaurant cannot reject or cancel an order, cannot mark itself closed or busy via API, no new-order alert (no push, no sound API), no prep-time input.

### 3.3 Rider flow

1. **Signup:** `POST /auth/rider/otp/verify` with OTP + name, CNIC, vehicle. Creates rider with `approval_status=pending`.
2. **Documents:** `POST /wallet/documents/{doc_type}` (CNIC, license, vehicle photos, private S3).
3. **Admin approval:** `PATCH /admin/riders/{id}/approval`.
4. **Kit:** Rs. 5,000 deposit paid at outlet, 2 shirts + 1 box, serials recorded by admin (`PATCH /admin/riders/{id}/kit`). Sets `kit_completed`.
5. **Wallet:** first recharge exactly Rs. 500, later any positive amount. **No payment verification at all** (Finding C1).
6. **Go online:** needs `kit_completed` and balance >= 500. Rider pushes GPS to `PATCH /wallet/location` (Redis, 45 s TTL).
7. **Assignment:** restaurant marks Ready for Pickup. Backend loops all approved riders, picks nearest by Haversine. Rider accepts or rejects. Reject triggers re-search excluding that rider.
8. **Delivery:** Accepted -> Arrived -> Picked Up -> On the Way -> Delivered, one endpoint each.
9. **On Delivered:** Rs. 10 deducted from wallet, COD total added to `pending_cash_owed`, auto-offline if balance < 100.
10. **Cash deposit:** `POST /wallet/cash-deposit`, reduces owed immediately, discrepancy flagged to admin.
11. **Payout:** admin generates weekly rider payouts and marks paid manually.

**Gaps:** no timeout if rider ignores assignment, no rider cancel after accept, no rider earnings tip handling, no support/chat, no push.

### 3.4 Admin flow

1. First admin auto-seeded from env vars on startup. Login `POST /auth/admin/login`.
2. Dashboard, restaurants (create, activate, commission, reset credentials), riders (approve, activate, kit), orders (list, cancel, reassign), settlements and rider payouts (generate, mark paid), cash discrepancies, customers (block/unblock), promotions, reports.
3. **RBAC (new):** roles + permissions tables, staff accounts with temp password, forced password change, audit log, session revocation on permission change.
4. Website pages exist for all of the above.

---

## 4. Feature Status Matrix

| Area | Status | Notes |
|------|--------|-------|
| Customer OTP auth, JWT, refresh rotation | Done | Needs real SMS |
| Rider signup, docs, approval, kit | Done | |
| Restaurant login, menu, orders | Done | No reject/cancel |
| Cart + checkout + idempotency | Done | Hours not enforced |
| Delivery fee, commission, snapshots | Done | Float used for some money |
| Nearest-rider auto assignment | Partial | No retry, no timeout, O(all riders) |
| Live tracking REST + WebSocket | Done | WebSocket blocks event loop (see M3) |
| Maps cost control (budget, cache) | Done | |
| Admin ops + settlements | Done | Manual only |
| Admin RBAC | Partial | Only account/role routes check permissions |
| SMS provider | Missing | Console print |
| Payment gateway (JazzCash, Easypaisa, card) | Missing | Stub |
| Push notifications | Missing | In-app list only |
| Promotions | Fake | In-memory list, not applied to orders |
| Customer cancel, refunds | Missing | |
| Restaurant open-hours enforcement | Missing | |
| Monitoring, error tracking, backups plan | Missing | |
| CI tests | Missing | Only deploy workflow |
| Ride hailing, logistics, medicine | Placeholder | |

---

## 5. Findings - Backend

### Critical

**C1. Free wallet money.** `recharge_wallet()` adds `amount` to the balance after only checking method string and `amount > 0`. No gateway, no admin approval, no receipt. A rider can POST Rs. 500 once then any amount, going online and ignoring the wallet rule. Same trust problem for `create_cash_deposit()`: the submitted amount instantly reduces `pending_cash_owed`, so a rider can clear the COD cap with a fake deposit and keep the cash. Fix: make recharge/deposit a `pending` record confirmed by admin or gateway webhook, then credit.

**C2. OTP delivery is a console print.** `_send_otp_via_console`. Also admin temp passwords and password-reset links are `print()`-ed to logs (`admin_accounts/service.py` lines 160, 303, `auth/service.py` line 362). Anyone with log access sees live credentials. Fix: real SMS/email provider, never log secrets.

**C3. Digital payment stub and no refund path.** Admin cancel sets status only. A paid digital order cancelled leaves customer charged (once a gateway exists). Also payment is taken before DB commit, so a commit failure would charge without an order. Fix: payment intent, commit order as `pending_payment`, confirm by webhook, refund on cancel.

### High

**H1. RBAC half enforced.** `modules/admin/routes.py` uses `require_role(["admin"])` for all ~30 routes. `require_permission()` is used only in `admin_roles` and `admin_accounts`. So a "support" role with no finance permission can still call `/admin/settlements/{id}/mark-paid`. Fix: attach a permission key per route group.

**H2. `must_change_password` not enforced.** Flag is put in the JWT but no dependency blocks other routes. A new staff member can skip the change-password page and use the temp password token on every endpoint (the `scope` claim exists but is always `full_access`).

**H3. Missing import = crash.** `platform/auth/routes.py` raises `HTTPException` in `change_initial_password` but only imports `APIRouter, Depends, status`. A non-admin calling that route gets a 500 `NameError` instead of 403.

**H4. Race condition on Delivered.** `rider_advance_delivery_status` reads the order with no `with_for_update()`. Two parallel taps both see `On the Way`, both commit: wallet deducted twice, COD owed doubled. The "exactly once" claim in docs is only true for sequential calls. Same pattern for wallet recharge and deposit (read-modify-write on float). Fix: row lock or atomic UPDATE.

**H5. Assignment lock is ineffective.** `SELECT ... FOR UPDATE` runs AFTER the order was already read and status changed, so it does not protect the read-check-write window. Lock first, then read.

**H6. Hardcoded demo restaurant on every startup.** `seed_demo_restaurant()` creates `contact@karachibiryani.pk` with password `Partner@123` in production if absent. Anyone who reads the repo (it is in source) can log in as a restaurant. Fix: remove from production, gate by env flag.

**H7. Assignment dead ends.** If no rider is eligible at Ready for Pickup, nothing retries (no worker/cron). If rider rejects and nobody else is available, order sits in `Rejected` with no valid transition. No timeout for a rider who never responds. Admin manual reassign is the only escape.

**H8. CORS regex too wide.** `allow_origin_regex` accepts any `https://*.vercel.app` WITH credentials enabled. Any attacker-hosted Vercel site passes CORS. Bearer tokens are in headers so impact is limited, but it should be removed or pinned to your project.

### Medium

- **M1. Rate limiter fails open** when Redis is down (logged only). Also per-phone only, no per-IP limit, so OTP SMS bombing across many numbers is not limited.
- **M2. OTP brute force window.** 5 verify tries/min per number on a 6-digit code valid 5 min = ~25 guesses, OTP is not invalidated after N failures. Uses `random` not `secrets`. Use `secrets.randbelow` and lock after 5 fails.
- **M3. WebSocket design.** Uses synchronous Redis `get_message(timeout=1.0)` inside an `async` handler (blocks the event loop) and queries Postgres every 0.5 s per connection. Will not scale past a few dozen viewers. JWT in URL query (appears in logs), and connection is not closed when the 30-min token expires.
- **M4. Duplicate function.** `get_order_tracking` is defined twice in `food_delivery/service.py` (lines ~226 and ~361). First is dead code.
- **M5. Float money.** Wallet, `pending_cash_owed`, recharge use Python `float`. Checkout uses `Decimal`. Use `Numeric` + `Decimal` everywhere.
- **M6. In-memory promotions.** `_PROMOTIONS_STORE` is a Python list: lost on restart, different per worker, never applied in checkout.
- **M7. Nearest rider is O(all approved riders)** with a Redis GET each. Fine for 50 riders, bad for 5,000. Use Redis GEO.
- **M8. Docstring and doc drift.** `_find_nearest_rider` docstring says wallet >= 500, code uses 100.
- **M9. Admin audit log exists only for RBAC actions.** Cancel, reassign, mark-paid, approvals are not audited.
- **M10. Startup via `@app.on_event`** is deprecated in FastAPI (use lifespan). Seeding runs on every worker start.
- **M11. Container runs as root, no healthcheck in Dockerfile, migrations run in CMD** (two replicas would race on migrations).
- **M12. No pagination** visible on admin list endpoints and order history (check `list_customer_orders`, admin lists). Will slow with data.

---

## 6. Findings - Website (Next.js)

- **W1 (High): Tokens in `localStorage` plus JS-set cookies.** Access token and refresh token are readable by any XSS. Cookies are set from JS (not HttpOnly) with 7-day expiry while the access token lives 30 min. Move to HttpOnly, Secure cookies set by a server route.
- **W2 (Medium): `proxy.ts` route guard trusts cookie presence.** It only checks that `sm_access_token` and `sm_user_role` cookies exist. Anyone can set `sm_user_role=admin` and see the admin UI shell. Backend still rejects API calls, so data is safe, but verify JWT signature server-side in the proxy.
- **W3 (Medium): Mock fallback in production code.** `client.ts` has `USE_MOCKS` and `fallbackData`, `restaurant/menu` shows "offline fixtures" when API unreachable. Restaurant staff could see fake data and think it is real. Disable fixtures in production builds.
- **W4 (Medium): `/api/register` rate limit is an in-memory Map.** On serverless or multiple instances it resets and is per instance. Uses `x-forwarded-for` which can be spoofed if not behind a trusted proxy. Reference codes use `Math.random()`.
- **W5 (Medium): Hardcoded API fallback** `https://api.speedymealservices.com` by hostname check, plus CORS list also hardcoded in backend. Fine, but keep a single env-driven source.
- **W6 (Low): No tests, no lint gate in CI** for the website. Next 16 with React 19 are very new, pin and watch for breaking changes.
- Positive: refresh mutex prevents refresh stampede, input sanitization and prompt-injection guard on registration, role-based layouts, admin accounts/roles pages exist.

## 7. Findings - Supabase

- **S1 (Critical): Public read of all partner registrations.** `create_registrations.sql` creates policy `for select to anon, authenticated using (true)`. The anon key is public in any browser app. Anyone can `GET /rest/v1/partner_registrations` and download every applicant's name, phone, email, city. Also later migrations `GRANT ALL ... TO anon` on the table and set `ALTER DEFAULT PRIVILEGES ... GRANT ALL TO anon` for all future tables in `public`. Fix: remove the select policy (insert via server route with service role, return reference code from the insert response), revoke anon grants, drop the default-privileges grant.
- **S2: Two data stores.** Business data is in Supabase Postgres (via FastAPI) while registrations use Supabase client directly. `create_core_schema.sql` duplicates the Alembic schema, so schema truth is split. Keep Alembic as the only source.
- Unique indexes on email and phone for registrations are good.

## 8. Findings - Mobile app (Flutter)

- **A1 (High): Stale constants.** `app_constants.dart` says delivery fee `50 + 20/km` but backend is `100 + 25/km`, comments say "no WebSockets" while `live_location_socket.dart` exists. These are display fallbacks, but customers may see a wrong estimate before preview loads.
- **A2: Forgot-password screens exist** for customer and rider, but those roles are OTP-only with no password. Dead or misleading UI, confirm and remove.
- **A3: Notifications are local only.** `notification_service.dart` builds an in-app list (partly from order polling). No FCM/APNs, so riders will miss assignments when the app is backgrounded. This is the biggest functional gap for rider operations.
- **A4: Rider GPS publishing** (`rider_location_service.dart`, `rider_location_publisher.dart`) needs background location permission handling on Android 10+ and iOS. Verify battery and foreground-service setup.
- **A5: Polling intervals** (15 s order poll) plus WebSocket: pick one primary path to reduce battery and server load.
- **A6: Google Maps key** must be restricted by package name and SHA-1 (Android) and bundle id (iOS). No key was found committed (secret scan clean for `AIza...`).
- Positive: tokens in `flutter_secure_storage`, 8 test files incl. critical flows and maps modules, repository pattern, server is authoritative for prices.

## 9. Findings - DevOps and Process

- **D1: CI only deploys.** `deploy-backend.yaml` pushes to Lightsail on every `backend/**` push to main with no test, lint, or migration check first. A failing commit goes live.
- **D2: No staging environment** documented. Deploy is `git pull` on the server.
- **D3: Static IP and server details are written in `docs/lightsail_guide.md`** (public repo). Not a secret, but reveals attack surface. Consider making repo private or removing.
- **D4: Single instance** (FastAPI + Redis in Docker on one Lightsail box). Redis holds carts and rider location with no persistence config seen. A restart loses carts and OTPs.
- **D5: No monitoring/alerting/log aggregation**, no Sentry, no uptime alert, no DB backup/restore procedure in docs.
- **D6: Docs duplicated and drifting.** `backend/docs/report.md` and `Backend_development (3).md`, multiple RBAC plan files, report says 15 tables / 373 tests while code has more tables (RBAC) and ~380 test functions. Current repo also contains committed `.env.example` only (good, no real `.env` found).
- **D7: Test claim unverified.** `report.md` says 373 passed. I could not run them. Re-run in CI to prove it.

---

## 10. What Is Working Well

1. Clean layered backend, thin routes, ownership-in-query pattern.
2. Refresh-token rotation with hashed storage, password-reset tokens hashed, uniform responses prevent account enumeration.
3. Money snapshots frozen on order; prices never trusted from client or Redis.
4. Idempotency key on checkout with 24 h replay.
5. Google Maps cost controls: budget breaker, Redis caches, per-user rate limits, Haversine fallback.
6. Rider onboarding gates (docs, approval, kit, wallet) are thoughtfully designed for the Pakistan market.
7. Large automated test suite, Postgres-backed (not SQLite).
8. Admin RBAC design (roles, permissions, audit log, forced password rotation) is solid in concept.

---

## 11. What Should Be Added / Changed (Roadmap)

### Phase 0 - Before any real user (1-2 weeks)
1. Fix S1 (Supabase RLS) and rotate anon exposure.
2. Fix C1: recharge and cash deposit become admin- or gateway-confirmed.
3. Integrate SMS provider (Pakistani gateway) and remove all secret `print()`s.
4. Remove `seed_demo_restaurant` from production.
5. Fix `HTTPException` import (H3), enforce `must_change_password` (H2).
6. Lock rows on Delivered / recharge / deposit (H4, H5). Switch money to `Decimal/Numeric`.
7. Add CI: run pytest with Postgres + Redis services before deploy.

### Phase 1 - Launch readiness (2-4 weeks)
1. Payment gateway (JazzCash / Easypaisa / card) with webhooks, refund on cancel.
2. Push notifications (FCM) for rider assignment, restaurant new order, customer status.
3. Restaurant accept/reject with timeout, customer cancel rules, enforce opening hours.
4. Assignment worker: retry unassigned orders every N seconds, rider-response timeout, escalate to admin.
5. Apply permission keys to every `/admin/*` route; extend audit log to money actions.
6. Real promotions table and checkout discount logic.
7. Sentry, uptime monitoring, DB backups, Redis persistence, non-root container.

### Phase 2 - Scale and quality
1. Redis GEO for rider search, WebSocket via async Redis or a dedicated service, pagination everywhere.
2. HttpOnly cookie sessions on website, JWT verification in proxy, remove fixtures from prod.
3. Staging environment, Alembic run as separate release step, blue-green deploy.
4. Automated settlement scheduling and finance export (CSV/PDF).
5. Rider incentives, ratings-based dispatch, ETA from real traffic, support chat, multi-language (Urdu) in mobile app.
6. Single source of truth docs: keep one `report.md`, auto-generate API docs from OpenAPI.

---

## 12. Test and Quality Snapshot

| Item | Value |
|------|-------|
| Backend test functions (static count) | ~380 across 20+ files (report claims 373 passing, unverified here) |
| Flutter tests | 8 files (critical flows, maps M1-M5, widget) |
| Website tests | None |
| CI | Deploy only |
| Compile check (backend) | Passed |
| Merge conflict markers in code | None found (earlier conflict in `config.py` is resolved) |
| Secrets committed | None found by pattern scan (only `.env.example`) |

## 13. Caveats

- This audit is static. Nothing was run against a live database, so runtime behavior (for example exact race outcomes) is inferred from the code.
- I read the most critical files fully (auth, config, main, wallet, order lifecycle, admin RBAC, website auth/proxy/register, Supabase SQL) and sampled the rest (mobile screens, most tests, website UI pages). Mobile UI correctness and website page-level behavior were not individually verified.
- Severity ratings are my judgment for a public launch handling real cash.

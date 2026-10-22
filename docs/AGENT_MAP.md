# AGENT_MAP — SpeedyMeals repo map for agents

Read-only review of `main` at `6b04fdc` (= `origin/main` = production server checkout), 2026-10-22. Tests were **not** run.
Paths are relative to the repo root (`speedymeals/`). Line numbers are for `6b04fdc`. Anything not confirmed in code or by the owner is marked **UNVERIFIED**.

**Source of truth is the codebase only.** `docs/`, `backend/docs/`, the ADRs and the READMEs describe the project's vision and overall scope. Many are outdated, including the MVP spec. Never take fees, thresholds, flows, env names or deploy steps from them; read the code. Open business questions are in §7.

## 1. Architecture per app

### backend (FastAPI, Python 3.11) — `backend/`
- **Entry:** `backend/app/main.py`, run as `uvicorn app.main:app` from `backend/`. `lifespan` (`:52`) runs `seed_bootstrap_data` (`:162`: first admin + demo restaurant), then the assignment sweeper (`core/assignment_sweeper.py`) and the deletion review job (`core/deletion_review_job.py`, `DELETION_REVIEW_JOB_ENABLED`). Docker CMD (`backend/Dockerfile`): `alembic upgrade head && uvicorn` (1 worker). **If the migration fails, the API never starts.**
- **Core:**
  - `core/config.py`: Settings. It reads `backend/.env`, then `backend/app/.env` (the later file wins), then cwd `.env`.
  - `core/database.py` (SQLAlchemy, `get_db`), `core/redis_client.py` (silent in-memory fallback, `:226`), `core/rate_limiter.py` (fails open, `:46`).
  - `core/storage.py` (S3 API: AWS, or Supabase Storage when `S3_ENDPOINT_URL` is set), `core/maps_client.py` (Google Directions, Distance Matrix, Geocode and Places, with a daily budget).
- **Routers** (mounted in `main.py`):
  - `platform/auth/routes.py` `/auth/*`: OTP (`:48`, `:63`), restaurant login (`:144`), admin login (`:191`), refresh, reset.
  - `platform/users/routes.py` `/users/me*` (profile, addresses).
  - `platform/wallet_payment/routes.py` `/wallet/*` (rider wallet, online status, cash deposit, location, documents, assignments, delivery steps).
  - `platform/location/routes.py` `/api/v1/location/*`; `platform/notification/routes.py` `/devices` (FCM tokens; push via `platform/notification/fcm.py`, which disables itself on bad credentials).
  - `platform/account_deletion/routes.py`:
    - User: `DELETE /users/me`, `GET /users/me/deletion-request`, `POST /users/me/deletion-request/cancel`.
    - Public web flow: `POST /account-deletion/request`, `POST /account-deletion/confirm`.
    - Admin: `/admin/deletion-requests` with approve, hold and release, gated by `require_permission("manage_deletion_requests")`.
  - `modules/food_delivery/routes.py`: customer browse, cart and checkout (`/restaurants*`, checkout `:192`); restaurant portal (`/restaurants/me/*`); customer orders (`/orders*`, WebSocket `:466`).
  - `modules/admin/routes.py` `/admin/*`, `modules/admin_roles/routes.py`, `modules/admin_accounts/routes.py`.
- **Key logic:** `modules/food_delivery/service.py` (2017 lines), `platform/wallet_payment/service.py`, `modules/admin/service.py`, `modules/food_delivery/tax.py` (GST), `platform/account_deletion/service.py`.
- **Schema:** Alembic `backend/app/migrations/versions/` (17 files; head chain ends `e8b7a6c5d4f3` → `d4a7c9e1f2b3`) plus the SQLAlchemy models. The production DB is Supabase Postgres (owner-confirmed).
- **Stubs:** `modules/logistics`, `modules/medicine`, `modules/ride_hailing` hold a README only. Promotions are an in-memory list (`modules/admin/service.py:891`).
- **Tests:** `backend/app/tests/` (30 files). They use the **real `DATABASE_URL`** inside rolled-back transactions (`tests/conftest.py:4`).

### website (Next.js 16, React 19, Bun; hosted on Vercel) — `website/`
- **Entry:** `app/layout.tsx`, `app/(home)/page.tsx`. Guard `proxy.ts` checks cookie **values** only (`sm_access_token`, `sm_user_role`), not the token.
- **Admin:** `app/admin/*` (dashboard, restaurants, riders, orders, customers, settlements, payouts, promotions, reports, roles, accounts, auth pages). **No deletion-requests page on `main`.**
- **Restaurant:** `app/restaurant/*`. **Public:** about, company, privacy, terms. **No `/delete-account` page on `main`** (see §5 #9).
- **API layer:** `lib/api/client.ts` (fetch, refresh mutex, mock fallback when `NEXT_PUBLIC_USE_MOCKS=true`), `admin.ts`, `restaurant.ts`, `rbac.ts`, `devices.ts`. Sessions live in `localStorage` and cookies (`lib/auth/index.ts`).
- **Server routes:** `app/api/register/route.ts` writes partner leads to Supabase `partner_registrations` (service role key if set). Also `app/api/health/route.ts` and `app/firebase-messaging-sw.js/route.ts`.

### mobile_app (Flutter; customer + rider) — `mobile_app/`
- **Entry:** `lib/main.dart` → `PushService.init()` → `SplashScreen`. Layers: `lib/screens/**` → `lib/data/repositories/**` → `lib/core/network/api_client.dart`. Tokens are in `flutter_secure_storage` (`lib/core/storage/token_storage.dart`).
- **Backend URL:** compile-time `--dart-define=API_BASE_URL` (`lib/core/config/api_config.dart:27`). Release builds throw without it. **No value in the repo.** Owner-confirmed 2026-10-23: release APKs are built with `flutter build apk --dart-define=API_BASE_URL=https://…`, an HTTPS URL on 443 through nginx with **no `:8000`**. The exact host string isn't recorded here (the only nginx `server_name` is `api.speedymealservices.com`).
- **Rider screens:** `lib/screens/rider/` (dashboard, wallet, documents, account). Location goes to `PATCH /wallet/location`.
- **Live tracking:** WebSocket `?token=`. The account deletion link is `lib/core/constants/app_constants.dart:54`.

### supabase — `supabase/migrations/`
- `create_registrations.sql`, `create_core_schema.sql` (grants ALL to anon/authenticated, `:222-229`), `20261003…_fix_security_and_rls.sql` (revokes anon), `20261006…_add_merchant_fields.sql` (re-grants anon, `:11-19`).
- These are grant and RLS history; use Alembic plus the models for schema. Live grant and RLS state: see §6 #9.

### Branches
- `main`: production.
- `account-deletion` (local only, `a721f1c`, based on `2288354`): the website developer's account-deletion draft (spec `docs/account_deletion.md`, migration `a9b8c7d6e5f4`).
- `main` already holds the mobile developer's account-deletion backend (`d4a7c9e1f2b3`).
- **Owner decision:** the real feature is a merge of both. The draft's website pages call endpoints that differ from `main`'s (`/wallet/account-deletion` versus `/users/me/deletion-request` and `/account-deletion/*`), so they must be ported to `main`'s API.
- **Never run the draft migration `a9b8c7d6e5f4` again** (see §6 #1).

## 2. Flows

### Auth / RBAC (`platform/auth/`)
- **Customer:** `/auth/otp/request` → Redis OTP (5 min TTL, 45 s cooldown, `service.py:83`) → `/auth/otp/verify` (`:157`) find-or-creates the `User`. SMS goes through `sms_client.py` (`SMS_MODE` = `console` or `sendpk`).
- **Rider:** OTP register and login (`authenticate_rider` `:208`).
- **Restaurant:** password login (`:347`, does **not** check `status`) or OTP.
- **Admin:** password login (`:383`) puts `permissions` and `must_change_password` in the JWT.
- **Tokens:** `jwt_utils.py`, HS256. Access token 30 min; refresh token 30 days, stored hashed, rotated (`refresh_access_token` `:322`).
- **Guards** (`dependencies.py`):
  - `get_current_user` (`:38`) checks `is_active` for customers and riders only.
  - `require_permission` (`:136`) is used for role and account admin, deletion management and rider commission.
  - The other `/admin/*` routes need only `require_admin = require_role(["admin"])` (`modules/admin/routes.py:48`, 32 uses).
- **Restaurant scoping:** `_resolve_restaurant_id` falls back to the **first restaurant** (`modules/food_delivery/routes.py:228`).

### Order lifecycle (`modules/food_delivery/service.py`)
1. **Cart:** Redis, 7-day TTL (`:1353`).
2. **Checkout:** `preview_checkout` (`:1656`) and `place_order` (`:1722`) reprice from Postgres. Route distance comes from the Directions API with a Haversine fallback. The route requires an `Idempotency-Key`. Orders are created as `Accepted`. `Digital` gets a 400 unless `ONLINE_PAYMENTS_ENABLED` (default `False`, `core/config.py:128`).
3. **Restaurant:** `update_order_status` (`:854`): Accepted → Preparing → Ready for Pickup. Ready for Pickup auto-assigns the nearest eligible rider (`_find_nearest_rider` `:595`) → `Rider Assigned`. Reject → Cancelled (`:827`).
4. **Rider:** `rider_respond_to_assignment` (`:927`) accepts or rejects (a reject re-dispatches). The sweeper expires ignored offers (`expire_stale_rider_assignments` `:717`, `SKIP LOCKED`).
5. **Delivery:** `rider_advance_delivery_status` (`:1009`): arrived → picked up → on the way → delivered. All transitions share `ORDER_STATUS_TRANSITIONS` (`:567`).
6. **Admin:** cancel or reassign (`modules/admin/service.py:393,413`). Customer: history, reorder, rating (`:1891`, `:1970`).

### Money flow
- **Customer total** = food (GST inclusive or exclusive, `tax.py`) + delivery fee `100 + 25×km` (`:1520-1530`, no distance cap) + `PLATFORM_FEE` 15 (`:1527`).
- **Frozen at placement:** `commission = calculate_commission(net_subtotal, restaurant.commission_rate)` (`:1130`); `restaurant_payable = net − commission + GST`; `rider_earning = delivery_fee × 0.90` (`wallet_payment/service.py:56`).
- **On Delivered:** `apply_delivery_commission` credits the rider wallet with 90% of the fee (`:160`). For COD, `pending_cash_owed += total_amount`; at `CASH_COLLECTION_CAP` (5000) the rider is forced offline (`:200`).
- **Wallet recharge:** `POST /wallet/recharge` credits **any amount immediately, with no payment check** (`:97`).
- **Online gate:** going online needs `kit_completed` and to be under the COD cap (`:131`).
- **COD cash:** rider deposit (`:241`, expected amount computed server-side `:212`) → admin approval (`:279`) lowers `pending_cash_owed`.
- **Payouts:** settlements (`modules/admin/service.py:468`) and rider payouts (`:602`) sum frozen order values per period. `mark-paid` only flips a status; no payout rail exists.

## 3. Env vars (names only)
- **backend** (`core/config.py`; * = required):
  - Core: `ENVIRONMENT` (default `development`), `DATABASE_URL`*, `JWT_SECRET`*, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`, `REDIS_URL`*.
  - Storage: `AWS_ACCESS_KEY_ID`*, `AWS_SECRET_ACCESS_KEY`*, `AWS_REGION`, `S3_BUCKET_NAME`, `S3_ENDPOINT_URL`, `SUPABASE_URL`, `SUPABASE_STORAGE_URL`.
  - Maps: `GOOGLE_MAPS_API_KEY`*, `GOOGLE_PLACES_API_KEY`, `MAPS_DAILY_CALL_BUDGET`.
  - Web and seeding: `ALLOWED_ORIGINS`, `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD` (default `admin123`, `:94`).
  - Push: `FIREBASE_CREDENTIALS_JSON`, `FIREBASE_CREDENTIALS_PATH`, `WEB_PUSH_BASE_URL`.
  - Dispatch: `RIDER_ASSIGNMENT_TIMEOUT_SECONDS`, `ASSIGNMENT_SWEEPER_INTERVAL_SECONDS`, `ASSIGNMENT_SWEEPER_ENABLED`, `CASH_COLLECTION_CAP`.
  - SMS: `SMS_MODE`, `SENDPK_API_URL`, `SENDPK_API_KEY`, `SENDPK_SENDER_ID`, `SENDPK_TEMPLATE_ID`, `OTP_TEMPLATE`.
  - Flags and deletion: `ONLINE_PAYMENTS_ENABLED`, `DELETION_REVIEW_JOB_ENABLED`, `DELETION_REVIEW_JOB_INTERVAL_SECONDS`, `RIDER_DELETION_GRACE_DAYS` (7), `DELETION_REQUEST_OVERDUE_DAYS` (30), `ALLOW_EARLY_ADMIN_APPROVAL`. The draft branch uses different names (`DELETION_COOLING_OFF_DAYS` etc.). The job's startup log prints these day values with an "s" suffix (`core/deletion_review_job.py:72`); they are days.
- **website** (Vercel project settings):
  - `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_USE_MOCKS`.
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only).
  - Firebase: `NEXT_PUBLIC_FIREBASE_API_KEY`, `_PROJECT_ID`, `_SENDER_ID` (`lib/firebase/client.ts:12`), `_APP_ID`, `_VAPID_KEY`.
  - Other: `BACKEND_INTERNAL_URL`, `NEXT_PUBLIC_API_URL`, `DOCKER_BUILD`.
- **mobile_app:**
  - `--dart-define=API_BASE_URL`.
  - `MAPS_API_KEY` from `android/local.properties` or the environment (`android/app/build.gradle.kts:24`); iOS `GOOGLE_MAPS_API_KEY` (`ios/Runner/Info.plist:46`).
  - `android/key.properties` for signing; without it, release builds are debug-signed.
- **CI:** `LIGHTSAIL_HOST`, `LIGHTSAIL_USER`, `LIGHTSAIL_SSH_KEY`.

## 4. CI/CD, deploy and production state
- **Topology (owner-confirmed):**
  - Backend: AWS Lightsail $12, Ubuntu, `~/speedymeals/backend/`.
  - DB: Supabase Postgres, Free plan; the org is **over quota**, with restriction from **18 Nov 2026** (dashboard). Pro upgrade requested.
  - Website: Vercel (Git integration).
  - Secrets: `.env` files on the server.
- **Pipeline:** `.github/workflows/deploy-backend.yaml`. On a push to `main` touching `backend/**`, it SSHes in and runs `git pull`, then `docker compose up -d --build api redis`, then `alembic upgrade head`. There are no tests, health check or rollback. Website and mobile have no pipeline in the repo.
- **Server facts (2026-10-22):**
  - **nginx:** `api.speedymealservices.com` on 443 (Certbot) and a default server on 80, both `proxy_pass http://127.0.0.1:8000`.
  - **Runtime:** Docker `api` serves `:8000` and Redis runs in Docker, bound to `127.0.0.1:6379`. The legacy systemd unit `speedymeals` is disabled and inactive.
  - **Health check:** `bash ~/speedymeals/backend/scripts/healthcheck.sh` is read-only and exits 1 on any FAIL. Last run on 2026-10-22: 0 FAIL, 0 WARN (local and public `/health`, migrations at head `d4a7c9e1f2b3`, Redis reachable, nginx valid, Firebase key present).
  - **Outage ~20–22 Oct (resolved 2026-10-22):** `api` exited with `Can't locate revision 'a9b8c7d6e5f4'`. Fix: `alembic_version` was re-stamped to `e8b7a6c5d4f3`, then `d4a7c9e1f2b3` was applied on restart. RLS on the new `deletion_requests` table was enabled manually (owner-confirmed). The draft's leftover tables and columns (`account_deletion_*`, `users.deleted_at`, `riders.deleted_at`, `riders.deletion_requested_at`) remain unused in the database.
  - **Env files:** `backend/.env` (`REDIS_URL` host `localhost`, plus `ALLOWED_ORIGINS`, `SUPABASE_*`, `S3_ENDPOINT_URL`, `FIREBASE_CREDENTIALS_PATH`) and `backend/app/.env` (`REDIS_URL` host `redis`). Neither sets `ENVIRONMENT`.
  - **Gotcha:** under systemd, `app/.env` wins, so `REDIS_URL=redis://redis…` is unresolvable on the host and Redis silently falls back to memory.
  - **Push:** `backend/serviceAccountKey.json` was empty. It was replaced with a key for Firebase project `speedymeals-84af9` and verified with an FCM `dry_run` send from the `api` container (2026-10-22). End-to-end delivery to a device has **not** been tested.
  - **Uncommitted:** `backend/docker-compose.yml` was hand-edited on the server, then reset by mistake.
- **Firewall:** open 22, 80, 443 (IPv4 only) and 8000 (public). Closed 5432 and 6379. Port 8000 is **not needed by any client**: the mobile app uses HTTPS on 443 (§1) and nginx reaches the API on `127.0.0.1:8000`. It can be closed (§6 #10).

## 5. Code vs code mismatches (trust the "Truth" column)
| # | Where | Claim | Truth |
|---|---|---|---|
| 1 | `modules/food_delivery/service.py:605` | Eligibility = online + wallet ≥ 500 + location | `rider_eligible_for_assignment` (`wallet_payment/service.py:434`) checks online + fresh location only |
| 2 | `modules/food_delivery/service.py:1151` | `calculate_commission` not wired into orders | `place_order` uses it |
| 3 | `modules/admin/service.py:605` | Rider payout = 100% of delivery fee | 90% (`wallet_payment/service.py:56`) |
| 4 | `mobile_app/lib/core/config/api_config.dart:59` | Backend var `SMS_PROVIDER_MODE` | `SMS_MODE` (`console`/`sendpk`) |
| 5 | `backend/app/core/config.py:4` | Secrets come from Secrets Manager | Plain `.env` on the server |
| 6 | `backend/app/main.py:172` | Logs via `journalctl -u speedymeals` | CI deploys Docker; the systemd unit exists but is inactive (§4) |
| 7 | `../AGENTS.md` (workspace root) §1B-C | Every migration must GRANT ALL to anon plus a public SELECT policy (also baked into `d4a7c9e1f2b3`) | Contradicts the 10-03 security migration; a `USING (true)` policy would expose a table. **Do not follow blindly.** |
| 8 | `platform/auth/service.py:557` | Seed is a no-op when an admin exists | Rewrites the existing admin's email domain and role each start |
| 9 | `mobile_app/lib/core/constants/app_constants.dart:54` | Deletion page at `/delete-account` | Not in `main`'s website (only on branch `account-deletion`): **404, a Play Store risk** |
| 10 | `backend/app/.env.example` | Lists backend env vars | Missing about 15 (see §3) |
| 11 | `.gitignore` NEXT.JS section | Web app at `admin_web/` | It's `website/` |
| 12 | Root `README.md`, `docker-compose.yml` | Entry docs and compose | Both 0 bytes |

## 6. Top risks (most severe first)
1. **CRITICAL: local development writes to the production DB.**
   - A draft migration (`a9b8c7d6e5f4`) run from a developer machine whose `.env` points at production Supabase took the API down for about 2 days (§4; resolved 2026-10-22).
   - Nothing stops it happening again: there's no separate dev or staging database, and `tests/conftest.py` uses whatever `DATABASE_URL` is set.
   - Fix: a separate dev database, and never run `alembic upgrade` locally against production.
2. **CRITICAL: free wallet money.** `recharge_wallet` credits any amount with no payment (`wallet_payment/service.py:97`). Digital checkout is safely gated off.
3. **HIGH: no safety net.** CI deploys and migrates with no tests or rollback. The Free plan has no restorable backups. The Supabase quota deadline is 18 Nov 2026. Tests use the configured DB, which may be production (`tests/conftest.py`).
4. **HIGH: restaurants can drive rider states.** The restaurant `PATCH …/status` shares `ORDER_STATUS_TRANSITIONS` (`:567`, `:854`). A restaurant can set `Rider Assigned` with no rider, or walk an order to `Delivered`, skipping commission and COD accrual (`:1009`).
5. **HIGH: cross-tenant fallback.**
   - `_resolve_restaurant_id` returns the first restaurant (`routes.py:228`).
   - Restaurant password login ignores `status` (`service.py:347`).
   - Restaurant and admin `is_active` isn't checked per request.
6. **HIGH: refresh drops admin claims.** `refresh_access_token` returns `issue_tokens(…, record.role)` without `permissions` or `must_change_password` (`service.py:344`). RBAC is also half-enforced (§2).
7. **HIGH: production runs as `development`.** With no `ENVIRONMENT` set:
   - The demo restaurant (`Partner@123`) is seeded.
   - Password-reset links with live tokens print to the logs (`service.py:473`).
   - Redis can fall back to memory unnoticed (`core/redis_client.py:226`), and the rate limiter fails open.
8. **MEDIUM (owner-accepted for now, test data only): hardcoded credentials.**
   - The website auto-logs in with `admin123` and `Partner@123` (`website/lib/api/client.ts:148,177`).
   - The seeded admin defaults to `admin123` (`core/config.py:94`).
   - **Must be removed before real customer data.**
9. **MEDIUM: Supabase grants.**
   - `anon` and `authenticated` hold ALL on all 24 public tables (verified 2026-10-22).
   - RLS is on everywhere, and only `partner_registrations` has policies (anon INSERT). Nothing is exposed today, but one permissive policy exposes a table.
   - Revoke the grants and fix the `AGENTS.md` rule.
10. **MEDIUM: port 8000 is publicly open on Lightsail, and no client needs it.** The API is reachable over plain HTTP, bypassing nginx and TLS. The mobile app's release URL is HTTPS without a port (owner-confirmed 2026-10-23), and nginx only needs `127.0.0.1:8000`.
    - Fix: delete the Custom TCP 8000 rule in Lightsail → Networking → Firewall, and publish the API on loopback only (`"127.0.0.1:8000:8000"` in `backend/docker-compose.yml`; `healthcheck.sh` and nginx still work).
    - Check first that Vercel's `NEXT_PUBLIC_API_BASE_URL` is the HTTPS host, and that no older test APK or script calls `:8000`.

## 7. Open questions (owner/team to answer; agents must not assume)
1. **Rider pay:** riders get 90% of each delivery fee credited to their wallet on delivery (`wallet_payment/service.py:160`), and admins also generate `rider_payouts` from the same `rider_earning` (`modules/admin/service.py:602`). Is the wallet the payout, or are payouts paid on top? If both, riders are paid twice.
2. **Wallet recharge:** until a payment gateway exists, should recharges stay instant, or become pending until an admin confirms them (like COD deposits)?
3. **Mobile backend URL — RESOLVED (owner, 2026-10-23):** release APKs use `--dart-define=API_BASE_URL=https://…` with no `:8000`, so port 8000 can be closed (§6 #10). Still to record: the exact host string from the mobile developer's build command.
4. **Settlement periods:** generation is idempotent only for an identical period (`modules/admin/service.py:468,602`). Should overlapping periods be blocked?

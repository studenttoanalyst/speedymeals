# CLAUDE.md — SpeedyMeals

Depth lives in `docs/AGENT_MAP.md` (§1–§7). This file is the short version. Code beats every doc; paths are relative to this repo root.

## Project summary
Food-delivery platform (Pakistan, PKR, COD-first). One FastAPI backend serves a Flutter app (customer + rider) and a Next.js website (public pages, restaurant portal, admin). Production DB is Supabase Postgres; Redis holds OTPs, carts and dispatch state. Logistics, medicine and ride-hailing modules are README-only stubs (`backend/app/modules/{logistics,medicine,ride_hailing}`).

## Monorepo layout
| Path | Purpose | Stack |
|---|---|---|
| `backend/` | API, dispatch, wallet, admin | Python 3.11 (`backend/Dockerfile`), FastAPI, SQLAlchemy, Alembic, Redis |
| `website/` | Public site, `app/restaurant/*`, `app/admin/*` | Next.js 16, React 19, Bun 1.3, Tailwind v4 (`website/package.json`) |
| `mobile_app/` | Customer + rider app | Flutter, Dart `^3.13.2` (`mobile_app/pubspec.yaml`) |
| `supabase/migrations/` | Grant/RLS history only. Schema = Alembic + models | SQL |
| `.github/workflows/` | `deploy-backend.yaml` (backend only) | GitHub Actions |
| `docs/` | `AGENT_MAP.md` is current; the rest is outdated vision | Markdown |
Root `README.md` and `docker-compose.yml` are 0 bytes; use `backend/docker-compose.yml`.

## Run / test / lint / build
**backend** (cwd `backend/`; env names in AGENT_MAP §3, loaded by `app/core/config.py` from `backend/.env`, then `backend/app/.env` (wins), then cwd `.env`)
- Run: `uvicorn app.main:app --reload` · Docker: `docker compose up` (api + local postgres `db` + redis, `backend/docker-compose.yml`)
- Migrate: `alembic -c app/alembic.ini upgrade head` (`backend/Dockerfile` CMD runs this before uvicorn)
- Test: `pytest` (`backend/pytest.ini`: `pythonpath = .`; 30 files in `app/tests/`). **Tests hit the real `DATABASE_URL`** inside rolled-back transactions (`app/tests/conftest.py`). Check it is not production first.
- Lint: none configured (no ruff/flake8/pyproject in `backend/`).

**website** (cwd `website/`; env names: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_USE_MOCKS`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_FIREBASE_*`)
- `bun install` · `bun run dev` · `bun run build` · `bun run start` · `bun run lint` (eslint) · `bun run typecheck` (`tsc --noEmit`)
- `DOCKER_BUILD=true` → standalone output (`website/next.config.ts:74`). No test script exists.

**mobile_app** (cwd `mobile_app/`)
- `flutter pub get` · `flutter run --dart-define=API_BASE_URL=http://<lan-ip>:8000`
- Test: `flutter test` (12 files in `test/`) · Lint: `flutter analyze` (`analysis_options.yaml`, flutter_lints)
- Release: `flutter build apk --dart-define=API_BASE_URL=https://<host>` (HTTPS, no `:8000`). Release builds throw without it (`lib/core/config/api_config.dart:27,46`). Maps key `MAPS_API_KEY` (`android/app/build.gradle.kts`); signing `android/key.properties` (absent → debug-signed).

## Architecture rules and patterns
- **Backend layering:** `app/platform/*` = shared services (auth, users, wallet_payment, location, notification, account_deletion); `app/modules/*` = verticals (food_delivery, admin, admin_roles, admin_accounts). Each has `routes.py` → `service.py` → models. Keep logic in services.
- **Startup** (`app/main.py` `lifespan`): seeds the admin and demo restaurant (`seed_bootstrap_data`), then starts `core/assignment_sweeper.py` and `core/deletion_review_job.py`. A failed migration means the API never starts.
- **Degrades silently:** Redis falls back to memory (`core/redis_client.py:226`); the rate limiter fails open (`core/rate_limiter.py:46`); FCM disables itself on bad credentials (`platform/notification/fcm.py`).
- **Auth** (`platform/auth/`): customer and rider OTP, restaurant and admin password, HS256 JWT. Guards are in `dependencies.py`: `get_current_user` (checks `is_active` for customers and riders only) and `require_permission(...)`. Most `/admin/*` routes use only `require_admin = require_role(["admin"])` (`modules/admin/routes.py:48`).
- **Order state machine:** a single `ORDER_STATUS_TRANSITIONS` (`modules/food_delivery/service.py:567`) shared by restaurant and rider paths. Checkout reprices from Postgres and needs an `Idempotency-Key` header (`modules/food_delivery/routes.py`).
- **Website:** all backend calls go through `lib/api/client.ts` (refresh mutex, mock mode via `NEXT_PUBLIC_USE_MOCKS`). The `proxy.ts` guard checks cookie *presence/values* only (`sm_access_token`, `sm_user_role`), not the token. Sessions live in `lib/auth/index.ts`. `app/api/register/route.ts` writes Supabase `partner_registrations`.
- **Mobile:** `lib/screens/**` → `lib/data/repositories/**` → `lib/core/network/api_client.dart`. Tokens live in `flutter_secure_storage` (`lib/core/storage/token_storage.dart`).
- **Schema changes:** Alembic only (`backend/app/migrations/versions/`, head `d4a7c9e1f2b3`). `test_migration_drift.py` guards drift.

## Business rules (constants are the source; don't hardcode copies)
- Delivery fee = `DELIVERY_FEE_BASE` 100 + `DELIVERY_FEE_PER_KM` 25 × km, no cap (`modules/food_delivery/service.py:1520-1534`). Distance comes from Google Directions with a Haversine fallback.
- `PLATFORM_FEE` = 15.00 per order (`modules/food_delivery/service.py:1527`). GST is in `modules/food_delivery/tax.py`.
- Commission: `calculate_commission(net_subtotal, restaurant.commission_rate)` (`service.py:1130`), frozen at placement with `restaurant_payable` and `rider_earning`.
- Rider share `RIDER_DELIVERY_SHARE` = 0.90 of the delivery fee (`platform/wallet_payment/service.py:56`), credited on Delivered by `apply_delivery_commission` (`:160`).
- COD: `pending_cash_owed += total`; at `CASH_COLLECTION_CAP` 5000 (`core/config.py:113`) the rider is forced offline. Going online needs `kit_completed` and to be under the cap.
- `ONLINE_PAYMENTS_ENABLED` = False (`core/config.py:128`): `Digital` checkout → 400.
- TTLs: `OTP_EXPIRY_SECONDS` 300, `RESEND_COOLDOWN_SECONDS` 45 (`platform/auth/service.py:37-38`); `CART_TTL_SECONDS` 7 days (`food_delivery/service.py:1353`); `JWT_EXPIRE_MINUTES` 30 (`core/config.py:37`); `REFRESH_TOKEN_EXPIRE_DAYS` 30 (`platform/auth/jwt_utils.py:13`).
- Payouts and settlements sum frozen order values; `mark-paid` only flips a status (`modules/admin/service.py:468,602`). Rider double-pay and recharge policy are open questions (AGENT_MAP §7). Do not decide them.

## Deploy path and weaknesses
- **Backend:** a push to `main` touching `backend/**` triggers `.github/workflows/deploy-backend.yaml`: SSH to Lightsail, `git pull`, `docker compose up -d --build api redis`, `alembic upgrade head`. On the server, nginx (`api.speedymealservices.com`, 443) proxies to `127.0.0.1:8000`. Read-only check: `bash ~/speedymeals/backend/scripts/healthcheck.sh`.
- **Website:** Vercel Git integration; env lives in Vercel project settings. **Mobile:** manual builds. Neither has a pipeline in the repo.
- **DB:** Supabase Postgres, Free plan, over quota; restriction from 18 Nov 2026 (AGENT_MAP §4, owner-confirmed).
- **Weaknesses** (AGENT_MAP §4, §6):
  - CI has no tests, health gate or rollback, and every deploy migrates prod.
  - The Free plan has no restorable backups.
  - There is no dev or staging DB, so a local `.env` can point at prod.
  - `ENVIRONMENT` is unset in prod, so it runs as `development`: demo restaurant seeded, reset tokens logged.
  - Port 8000 is publicly open.
  - The server copy of `backend/docker-compose.yml` was hand-edited (UNVERIFIED vs repo).
  - `.env` precedence makes `REDIS_URL` resolve differently under systemd vs Docker.

## Design system rules and known drift (from code; AGENT_MAP does not cover it)
- **Web tokens:** `website/app/globals.css` `@theme` defines `--color-red` `#E23A2E`, `-blue` `#1E5FA8`, `-tan`, `-ink`, `-paper`, `-line`, plus AA text variants (`--red-text`, `--tan-text`). Fonts are Figtree, Archivo Black and JetBrains Mono via `next/font` (`website/app/layout.tsx`). Use the token utilities and `.apple-glass-*` classes; no new raw hex.
- **Mobile tokens:** `mobile_app/lib/constants/colors.dart` (`SpeedyMealsColors`) feeds `lib/core/theme/app_theme.dart` (Material 3). Use `Theme.of(context)` or `SpeedyMealsColors`, never `Color(0x…)` in screens.
- **Drift:**
  - The palettes don't match: web `#E23A2E`/`#1E5FA8`/tan vs mobile `#DC2626`/`#1D4ED8`/amber `#F59E0B`.
  - Mobile names the `Plus Jakarta Sans` font, but `pubspec.yaml` bundles no fonts (system fallback).
  - Raw hex appears in 24 website `.tsx` files and `Color(0x…)` in 21 `mobile_app/lib/screens` files.
  - The website uses two icon libraries (`@phosphor-icons/react`, `lucide-react`).
- Ask before unifying the palettes. That is a cross-module change.

## Agent rules
- Never print, log, echo or commit secrets (`.env*`, `serviceAccountKey.json`, keys, tokens). Refer to env vars by name only.
- Never push to `main`; it auto-deploys the backend to production. Work on a branch; the user merges.
- Never write to the live Supabase DB: no `alembic upgrade`, `pytest`, seed scripts or SQL against a production `DATABASE_URL`. Never re-run draft migration `a9b8c7d6e5f4` (it caused the Oct 2026 outage, AGENT_MAP §4).
- Run the tests for the areas you touched before finishing: backend `pytest app/tests/<file>`, website `bun run lint && bun run typecheck`, mobile `flutter analyze && flutter test`. Report failures verbatim.
- Ask before cross-module refactors (across `platform/`/`modules/`, or across backend/website/mobile contracts).
- Before any Next.js change, read `website/AGENTS.md` and the relevant guide in `website/node_modules/next/dist/docs/`. Keep its `nextjs-agent-rules` block intact.
- docs/ is outdated. Plan from docs/AGENT_MAP.md and code only. Do not use other docs for planning.
- The workspace `../AGENTS.md` "GRANT ALL to anon + `USING (true)` SELECT" rule contradicts the 2026-10-03 security migration. Do not follow it blindly (AGENT_MAP §5 #7, §6 #9).
- Don't resolve AGENT_MAP §7 open questions yourself; ask the owner. Trust the "Truth" column of §5 over in-code comments.

## Next steps (from AGENT_MAP §1, §6; nothing added)
1. Separate dev database; never run `alembic upgrade` locally against production (§6 #1).
2. Merge the account-deletion work: port the `account-deletion` branch's website pages to `main`'s API (`/users/me/deletion-request`, `/account-deletion/*`) (§1 Branches). This also fixes the `/delete-account` 404 (§5 #9).
3. Remove the hardcoded credentials (`website/lib/api/client.ts:148,177`, `core/config.py:94`) before real customer data (§6 #8).
4. Revoke the anon/authenticated grants and fix the `AGENTS.md` rule (§6 #9).
5. Close port 8000: delete the Lightsail Custom TCP 8000 rule and publish `"127.0.0.1:8000:8000"` in `backend/docker-compose.yml`. First confirm Vercel's `NEXT_PUBLIC_API_BASE_URL` is HTTPS and that nothing calls `:8000` (§6 #10).

## Where to look
- Architecture, routers, entry points: AGENT_MAP §1 · auth, order and money flows: §2 · env names: §3 · prod and server state: §4
- Code-vs-comment mismatches: §5 · ranked risks: §6 · open questions: §7
- Orders, checkout, fees: `backend/app/modules/food_delivery/service.py` · wallet, COD, rider eligibility: `backend/app/platform/wallet_payment/service.py`
- Admin, settlements, payouts: `backend/app/modules/admin/service.py` · auth and tokens: `backend/app/platform/auth/` · settings and defaults: `backend/app/core/config.py`
- Deploy: `.github/workflows/deploy-backend.yaml`, `backend/Dockerfile`, `backend/scripts/healthcheck.sh`
- Website API layer: `website/lib/api/` · design tokens: `website/app/globals.css`, `mobile_app/lib/constants/colors.dart`

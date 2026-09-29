# Speedy Meals — Complete Project Report

> **Report type:** READ-ONLY static analysis of the workspace.
> **Scope:** Full repository scan (Flutter client + FastAPI backend + config + docs).
> **Date:** September 26, 2026
> **Note:** No existing file was modified while producing this report. This is the only new file created.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Folder / File Structure](#2-folder--file-structure)
3. [Backend Details](#3-backend-details)
4. [Frontend Details](#4-frontend-details)
5. [Dependencies](#5-dependencies)
6. [Environment / Config](#6-environment--config)
7. [Deployment Info](#7-deployment-info)
8. [Known Issues / TODOs](#8-known-issues--todos)
9. [Summary](#9-summary)

---

## 1. Project Overview

**Speedy Meals** is a cross-platform **food delivery platform** built for the Pakistani market (prices in PKR). It has three user sides plus an admin surface:

- **Customers** — sign in with phone + OTP, browse restaurants near a saved address, add items to a cart, check out (Cash-on-Delivery or a stub "Digital" method), and track orders through their delivery lifecycle.
- **Riders** — verify by OTP, are approved by an admin, go online, receive auto-assigned jobs, advance an order through *pickup → out for delivery → delivered*, and accumulate earnings in a wallet.
- **Restaurants** — log in with credentials and manage their menu and orders (backend API only; **no restaurant UI in this repo**).
- **Admin** — approve riders, manage restaurants, intervene on orders, generate settlements/rider payouts, and view cash discrepancies and reports (backend API only; **no admin UI in this repo**).

### Tech Stack

| Layer | Technology |
|---|---|
| Mobile / client | **Flutter** (Dart SDK `^3.13.2`), Material 3, multi-platform (Android, iOS, Web, Windows, macOS, Linux) |
| Backend | **FastAPI 0.115** (async Python), Uvicorn |
| ORM / validation | **SQLAlchemy 2.0** (typed `Mapped` models), **Pydantic 2** / pydantic-settings |
| Database | **PostgreSQL 15** (durable state), **Alembic** migrations |
| Cache / ephemeral | **Redis 7** (OTP store, rate limiting, per-restaurant carts, rider live location) |
| Auth | Phone OTP + **JWT** access/refresh tokens (python-jose, passlib/bcrypt), role-based |
| Storage | **AWS S3** (rider documents, menu photos) via boto3 |
| Maps | **Google Maps Distance Matrix** (delivery fee calc) |
| Payments | COD (working) + "Digital" (documented **stub**) |
| Notifications | In-app feed derived from `GET /orders` (no push/FCM) |
| Containerization | Docker + docker-compose (api + postgres:15 + redis:7) |

### Current Status

**MVP-ready but NOT production-ready.** The Flutter app and FastAPI backend are integrated: screens → repositories → `ApiClient` → HTTP → FastAPI → PostgreSQL/Redis. Remaining production blockers are documented in `README.md` and `MISSING.md`: SMS/OTP is **console-mode**, the payment gateway is a **stub**, notifications are **polled / order-derived**, there is **no admin/restaurant UI**, and the backend test suite requires a live Postgres + Redis to run.

---

## 2. Folder / File Structure

### Top-level tree

```
speedy_meals/
├── .env                          # Local root env (same keys as backend .env)
├── .env.example (in backend/app) # Template for backend config
├── .gitignore
├── .metadata                     # Flutter project metadata
├── analysis_options.yaml         # Dart/Flutter lint configuration
├── pubspec.yaml / pubspec.lock   # Flutter dependency manifest
├── README.md                     # Primary project documentation
├── MISSING.md                    # Honest gap / known-limitations list
├── INTEGRATION_REPORT.md         # Flutter ↔ backend integration summary
├── FLUTTER_BACKEND_INTEGRATION_REPORT.md
├── PROJECT_DOCUMENTATION_AND_CLIENT_REPORT.md
├── REPORT.md / Check.md / Backend_development.md
├── AUTH_DATABASE_FIX_REPORT.md   # Auth/DB fix notes
├── DEMO_ACCOUNT.md               # Demo customer + OTP instructions
├── speedy_meals.iml              # IntelliJ module file
│
├── lib/                          # ── Flutter application source ──
│   ├── main.dart                 # App entry, branded error widget, splash → login
│   ├── constants/                # colors.dart
│   ├── core/                     # Config, network, storage, theme, constants
│   ├── data/                     # json_utils, models/, repositories/
│   ├── models/                   # Legacy models (order.dart, restaurant.dart)
│   ├── screens/                  # All UI screens (auth, cart, checkout, dashboard, menu, orders, profile, rider, tracking, notifications)
│   ├── services/                 # Legacy app services (auth façade, cart, notifications)
│   └── widgets/                  # home_navigation.dart (bottom-nav shell)
│
├── backend/                      # ── FastAPI backend ──
│   ├── Dockerfile                # python:3.11-slim image
│   ├── docker-compose.yml        # api + postgres:15 + redis:7
│   ├── pytest.ini                # pytest config (pythonpath = .)
│   ├── scripts/
│   │   └── seed_demo_customer.py # Idempotent demo-customer seeder (not auto-run)
│   ├── docs/                     # Backend development docs
│   └── app/
│       ├── main.py               # FastAPI app, CORS, routers, admin seed on startup
│       ├── requirements.txt
│       ├── .env / .env.example
│       ├── alembic.ini
│       ├── core/                 # config, database, security, redis, rate_limiter, maps_client, storage, base_model
│       ├── migrations/           # Alembic env + versions (13 tables + refresh_tokens)
│       ├── platform/             # Cross-cutting domains
│       │   ├── auth/             # OTP + JWT (routes/schemas/service/models/jwt_utils/dependencies)
│       │   ├── users/            # Profiles + addresses
│       │   ├── wallet_payment/   # Rider wallet, payments, riders, documents, settlements/payouts
│       │   ├── location/         # README only (placeholder)
│       │   └── notification/     # README only (placeholder)
│       ├── modules/              # Business modules
│       │   ├── food_delivery/    # Restaurants, menu, cart, orders, riders
│       │   ├── admin/            # Admin routes/service/schemas
│       │   ├── logistics/        # README only (placeholder)
│       │   ├── medicine/         # README only (placeholder)
│       │   └── ride_hailing/     # README only (placeholder)
│       └── tests/                # 18 test modules + conftest (293 test functions)
│
├── test/                         # ── Flutter tests ──
│   ├── widget_test.dart
│   └── critical_flows_test.dart  # 6 offline-safe regression widget tests
│
├── assets/
│   ├── images/                   # logo.png, "new logo.png"
│   └── stitch_speedy_meals_app_ui_design/   # HTML mockups + PNG screens + DESIGN.md (design reference)
│
├── android/ ios/ linux/ macos/ windows/ web/   # Flutter platform shells
│
└── build/ .dart_tool/ .idea/ .vscode/          # Generated / IDE files (not source)
```

### Purpose of major folders

| Folder | Purpose |
|---|---|
| `lib/core/` | Single source for API base URL (`api_config.dart`), HTTP client (`api_client.dart`), typed errors, secure token storage, theme, app constants/enums. |
| `lib/data/models/` | Dart models with `fromJson`/`toJson` and nullable-safe parsing (cart, catalog, order, rider, user). |
| `lib/data/repositories/` | Own endpoint calls and JSON → model mapping (auth, user, restaurant, cart, order, rider). |
| `lib/screens/` | All UI, grouped by feature (auth, cart, checkout, dashboard, menu, orders, profile, rider, tracking, notifications). |
| `lib/services/` | Legacy app-level singleton services (`ChangeNotifier`): auth façade, cart, derived notifications. |
| `backend/app/platform/` | Cross-cutting domains usable by any vertical (auth, users, wallet/payment). |
| `backend/app/modules/` | Business verticals (food_delivery active; admin active; logistics/medicine/ride_hailing are README stubs). |
| `backend/app/core/` | Config, DB session, security/JWT helpers, Redis client, rate limiter, maps client, S3 storage, base model. |
| `backend/app/tests/` | Pytest suite for auth, cart, checkout, order lifecycle E2E, tracking, riders, wallet math, admin. |

---

## 3. Backend Details

### Framework & architecture

- **Framework:** FastAPI (async), Uvicorn server.
- **Pattern:** `routers → services → SQLAlchemy models`, with Pydantic schemas for I/O. Routers stay thin; business logic lives in `service.py`.
- **Entry point:** `backend/app/main.py` — creates `FastAPI(title="SpeedyMeals API", version="0.1.0")`, adds CORS middleware, includes 7 routers, seeds the first admin on startup, and exposes `GET /health`.
- **CORS:** `CORS_ORIGINS` is a comma-separated allow-list or `"*"`. Credentials are enabled only when explicit origins are configured (a wildcard is incompatible with credentialed requests).

### Databases

- **PostgreSQL 15** — durable state. Models and Alembic migrations define **13 core tables** plus a `refresh_tokens` table:

```
admins, restaurants, riders, users, addresses, cash_deposits,
menu_items, rider_payouts, settlements, orders, order_items,
ratings, wallet_transactions, refresh_tokens
```

- **Redis 7** — OTP store, rate limiting, per-restaurant carts, rider live location.
- **S3** — rider documents (CNIC / license / vehicle photo) and menu photos.
- Migrations are under `backend/app/migrations/versions/`:
  - `ea1fe1cee296_create_all_13_tables.py`
  - `b1c2d3e4f5a6_create_refresh_tokens_table.py`

### Models (SQLAlchemy 2.0)

| Table | Model | Key fields |
|---|---|---|
| `admins` | `Admin` | email, password_hash, role (`super_admin`/`support`), is_active |
| `refresh_tokens` | `RefreshToken` | subject_id, role, token_hash (SHA-256), status, expires_at |
| `users` | `User` | phone_number (unique), name, email, wallet_balance, country_code, is_active |
| `addresses` | `Address` | user_id (FK), label, latitude, longitude, full_address, is_default |
| `restaurants` | `Restaurant` | name, email, password_hash, phone, lat/lng, commission_rate, status, hours, currency |
| `menu_items` | `MenuItem` | restaurant_id (FK), name, description, price, category, photo_url, variants (JSONB), is_available |
| `orders` | `Order` | user/restaurant/rider/address FKs, status, payment_method, subtotal, distance_km, delivery_fee, total, commission, restaurant_payable, rider_earning, placed_at, delivered_at |
| `order_items` | `OrderItem` | order_id, menu_item_id, quantity, selected_variant, price_at_order |
| `ratings` | `Rating` | order_id, user_id, restaurant_rating, rider_rating, comment |
| `riders` | `Rider` | phone, cnic, vehicle fields, photo URLs, approval_status, wallet_balance, pending_cash_owed, is_online, lat/lng |
| `wallet_transactions` | `WalletTransaction` | rider_id, order_id (nullable), type (`recharge`/`deduction`), amount, balance_after |
| `cash_deposits` | `CashDeposit` | rider_id, amount_submitted, expected_amount, discrepancy, verified_by_admin |
| `settlements` | `Settlement` | restaurant_id, period, total_sales, commission_deducted, net_payable, status, paid_at |
| `rider_payouts` | `RiderPayout` | rider_id, period, total_earning, status, paid_at |

Common columns come from `BaseModel` (UUID `id`, created_at) and `UpdatedAtMixin` (updated_at).

### API Endpoints (by router prefix)

**Auth — `/auth`**

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/otp/request` | Request an OTP for a customer |
| POST | `/auth/otp/verify` | Verify customer OTP → tokens |
| POST | `/auth/rider/otp/verify` | Verify rider OTP → tokens |
| POST | `/auth/restaurant/login` | Restaurant credential login |
| POST | `/auth/restaurant/otp/verify` | Restaurant OTP verify |
| POST | `/auth/admin/login` | Admin credential login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current identity from JWT |

**Users — `/users`**

| Method | Path | Purpose |
|---|---|---|
| GET | `/users/me` | Get profile |
| PUT | `/users/me` | Update profile |
| GET | `/users/me/addresses` | List addresses |
| POST | `/users/me/addresses` | Add address |
| PUT | `/users/me/addresses/{address_id}` | Edit address |
| DELETE | `/users/me/addresses/{address_id}` | Delete address |

**Wallet / Rider — `/wallet`**

| Method | Path | Purpose |
|---|---|---|
| POST | `/wallet/recharge` | Recharge rider wallet |
| GET | `/wallet/balance` | Wallet summary |
| GET | `/wallet/profile` | Rider profile + approval state |
| GET | `/wallet/assignments` | Auto-assigned jobs |
| PATCH | `/wallet/status` | Online/offline toggle |
| POST | `/wallet/cash-deposit` | Submit collected cash |
| GET | `/wallet/cod-eligibility` | COD eligibility gate |
| GET | `/wallet/earnings` | Earnings summary |
| PATCH | `/wallet/location` | Push rider live GPS |
| POST | `/wallet/assignments/{order_id}/respond` | Accept / reject a job |
| PATCH | `/wallet/deliveries/{order_id}/status/{arrived\|picked-up\|on-the-way\|delivered}` | Delivery lifecycle |
| POST | `/wallet/documents/{doc_type}` | Upload rider document |

**Customer / Restaurants — `/restaurants`**

| Method | Path | Purpose |
|---|---|---|
| GET | `/restaurants` | Browse (radius/search around an address) |
| GET | `/restaurants/{id}/menu` | Menu grouped by category |
| GET | `/restaurants/{id}/cart` | Get per-restaurant cart |
| POST | `/restaurants/{id}/cart/items` | Add item |
| PATCH | `/restaurants/{id}/cart/items/{item_id}` | Update quantity |
| DELETE | `/restaurants/{id}/cart/items/{item_id}` | Remove item |
| DELETE | `/restaurants/{id}/cart` | Clear cart |
| GET | `/restaurants/{id}/cart/checkout-preview` | Server-authoritative totals |
| POST | `/restaurants/{id}/cart/checkout` | Place order |

**Restaurant menu management — `/restaurants/me/menu-items`**

`GET` list · `POST` create · `PUT /{menu_item_id}` update · `DELETE /{menu_item_id}` · `PATCH /{menu_item_id}/availability` · `POST /{menu_item_id}/photo` (multipart upload).

**Restaurant orders — `/restaurants/me/orders`**

`GET` list (status/date filters) · `GET /{order_id}` detail · `PATCH /{order_id}/status` (accept / prepare / ready).

**Customer orders — `/orders`**

`GET` order history · `GET /{order_id}/track` tracking · `POST /{order_id}/reorder` · `POST /{order_id}/rating`.

**Admin — `/admin`**

Dashboard (`GET /admin/dashboard`); Restaurants (`POST`, `GET`, `GET /{id}`, `PATCH /{id}/status`, `PATCH /{id}/commission`, `POST /{id}/reset-credentials`); Riders (`GET`, `GET /{id}`, `PATCH /{id}/approval`, `PATCH /{id}/status`); Orders (`GET`, `GET /{id}`, `POST /{id}/cancel`, `PATCH /{id}/reassign`); Settlements (`POST /generate`, `GET`, `POST /{id}/mark-paid`); Rider payouts (same shape); `GET /admin/cash-discrepancies`; `GET /admin/reports`.

### Order lifecycle

```
Accepted → Preparing → Ready for Pickup → Rider Assigned
Rider Assigned → Accepted by Rider | Rejected (→ re-assign)
Accepted by Rider → Arrived at Restaurant → Picked Up → On the Way → Delivered
Terminal: Delivered | Cancelled (admin)
```

Delivery triggers side effects (rider wallet credit, cash accounting) on `Delivered`.

### Security

- Rider approval is **enforced server-side** on protected delivery endpoints.
- Admin routes are role-gated; role separation: customer / rider / restaurant / admin.
- JWT access/refresh with single-use OTPs and revoked-token tracking; secrets come from environment.
- Passwords hashed with bcrypt; refresh tokens stored only as SHA-256 hashes.
- Menu photo and document uploads size-limited (`MAX_MENU_PHOTO_SIZE_BYTES`).

---

## 4. Frontend Details

### Framework & architecture

- **Framework:** Flutter (Material 3), Dart SDK `^3.13.2`.
- **Layering rule:** `screens/` never perform HTTP directly → `data/repositories/` own calls & mapping → `core/network/api_client.dart` owns base URL, headers, timeouts, auth, retry-on-401 and error mapping → FastAPI.
- **HTTP:** `package:http`, deliberately free of `dart:io` so the same code compiles for Flutter web.
- **Error handling:** `lib/core/network/api_exception.dart` maps 400/401/403/404/409/422/429/500/503, timeouts and no-network into typed `ApiErrorKind`s.
- **Session:** `flutter_secure_storage` holds JWT; `ApiClient` injects the bearer header, refreshes once on 401 (single-flight guard), and fires `onSessionExpired` to bounce to login.
- **Base URL resolution:** `--dart-define=API_BASE_URL` wins → release uses `_productionUrl` → debug Android emulator uses `http://10.0.2.2:8000` → otherwise `http://localhost:8000`.

### State management approach

The project's **existing approach is preserved — no third-party state library was introduced**:

- **`ChangeNotifier` singletons** in `lib/services/` (`AuthService`, `CartService`, `NotificationService`) — app-level shared state (cart badge, notifications, auth façade).
- **`setState` / `FutureBuilder`** inside screens for local, per-screen state and async loads.
- **`InheritedWidget`** style scope for cart access (`CartScope`) in widget tests.
- No Provider / Riverpod / Bloc / GetX anywhere.

### Main screens

| Area | Screens (`lib/screens/`) |
|---|---|
| Auth | `login_screen`, `register_as_screen`, `customer_login_screen`, `customer_signup_screen`, `otp_verification_screen`, `customer_forgot_password_screen`, `rider_login_screen`, `rider_signup_screen`, `rider_forgot_password_screen` |
| Dashboard | `dashboard/dashboard_screen` (real restaurants + search + popular items) |
| Menu | `menu/restaurant_detail_screen`, `menu/menu_screen` |
| Cart / Checkout | `cart/cart_screen`, `checkout/checkout_screen` |
| Orders / Tracking | `orders/order_history_screen`, `tracking/track_orders_tab`, `tracking/order_tracking_screen` (polls `GET /orders/{id}/track`, 15 s interval, stops on terminal) |
| Notifications | `notifications/notifications_screen` (derived from orders) |
| Profile | `profile/profile_screen`, `profile/edit_profile_screen`, `profile/saved_addresses_screen` |
| Rider | `rider/rider_dashboard_screen`, `rider/rider_wallet_screen`, `rider/rider_documents_screen` (read-only status) |
| Shell | `widgets/home_navigation.dart` (bottom-nav `IndexedStack`) |

### Platform config

- **Android:** `INTERNET` + location permissions; `network_security_config.xml` permits cleartext **only** for `10.0.2.2`, `localhost`, `127.0.0.1` (local dev), everything else HTTPS-only.
- **iOS:** location usage strings + ATS exception for local dev.

### Tests (Flutter)

- `test/critical_flows_test.dart` — 6 offline-safe widget/flow tests (cart empty state, checkout renders, dashboard search, navigation to profile, profile sections, empty notifications).
- `test/widget_test.dart` — smoke test.
- These verify rendering/navigation and graceful no-backend behaviour; they do **not** exercise a live API.

---

## 5. Dependencies

### Flutter — `pubspec.yaml`

**Runtime dependencies**

| Package | Version | Purpose |
|---|---|---|
| `flutter` | SDK | Framework |
| `cupertino_icons` | ^1.0.8 | iOS-style icons |
| `http` | ^1.6.0 | REST calls to FastAPI |
| `flutter_secure_storage` | ^11.1.1 | Secure JWT persistence |
| `geolocator` | ^14.0.3 | GPS for rider live location / customer coords |
| `http_parser` | ^4.1.2 | `MediaType` for multipart uploads |
| `file_picker` | ^13.1.0 | File selection (uploads) |
| `shared_preferences` | ^2.5.5 | Local prefs (notification read state, etc.) |

**Dev dependencies**

| Package | Version | Purpose |
|---|---|---|
| `flutter_test` | SDK | Widget tests |
| `flutter_launcher_icons` | ^0.13.1 | Generate launcher icons from `assets/images/new logo.png` |
| `flutter_lints` | ^6.0.0 | Recommended lint set (`analysis_options.yaml`) |

> Note: `pubspec.yaml` declares these deps, but `README.md`/`MISSING.md` state the **rider document-upload UI is missing** in Flutter even though the backend endpoint exists. (The dependency list above is the current `pubspec.yaml`; treat the missing-UI note as the source of truth for UI gaps.)

### Backend — `app/requirements.txt`

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | 0.115.0 | Web framework |
| `uvicorn[standard]` | 0.30.6 | ASGI server |
| `sqlalchemy` | 2.0.35 | ORM |
| `alembic` | 1.13.2 | DB migrations |
| `psycopg2-binary` | 2.9.9 | PostgreSQL driver |
| `pydantic` | 2.9.2 | Validation/schemas |
| `pydantic-settings` | 2.5.2 | Env-based settings |
| `python-jose[cryptography]` | 3.3.0 | JWT encode/decode |
| `passlib[bcrypt]` | 1.7.4 | Password hashing |
| `bcrypt` | 4.0.1 | Hash backend |
| `redis` | 5.0.8 | Redis client |
| `boto3` | 1.35.24 | AWS S3 uploads |
| `httpx` | 0.27.2 | HTTP client (Maps / tests) |
| `python-dotenv` | 1.0.1 | .env loading |
| `python-multipart` | 0.0.9 | Multipart form / file uploads |
| `pytest` | 8.3.3 | Test runner |
| `pytest-asyncio` | 0.24.0 | Async tests |

---

## 6. Environment / Config

### Backend variables — consumed by `backend/app/core/config.py`

**Names only (values are intentionally omitted):**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_ALGORITHM` | JWT algorithm (default `HS256`) |
| `JWT_EXPIRE_MINUTES` | Access-token lifetime |
| `REDIS_URL` | Redis connection |
| `AWS_ACCESS_KEY_ID` | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | S3 secret |
| `AWS_REGION` | S3 region |
| `S3_BUCKET_NAME` | S3 bucket |
| `GOOGLE_MAPS_API_KEY` | Distance Matrix delivery fee |
| `SMS_PROVIDER_MODE` | `console` (dev default) or `production` |
| `SMS_API_KEY` | SMS provider key |
| `FIRST_ADMIN_EMAIL` | One-time first-admin seed |
| `FIRST_ADMIN_PASSWORD` | One-time first-admin password |
| `CASH_COLLECTION_CAP` | Rider COD cash cap (default `10000`) |
| `CORS_ORIGINS` | Comma-separated allowed origins (default `*`) |

Additional settings with defaults only (not always in `.env`): `JWT_ALGORITHM`, `AWS_REGION`, `CASH_COLLECTION_CAP`, `CORS_ORIGINS`.

**Files present:**

- `backend/app/.env.example` — documented template (placeholder values).
- `backend/app/.env` — real local config (**exists on disk; values never printed here**).
- `.env` at repo root — same key set as the backend `.env`.
- `backend/app/core/config.py` — defines *what* settings exist; loads values from `.env` (path resolved relative to `app/`, so `uvicorn app.main:app` run from `backend/` finds it).

### Frontend config

- `lib/core/config/api_config.dart` — single source for the backend base URL (override via `--dart-define=API_BASE_URL`).
- `lib/core/constants/app_constants.dart` — backend-aligned enums (roles, order statuses, payment methods, food categories) and display-only fee fallbacks.
- `analysis_options.yaml` — Flutter lint rules.
- `android/app/src/main/res/xml/network_security_config.xml` — cleartext allow-list for local dev hosts.
- `.vscode/settings.json`, `.idea/`, `speedy_meals.iml` — IDE config.

> ⚠️ Security note (from docs): do **not** commit real `.env`, JWT secrets, SMS keys, S3 keys or Google Maps keys. `FIRST_ADMIN_PASSWORD` ships as a placeholder and nothing enforces changing it.

---

## 7. Deployment Info

### Containerization

**`backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /backend
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**`backend/docker-compose.yml`** — three services:

| Service | Image / build | Ports | Notes |
|---|---|---|---|
| `api` | build `.` | `8000:8000` | Uses `./app/.env`, mounts `./app` as a volume, depends on db + redis |
| `db` | `postgres:15` | `5432:5432` | user/pass/db = `speedymeals`, named volume `postgres_data` |
| `redis` | `redis:7` | `6379:6379` | Ephemeral cache |

`GET /health` returns `{"status":"ok"}`, intended for Docker/deployment liveness checks.

### What is NOT present

- **No CI/CD** configuration (no `.github/` workflows, no GitLab/GitLab-CI, no Jenkins).
- **No cloud deployment manifests** (no AWS ECS/Lightsail/Terraform/K8s definitions found).
- **No monitoring/APM**, **no error tracking**, **no alerting**, **no backup strategy**.
- **No production secrets management** wired in (docs mention Secrets Manager as the intent, not implemented).
- Production API host is a **placeholder** (`https://api.speedymeals.pk` in `api_config.dart`).

> Note: `FLUTTER_BACKEND_INTEGRATION_REPORT.md` references a `website/` Next.js web portal (landing page + admin/restaurant shells). **No `website/` directory exists in the current working tree** — that documentation describes an earlier/other state and should be treated as historical.

---

## 8. Known Issues / TODOs

### Explicitly documented limitations

- **OTP is console-mode** — codes print to the uvicorn log (`[OTP-CONSOLE] ...`), not sent via SMS. Dev default by design.
- **Digital payment is a stub** — accepted by the API but no gateway is integrated; **not production ready**.
- **No push notifications / FCM** — the in-app feed is *derived from* `GET /orders`; there is no notifications backend.
- **No real-time updates** — polling (15 s) instead of WebSockets.
- **No admin frontend** and **no restaurant frontend** in this repository (APIs exist, UI does not).
- **Rider document-upload UI missing** in Flutter (backend `POST /wallet/documents/{doc_type}` exists; app shows read-only status).
- **Customer order cancellation** and **order rating** are backend-only (no Flutter UI; rating not surfaced).
- **Reorder** is implemented in the repository but not surfaced in the UI.
- **Delivery fee accuracy** depends on `GOOGLE_MAPS_API_KEY`; without it fallback distance/fee rules apply.
- **Backend test suite could not be executed** in the audit environment (needs live PostgreSQL + Redis + installed deps). Live DB/Redis flows are not verified end-to-end there.

### TODO / placeholder comments found in code

| Location | Note |
|---|---|
| `lib/core/config/api_config.dart:27` | `TODO(production): replace with the real deployed origin` — `_productionUrl` is a guess |
| `android/app/build.gradle.kts:18` | `TODO: Specify your own unique Application ID` |
| `android/app/build.gradle.kts:34` | `TODO: Add your own signing config for the release build` |
| `lib/screens/dashboard/dashboard_screen.dart` | 7 hardcoded category chips with **hotlinked Unsplash images** — placeholder static UI, no backend category endpoint |
| `backend/app/tests/test_wallet_payment.py:101` | TODO: cash-deposit discrepancy + earnings-window coverage (now filled by `test_wallet_money_math.py`) |
| `backend/app/platform/auth/service.py:114` | Customer created with placeholder `name="New User"` until profile updated |
| `linux/flutter/CMakeLists.txt`, `windows/flutter/CMakeLists.txt` | Upstream Flutter TODO comments (not project-specific) |
| `backend/app/modules/{logistics,medicine,ride_hailing}/README.md` | Placeholder modules (no implementation) |
| `backend/app/platform/{location,notification}/README.md` | Placeholder platform modules |
| `backend/app/modules/food_delivery/service.py:360` | Comment marking a feature intentionally deferred (Phase 6, not implemented) |

### Security / config concerns (from docs)

- Auto-seeded admin with a **placeholder password** (`FIRST_ADMIN_PASSWORD=change-this-before-first-run`) — nothing enforces a change after first run.
- `JWT_SECRET` example is a placeholder string; a real value must be supplied before deployment.
- Demo account (`DEMO_ACCOUNT.md`) was **not verified/created** — the environment lacked Python deps, PostgreSQL credentials, and Redis.

### Documentation drift

- `FLUTTER_BACKEND_INTEGRATION_REPORT.md` describes a `website/` Next.js portal with 23 TODO route shells. That folder is absent from the working tree; several root `.md` reports overlap and describe different points in time.

---

## 9. Summary

Speedy Meals is a **Flutter + FastAPI food-delivery platform** targeting the Pakistani market, with customer, rider, restaurant, and admin domains. The Flutter client (`lib/`, ~50 Dart files across core/data/screens/services) is cleanly layered — screens → repositories → a single `ApiClient` — with JWT auth in secure storage, `ChangeNotifier`-based app state, and no third-party state library. The backend (`backend/app/`) is a well-structured FastAPI app: 7 routers, ~76 endpoints, service-layer business logic, SQLAlchemy 2.0 models over **13 PostgreSQL tables + refresh tokens** (Alembic-migrated), Redis for OTP/carts/rate-limit/live location, and S3 for uploads.

The system is **functionally integrated and MVP-ready**, covering OTP login, browsing, cart/checkout, order lifecycle and tracking, rider assignment/wallet/cash handling, and admin operations. It is **not production-ready**: OTP is console-mode, digital payment is a stub, there are no push notifications or WebSockets, and there is no admin/restaurant UI. Deployment is limited to Docker/docker-compose for local/container runs — **no CI/CD, cloud manifests, monitoring, or backups** exist, and the backend test suite (18 modules, 293 tests) still requires a live Postgres + Redis to execute. Overall this is a solid, honestly documented **MVP** with a short, clearly listed path to production.

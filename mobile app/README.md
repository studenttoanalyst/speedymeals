<div align="center">

# ⚡ Speedy Meals

### Lightning Fast Food Delivery

A cross-platform food delivery platform: **Flutter** mobile app + **FastAPI** backend, built for the Pakistani market (PKR).

[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=flat-square&logo=flutter)](https://flutter.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)](https://redis.io)
[![Status](https://img.shields.io/badge/Status-MVP%20(not%20production)-orange?style=flat-square)](#production-readiness)

</div>

---

## 📋 Project Overview

Speedy Meals is a food delivery platform with three sides:

- **Customers** browse restaurants near a saved address, order food, pay with **COD** or a (stub) **Digital** method, and track the order through its delivery lifecycle.
- **Riders** verify by phone OTP, are **approved by an admin**, go online, receive auto-assigned jobs, advance an order through pickup → out for delivery → delivered, and accumulate earnings in a wallet.
- **Restaurants** log in with credentials, manage their menu and accept/prepare orders.

There is also an **admin** surface: rider approval, restaurant management, order intervention, settlements, rider payouts, cash discrepancies and reports.

> **Current Status:** The Flutter app and the FastAPI backend are integrated. The API layer, models, repositories and screens are wired to real endpoints — no fake orders or hardcoded restaurants remain in the customer/rider flow. The project is **MVP-ready** but **not production-ready**: SMS/OTP is console-mode, the payment gateway is a stub, notifications are order-derived rather than push, and the backend test suite could not be executed in this environment (see [Testing](#-testing)).

---

## 🏗️ Current Architecture

```
Flutter app (lib/)
   │  screens  →  repositories  →  ApiClient  →  HTTP
   ▼
FastAPI (backend/app/)
   │  routers → services → SQLAlchemy models
   ▼
PostgreSQL 15        Redis 7
(durable state)      (OTP store, rate limit, carts, rider live location)
```

**Flutter layer rules**

- `lib/screens/**` never performs HTTP directly.
- `lib/data/repositories/**` owns endpoint calls and JSON → Dart model mapping.
- `lib/core/network/api_client.dart` owns base URL, headers, timeout, error mapping.
- `lib/core/storage/token_storage.dart` owns secure token persistence.
- `lib/services/**` holds legacy app-level services (cart, auth façade, notifications).

**Backend layer rules**

- `backend/app/platform/**` — cross-cutting: `auth` (OTP + JWT), `users` (profile + addresses), `wallet_payment` (rider wallet, payments, rider profile/assignments/location/documents).
- `backend/app/modules/**` — `food_delivery` (restaurants, menu, cart, orders, riders) and `admin`.

---

## ✅ Features Currently Implemented

Legend: ✅ implemented & verified · ⚠️ partial · ❌ not implemented · 🧪 not fully tested

### Customer

| Feature | Status | Notes |
|---|---|---|
| Phone + OTP login | ✅ | `POST /auth/otp/request`, `POST /auth/otp/verify`; JWT stored in secure storage |
| Session restore / refresh / logout | ✅ | `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`; 401 → session cleared, auth guard on home shell |
| Profile view / edit | ✅ | `GET /users/me`, `PUT /users/me` |
| Address book (list / add / edit / delete / default) | ✅ | `GET|POST /users/me/addresses`, `PUT|DELETE /users/me/addresses/{id}` |
| Address is required for browsing | ✅ | Dashboard requires a real address; sends `address_id` + coordinates |
| Restaurant browsing | ✅ | `GET /restaurants` (radius search around the selected address) |
| Restaurant detail + menu | ✅ | `GET /restaurants/{id}`, `GET /restaurants/{id}/menu` |
| Search / popular items | ✅ | Derived from real fetched restaurants/menus, not mock lists |
| Cart | ✅ | `GET /restaurants/{id}/cart`, `POST /restaurants/{id}/cart/items`, `PATCH|DELETE /restaurants/{id}/cart/items/{itemId}`, `DELETE /restaurants/{id}/cart` — backend is source of truth; per-restaurant carts |
| Checkout | ✅ | Address + cart + payment method validated; **totals displayed are the backend's totals** |
| Payment method selection | ⚠️ | COD works end-to-end; Digital is an accepted value but a **stub** |
| Checkout preview (backend totals) | ✅ | `GET /restaurants/{id}/cart/checkout-preview` supplies subtotal/fee/total |
| Order creation | ✅ | `POST /restaurants/{id}/cart/checkout` — real order id returned, no fake ids |
| Order history | ✅ | `GET /orders` with loading / empty / error states |
| Order tracking | ✅ | `GET /orders/{id}/track`; polls active orders, stops on terminal state |
| Cancel order (customer) | ❌ | No customer cancel endpoint exists (only `POST /admin/orders/{id}/cancel`) |
| Reorder | ⚠️ | `POST /orders/{id}/reorder` implemented in the repository; not surfaced in the UI |
| Order rating | ⚠️ | `POST /orders/{id}/rating` implemented in the repository; not surfaced in the UI |

### Rider

| Feature | Status | Notes |
|---|---|---|
| Rider OTP login | ✅ | `POST /auth/rider/otp/verify` |
| Approval state | ✅ | `GET /wallet/profile`; banner shown; **backend enforces** approval on delivery endpoints |
| Dashboard (orders, wallet balance, status) | ✅ | `GET /wallet/assignments`, `GET /wallet/balance` |
| Online / offline toggle | ✅ | `PATCH /wallet/status`; Rs. 500 minimum shown/enforced from backend |
| Auto-assigned jobs | ✅ | `GET /wallet/assignments` |
| Accept / reject | ✅ | `POST /wallet/assignments/{orderId}/respond` |
| Delivery lifecycle | ✅ | `PATCH /wallet/deliveries/{orderId}/status/{arrived\|picked-up\|on-the-way\|delivered}` wired to UI buttons |
| Live location push | ✅ | `PATCH /wallet/location` with GPS + periodic refresh; permission/GPS failure handled |
| Wallet + earnings | ✅ | `GET /wallet/balance`, `GET /wallet/earnings`, `GET /wallet/cod-eligibility`; recharge via `POST /wallet/recharge`, cash deposit via `POST /wallet/cash-deposit` |
| Document upload | ❌ | Backend `POST /wallet/documents/{doc_type}` exists; **no Flutter upload UI** (no file-picker dependency) — status is displayed read-only |

### Restaurant

| Feature | Status | Notes |
|---|---|---|
| Credential login | ✅ | `POST /auth/restaurant/login` |
| Menu CRUD + availability + photo | ✅ | Backend complete; **no restaurant Flutter/web UI** in this repo |
| Accept / prepare / ready-for-pickup | ✅ | Backend complete; **no restaurant UI in this repo** |

### Admin

| Feature | Status | Notes |
|---|---|---|
| Rider approval / status | ✅ | `GET /admin/riders`, `PATCH /admin/riders/{id}/approval` |
| Restaurant management, commissions, credential reset | ✅ | Backend complete |
| Order cancel / reassign | ✅ | Backend complete |
| Settlements, rider payouts, cash discrepancies, reports | ✅ | Backend complete |
| Admin dashboard | ✅ | `GET /admin/dashboard` |
| Admin frontend | ❌ | **No admin UI exists in this repository** (API-only) |

### Payments

| Feature | Status | Notes |
|---|---|---|
| COD | ✅ | Full lifecycle incl. rider cash-collection cap and discrepancy reporting |
| Digital | ⚠️ | Accepted by the API but **stub — NOT PRODUCTION READY** (no gateway integration) |
| COD eligibility gate | ✅ | `GET /wallet/cod-eligibility` |
| Money math | ✅ | Delivery fee computed server-side (Google Maps Distance Matrix when configured); Flutter does **not** invent fees or taxes |

### Notifications

| Feature | Status | Notes |
|---|---|---|
| In-app notification feed | ✅ | **Derived from `GET /orders`** — no notification backend exists |
| Read / dismissed state | ✅ | Persisted locally |
| Push notifications / FCM | ❌ | No push backend |
| Real-time (WebSocket) updates | ❌ | Polling is the MVP mechanism |

### Tracking

| Feature | Status | Notes |
|---|---|---|
| All backend statuses mapped in Flutter | ✅ | pending, confirmed, preparing, ready_for_pickup, rider_assigned, picked_up, out_for_delivery, delivered, rejected, cancelled (wire values come from the backend) |
| Polling for active orders | ✅ | Interval-based, stops at terminal states, handles error/timeout |

---

## 📱 Flutter

- **Architecture:** screens → repositories → `ApiClient` → FastAPI, with a legacy `lib/services/` layer retained for cart/auth façade and notifications.
- **API layer:** `lib/core/config/api_config.dart` (single source of base URL), `lib/core/network/api_client.dart` (GET/POST/PUT/PATCH/DELETE, bearer auth, timeouts, error mapping), `lib/core/network/api_exception.dart` (typed errors for 400/401/403/404/409/422/429/500/503/timeout/no-network).
- **Models:** `lib/data/models/**` with `fromJson`/`toJson`, nullable-safe parsing (no blind casts).
- **Repositories:** `auth`, `user`, `restaurant`, `cart`, `order`, `rider`.
- **Auth:** phone + OTP → JWT; token in secure storage (`flutter_secure_storage`); automatic header injection; 401 handling; session restore.
- **Address:** selected address feeds restaurant browsing and checkout by real `address_id`.
- **State management:** the project's existing approach (`ChangeNotifier` / `InheritedWidget` / `FutureBuilder`) is preserved — no new state library was introduced.
- **Key screens:** login/OTP, dashboard (real restaurants + search + popular items), restaurant detail/menu, cart, checkout, tracking, order history, notifications, profile, edit profile, saved addresses, rider dashboard, rider wallet.
- **Platform config:** Android `INTERNET` + location permissions and a `network_security_config.xml` (cleartext only for local dev hosts); iOS location usage strings + ATS exception for local dev.

---

## 🖥️ Backend

- **Framework:** FastAPI (async) with SQLAlchemy 2.0 models and Pydantic schemas.
- **Auth:** phone OTP (`console` mode by default) + JWT access/refresh; role separation for customer / rider / restaurant / admin.
- **Database:** PostgreSQL 15. Models cover users, addresses, restaurants, menu items, orders + order items + status history, riders, rider documents, wallets + transactions, payments, settlements, payouts.
- **Redis:** OTP store, rate limiting, per-restaurant carts, rider live location.
- **Modules:** `platform/auth`, `platform/users`, `platform/wallet_payment`, `modules/food_delivery`, `modules/admin`.
- **Order lifecycle:** pending → confirmed → preparing → ready_for_pickup → rider_assigned → picked_up → out_for_delivery → delivered, plus rejected/cancelled, with side effects (wallet credit, cash accounting) on delivery.
- **Security:** rider approval enforced on protected delivery endpoints; admin-only routes gated; CORS configurable via `CORS_ORIGINS`; single-use OTPs; secrets via environment.
- **Tests:** 19 test files with **293 test functions** (auth, cart, checkout, order lifecycle E2E, tracking, status transitions, rider assignment/accept-reject/documents/location, wallet math, admin, restaurants) — see [Testing](#-testing).

---

## 🚀 Setup

### Prerequisites

- Flutter SDK 3.x (Dart 3)
- Python 3.11
- Docker (recommended) **or** PostgreSQL 15 + Redis 7 running locally

### 1. Backend

```bash
cd backend

# Fastest path: Postgres + Redis + API
docker compose up --build

# OR run the API locally against your own Postgres/Redis:
python -m venv .venv
# Windows (bash): source .venv/Scripts/activate
source .venv/bin/activate
pip install -r app/requirements.txt
cp app/.env.example app/.env         # then edit values
python -m uvicorn app.main:app --reload --port 8000
```

The API serves at `http://localhost:8000` (interactive docs at `/docs`).

### 2. Flutter app

```bash
flutter pub get
flutter run            # Android emulator maps the host as 10.0.2.2
```

Backend base URL is configured centrally (see [Environment / Configuration](#-environment--configuration)).

---

## 🔧 Environment / Configuration

Backend variables (documented in `backend/app/.env.example`, consumed by `backend/app/core/config.py`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (never commit a real value) |
| `JWT_ALGORITHM` | JWT algorithm (HS256) |
| `JWT_EXPIRE_MINUTES` | Access-token lifetime |
| `REDIS_URL` | Redis connection (OTP store, rate limit, carts, rider location) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET_NAME` | Rider document uploads (S3) |
| `GOOGLE_MAPS_API_KEY` | Distance Matrix — delivery fee calculation |
| `SMS_PROVIDER_MODE` | `console` (dev default) or `production` |
| `SMS_API_KEY` | SMS provider key (empty in dev) |
| `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` | One-time first-admin seed on startup — change after first run |
| `CORS_ORIGINS` | Comma-separated allowed origins for the API |

Flutter: the backend base URL is set in **`lib/core/config/api_config.dart`**. Local development defaults to `http://10.0.2.2:8000` for the Android emulator; use your machine's LAN IP for a physical device, or an override/environment value for production.

> ⚠️ Do **not** commit `app/.env`, real JWT secrets, SMS keys, S3 keys or Google Maps keys.

---

## ▶️ Running

**Backend**

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Flutter**

```bash
flutter run                    # debug on a connected device/emulator
flutter run -d chrome          # web (dev only)
flutter build apk --debug      # build an Android debug APK
```

---

## 🧪 Testing

Results from the final audit run in this environment (Windows, no live Postgres/Redis):

| Check | Command | Result |
|---|---|---|
| Flutter static analysis | `flutter analyze` | **PASS** — No issues found |
| Flutter tests | `flutter test` | **PASS** — 7/7 |
| Flutter Android build | `flutter build apk --debug` | **PASS** — `app-debug.apk` produced |
| Backend Python syntax | `python -m py_compile` (all modules) | **PASS** |
| Backend module/schema import validation | import of `app.main`, models, schemas | **PASS** |
| Backend tests | `pytest` | **NOT RUN** — see below |
| End-to-end customer flow | — | **NOT RUN** |
| End-to-end rider flow | — | **NOT RUN** |

**Why the backend tests were not run:** this environment has no backend virtualenv with dependencies installed, no PostgreSQL instance, and no Redis instance. The suite (293 tests) is written against real Postgres + Redis and an `app/.env`; it must be run where those exist:

```bash
cd backend
source .venv/bin/activate     # after pip install -r app/requirements.txt
pytest                        # or: pytest app/tests -v
```

Flutter tests are widget/flow tests with the platform channels mocked; they verify rendering, navigation and graceful no-backend behaviour — they do not exercise a live API.

---

## ⚠️ Known Limitations

- **OTP is console-mode** (`SMS_PROVIDER_MODE=console`): the code is written to the server log, not sent by SMS. This is a deliberate dev default, not production behaviour.
- **Digital payment is a stub** — no real gateway is integrated.
- **No push notifications.** The in-app feed derives entries from the order list; real-time order updates use polling, not WebSockets.
- **No admin / restaurant frontend in this repository** — those APIs exist but have no UI here.
- **Rider document upload UI is missing** in Flutter (backend endpoint exists).
- **Customer order cancellation and order rating** are backend-only; no Flutter UI.
- **Delivery fee accuracy** depends on `GOOGLE_MAPS_API_KEY`; without it the fallback distance/fee rules apply.
- Verified only on the checks listed above — the live database/Redis flows are **not yet verified end-to-end** in this environment.

---

## 🏁 Production Readiness

**MVP READY — NOT PRODUCTION READY.**

The customer and rider flows are code-complete against real APIs and the app builds and passes its own tests. Blockers before production: real SMS provider, payment gateway integration, push notifications, deployment/secrets management, and a green run of the backend test suite plus end-to-end verification against live PostgreSQL/Redis.

The detailed, honest gap list lives in **[MISSING.md](MISSING.md)**; the integration summary is in **[INTEGRATION_REPORT.md](INTEGRATION_REPORT.md)**.

---

## 📄 License

This project is private and not published to pub.dev.

<div align="center">

**Built with ❤️ using Flutter + FastAPI**

*Last updated: September 2026*

</div>

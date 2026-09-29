# Speedy Meals — Remaining Missing Functionality & Gaps

> Audit date: September 2026 · Basis: direct inspection of the current codebase.
> Every claim below was derived from reading the actual source, the route table, and the
> command output of `flutter analyze`, `flutter test`, `flutter build apk --debug`,
> `python -m py_compile` and module-import validation. Nothing is copied from an earlier report.

Legend used throughout:

| Term | Meaning |
|---|---|
| **IMPLEMENTED** | Code exists |
| **VERIFIED** | Actually executed / tested successfully |
| **PARTIAL** | Some functionality works, gaps remain |
| **NOT TESTED** | Could not be verified in this environment |
| **MISSING** | Functionality does not exist |
| **PRODUCTION BLOCKER** | Must be fixed before production |

---

## 1. Executive Summary

The Flutter app and the FastAPI backend are **integrated**. A proper API layer exists
(`lib/core/network/api_client.dart`), typed models, six repositories, secure token storage,
and the customer + rider screens call real endpoints. **All 32 request paths issued by the
Flutter repositories map to endpoints that actually exist in the backend route table** —
verified by extracting both sides and comparing them. There are no invented endpoints and
no fabricated order IDs, restaurants, menus, wallets or rider jobs left in the customer or
rider flows.

What is genuinely verified in *this* environment:

- `flutter analyze` → **PASS** (`No issues found`)
- `flutter test` → **PASS** (7/7)
- `flutter build apk --debug` → **PASS** (APK produced)
- Backend `py_compile` of every module → **PASS**
- Backend module / route / schema import validation → **PASS**

What is **not** verified and must not be reported as passing:

- The backend test suite (293 tests) was **NOT RUN** — no virtualenv with dependencies, no
  PostgreSQL, no Redis in this environment.
- Any end-to-end customer or rider flow against a live API — **NOT RUN** for the same reason.
- Physical-device behaviour (GPS, SMS delivery, payment gateway) — **NOT TESTED**.

The project is **MVP-ready** and **not production-ready**. The blockers are listed in §17.

---

## 2. Flutter Missing Functionality

| # | Feature | File / screen | Status | What's missing | Backend available? | Priority | Recommended action |
|---|---|---|---|---|---|---|---|
| 1 | Rider document upload | `lib/screens/rider/rider_dashboard_screen.dart` | PARTIAL | Only document *status* is displayed; no picker/upload. No file-picker or image-picker dependency exists in `pubspec.yaml` | ✅ `POST /wallet/documents/{doc_type}` | HIGH | Add `image_picker`/`file_picker`, multipart upload, per-doc-type flow (CNIC, licence, vehicle photo) |
| 2 | Customer order cancellation | — | MISSING | No UI **and** no endpoint (see §3) | ❌ | MEDIUM | Needs a backend endpoint first |
| 3 | Order rating UI | — | PARTIAL | `OrderRepository.rateOrder` calls `POST /orders/{id}/rating` but no screen invokes it | ✅ | MEDIUM | Add a rating prompt on delivered orders in order history |
| 4 | Reorder UI | — | PARTIAL | `OrderRepository` calls `POST /orders/{id}/reorder`; no screen invokes it | ✅ | MEDIUM | Add a "Reorder" button on past orders |
| 5 | Restaurant portal UI | — | MISSING | Backend has full restaurant login + menu CRUD + order status, but **no Flutter screen** for restaurant staff | ✅ (9 endpoints) | MEDIUM | Build a restaurant app/section, or scope it out as a separate client |
| 6 | Admin panel UI | — | MISSING | Backend has 23 admin endpoints; **no UI of any kind** exists in this repo | ✅ (23 endpoints) | MEDIUM | Build a web admin, or scope it out |
| 7 | Push notifications | — | MISSING | Notification feed is derived from `GET /orders`; read/dismiss persisted locally only | ❌ | HIGH | Add FCM + a notification backend |
| 8 | Real-time order updates | `lib/screens/tracking/order_tracking_screen.dart` | PARTIAL | Polling only; no WebSocket/SSE | ❌ | LOW (post-MVP) | Keep polling for MVP; revisit with a socket channel |
| 9 | Digital payment UI | `lib/screens/checkout/checkout_screen.dart` | PARTIAL | Method selectable, but the backend has no gateway — it is a stub | ⚠️ stub | HIGH | Integrate a real gateway before enabling |
| 10 | Dead screen | `lib/screens/menu/menu_screen.dart` | UNUSED | `MenuScreen` is defined but referenced nowhere — the menu lives in `restaurant_detail_screen.dart` | n/a | LOW | Delete or repurpose; kept in place to avoid removing existing work |
| 11 | Category taxonomy | `lib/screens/dashboard/dashboard_screen.dart` (`_categories`) | PLACEHOLDER | 7 hardcoded category chips ("Pizza", "Burgers", "Cloud Hub", …) with **hotlinked Unsplash images**; there is no backend category endpoint | ❌ | MEDIUM | Move images to local assets and/or add a category source to the backend |
| 12 | Order tracking map | `lib/screens/tracking/order_tracking_screen.dart` | PARTIAL | "Map View" is a stylised static mock, not a real map; no maps SDK dependency | ⚠️ needs maps SDK + API key | MEDIUM | Integrate `google_maps_flutter` with the backend's `GOOGLE_MAPS_API_KEY` |
| 13 | Production API base URL | `lib/core/config/api_config.dart` | PLACEHOLDER | `_productionUrl = 'https://api.speedymeals.pk'` is a placeholder guessing at the deploy host; override exists via `--dart-define=API_BASE_URL=...` | n/a | HIGH | Set the real deployed origin before shipping |

---

## 3. Backend Missing Functionality

> Scope note: this section only lists backend work that the **current frontend/project scope actually needs**. Generic backend wishlists are deliberately excluded. There is no "backend mein kya missing hai according to frontend" beyond the items below — all 32 Flutter request paths resolve to existing routes.

| # | Feature | Required endpoint / service | Current backend status | Flutter dependency | What's missing | Priority |
|---|---|---|---|---|---|---|
| 1 | Customer order cancellation | `POST /orders/{id}/cancel` | **MISSING** — only `POST /admin/orders/{id}/cancel` exists | No UI yet either | Endpoint, ownership check, status-transition guard, refund/cash handling for a paid order | MEDIUM |
| 2 | Real SMS delivery | SMS provider in `SMS_PROVIDER_MODE=production` path | STUB — `console` mode prints the OTP to the server log | OTP login (`POST /auth/otp/request`) | Provider integration, delivery retries, delivery-status handling | **PRODUCTION BLOCKER** |
| 3 | Real digital payment | `POST` payment intent/callback in `wallet_payment` | STUB — method value accepted, no gateway, no `payment_reference` round-trip against a provider | Checkout "Digital" option | Gateway client, webhook/callback verification, reconciliation | **PRODUCTION BLOCKER** |
| 4 | Notification backend | e.g. `GET /notifications` | **MISSING** — no notification module exists | Notification feed (currently derived client-side from `GET /orders`) | Table/model, per-user notification records, read state server-side, push registration | HIGH |
| 5 | Push delivery pipeline | FCM/APNs registration endpoint | **MISSING** | Push notifications | Device-token storage, send pipeline, order-event triggers | HIGH |
| 6 | Order status history exposure | Already persisted in DB (`order status history` model) | PARTIAL — history is stored but not exposed as a timeline to customers | Tracking timeline UI | A `GET /orders/{id}/timeline` (or extending the track response) | LOW |

---

## 4. Frontend ↔ Backend Gaps

**Verified to match:** request paths, payment-method vocabulary (`COD` / `Digital`), order-status
wire values, address-driven browsing (`address_id` + coordinates), and money calculations
(the app displays backend totals from `checkout-preview`; it does not add its own fee/tax).

**Real mismatches found:**

| # | Flutter expects | Backend provides | Impact | Severity |
|---|---|---|---|---|
| 1 | Rider document **upload** | Endpoint exists (`POST /wallet/documents/{doc_type}`) | Feature unreachable from the app | HIGH |
| 2 | A cancellation action for customers | Only admin-initiated cancellation | Customer cannot cancel | MEDIUM |
| 3 | A notification source | No notification API; app derives entries from `GET /orders` | Feed reflects order state only; no promos/support messages | MEDIUM |
| 4 | A category list from the backend | No category endpoint; categories are hardcoded client-side | Category chips can drift from the real catalogue | MEDIUM |
| 5 | Order rating / reorder surfaced in UI | Both endpoints exist | Dead repository methods | LOW |
| 6 | Restaurant + admin surfaces | 32 backend endpoints exist | Fully unused by any client | MEDIUM |

**No mismatches were found** in: request schemas for auth/cart/checkout, `order_id` /
`restaurant_id` / `address_id` / `item_id` handling, order-status wire values, or
payment-method values.

---

## 5. Mock / Hardcoded Data Remaining

Full-text search for `mock|dummy|sample|placeholder|fake|hardcoded|TODO|FIXME` was run across
`lib/`. Classification of every remaining hit:

| # | File | Data | Classification | Replacement needed? |
|---|---|---|---|---|
| 1 | `lib/screens/dashboard/dashboard_screen.dart:1627` | `_categories` — 7 category labels + **hotlinked Unsplash URLs** (`images.unsplash.com`) | **PLACEHOLDER / INTENTIONAL STATIC UI** | Yes — external image dependency; move to local assets or backend-driven categories |
| 2 | `lib/screens/tracking/order_tracking_screen.dart:14,542` | "stylised mock map" comment + `_MockTrackingData` reference; the map view is decorative | **INTENTIONAL STATIC UI** | Ideally replace with a real map (`google_maps_flutter`); the surrounding data is now real |
| 3 | `lib/core/config/api_config.dart:27` | `_productionUrl = 'https://api.speedymeals.pk'` | **PLACEHOLDER** | Yes — set the real host at deploy time |
| 4 | `lib/core/config/api_config.dart:25` | `TODO(production): replace with the real deployed origin` | **TODO** | Yes, before release |
| 5 | `lib/screens/menu/menu_screen.dart` | Entire `MenuScreen`, unreferenced | **UNUSED** | Remove or repurpose |
| 6 | `lib/services/*`, `lib/models/*` | Legacy façade/service layer retained alongside `lib/data/**` | **REAL** (working code, not mock) | No — intentional; keeps existing public APIs intact |
| 7 | `pubspec.yaml` / `assets/images/*` | Brand logo and icon assets | **REAL** | No |
| 8 | Naming-only hits — `_TrackingPlaceholder`, `_buildEmptyMenuPlaceholder`, `avatar placeholder`, `Image placeholder` | Loading/empty/error **UI states** | **INTENTIONAL STATIC UI** | No |

**Deleted in the integration and no longer present:** `sampleRestaurants` (4 fake restaurants,
11 fake dishes, fake reviews), the fake `_popularItems` rail and its external images, the
`_MockTrackingData` payload, seeded fake notifications, the fake `'SM-89241'` order id, and
the USD mock rider dashboard. Verified absent by search — comments at
`lib/models/restaurant.dart:220` and `lib/screens/dashboard/dashboard_screen.dart:1658`
record that removal.

**No hardcoded credentials, API keys, JWT secrets or tokens exist in `lib/`.**

---

## 6. Broken / Partially Working Features

| # | Feature | State | Detail |
|---|---|---|---|
| 1 | Digital payment | PARTIAL | Selectable but backed by a stub. **Not production ready** |
| 2 | Notifications | PARTIAL | Order-derived only; nothing else can notify the user |
| 3 | Order tracking map | PARTIAL | Decorative placeholder, not a real map |
| 4 | Rider document upload | PARTIAL | Status visible, upload impossible from the app |
| 5 | Category chips | PARTIAL | Hardcoded; also break visually with no network (Unsplash unreachable — degrades via `errorBuilder`) |
| 6 | Rating / reorder | PARTIAL | Repository methods exist, unreachable from the UI |

No screen was found that crashes on a missing backend: the dashboard, cart, checkout,
tracking, order history, notifications, profile, saved addresses and rider screens all
implement loading / empty / error states.

---

## 7. Untested Features

Everything below is **NOT TESTED** in this environment and must not be reported as passing:

**Blocked by missing infrastructure**

| Dependency | Blocks |
|---|---|
| PostgreSQL not running | Entire backend test suite (293 tests); real order creation; cart persistence; wallet/earnings; admin |
| Redis not running | OTP request/verify; rate limiting; per-restaurant carts; rider live location |
| Backend virtualenv / dependencies not installed | `pytest` in any form |
| `app/.env` absent | Any backend process start; config-dependent behaviour |

**Blocked by external services**

| Dependency | Blocks |
|---|---|
| SMS provider (`SMS_PROVIDER_MODE=console`) | Real OTP delivery to a phone |
| Payment gateway (not integrated) | Digital payment end-to-end |
| `GOOGLE_MAPS_API_KEY` | Accurate distance-based delivery fees |
| AWS S3 credentials | Rider document upload |
| FCM/APNs | Push notification delivery |

**Blocked by device / runtime**

| Dependency | Blocks |
|---|---|
| Android emulator/device not exercised | Manual UI walkthrough of every screen |
| iOS device/simulator not exercised | iOS-specific behaviour (permissions, ATS) |
| Real GPS hardware | Rider location accuracy, permission-denied/GPS-disabled paths on a real device |

**Flutter-side coverage:** the 7 passing Flutter tests are widget/flow tests with platform
channels mocked. They verify rendering, navigation and graceful no-backend behaviour. They do
**not** exercise a live API, so every repository method that performs HTTP is unverified at
runtime.

---

## 8. Security Gaps

| # | Item | Assessment | Notes |
|---|---|---|---|
| 1 | JWT secret | **SAFE (config)** | Read from env (`JWT_SECRET`); no hardcoded secret found in the repo |
| 2 | Token storage | **SAFE** | `flutter_secure_storage` (Keychain/Keystore), not plain `SharedPreferences` |
| 3 | Bearer auth on protected calls | **SAFE** | Injected centrally by `ApiClient` |
| 4 | Rider approval enforcement | **SAFE** | Approval is enforced **server-side**; the Flutter banner is cosmetic only and the backend remains the security boundary |
| 5 | Admin route protection | **SAFE** | Role-gated in the admin router/dependency |
| 6 | Role separation | **SAFE** | Distinct customer / rider / restaurant / admin token flows |
| 7 | CORS | **SAFE (configurable)** | Middleware present; origins via `CORS_ORIGINS`. **WARNING:** must be narrowed to real origins before production — a wide `*` is unsuitable for credentialed APIs |
| 8 | OTP handling | **WARNING** | Single-use with TTL in Redis, but in console mode the code is written to server logs — logs must not be shipped/retained in production |
| 9 | Rate limiting | **WARNING** | Backend rate limiting exists (Redis); coverage of *every* abuse-sensitive route was not verified in this audit |
| 10 | Secrets management | **WARNING** | `app/.env` is gitignored, but `.env.example` seeding the first admin means `FIRST_ADMIN_PASSWORD` must be changed before first production run |
| 11 | SQL injection | **SAFE (by construction)** | SQLAlchemy ORM/parameter binding; no raw string-built SQL found |
| 12 | Unauthorised order/wallet access | **SAFE (by construction)** | Ownership is enforced in the query layer |
| 13 | HTTP (cleartext) on device | **WARNING** | Android `network_security_config.xml` permits cleartext only for local dev hosts; iOS ATS exception is dev-scoped — both must stay out of production builds |
| 14 | Digital payment integrity | **CRITICAL (production)** | Stub payment path with no gateway verification. **Production blocker** |

No secret values are reproduced in this document.

---

## 9. Database Gaps

| # | Gap | Detail | Priority |
|---|---|---|---|
| 1 | Customer order cancellation audit trail | No dedicated cancellation reason/actor column surfaced for customer cancellations (endpoint does not exist either) | MEDIUM |
| 2 | Notification storage | No notifications table — the app currently derives and stores read state locally | HIGH |
| 3 | Device/push tokens | No device-token table for FCM/APNs | HIGH |
| 4 | Categories | No category entity; the client hardcodes the taxonomy | MEDIUM |
| 5 | Rating/reorder reachability | Tables/endpoints exist but the uniqueness and moderation rules for ratings were not verified in this audit | LOW |
| 6 | Backend test coverage of DB constraints | The suite (293 tests) is written against live Postgres and was not executed here, so constraint/cascade/index behaviour is **unverified in this environment** | HIGH |

Positive findings: models exist for users, addresses, restaurants, menu items, orders,
order items, order status history, riders, rider documents, wallets, wallet transactions,
payments, settlements and payouts. Foreign keys and ownership checks are enforced at the
query layer. The backend uses one database — no second/duplicate schema was introduced.

---

## 10. API Gaps

**Endpoint inventory (extracted from the route table): 75 endpoints.**

| Group | Endpoints | Flutter consumer? |
|---|---|---|
| Auth (`/auth`) | 9 | **6 used** — restaurant login, restaurant OTP verify, admin login unused |
| Users (`/users`) | 6 | **6 used** |
| Wallet / rider (`/wallet`) | 15 | **15 used** |
| Customer restaurants (`/restaurants`) | 9 | **8 used** — `DELETE /restaurants/{id}/cart` (clear cart) unused |
| Customer orders (`/orders`) | 4 | **4 used** |
| Restaurant menu (`/restaurants/me/menu-items`) | 6 | **0 used** |
| Restaurant orders (`/restaurants/me/orders`) | 3 | **0 used** |
| Admin (`/admin`) | 23 | **0 used** |
| **Total** | **75** | **39 used (52.0%), 36 unused** |

Calculation: the Flutter repositories issue **32 distinct request-path templates**, which expand
to **39 concrete endpoint calls** (`/users/me` is hit by both GET and PUT;
`/restaurants/{id}/cart/items/{itemId}` by PATCH and DELETE;
`/wallet/deliveries/{id}/status/{seg}` by four status segments). 39 ÷ 75 = 52.0%.
Counts are endpoint-by-endpoint from the route table, not estimates.

| # | Gap | Detail | Priority |
|---|---|---|---|
| 1 | 36 endpoints with no client | 6 restaurant-menu + 3 restaurant-order + 23 admin + 3 auth + 1 unused cart-clear = 36 endpoints are unreachable from any UI | MEDIUM |
| 2 | No notification endpoints | Documented in §3 | HIGH |
| 3 | No customer cancel endpoint | Documented in §3 | MEDIUM |
| 4 | Owner "unused endpoint" list | Kept intentionally — they implement the restaurant/admin product surfaces called for by the project docs | — |
| 5 | No API integration test run | Contract correctness is asserted by code reading, not by executed tests | HIGH |

**Not found:** any endpoint called by Flutter that does not exist. Any endpoint invented by
Flutter. Any Flutter path with a typo or a stale prefix.

---

## 11. Payment Gaps

| Item | Status |
|---|---|
| Cash on Delivery (COD) | **IMPLEMENTED** — full lifecycle, including the rider cash-collection cap and discrepancy reporting |
| COD eligibility gate (`GET /wallet/cod-eligibility`) | **IMPLEMENTED** |
| Wallet top-up (`POST /wallet/recharge`) | **IMPLEMENTED** |
| Rider cash deposit (`POST /wallet/cash-deposit`) | **IMPLEMENTED** |
| Money math (subtotal / delivery fee / total) | **IMPLEMENTED** — computed server-side; the app renders backend values and adds no fee or tax of its own |
| Delivery-fee accuracy | **PARTIAL** — depends on `GOOGLE_MAPS_API_KEY`; fallback rules apply without it |
| Digital payment | **STUB — NOT PRODUCTION READY.** The API accepts the value; no gateway, no verified reference, no reconciliation |
| Payment reference persistence | **UNVERIFIED** — storage exists but was not exercised (needs live DB) |
| Production gateway + webhooks | **MISSING — PRODUCTION BLOCKER** |

---

## 12. Rider Gaps

| Area | Status | Detail |
|---|---|---|
| Rider auth (phone OTP) | IMPLEMENTED | `POST /auth/rider/otp/verify` |
| Approval state surfaced | IMPLEMENTED | `GET /wallet/profile`; banner shown in the app |
| Approval **enforcement** | IMPLEMENTED (server-side) | Protected delivery endpoints run an approval check — an unapproved rider is refused |
| Online/offline + Rs. 500 minimum | IMPLEMENTED | `PATCH /wallet/status`; the minimum is the backend's rule and is displayed, not invented |
| Assignment discovery | IMPLEMENTED | `GET /wallet/assignments` |
| Accept / reject | IMPLEMENTED | `POST /wallet/assignments/{order_id}/respond` |
| Delivery lifecycle | IMPLEMENTED | arrived / picked-up / on-the-way / delivered |
| Location push | IMPLEMENTED | `PATCH /wallet/location`, GPS + periodic refresh, permission and GPS-off handled |
| Wallet + earnings | IMPLEMENTED | balance / earnings / cod-eligibility / recharge / cash-deposit |
| **Document upload** | **MISSING (frontend)** | Backend endpoint exists; no Flutter picker. **Not faked** |
| Document verification workflow | NOT TESTED | Admin side exists; not exercised |
| Real GPS accuracy on hardware | NOT TESTED | No device available |

---

## 13. Restaurant Gaps

| Area | Status |
|---|---|
| Restaurant login (credentials) | IMPLEMENTED (backend); **no Flutter UI** |
| Menu CRUD, availability, photo | IMPLEMENTED (backend, 6 endpoints); **no Flutter UI** |
| Accept / prepare / ready-for-pickup (`PATCH /restaurants/me/orders/{id}/status`) | IMPLEMENTED (backend); **no Flutter UI** |
| Restaurant order history | IMPLEMENTED (backend); **no Flutter UI** |
| Customer-facing restaurant list / menu / images | IMPLEMENTED and wired in Flutter |
| Restaurant images | PARTIAL — depends on what the backend returns; no image pipeline/CDN was verified |

---

## 14. Admin Gaps

| Area | Status |
|---|---|
| All 23 admin endpoints (riders, restaurants, orders, settlements, payout generation, cash discrepancies, reports, dashboard) | IMPLEMENTED (backend) |
| Admin authentication | IMPLEMENTED (`POST /auth/admin/login`) |
| **Admin UI (web or mobile)** | **MISSING — none exists in this repository** |
| First-admin seeding | IMPLEMENTED via `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` — **must be changed before production** |
| Admin action audit logging | UNVERIFIED in this environment |

---

## 15. Notifications Gaps

The current state is precisely this:

- **Not real.** There is no notification backend, no notifications table, no endpoint.
- **Polling/order-derived.** The in-app feed is built client-side from `GET /orders`, so it
  reflects order lifecycle changes only.
- **Local read/dismiss state.** Read and dismissed flags are persisted on the device, not on
  the server — they do not sync across devices and are lost on reinstall.
- **No push.** No FCM/APNs integration and no device-token registration.
- **No categories.** No promo, support, or system-message channel.
- **Remaining fake data:** none — verified. The previously seeded fake notifications were
  removed; the feed is empty without a backend and the screen renders that state correctly
  (covered by a passing widget test).

Consequence: a customer is only notified while the app is open and reaches the feed. Anything
requiring a nudge with the app closed (order ready, rider at the door) will not arrive.

---

## 16. Testing Gaps

| Layer | Status | Notes |
|---|---|---|
| `flutter analyze` | **PASS** | `No issues found!` |
| `flutter test` | **PASS** | 7/7 — widget/flow tests, platform channels mocked |
| `flutter build apk --debug` | **PASS** | APK produced |
| Flutter API-layer unit tests | **MISSING** | No tests for `ApiClient`, error mapping, or repository JSON parsing |
| Flutter error-state tests | **PARTIAL** | Empty/no-backend states covered; 401/403/429/500/timeout paths not covered |
| Backend Python syntax (`py_compile`) | **PASS** | All modules |
| Backend import/route/schema validation | **PASS** | `app.main` and modules import cleanly |
| Backend `pytest` (293 tests, 19 files) | **NOT RUN** | No virtualenv/deps, no PostgreSQL, no Redis, no `.env` |
| API contract tests | **NOT RUN** | Contract asserted by code reading only |
| Database tests | **NOT RUN** | Needs live PostgreSQL |
| E2E customer flow | **NOT RUN** | Needs live stack |
| E2E rider flow | **NOT RUN** | Needs live stack |
| Manual device walkthrough | **NOT RUN** | No emulator/device exercised |

**To close the backend gap:**

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows bash
pip install -r app/requirements.txt
cp app/.env.example app/.env                            # then set DATABASE_URL, REDIS_URL, JWT_SECRET
pytest
```

Alternatively `docker compose up --build` provides PostgreSQL 15 and Redis 7 on the expected ports.

---

## 17. Deployment / Production Gaps

| # | Area | Status | Detail |
|---|---|---|---|
| 1 | Environment | PARTIAL | `backend/app/.env.example` documents every variable; `app/.env` is gitignored. No separate prod config/secret store |
| 2 | Secrets | **PRODUCTION BLOCKER** | Real JWT secret, DB password, SMS key, S3 keys and Maps key must come from a managed secret store, never from a committed file |
| 3 | Database | PARTIAL | PostgreSQL 15 via `docker-compose.yml`; **no migrations/backup strategy verified**, no managed hosting |
| 4 | Redis | PARTIAL | Redis 7 in compose; **no persistence/replication strategy verified** — OTP, carts and rider location all live here |
| 5 | CORS | WARNING | Configurable but must be narrowed to real origins for production |
| 6 | SMS / OTP | **PRODUCTION BLOCKER** | Still console mode |
| 7 | Maps | PARTIAL | `GOOGLE_MAPS_API_KEY` required for accurate fees and any real map |
| 8 | File storage | PARTIAL | S3 configured for rider docs; no CDN/image pipeline for restaurant or menu images |
| 9 | Payments | **PRODUCTION BLOCKER** | No gateway |
| 10 | Monitoring / alerting | **MISSING** | No APM, error tracking, or alerting found |
| 11 | Logging | PARTIAL | Logging exists; console-mode OTPs mean log handling is security-sensitive |
| 12 | CI/CD | **MISSING** | No pipeline configuration found |
| 13 | Backups | **MISSING** | No documented backup/restore for PostgreSQL |
| 14 | Mobile release readiness | PARTIAL | Debug APK builds; no signing config, release build, or store metadata verified |
| 15 | Production API host | **MISSING** | `api_config.dart` still points at a placeholder origin |
| 16 | Rate limiting / abuse | PARTIAL | Backend rate limiting exists; full route coverage unverified |
| 17 | TLS | NOT VERIFIED | HTTPS termination assumed at the deploy layer; cleartext exceptions exist for local dev only |

---

## 18. Priority Action Plan

### CRITICAL (must be fixed first)

1. Run the backend test suite against live PostgreSQL + Redis and fix whatever fails. Nothing
   in this document should be treated as verified until `pytest` is green.
2. Run a real end-to-end customer and rider flow against the live stack.
3. Real SMS provider for OTP.
4. Real payment gateway, or explicitly disable "Digital" in the UI until one exists.
5. Secrets out of files and into a managed store; rotate the seeded admin password.

### HIGH (before pilot)

6. Rider document upload UI.
7. Push notifications + device-token registration + a notification backend.
8. Set the real production API origin in `lib/core/config/api_config.dart`.
9. Narrow CORS; remove cleartext/ATS dev exceptions from release builds.
10. Add Flutter tests for `ApiClient` error mapping and repository JSON parsing (401/403/429/500/timeout).

### MEDIUM (can follow)

11. Customer order cancellation (backend + UI).
12. Rating and reorder surfaced in the UI.
13. Category taxonomy server-side; move category images off Unsplash to local assets.
14. Real order-tracking map.
15. Decide the fate of the restaurant and admin surfaces (build a client or formally scope them out).
16. CI/CD pipeline, monitoring, and database backups.

### LOW (future)

17. Remove or repurpose the unused `MenuScreen`.
18. Order status timeline exposure.
19. WebSocket/SSE for live tracking once polling proves insufficient.
20. Consolidate the legacy `lib/services` + `lib/models` layer into `lib/data/**`.

---

## 19. Final Completion Summary

Counts are audited item-by-item from §2–§16, not estimated. Percentages are stated only where
the denominator is explicit.

### Flutter — §2 enumerates gaps only (13 rows)

| Bucket | Count | Items |
|---|---|---|
| Partial | 6 | rider upload, rating, reorder, digital payment, track map, category chips |
| Missing | 4 | customer cancel UI, restaurant UI, admin UI, push notifications |
| Unused / placeholder | 3 | dead `MenuScreen`, production URL placeholder, category data |

For the *complete* picture of Flutter feature status (including what does work), see the table
below.

Flutter feature status across the whole app — **47 feature rows**, enumerated in the README
matrix as customer (18) + rider (10) + restaurant (3) + admin (6) + payments (4) +
notifications (4) + tracking (2):

| Status | Count | Share | Which rows |
|---|---|---|---|
| IMPLEMENTED (code exists) | 38 | 80.9% | 14 customer + 9 rider + 3 restaurant + 5 admin + 3 payments + 2 notifications + 2 tracking |
| PARTIAL | 4 | 8.5% | payment-method selection, digital payment, reorder, rating |
| MISSING | 5 | 10.6% | customer cancel UI, rider document upload, admin frontend, push notifications, real-time updates |

Calculation: 18 + 10 + 3 + 6 + 4 + 4 + 2 = 47 rows. 38 + 4 + 5 = 47. 38 ÷ 47 = 80.85%,
4 ÷ 47 = 8.51%, 5 ÷ 47 = 10.64%. The three shares sum to 100%.

**Crucially: "IMPLEMENTED" here means code exists and `flutter analyze` passes — it does not
mean "verified at runtime".** Only 7 widget tests were executed; no HTTP path was exercised
against a live backend.

### Backend — endpoint level (§10)

| Bucket | Count | Share |
|---|---|---|
| Endpoints implemented | 75 | 100% |
| Endpoints with a Flutter consumer | 39 | 52.0% |
| Endpoints with no client | 36 | 48.0% |
| Endpoints verified by executed tests | 0 | 0% (suite not run) |

### Integration

| Bucket | Count | Share |
|---|---|---|
| Flutter request paths that resolve to a real endpoint | 32 of 32 | 100% |
| Invented endpoints found | 0 | — |
| Confirmed contract mismatches | 0 | — |
| Features blocked by a genuine missing backend capability | 2 (customer cancel, notifications) | — |

### Testing

| Bucket | Count |
|---|---|
| Passed | `flutter analyze`, `flutter test` (7/7), `flutter build apk --debug`, backend `py_compile`, backend import validation |
| Failed | 0 |
| Not run | backend `pytest` (293 tests), API contract tests, database tests, E2E customer flow, E2E rider flow, manual device walkthrough |
| Bugs found and fixed during this audit | Android internet/location permissions + network-security config; iOS location usage strings + ATS exception; rider-location reference; dashboard missing-address recovery affordance |

### Honest bottom line

Code completeness is high; **verified** completeness is not. The app builds, analyses clean and
passes its own tests, and every endpoint it calls exists. But the backend suite has never been
executed in this environment, no live flow has been run end to end, SMS and payments are stubs,
and notifications are not real. Treat this as **MVP-ready, not production-ready**.

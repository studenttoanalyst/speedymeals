# Speedy Meals — Flutter ⇄ FastAPI Integration Report

**Date:** 15 September 2026
**Scope:** Connect the EXISTING Flutter app (`lib/`) to the EXISTING FastAPI backend
(`backend/`) without redesigning the UI. Backend API/schema/DB is the source of truth.
**Predecessor document:** `FLUTTER_BACKEND_INTEGRATION_REPORT.md` (read-only audit) was used
as the checklist.

> This integration was started in a previous session (API client, models, repositories,
> auth layer, dashboard/cart/checkout/tracking wiring). This session **finished the
> integration**, closed the backend gaps it depended on, removed the remaining mock data,
> fixed the test suite, and verified the build.

---

## 1. Completed — frontend features now backed by the real backend

| Feature | Screen(s) | Backend call(s) |
|---|---|---|
| Splash auto-login / session restore | `auth/login_screen.dart` (`SplashScreen`) | `GET /auth/me`, `POST /auth/refresh` |
| Customer login (phone → OTP) | `customer_login_screen.dart` → `otp_verification_screen.dart` | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| Customer signup | `customer_signup_screen.dart` → OTP | `POST /auth/otp/verify` + `PUT /users/me` (name/email) |
| Rider login / signup (phone → OTP, CNIC + vehicle) | `rider_login_screen.dart`, `rider_signup_screen.dart` → OTP | `POST /auth/rider/otp/verify` |
| Token persistence, refresh, 401 handling, logout | `core/storage/token_storage.dart`, `core/network/api_client.dart`, `services/auth_service.dart` | `POST /auth/refresh`, `POST /auth/logout` |
| Profile view | `screens/profile/profile_screen.dart` | `GET /users/me` |
| Profile edit | `screens/profile/edit_profile_screen.dart` **(new)** | `PUT /users/me` |
| Address list / add (GPS or typed lat-lng) / set default / delete | `screens/profile/saved_addresses_screen.dart` **(new)** | `GET/POST /users/me/addresses`, `PUT/DELETE /users/me/addresses/{id}` |
| Restaurant browsing (location-aware) | `screens/dashboard/dashboard_screen.dart` | `GET /restaurants` |
| Restaurant detail + real menu (per restaurant) | `screens/menu/restaurant_detail_screen.dart` | `GET /restaurants/{id}/menu` |
| Cart (per-restaurant, add/inc/dec/remove/clear) | `screens/cart/cart_screen.dart`, `services/cart_service.dart` | `GET/POST/PATCH/DELETE /restaurants/{id}/cart…` |
| Checkout — real address, real totals, COD/Digital only | `screens/checkout/checkout_screen.dart` | `GET …/cart/checkout-preview`, `POST …/cart/checkout` |
| Order placement → real UUID + tracking | `checkout_screen.dart` → `order_tracking_screen.dart` | `POST …/cart/checkout` |
| Order history | `screens/orders/order_history_screen.dart` **(new)** + `track_orders_tab.dart` | `GET /orders` |
| Order tracking with polling (stops on terminal) | `screens/tracking/order_tracking_screen.dart` | `GET /orders/{id}/track` |
| Order rating | tracking screen | `POST /orders/{id}/rating` |
| Reorder | tracking/history | `POST /orders/{id}/reorder` |
| Rider dashboard: approval state, wallet, job board | `screens/rider/rider_dashboard_screen.dart` **(rewritten)** | `GET /wallet/profile`, `GET /wallet/assignments`, `GET /wallet/balance` |
| Rider online/offline (Rs. 500 floor surfaced) | rider dashboard | `PATCH /wallet/status` |
| Rider GPS push (+ periodic refresh while online) | rider dashboard | `PATCH /wallet/location` |
| Rider accept / reject | rider dashboard | `POST /wallet/assignments/{id}/respond` |
| Rider delivery flow (arrived → picked up → on the way → delivered) | rider dashboard | `PATCH /wallet/deliveries/{id}/status/…` |
| Rider wallet, earnings, COD cash deposit, recharge | `screens/rider/rider_wallet_screen.dart` **(new)** | `GET /wallet/earnings`, `GET /wallet/cod-eligibility`, `POST /wallet/recharge`, `POST /wallet/cash-deposit` |
| In-app notifications (order updates) | `services/notification_service.dart`, `notifications_screen.dart` | derived from `GET /orders` (no notification backend — see §3) |
| Auth guard on the authenticated shell | `widgets/home_navigation.dart` | session-expiry → back to auth entry |

### Architecture (unchanged conventions, per §25)
```
Screen → Service / Repository → ApiClient → FastAPI
```
- **No** state-management rewrite: the existing `ChangeNotifier` singletons
  (`AuthService`, `CartService`, `NotificationService`) are preserved.
- **No** raw HTTP in widgets: everything goes through `core/network/ApiClient`.
- Error handling centralised in `core/network/api_exception.dart`
  (400/401/402/403/404/409/422/429/500/503, timeout, offline).
- Base URL centralised in `core/config/api_config.dart` with `--dart-define=API_BASE_URL`,
  Android-emulator `10.0.2.2` and production fallbacks.

---

## 2. Backend changes (only what integration required)

| File | Change | Why |
|---|---|---|
| `app/main.py` | Added `CORSMiddleware` (origins from settings) | The audit found **no CORS at all**, which blocked every browser client. |
| `app/core/config.py` | Added `CORS_ORIGINS` setting (default `*`) | So CORS is configurable per environment without code changes. |
| `app/modules/food_delivery/schemas.py` | `OrderTrackingResponseSchema.restaurant_name` (optional) | The customer tracking screen must name the restaurant; the response previously carried only `restaurant_id`. |
| `app/modules/food_delivery/service.py` | `get_order_tracking` now returns `restaurant_name`; added `_assignment_payload`, `list_rider_assignments`; `rider_respond_to_assignment` / `rider_advance_delivery_status` now return the full assignment payload | The rider app needs the pickup/drop-off/items/earning on each job card. |
| `app/platform/wallet_payment/schemas.py` | Added `RiderProfileResponseSchema`, `RiderAssignmentAddressSchema`, `RiderAssignmentItemSchema`; extended `RiderAssignmentResponseSchema` / `DeliveryStatusResponseSchema` with optional restaurant/address/items fields | Same as above; optional so existing consumers still parse. |
| `app/platform/wallet_payment/service.py` | Added `get_rider_profile(db, rider_id)` | The audit found **no way for a rider to read its own `approval_status`**; the app needs it to explain refusals. |
| `app/platform/wallet_payment/routes.py` | Added `GET /wallet/profile`, `GET /wallet/assignments`; added `require_approved_rider` and applied it to accept/reject + the four delivery-status endpoints | **Security (audit A2/H1):** a `pending`/deactivated rider could previously accept and complete real deliveries. The backend is now the boundary. |

**Deliberately NOT changed:** the money model (`fee = 50 + km×20`, no platform fee, no tax),
the order state machine, RBAC, rate limits, the Redis cart design, and every working module.

---

## 3. Remaining — not connected because the backend does not support it

| Feature | Why it is not connected | Handling |
|---|---|---|
| **Push notifications** | No notification module/table/device tokens (spec-sanctioned deferral, §14). | In-app feed is **derived from `GET /orders`**; the UI states push is not enabled yet. |
| **Real digital payment gateway** | `Digital` is a documented always-succeed stub (`_process_digital_payment`). | Only `COD` / `Digital` are offered; labelled "Pay Online (demo)". |
| **Stored payment methods** | No customer payment-method endpoints (payment is chosen per order). | Profile row explains it is chosen at checkout. |
| **Rider document *upload* UI** | Endpoint `POST /wallet/documents/{doc_type}` exists, but the Flutter app has **no image/file-picker dependency** (none in `pubspec.yaml`), so a file cannot be selected. | Document **status** is shown on the dashboard and the gap is documented here. Uploading requires adding a picker (e.g. `image_picker`) as a follow-up. |
| **Customer order cancel** | Admin-only (`POST /admin/orders/{id}/cancel`). | Not exposed in the app. |
| **`GET /restaurants/{id}` detail** | Endpoint does not exist. | Detail is composed from the browse row + `GET /restaurants/{id}/menu`. |
| **Promo codes / loyalty** | No promo system (spec §14 excludes loyalty/referral). | Promo card *copy* remains as presentation only; its button browses real restaurants. |
| **Restaurant & admin portals** | Out of scope for this Flutter task (`website/` is a separate client). | Untouched. |
| **Backend `.env`** | Only `.env.example` exists; the app cannot boot without real DB/Redis/AWS/Maps values. | Operational dependency — see §5. |

---

## 4. Mock / hardcoded data remaining

| # | Location | What remains | Status |
|---|---|---|---|
| 1 | `lib/screens/menu/menu_screen.dart` | 365-line **unreachable** screen with hardcoded items | Dead code (was dead before this work too). Left in place per "do not delete working functionality"; safe to remove later. |
| 2 | `lib/models/order.dart` | Unused `Order`/`OrderItem` Dart classes | Superseded by `data/models/order_models.dart`. Unused. |
| 3 | `dashboard_screen.dart` `_promoCards` | Promo banner copy ("SPEEDY30", etc.) | **Presentation-only** placeholder; the button now opens a real restaurant. No promo backend exists. |
| 4 | `dashboard_screen.dart` `_categories` | Category chip labels + stock images | Presentation-only icons; tapping a chip runs a **real** search over backend data. |
| 5 | `assets/stitch_speedy_meals_app_ui_design/**` | Stitch HTML/PNG design references | Design source material, never loaded at runtime. |

**Removed this session:** `sampleRestaurants` (4 fake restaurants + 11 fake dishes),
`_popularItems` (fake dishes, fake ratings/review counts), the entire mock rider dashboard
(`$142.50`, `#SPD-9402/9415`, USD earnings), the 5 seeded fake notifications referencing
`SM-89241`, and the fake `'SM-89241'` order id path.

---

## 5. Testing

| Check | Result | Notes |
|---|---|---|
| **Flutter analyzer** | **PASS** | `flutter analyze --no-fatal-infos` → *No issues found!* |
| **Flutter tests** | **PASS** | `flutter test` → 7/7 passing (`critical_flows_test.dart`, `widget_test.dart`), rewritten for the integrated, offline-safe app. |
| **Backend syntax** | **PASS** | `python -m py_compile` on every changed module; schema models validated by importing them. |
| **Backend test suite** | **NOT RUN** | `backend/app/tests/conftest.py` requires a **live PostgreSQL + Redis** (all PKs are `PG UUID`; sqlite is explicitly avoided). Not available in this environment. Run with the DB/Redis up: `cd backend && pytest`. |
| **End-to-end customer flow** | **NOT RUN** | Requires the backend running with a real `.env` (Postgres, Redis, AWS S3, Google Maps). See procedure below. |
| **End-to-end rider flow** | **NOT RUN** | Same dependency. |

### How to verify end-to-end
1. `cd backend` → create `app/.env` from `app/.env.example` with real
   `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `AWS_*`, `S3_BUCKET_NAME`,
   `GOOGLE_MAPS_API_KEY`, `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD`.
2. `docker compose up -d` (postgres + redis) then `alembic upgrade head`
   then `uvicorn app.main:app --reload`.
3. Seed a restaurant (admin API) with latitude/longitude and menu items.
4. `flutter run` (Android emulator uses `10.0.2.2:8000` automatically).
5. Customer: phone → OTP (read the code from the **server console**, `SMS_PROVIDER_MODE=console`)
   → add an address (GPS or typed) → browse → open a restaurant → add to cart → checkout (COD)
   → order tracking/history.
6. Rider: `PATCH /admin/riders/{id}/approval` to approve → rider app → go online
   (needs wallet ≥ Rs. 500) → accept → advance status → wallet/earnings update.

---

## 6. API integration matrix (actual endpoint names)

| Flutter Feature | Backend Endpoint | Status |
|---|---|---|
| Login (request OTP) | `POST /auth/otp/request` | Connected |
| Login (verify OTP) | `POST /auth/otp/verify` | Connected |
| Rider login/signup | `POST /auth/rider/otp/verify` | Connected |
| Session restore | `GET /auth/me` | Connected |
| Token refresh | `POST /auth/refresh` | Connected |
| Logout | `POST /auth/logout` | Connected |
| Profile view | `GET /users/me` | Connected |
| Profile edit | `PUT /users/me` | Connected |
| Addresses | `GET /users/me/addresses` | Connected |
| Add address | `POST /users/me/addresses` | Connected |
| Update / set default address | `PUT /users/me/addresses/{address_id}` | Connected |
| Delete address | `DELETE /users/me/addresses/{address_id}` | Connected |
| Restaurants | `GET /restaurants` | Connected |
| Menu | `GET /restaurants/{restaurant_id}/menu` | Connected |
| Cart | `GET /restaurants/{restaurant_id}/cart` | Connected |
| Add to cart | `POST /restaurants/{restaurant_id}/cart/items` | Connected |
| Update quantity | `PATCH /restaurants/{restaurant_id}/cart/items/{item_id}` | Connected |
| Remove item | `DELETE /restaurants/{restaurant_id}/cart/items/{item_id}` | Connected |
| Clear cart | `DELETE /restaurants/{restaurant_id}/cart` | Connected |
| Checkout totals | `GET /restaurants/{restaurant_id}/cart/checkout-preview` | Connected |
| Place order | `POST /restaurants/{restaurant_id}/cart/checkout` | Connected |
| Order tracking | `GET /orders/{order_id}/track` | Connected |
| Order history | `GET /orders` | Connected |
| Reorder | `POST /orders/{order_id}/reorder` | Connected |
| Rate order | `POST /orders/{order_id}/rating` | Connected |
| Rider profile / approval | `GET /wallet/profile` | **Added + Connected** |
| Rider job board | `GET /wallet/assignments` | **Added + Connected** |
| Rider accept/reject | `POST /wallet/assignments/{order_id}/respond` | Connected (approval enforced) |
| Rider status flow | `PATCH /wallet/deliveries/{order_id}/status/{arrived\|picked-up\|on-the-way\|delivered}` | Connected (approval enforced) |
| Rider online/offline | `PATCH /wallet/status` | Connected |
| Rider location | `PATCH /wallet/location` | Connected |
| Rider balance | `GET /wallet/balance` | Connected |
| Rider earnings | `GET /wallet/earnings` | Connected |
| Rider COD eligibility | `GET /wallet/cod-eligibility` | Connected |
| Rider wallet recharge | `POST /wallet/recharge` | Connected |
| Rider cash deposit | `POST /wallet/cash-deposit` | Connected |
| Rider documents | `POST /wallet/documents/{doc_type}` | Backend ready — **no client upload UI** (no picker dependency) |
| Notifications | *(none)* | Derived from `GET /orders` |

---

## 7. Notes on decisions

- **Money math left to the backend.** The Flutter fee/tax constants that contradicted the
  locked spec (`Rs. 25` platform fee, `17%` GST) are **not** used to compute anything; the
  backend's `checkout-preview` is the single authority for the delivery fee and total.
- **Cart is per-restaurant**, matching the backend's `cart:{customer}:{restaurant}` Redis key.
  Switching restaurant switches carts; it never merges two restaurants into one order.
- **Order states** use the exact backend wire values (`Accepted`, `Preparing`,
  `Ready for Pickup`, `Rider Assigned`, `Rejected`, `Accepted by Rider`,
  `Arrived at Restaurant`, `Picked Up`, `On the Way`, `Delivered`, `Cancelled`) with a
  separate customer-facing label + 5-step tracker mapping, so the backend machine is never
  redefined on the client.
- **OTP delivery is console-only in development.** The app shows an honest dev hint that the
  code is printed in the server console; a real SMS provider is a backend production
  dependency (ADR-001).

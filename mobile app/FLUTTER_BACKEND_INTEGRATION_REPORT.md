# Speedy Meals — Flutter + Backend Integration Report

**Audit type:** Read-only. No project file was created, modified, deleted, renamed or moved to produce this report other than this report itself. No dependency was installed. Nothing was run against a database or any service.
**Date:** 14 September 2026
**Scope:** Flutter app at repo root (`lib/` 27 files, `test/` 2 files), FastAPI backend (`backend/`, 58 Python files + 2 migrations + Docker), Next.js web app (`website/`, in git HEAD), `docs/` (in git HEAD), `assets/`, root documentation.
**Evidence base:** direct source reading of the working tree, plus `git show` reads of files present in `HEAD` but absent from the working tree. Two items could not be verified and are labelled **Unknown / Requires Verification** rather than guessed.

---

> ## ⚠️ 0. Read This First — Committed Work Is Missing From Your Working Tree
>
> `git status` shows **four substantial, committed artifacts deleted from the working tree** (unstaged deletions, not committed). They exist in `HEAD` and will be lost if those deletions are committed:
>
> | Deleted from working tree | In `HEAD` | What it is |
> |---|---|---|
> | `website/**` (≈100 files) | ✅ | Next.js 15 restaurant dashboard + admin panel + implemented landing page |
> | `docs/**` (17 files) | ✅ | **The locked MVP spec (v6.0)**, the ERD image, ADR-001, ADR-002, all four journey diagrams |
> | `mobile_app/**` (≈160 files) | ✅ | A second, older copy of the Flutter app |
> | `docker-compose.yml` (root) | ✅ | Superseded by `backend/docker-compose.yml` |
>
> Additionally, at the repo root, the older `lib/constants/app_constants.dart`, `constants.dart`, `spacing.dart`, `typography.dart` are deleted (migrated into `lib/core/`).
>
> **This materially changes the audit** — before doing this work I believed no restaurant/admin client and no spec documents existed. They do; they are simply not in the working tree. Everything below reflects what is actually in the repository, with the working-tree/`HEAD` distinction called out explicitly.
>
> **Recommended first action (not taken — read-only audit): confirm with the repo owner whether these deletions are intentional.** `docs/` in particular contains the authoritative specification this entire project is built against.

---

## 1. Executive Summary

Three clients and one backend exist in this repository, and **none of the clients is connected to the backend**. The backend is by far the most mature artifact.

| Layer | Location | Reality |
|---|---|---|
| **Flutter mobile app** | `lib/` (working tree) | 17 reachable screens, complete Material 3 UI, in-memory mock services. **Zero networking code** — no `http`/`dio` in `pubspec.yaml`, no API client, no base URL, no token storage. |
| **Next.js web app** | `website/` (**in HEAD, deleted from working tree**) | Landing page fully implemented. Restaurant portal (10 routes) and admin panel (13 routes) are **5-line `TODO` shells** — `<h1>` + `{/* TODO: implement */}`. API layer is a stub: one working `fetch` wrapper plus two comment-only files. Auth middleware commented out. |
| **FastAPI backend** | `backend/` | 74 endpoints across 4 role surfaces, 14 tables, 19 test files / **293 test functions**, Docker + compose. Substantially more complete than the README claims. |
| **Spec** | `docs/SpeedyMeals_Food_Delivery_MVP.md` (**in HEAD**) | v6.0 **"FINAL LOCKED"**. The authority for money math, roles and MVP scope. |

**The three blocker-class findings:**

**1 — Auth model mismatch (critical).** The Flutter app implements **email + password** login/signup for customer and rider. The backend implements **phone + OTP** for customer and rider, with **no password column at all** on `users` or `riders`. Email+password exists only for restaurant and admin. **Every existing Flutter auth screen sends the wrong credential type.** The one screen with the right shape — `PhoneOtpLoginScreen` in `lib/screens/auth/login_screen.dart` — is never instantiated anywhere, and its "Continue with OTP" button fakes success and jumps to the home screen.

**2 — Money math contradicts the locked specification (critical).** The Flutter cart and checkout add a **Rs. 25 platform fee** and **17% GST** on top of the delivery fee. The backend charges `total = food_subtotal + delivery_fee` only, and that matches spec §11 exactly. Spec §3.3/§11 confirm SpeedyMeals earns from **exactly two sources: 10% restaurant commission + a flat Rs. 10 per-delivery wallet deduction**. There is no platform fee and no tax anywhere in the specification. As written, **the Flutter app's totals can never equal the backend's**, in any configuration.

**3 — Zero integration layer anywhere.** No client has an API integration: Flutter has no HTTP dependency at all; the web app has a fetch wrapper whose auth header is a `TODO`. Every customer-facing feature is backed by `sampleRestaurants` (hardcoded in `lib/models/restaurant.dart`) or `_MockTrackingData` (hardcoded constants in `order_tracking_screen.dart`).

**Documentation is actively misleading.** `README.md` states *"The backend is planned but not yet implemented in this repository"* and marks the backend stack 🔜 Planned. `Backend_development.md` says Phase 2 is "in progress". In reality backend Phases 0–8 are implemented and tested. The README also never mentions `website/`, `docs/` or `mobile_app/`.

**Recommended posture:** the backend and the locked spec are the sources of truth. Do **not** reshape the backend around the Flutter mock auth. Reshape the Flutter auth flow around phone+OTP, delete the invented platform fee and tax, and build a thin `data/` layer that maps backend response schemas to Dart models.

---

## 2. Current Project Architecture

```
speedy_meals/                     ← repo root is ALSO the Flutter app
│
├── lib/                          FLUTTER (working tree) — 27 files, no networking
│   ├── main.dart                 entry + global ErrorWidget fallback
│   ├── constants/colors.dart     brand tokens — imported ONLY by app_theme.dart
│   ├── core/constants/app_constants.dart   fees/tax rules + OrderStatus, PaymentMethod
│   ├── core/theme/app_theme.dart           Material 3 light theme only
│   ├── models/restaurant.dart    models + `sampleRestaurants` HARDCODED DATA
│   ├── models/order.dart         ** UNUSED — never imported **
│   ├── screens/ (9 dirs, 18 screen widgets)
│   ├── services/                 auth / cart / notification — all in-memory mocks
│   └── widgets/home_navigation.dart   4-tab IndexedStack shell
├── test/                         widget_test.dart, critical_flows_test.dart
├── assets/                       images + ~20 Stitch HTML/PNG design references
├── android/ ios/ web/ linux/ macos/ windows/   platform shells
│
├── backend/                      FASTAPI (working tree)
│   ├── app/
│   │   ├── main.py               app + router registration + first-admin seed
│   │   ├── core/                 config, database, redis_client, security,
│   │   │                         rate_limiter, maps_client, storage, base_model
│   │   ├── platform/             auth, users, wallet_payment, location(stub), notification(stub)
│   │   ├── modules/              food_delivery, admin, logistics(stub), medicine(stub), ride_hailing(stub)
│   │   ├── migrations/versions/  2 revisions (13 tables + refresh_tokens)
│   │   └── tests/                19 files, 293 test functions
│   ├── Dockerfile, docker-compose.yml (api + postgres:15 + redis:7)
│   └── docs/                     README + "Backend_development (3).md" (61 KB)
│
├── website/                      NEXT.JS 15  ← IN `HEAD`, DELETED FROM WORKING TREE
│   ├── app/(home)/               ✅ IMPLEMENTED landing page
│   ├── app/admin/*               13 route shells — ALL `TODO`
│   ├── app/restaurant/*          10 route shells — ALL `TODO`
│   ├── app/dashboard/*           README placeholders only
│   ├── lib/api/client.ts         ✅ working fetch wrapper (auth header TODO)
│   ├── lib/api/{admin,restaurant}.ts   comment-only stubs
│   ├── lib/auth/index.ts         comment-only stub
│   ├── middleware.ts             route protection — commented out, pass-through
│   ├── types/{order,restaurant,rider,admin}.ts   draft interfaces, "TODO: mirror backend"
│   └── components/home/*         5 landing components (implemented)
│
├── docs/                         ← IN `HEAD`, DELETED FROM WORKING TREE
│   ├── SpeedyMeals_Food_Delivery_MVP.md   ← v6.0 FINAL LOCKED SPEC
│   ├── Schema_Updated.png                 ← the ERD
│   ├── decisions/ADR-001-otp-sms-provider.md
│   ├── decisions/ADR-002-first-admin-seed.md
│   └── {admin,customer,rider,restaurant}journey.jpeg, ecosystem.jpeg, revflow.jpeg, …
│
├── mobile_app/                   ← IN `HEAD`, DELETED FROM WORKING TREE
│                                 (older duplicate Flutter app — 15 dart files)
├── docker-compose.yml            ← IN `HEAD`, DELETED (superseded by backend/)
└── README.md, REPORT.md, Check.md, Backend_development.md
```

### 2.1 Duplicate / obsolete / conflicting implementations (Rule 14)

| # | Item | Finding |
|---|---|---|
| 1 | **Two Flutter apps in `HEAD`** | The repo root had `lib/` (16 files) **and** `mobile_app/lib/` (15 files) — two Flutter projects in one repository. The last commit is *"Update Flutter project inside mobile_app folder"*, implying `mobile_app/` was intended as canonical, yet the **working tree has a third, larger, newer app at the root** (27 files, including cart/notifications/profile/rider/restaurant_detail/services that neither `HEAD` copy has). Which location is canonical is **Unknown / Requires Verification**, and the working-tree root app is *not* the same code as either committed copy (`main.dart` and `pubspec.yaml` both differ). |
| 2 | **Two backend development docs** | Root `Backend_development.md` and `backend/docs/Backend_development (3).md` (61 KB) cover the same ground. The root copy says it was "merged from `development.md` + old `Backend_development.md`". They will drift. |
| 3 | **Two docker-compose files** | Root `docker-compose.yml` (in `HEAD`, deleted) and `backend/docker-compose.yml` (working tree). |
| 4 | **Duplicated constants dir** | `lib/constants/app_constants.dart` (in `HEAD`, deleted) and `lib/core/constants/app_constants.dart` (working tree). Same for `colors.dart` (still at `lib/constants/`, still imported by `app_theme.dart`). |
| 5 | `lib/models/order.dart` | Defines `Order` + `OrderItem`. **Never imported anywhere.** Checkout navigates with a hardcoded `'SM-89241'` string instead. |
| 6 | `lib/screens/menu/menu_screen.dart` | Complete 365-line category menu screen. **Zero instantiations repo-wide.** Dead code. |
| 7 | `PhoneOtpLoginScreen` | **Zero instantiations.** Yet the only UI matching the real backend auth contract. |
| 8 | `lib/constants/colors.dart` | Imported only by `app_theme.dart`; all screens hardcode `0xFFDC2626` literals. |
| 9 | `backend/app/modules/{logistics,medicine,ride_hailing}` | README-only stubs — correctly empty; spec §14 defers them. |
| 10 | `backend/app/platform/{location,notification}` | README-only stubs. Notification deferral is spec-sanctioned (§14: "Push notifications (in-app status refresh is enough for MVP)"). |
| 11 | `assets/stitch_speedy_meals_app_ui_design/**` | ~20 HTML/PNG design references. Design source material, not runtime. |
| 12 | `assets/.../no_bg_no_text_removebg_preview.png/screen.png` | Registered in `pubspec.yaml` as an asset path through a **directory literally named `*.png`**. Resolves today; fragile. |

### 2.2 Spec vs. implementation deviations

| Spec | Implementation | Verdict |
|---|---|---|
| §3.3 fee `50 + km×20` | `service.py` `DELIVERY_FEE_BASE=50`, `DELIVERY_FEE_PER_KM=20`, `Decimal` quantized | ✅ exact |
| §11 commission 10%, restaurant gets 90% | `calculate_commission`, frozen on the order row | ✅ exact |
| §11 rider earns 100% of delivery fee | `rider_earning = ctx["delivery_fee"]` | ✅ exact |
| §3.1 Rs. 500 wallet minimum to go online | `PATCH /wallet/status` rejects with 400 | ✅ exact |
| §3.1 Rs. 10 deducted on delivery | `rider_advance_delivery_status("Delivered")` | ✅ exact |
| §3.4 cash cap Rs. 10,000 | `CASH_COLLECTION_CAP: float = 10000` | ✅ exact |
| §12 "`carts` schema" (ERD) | **No `carts` table** — Redis `cart:{customer_id}:{restaurant_id}` | ⚠️ Deliberate, documented deviation (`Backend_development.md` Phase 1/5). Spec's own closing note asks to "add multi-cart support in `carts`/`orders` schema", so the Redis choice diverges from the ERD as written — **worth an explicit sign-off**. |
| §12 `orders.delivery_distance_km` | ✅ present, snapshotted | ✅ |
| §6 no security deposit; `wallet_balance` + `pending_cash_owed` only | ✅ present, no deposit field | ✅ |
| §14 "Restaurant mobile app — Web Dashboard only for MVP" | `website/` is the restaurant surface | ✅ (mobile scope = customer + rider) |
| §14 "Push notifications excluded" | `platform/notification` is a stub | ✅ |
| §14 "One digital method + COD" | Backend accepts `COD`/`Digital` (2 values) | ✅ — so the Flutter UI's **4** payment options exceed spec |

---

## 3. Flutter Application Audit

**18 screen widgets across 17 files, plus the `HomeNavigation` shell. ≈12,000 lines.**

### 3.1 Authentication (9 screens)

| Screen | File | Implemented | Data source | Connected |
|---|---|---|---|---|
| Splash | `login_screen.dart` `SplashScreen` | ✅ 3 s `Timer` → `pushReplacement` | none | ❌ unconditionally routes to `RegisterAsScreen`; never consults `AuthService.isLoggedIn` |
| Phone OTP Login | `login_screen.dart` `PhoneOtpLoginScreen` | UI complete, **UNREACHABLE** | none | ❌ fakes "OTP Code sent! Logged in." then jumps to `HomeNavigation` |
| Register As | `register_as_screen.dart` | ✅ role picker gates Continue | local `setState` | ❌ pure navigation |
| Customer Login | `customer_login_screen.dart` (664 L) | ✅ + validation + inert social buttons | `AuthService.login(role: customer)` | ❌ mock |
| Customer Signup | `customer_signup_screen.dart` (686 L) | ✅ + validation | `AuthService.register(role: customer)` | ❌ mock |
| Customer Forgot Password | `customer_forgot_password_screen.dart` (414 L) | ✅ UI + nav | `sendPasswordReset` (no-op delay) | ❌ mock |
| Rider Login | `rider_login_screen.dart` (636 L) | ✅ | `AuthService.login(role: deliveryRider)` → `RiderDashboardScreen` | ❌ mock |
| Rider Signup | `rider_signup_screen.dart` (748 L) | ✅ incl. vehicle type + city | `AuthService.register(role: deliveryRider)` | ❌ mock |
| Rider Forgot Password | `rider_forgot_password_screen.dart` (417 L) | ✅ | `sendPasswordReset` | ❌ mock |

**Verified auth mechanics:**

| Aspect | Implementation |
|---|---|
| Pattern | Singleton `AuthService._internal()` / `AuthService.instance` |
| Credentials | Email **or** phone + **password** (`login`); name+email+phone+password (`register`) |
| Password rules | Login requires **≥6**, register requires **≥8** — inconsistent, unspecified, untested |
| Tokens | `'mock_token_${DateTime.now().millisecondsSinceEpoch}'`, in memory only |
| Persistence | **None** — session lost on restart |
| Logout | Clears the in-memory user; `profile_screen` and `rider_dashboard_screen` then `pushAndRemoveUntil` to auth |
| Route guards | **None.** No screen checks `isLoggedIn`. `currentRole` is read only by `profile_screen` (role chip) and `rider_dashboard_screen` (display name) |
| Google login | Visual placeholders only on both login screens; no implementation |

### 3.2 Customer screens

| Screen | File | Status | Data source |
|---|---|---|---|
| Dashboard/Home | `dashboard_screen.dart` (1,944 L) | ✅ implemented | `sampleRestaurants` + local lists |
| Restaurant Detail | `restaurant_detail_screen.dart` (1,106 L) | ✅ implemented | `Restaurant` object passed from `sampleRestaurants` |
| Menu (category) | `menu_screen.dart` (365 L) | ✅ implemented but **UNREACHABLE** | local hardcoded items |
| Cart | `cart_screen.dart` (386 L) | ✅ implemented | `CartService` (in-memory) |
| Checkout | `checkout_screen.dart` (532 L) | ⚠️ UI only | **HARDCODED** — 2 fake items (Rs. 650 + 520), subtotal Rs. 1,170, total Rs. 1,444; ignores `CartService` |
| Order Tracking | `order_tracking_screen.dart` (1,682 L) | ⚠️ UI only | `_MockTrackingData` |
| Notifications | `notifications_screen.dart` (245 L) | ✅ implemented | `NotificationService`, seeded with 5 fakes |
| Profile | `profile_screen.dart` (486 L) | ⚠️ mostly UI | `AuthService.currentUser`; 3 of 4 menu rows → "coming soon" |
| Order history | — | ❌ **does not exist** | — |
| Address/location management | — | ❌ **does not exist** | hardcoded Clifton string |
| Rating/review | inside tracking screen | ⚠️ UI only | local `setState`; persists nothing |

Feature notes: debounced (300 ms) client-side search over name/tagline/cuisine/area **and menu items**; promo carousel; category chips filter in memory; sticky cart bar and bottom-nav Cart badge react to `CartService`; promo codes displayed but no promo system exists server-side.

### 3.3 Rider screens

| Screen | Status | Detail |
|---|---|---|
| Rider Dashboard (`rider_dashboard_screen.dart`, 470 L) | ⚠️ UI only | **Hardcoded USD** values: payout `$142.50`, 8 deliveries, `5.2 hrs`, `$27/hr`, tips `$38.00`, rating `4.95 ★`, plus 2 fake cards (`#SPD-9402`, `#SPD-9415`) |
| Available orders | ❌ no real list | only the 2 static cards |
| Accept | ⚠️ partial | button shows a snackbar only |
| Reject | ❌ **missing entirely** | — |
| Delivery status flow | ❌ **missing** | no arrived/picked-up/on-the-way/delivered UI |
| Rider location | ❌ **missing** | **no GPS dependency in `pubspec.yaml`** |
| Rider documents | ❌ **missing** | no upload UI |
| Earnings / Wallet | ❌ **missing** | static mock numbers only |
| Rider profile / notifications | ❌ none | logout icon only |

**Currency inconsistency:** the rider dashboard renders USD (`$`) while the entire customer flow, the backend and the locked spec use PKR (`Rs.`).

### 3.4 Cross-cutting facts

- **State management:** `setState` + three ad-hoc `ChangeNotifier` singletons. No Provider/Riverpod/Bloc.
- **Navigation:** imperative Navigator 1.0, ~25 `Navigator.push` calls, no named routes, no route table.
- **`HomeNavigation`** keeps all 4 tabs alive in an `IndexedStack`, including `OrderTrackingScreen`, which starts **three repeating `AnimationController`s** that tick even while hidden.
- **Tracking is fed a constant.** `home_navigation.dart` hardcodes `orderId: 'ORD-2024-001', status: OrderStatus.prepared`; `checkout_screen` hardcodes `'SM-89241'`. Neither resembles a backend UUID.
- **Verified dead controls** (`onPressed/onTap: () {}`): dashboard address pill (L252), "Explore All" (L1029), popular-item heart (L1684); checkout "Change Address" (L151), "View Cart" (L170); `menu_screen` "Sort" (L89); tracking map/help controls (L505, 510, 1099, 1204).

---

## 4. Backend Audit

**Stack:** FastAPI 0.115.0 · SQLAlchemy 2.0.35 · Alembic 1.13.2 · Pydantic 2.9.2 · PostgreSQL (`psycopg2-binary`) · Redis 5.0.8 · python-jose · passlib+bcrypt · boto3 · httpx · pytest 8.3.3.
**Entry point:** `backend/app/main.py`, run `uvicorn app.main:app --reload` **from `backend/`**. Registers 7 routers + a startup admin seed.

| Area | Status | Evidence |
|---|---|---|
| Config | ✅ | `core/config.py`; `.env` resolved relative to the file, not CWD (a real bug, fixed) |
| DB session | ✅ | `core/database.py`, `get_db()` |
| Redis | ✅ | `core/redis_client.py` — shared client for OTP, rate limit, carts, rider location |
| Password hashing | ✅ | `core/security.py` — bcrypt via passlib |
| JWT | ✅ | `auth/jwt_utils.py` — access 30 min + refresh 30 d, `jti` collision guard, `type` claim |
| RBAC | ✅ | `auth/dependencies.py` — `get_current_user`, `require_role([...])`, 401 vs 403 |
| Rate limiting | ✅ | `core/rate_limiter.py` — Redis INCR+EXPIRE, 5/60 s, per-(action, identifier) |
| OTP | ✅ logic, ⚠️ **console sender only** | `auth/service.py` — 6-digit, 5 min TTL, one-time use, 45 s cooldown |
| Maps | ✅ | `core/maps_client.py` — Distance Matrix, 10 s timeout, raises `MapsError` |
| S3 storage | ✅ | `core/storage.py` — sole S3 touchpoint |
| Customer APIs | ✅ | `platform/users`, `modules/food_delivery` customer routers |
| Rider APIs | ✅ | `platform/wallet_payment` |
| Restaurant APIs | ✅ | `modules/food_delivery` menu + order routers |
| Admin APIs | ✅ | `modules/admin` |
| Cart | ✅ Redis, no table | `cart:{customer_id}:{restaurant_id}`, 7-day TTL |
| Checkout / orders | ✅ | `_build_checkout_context` re-reads authoritative prices from Postgres |
| Order tracking | ✅ poll-based | `GET /orders/{id}/track` |
| Ratings | ✅ | delivered-only, once-only |
| Notifications | ❌ not implemented | README stub — **spec-sanctioned deferral (§14)** |
| **CORS** | ❌ **not configured** | no `CORSMiddleware` in `main.py` |

### 4.1 Web client audit (`website/` — in `HEAD`)

Its own README states the status plainly, and the code confirms it:

| Layer | Status |
|---|---|
| Landing page `/` | ✅ **Implemented** — 5 client components (Navbar, HeroSection, ServicesSection, PartnerSection, Footer) + `ReededGlassBackground`; Framer Motion |
| `lib/api/client.ts` | ✅ Working `fetch` wrapper: base URL from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`), JSON content-type, throws `API error <status>`. **`Authorization: Bearer` is a `TODO` comment.** |
| `lib/api/admin.ts` | ❌ Comment-only: `// TODO: admin-domain API calls …` + an unused import |
| `lib/api/restaurant.ts` | ❌ Comment-only: `// TODO: restaurant-domain API calls …` + an unused import |
| `lib/auth/index.ts` | ❌ Comment-only: `// TODO: token storage, role guards …` |
| `middleware.ts` | ❌ Route matcher exists; both `hasValid…Token` checks are **commented out**; returns `NextResponse.next()` (pass-through) |
| `types/*.ts` | ⚠️ 5 draft interfaces, each headed `// TODO: mirror backend … table schema`. **`types/order.ts` status union omits `Arrived at Restaurant`, `Accepted by Rider` and `Rejected`** — already out of sync with the backend state machine. |
| `app/admin/*` (13 routes) | ❌ Every page is `<h1>{Title}</h1>` + `{/* TODO: implement X */}` (~8 lines each) |
| `app/restaurant/*` (10 routes) | ❌ Same |
| `app/dashboard/{modules,platform}/*` | ❌ README placeholders only |
| `app/admin/layout.tsx` | ❌ `<AdminSidebar/>` is a TODO comment |
| Docker | ✅ Multi-stage `oven/bun:1-alpine` + Next.js standalone output |
| Scripts | `dev`, `build`, `start`, `lint`, `typecheck` (Bun) |

**Route inventory:** admin 13 (`dashboard`, `login`, `customers`, `orders`, `orders/[orderId]`, `payouts`, `reports`, `restaurants`, `restaurants/[restaurantId]`, `riders`, `riders/[riderId]`, `settlements`, `layout`); restaurant 10 (`dashboard`, `login`, `menu`, `menu/[itemId]`, `orders`, `orders/[orderId]`, `profile`, `reports`, `settlements`, `layout`); landing 1.

**Net:** `website/` is a **correctly-shaped scaffold with one implemented page**. It maps 1:1 onto the backend's restaurant (9) and admin (23) endpoint groups, but **0% of those 32 endpoints is called.** Note the brand tokens in `website/globals.css` (`--color-red #E23A2E`, `--color-blue #1E5FA8`) **differ from the Flutter app's** (`#DC2626`, `#1D4ED8`) — two inconsistent brand palettes across the two clients.

### 4.2 Backend source-code observations

1. `platform/wallet_payment/routes.py` has `from app.modules.food_delivery import service as food_service` **placed mid-file** (~line 112), not at the top — a circular-import workaround. Works, but fragile.
2. `main.py` uses the deprecated `@app.on_event("startup")` rather than a lifespan handler.
3. `base_model.py` does `import re` **inside** the `__tablename__` function body.
4. `DEFAULT_SEARCH_RADIUS_KM = 5.0` with `le=50` — a customer with a distant saved address sees an empty list.
5. `backend/app/.env.example` opens with a literal `[TEMPLATE]` line that is not a valid settings key.
6. The real requirements file is `backend/app/requirements.txt`; there is no `backend/requirements.txt`.

---

## 5. Database Audit

**14 tables** — 13 from `ea1fe1cee296_create_all_13_tables.py` + `refresh_tokens` from `b1c2d3e4f5a6`. Every table: UUID PK + `created_at`. `updated_at` only on `users`, `riders`, `restaurants`, `orders`.

| # | Table | Key columns | FKs |
|---|---|---|---|
| 1 | `admins` | email (uniq), password_hash, role, is_active | — |
| 2 | `users` | phone_number (uniq), name, email, wallet_balance, country_code, is_active | — |
| 3 | `refresh_tokens` | subject_id, role, token_hash (uniq), status, expires_at | none (deliberate — points at 4 tables) |
| 4 | `addresses` | user_id, label, latitude, longitude, full_address, is_default | → users |
| 5 | `riders` | phone_number (uniq), cnic_number (uniq), vehicle_type/registration, 3 doc URLs, approval_status, wallet_balance, pending_cash_owed, is_online, current_lat/lng, is_active | — |
| 6 | `restaurants` | name, email (uniq), password_hash, phone_number (uniq), address, lat/lng, commission_rate (10.00), logo/cover URLs, status, opening/closing_time, country_code, currency | — |
| 7 | `menu_items` | restaurant_id, name, description, price, category, photo_url, variants JSONB, is_available | → restaurants |
| 8 | `orders` | user_id, restaurant_id, rider_id (nullable), delivery_address_id, status, payment_method, food_subtotal, delivery_distance_km, delivery_fee, total_amount, commission_amount, restaurant_payable, rider_earning, special_instructions, country_code, currency, cancellation_reason, cancelled_by, placed_at, delivered_at | → users, restaurants, riders, addresses |
| 9 | `order_items` | order_id, menu_item_id, quantity, selected_variant, price_at_order | → orders, menu_items |
| 10 | `ratings` | order_id, user_id, restaurant_rating, rider_rating, comment | → orders, users |
| 11 | `wallet_transactions` | rider_id, order_id (nullable), type, amount, balance_after | → riders, orders |
| 12 | `cash_deposits` | rider_id, amount_submitted, expected_amount, discrepancy, submission_method, verified_by_admin | → riders |
| 13 | `settlements` | restaurant_id, period_start/end, total_sales, commission_deducted, net_payable, status, paid_at | → restaurants |
| 14 | `rider_payouts` | rider_id, period_start/end, total_earning, status, paid_at | → riders |

**Spec alignment:** every field spec §12 requires is present — `commission_amount`, `restaurant_payable`, `rider_earning`, `delivery_distance_km` as placement-time snapshots; `commission_rate` default 10.00; `wallet_balance` + `pending_cash_owed` with no deposit field; `wallet_transactions`, `cash_deposits`, `settlements`, `rider_payouts` all present. **Structurally the schema matches the locked spec.**

**Relationship coverage:** complete for every app requirement (users→addresses→orders, restaurants→menu_items→order_items, orders→riders, orders→ratings, riders→wallet/payouts, restaurants→settlements).

### Database gaps

| # | Gap | Priority |
|---|---|---|
| D1 | **No `carts`/`cart_items` tables.** Cart is Redis-only, 7-day TTL. Documented deviation, but Redis flush loses active carts and there is no abandoned-cart reporting. The ERD reportedly contains a `carts` schema. | 🟡 Medium |
| D2 | **No order status history table.** `orders.status` holds only the current value — "when did it become Picked Up?" is unanswerable. | 🟠 High |
| D3 | **No `payment_reference` column.** `_process_digital_payment` returns a gateway ref echoed in the response but **never persisted**. No payment audit trail. | 🟠 High |
| D4 | **No indexes beyond unique constraints.** No index on `orders.user_id`, `orders.restaurant_id`, `orders.rider_id`, `orders.status`, `orders.placed_at`, `menu_items.restaurant_id`, `wallet_transactions.rider_id`, `ratings.order_id`, `refresh_tokens.subject_id`. Every list/filter is a sequential scan. | 🟠 High |
| D5 | **No `CHECK` constraints** on enumerable strings (`orders.status`, `orders.payment_method`, `riders.approval_status`, `wallet_transactions.type`, `restaurants.status`, `refresh_tokens.status`). | 🟡 Medium |
| D6 | **`ratings` has no unique constraint on `order_id`** — once-only is app-level only; a race could double-rate. | 🟡 Medium |
| D7 | **`refresh_tokens` never cleaned up**, no revoke-all, no device/session list. | 🟡 Medium |
| D8 | `users.email` not unique; no `avatar_url` — profile avatars unsupported end-to-end. | 🟢 Low |
| D9 | **`menu_items.variants` JSONB has no schema.** `_validate_variant` checks a cart's variant against the item, but the shape itself is unconstrained. | 🟡 Medium |
| D10 | **`orders.special_instructions` is unreachable** — no endpoint accepts it (`PlaceOrderSchema` lacks the field). | 🟡 Medium |
| D11 | **`users.wallet_balance` is dead** — no customer wallet endpoints. Spec does not require one. | 🟢 Low |
| D12 | **ERD filename mismatch.** Five model files claim to "match `docs/schema.jpeg` exactly"; the ERD in `HEAD` is **`docs/Schema_Updated.png`**. No file named `schema.jpeg` exists. The claim is therefore **Unknown / Requires Verification** (the ERD image itself is a PNG and could not be read as text). **In the working tree neither file exists.** | 🟠 High (process) |
| D13 | Migrations are correct and reversible (`upgrade`/`downgrade` symmetric). No model↔migration drift detected. | ✅ |

---

## 6. Authentication Audit

### 6.1 Backend (mature)

| Mechanism | Detail |
|---|---|
| Customer | `POST /auth/otp/request` → console OTP → `POST /auth/otp/verify`. Find-or-create `users`. **No password.** |
| Rider | Same OTP request → `POST /auth/rider/otp/verify` (carries CNIC/vehicle on first signup). Created `approval_status="pending"`. |
| Restaurant | `POST /auth/restaurant/login` (email+bcrypt) **or** `POST /auth/restaurant/otp/verify`. Admin-created, no self-signup. |
| Admin | `POST /auth/admin/login` (email+bcrypt). First admin auto-seeded on startup. |
| Access token | HS256, `JWT_EXPIRE_MINUTES=30`, claims `sub`/`role`/`type:"access"`/`exp`/`jti` |
| Refresh token | 30 d, `type:"refresh"`, persisted as **SHA-256 hash**, `valid`/`revoked`; rotated on every `POST /auth/refresh` |
| Logout | `POST /auth/logout` revokes the refresh row |
| RBAC | `require_role([...])` at the API layer; 403 wrong role, 401 bad/expired/missing/wrong-type |
| Rate limits | `otp/request`, `otp/verify`, `rider/otp/verify`, `restaurant/login`, `restaurant/otp/verify`, `admin/login` — 5/60 s each. **`/auth/refresh` is deliberately unthrottled** (documented; the credential is a hashed, single-use, revocable secret). |
| Hashing | bcrypt; admin/restaurant only |
| Validation | Pydantic on every request body, all routers — no raw dicts |
| SQLi | ORM/param binding throughout; the one raw `text()` call is parameterised |

### 6.2 Clients

| Aspect | Flutter | Web (`website/`) |
|---|---|---|
| Credential model | ❌ **email+password** — wrong for customer/rider, right for restaurant/admin | n/a — no login form implemented (`/admin/login` and `/restaurant/login` are TODO shells) |
| Token storage | ❌ none (no secure-storage dependency) | ❌ `lib/auth/index.ts` is a comment |
| Refresh handling | ❌ none | ❌ none |
| Bearer injection | ❌ none | ⚠️ `TODO` comment in `client.ts` |
| Session persistence | ❌ none | ❌ none |
| Route guards | ❌ none | ⚠️ middleware exists but checks are commented out → **all `/admin/*` and `/restaurant/*` routes are publicly reachable** |
| Logout | ⚠️ clears memory only; never calls `/auth/logout` | ❌ not implemented |

### 6.3 Auth & security findings

| # | Finding | Priority |
|---|---|---|
| A1 | **Credential-model mismatch (customer/rider).** Flutter collects email+password; backend accepts only phone+OTP. Blocks all customer and rider auth. | 🔴 Critical |
| A2 | **Rider `approval_status` is not enforced on rider endpoints.** A `pending`, unapproved rider receives a valid token and can call wallet, location, assignment and delivery-status endpoints. Approval is only meaningful in the admin list view. | 🔴 Critical |
| A3 | **OTP is delivered by `print()` to the server console.** No customer or rider can log in without server-log access. ADR-001 documents this as an intentional pre-MVP bridge (and warns PTA Sender-ID registration must start *before* MVP completion) — but it must not ship. | 🔴 Critical (non-dev) |
| A4 | **Auto-seeded admin with placeholder credentials.** Startup seed + `FIRST_ADMIN_PASSWORD=change-this-before-first-run` in `.env.example`. ADR-002 accepts the auto-seed but explicitly requires the operator to change the password after first login — nothing enforces that. | 🔴 Critical |
| A5 | **No CORS middleware.** Blocks every browser client, including the entire `website/` app — `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` cannot be called from a browser today. | 🟠 High |
| A6 | **No client token persistence or secure storage** (Flutter or web). | 🟠 High |
| A7 | **Web middleware is a pass-through** — `/admin/*` and `/restaurant/*` are unprotected. | 🟠 High |
| A8 | **No idempotency/double-submit guard server-side.** `place_order`'s own docstring accepts "a duplicate click can at worst place two real orders". The Flutter `_isPlacingOrder` flag is client-side only. | 🟠 High |
| A9 | **`is_active` is never enforced at token-verification time** for customers/riders/restaurants — deactivating an account does not stop its 30-minute access token. | 🟡 Medium |
| A10 | **Per-identifier rate limits are IP-rotation-bypassable**; no global limiter or account lockout. | 🟡 Medium |
| A11 | **`JWT_SECRET` ships as `change-this-to-a-long-random-string`.** | 🟠 High |
| A12 | **No `.env` exists** — only `.env.example`. Backend cannot start. | 🟠 High (operational) |
| A13 | **AWS + Google Maps keys are mandatory non-defaulted `Settings` fields** — the app refuses to boot without real S3 and Maps credentials, even for work touching neither. | 🟡 Medium |
| A14 | **No device/session management**, no revoke-all-sessions. | 🟡 Medium |
| A15 | `POST /auth/refresh` unthrottled (documented as intentional). | 🟢 Low |

**Security positives (verified):** bcrypt wherever a password exists; refresh tokens stored as hashes, never raw; the `type` claim prevents using a refresh token as an access token; OTP is one-time-use and deleted on success; the 45 s resend cooldown is **server-side**, not just a disabled button; every request body is Pydantic-validated; all queries are ORM-parameterised; every credential-accepting endpoint is rate-limited; uploads are size-capped and read with `max+1` to prevent unbounded buffering.

---

## 7. API Endpoint Inventory

**74 endpoints** (73 router-decorated + `GET /health`).

### 7.1 Auth — `/auth` (9)

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| POST | `/auth/otp/request` | — | — | `{country_code, phone_number}` | `{message}` · 429 |
| POST | `/auth/otp/verify` | — | — | `{country_code, phone_number, otp_code}` | tokens · 400/429 |
| POST | `/auth/rider/otp/verify` | — | — | `{country_code, phone_number, otp_code, name, cnic_number, vehicle_type, vehicle_registration}` | tokens · 400/429 |
| POST | `/auth/restaurant/login` | — | — | `{email, password}` | tokens · 401/429 |
| POST | `/auth/restaurant/otp/verify` | — | — | `{country_code, phone_number, otp_code}` | tokens · 404/429 |
| POST | `/auth/admin/login` | — | — | `{email, password}` | tokens · 401/429 |
| POST | `/auth/refresh` | — | — | `{refresh_token}` | tokens (rotated) · 401 |
| POST | `/auth/logout` | — | — | `{refresh_token}` | `{message}` · 400 |
| GET | `/auth/me` | ✅ | any | — | `{id, role}` · 401 |

### 7.2 Users — `/users` (6) — role `customer`

| Method | Path | Request |
|---|---|---|
| GET | `/users/me` | — → profile |
| PUT | `/users/me` | `{name?, email?}` |
| GET | `/users/me/addresses` | → `[address]` |
| POST | `/users/me/addresses` | `{label?, latitude, longitude, full_address?, is_default}` · 201 |
| PUT | `/users/me/addresses/{address_id}` | partial · 404 |
| DELETE | `/users/me/addresses/{address_id}` | 204 · 404 |

### 7.3 Restaurant menu — `/restaurants/me/menu-items` (6) — role `restaurant`

`GET ""` · `POST ""` (201) · `PUT /{menu_item_id}` · `DELETE /{menu_item_id}` (204) · `PATCH /{menu_item_id}/availability` · `POST /{menu_item_id}/photo` (multipart, size-capped)

### 7.4 Restaurant orders — `/restaurants/me/orders` (3) — role `restaurant`

| Method | Path | Notes |
|---|---|---|
| GET | `""` | `?status=&date_from=&date_to=` |
| GET | `/{order_id}` | full detail; another restaurant's order = 404 |
| PATCH | `/{order_id}/status` | machine Accepted→Preparing→Ready for Pickup; 400 on skip/backward. **Ready for Pickup triggers nearest-rider assignment** and may set status to `Rider Assigned` |

### 7.5 Customer browse / menu / cart / checkout — `/restaurants` (9) — role `customer`

| Method | Path | Notes |
|---|---|---|
| GET | `""` | `?address_id=&search=&sort=distance\|rating&radius_km=` (**max 50, default 5**). **400 without a saved address.** Returns `distance_km`, `avg_rating` |
| GET | `/{restaurant_id}/menu` | grouped by category, `?category=`; sold-out included with `is_available=false` |
| GET | `/{restaurant_id}/cart` | Redis cart |
| POST | `/{restaurant_id}/cart/items` | `{item_id, qty>0, variant?}` · 201 |
| PATCH | `/{restaurant_id}/cart/items/{item_id}` | `{qty>0}` |
| DELETE | `/{restaurant_id}/cart/items/{item_id}` | returns updated cart |
| DELETE | `/{restaurant_id}/cart` | 204 |
| GET | `/{restaurant_id}/cart/checkout-preview` | **required `?address_id=`**; Google Maps; `fee=50+km×20`; no side effects |
| POST | `/{restaurant_id}/cart/checkout` | `{address_id, payment_method}` · 201. Clears cart **after** commit. 400 empty/invalid, 402 digital fail, 503 Maps down |

### 7.6 Customer orders — `/orders` (4) — role `customer`

`GET /{order_id}/track` (poll; rider fields `null` until assigned; other customer = 404) · `GET ""` (history, newest first) · `POST /{order_id}/reorder` (returns `{cart, skipped_items}`) · `POST /{order_id}/rating` (delivered-only, once-only, at least one rating; 201)

### 7.7 Rider — `/wallet` (13) — role `rider`

| Method | Path | Notes |
|---|---|---|
| POST | `/recharge` | `{amount, method}` · 201 |
| GET | `/balance` | wallet summary |
| PATCH | `/status` | `{is_online}`; **online rejected 400 if balance < Rs. 500** |
| POST | `/cash-deposit` | `{amount_submitted, submission_method}`; server computes expected + discrepancy · 201 |
| GET | `/cod-eligibility` | read view over `can_assign_cod()` |
| GET | `/earnings` | 3-number earnings view |
| PATCH | `/location` | `{latitude, longitude}` → Redis, ~45 s TTL |
| POST | `/assignments/{order_id}/respond` | `{action: accept\|reject}`; assigned rider only |
| PATCH | `/deliveries/{order_id}/status/arrived` | → `Arrived at Restaurant` |
| PATCH | `/deliveries/{order_id}/status/picked-up` | → `Picked Up` |
| PATCH | `/deliveries/{order_id}/status/on-the-way` | → `On the Way` |
| PATCH | `/deliveries/{order_id}/status/delivered` | → `Delivered`; triggers wallet deduction |
| POST | `/documents/{doc_type}` | `doc_type ∈ {cnic, license, vehicle}`; multipart, size-capped |

### 7.8 Admin — `/admin` (23) — role `admin`

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard` | today's orders/revenue + standing balances |
| POST | `/restaurants` | onboard (name, email, password, phone, lat/lng, commission) · 201 |
| GET | `/restaurants` | `?status=active\|inactive` |
| GET | `/restaurants/{id}` | detail |
| PATCH | `/restaurants/{id}/status` | `{is_active}` |
| PATCH | `/restaurants/{id}/commission` | `{commission_rate}` |
| POST | `/restaurants/{id}/reset-credentials` | any subset of email/phone/password |
| GET | `/riders` | `?approval_status=pending\|approved\|rejected` |
| GET | `/riders/{id}` | wallet + pending cash |
| PATCH | `/riders/{id}/approval` | approve/reject docs |
| PATCH | `/riders/{id}/status` | `{is_active}` |
| GET | `/orders` | `?status=&restaurant_id=&date_from=&date_to=` |
| GET | `/orders/{id}` | full detail incl. fee breakdown |
| POST | `/orders/{id}/cancel` | `{reason}`; non-terminal only |
| PATCH | `/orders/{id}/reassign` | `{rider_id}`; bypasses auto-search |
| POST | `/settlements/generate` | `{period_start, period_end}` |
| GET | `/settlements` | `?status=Pending\|Settled` |
| POST | `/settlements/{id}/mark-paid` | manual transfer |
| POST | `/rider-payouts/generate` | `{period_start, period_end}` |
| GET | `/rider-payouts` | `?status=Pending\|Paid` |
| POST | `/rider-payouts/{id}/mark-paid` | |
| GET | `/cash-discrepancies` | `?unresolved_only=` |
| GET | `/reports` | required `?period_start=&period_end=` |

### 7.9 System (1)

`GET /health` → `{status: "ok"}` — unauthenticated, defined in `main.py`.

**Not present anywhere (do not invent):** no `/notifications` API; no customer password reset; no push/device-token registration; no `GET /restaurants/{id}` detail endpoint; no storefront reviews list; no search-suggestions; no customer wallet endpoints; **no customer-facing order cancel** (admin only); no restaurant `city` field; no `/riders/me` profile.

---

## 8. Client ↔ Backend Integration Matrix

`Integrated?` is **No** for every row across **both** clients — neither has a working API call.

### 8.1 Flutter → backend

| Flutter Feature | Flutter Status | Backend Endpoint | Backend | Integrated | Missing Work |
|---|---|---|---|---|---|
| Splash auto-login | routes blindly | `GET /auth/me` | ✅ | ❌ | persist session; call `/auth/me`; branch Home vs Auth |
| Customer Login | mock email+password | `POST /auth/otp/request` + `/otp/verify` | ✅ | ❌ | **rebuild as phone→OTP**; no password server-side |
| Customer Signup | mock email+password+form | `POST /auth/otp/verify` (find-or-create) | ✅ | ❌ | collect phone only; move name/email to `PUT /users/me` |
| Forgot Password | mock delay | **none** (OTP accounts have no password) | ✅ by design | ❌ | remove or repurpose the two screens |
| Rider Login / Signup | mock email+password | `/auth/rider/otp/verify` | ✅ | ❌ | rebuild; backend needs **CNIC**, not email; **`city` does not exist** |
| Logout | clears memory | `POST /auth/logout` | ✅ | ❌ | send refresh_token; clear secure storage |
| Dashboard / restaurant list | `sampleRestaurants` | `GET /restaurants` | ✅ | ❌ | needs a saved address first (400 otherwise) |
| Restaurant Details | passed object | `GET /restaurants/{id}/menu` | ✅ | ❌ | no detail endpoint — compose browse row + menu |
| Menu | `Restaurant.categories` | `GET /restaurants/{id}/menu` | ✅ | ❌ | map category DTOs |
| Search | client-side filter | `GET /restaurants?search=` | ✅ | ❌ | server search is name-only (Flutter also searches tagline/area/menu) |
| Cart | global in-memory `CartService` | 5 cart endpoints | ✅ | ❌ | **cart is per-restaurant server-side**; `CartService` is global |
| Checkout | hardcoded Rs. 1,170/1,444 | `…/cart/checkout-preview` | ✅ | ❌ | replace hardcoded items/totals; drop platform fee + tax |
| Address selection | hardcoded Clifton | `/users/me/addresses` | ✅ | ❌ | build; `address_id` is mandatory |
| Place Order | fake delay | `POST …/cart/checkout` | ✅ | ❌ | send address_id + payment_method; handle 400/402/503 |
| Payment selection | 4 options | accepts **`COD`/`Digital`** only | ✅ | ❌ | map 3 digital → `Digital` |
| Order Tracking | `_MockTrackingData` | `GET /orders/{id}/track` | ✅ | ❌ | poll; map 9 statuses → 5 stages |
| Order History | ❌ no screen | `GET /orders` | ✅ | ❌ | build |
| Reorder | ❌ none | `POST /orders/{id}/reorder` | ✅ | ❌ | add button; surface `skipped_items` |
| Rating / Review | local `setState` | `POST /orders/{id}/rating` | ✅ | ❌ | submit; handle once-only 400 |
| Notifications | 5 seeded fakes | **none** | ❌ | ❌ | backend first, or keep app-local |
| Profile view | mock user | `GET /users/me` | ✅ | ❌ | replace mock object |
| Profile edit | ❌ none | `PUT /users/me` | ✅ | ❌ | add edit UI |
| Saved Addresses menu | "coming soon" | `/users/me/addresses` | ✅ | ❌ | build |
| Payment Methods menu | "coming soon" | **none** | ❌ | ❌ | defer |
| Rider Dashboard | static USD mock | `/wallet/earnings` + `/balance` + `/status` | ✅ | ❌ | replace 4 metric cards + 2 fake orders |
| Rider Online toggle | local `setState` | `PATCH /wallet/status` | ✅ | ❌ | enforce Rs. 500 minimum |
| Rider Accept / Reject | snackbar / **missing** | `/wallet/assignments/{id}/respond` | ✅ | ❌ | real list + both actions |
| Rider Delivery Status | **missing** | 4 × `PATCH /wallet/deliveries/…` | ✅ | ❌ | build progression UI |
| Rider Location | **missing** | `PATCH /wallet/location` | ✅ | ❌ | add a GPS dependency |
| Rider Documents | **missing** | `POST /wallet/documents/{doc_type}` | ✅ | ❌ | build upload UI |
| Rider Earnings/Wallet | **missing** | 5 wallet endpoints | ✅ | ❌ | build screens |

### 8.2 Web (`website/`) → backend

| Web Route | Impl. | Backend Endpoints | Integrated | Missing Work |
|---|---|---|---|---|
| `/` landing | ✅ | none | n/a | — |
| `/admin/login` | ❌ TODO shell | `POST /auth/admin/login` | ❌ | form + token storage + guard |
| `/restaurant/login` | ❌ TODO shell | `POST /auth/restaurant/login` + `/restaurant/otp/verify` | ❌ | form + token storage + guard |
| `/admin/dashboard` | ❌ TODO shell | `GET /admin/dashboard` | ❌ | build |
| `/admin/restaurants` + `/{id}` | ❌ TODO shells | 6 endpoints | ❌ | build |
| `/admin/riders` + `/{id}` | ❌ TODO shells | 4 endpoints | ❌ | build |
| `/admin/orders` + `/{id}` | ❌ TODO shells | 4 endpoints | ❌ | build |
| `/admin/settlements` | ❌ TODO shell | 3 endpoints | ❌ | build |
| `/admin/payouts` | ❌ TODO shell | 3 endpoints | ❌ | build |
| `/admin/customers` | ❌ TODO shell | **no endpoint** | ❌ | no customer-list API exists |
| `/admin/reports` | ❌ TODO shell | `GET /admin/reports` | ❌ | build |
| `/restaurant/dashboard` | ❌ TODO shell | — | ❌ | compose |
| `/restaurant/menu` + `/{id}` | ❌ TODO shells | 6 endpoints | ❌ | build |
| `/restaurant/orders` + `/{id}` | ❌ TODO shells | 3 endpoints | ❌ | build |
| `/restaurant/settlements` | ❌ TODO shell | **no restaurant-side endpoint** | ❌ | does not exist — admin-only |
| `/restaurant/reports` | ❌ TODO shell | **no restaurant-side endpoint** | ❌ | does not exist — admin-only |
| `/restaurant/profile` | ❌ TODO shell | **no endpoint** | ❌ | no restaurant profile API |
| `types/*.ts` | ⚠️ drafts | — | ❌ | resync with real schemas (`order.ts` already wrong) |
| `lib/api/admin.ts`, `restaurant.ts` | ❌ comment-only | — | ❌ | write the calls |
| `lib/auth/index.ts` | ❌ comment-only | — | ❌ | token storage + role guards |
| `middleware.ts` | ❌ pass-through | — | ❌ | uncomment/implement the guards |
| `lib/api/client.ts` | ⚠️ wrapper works | — | ❌ | attach `Authorization: Bearer` |

**Notable backend gaps the web routes assume exist:** no customer-list endpoint (blocks `/admin/customers`), no restaurant-side settlements/reports/profile endpoints (blocks 3 restaurant routes), no restaurant-detail endpoint.

---

## 9. Mock / Hardcoded Data Inventory

### Flutter

| # | Location | Faked | Replaces |
|---|---|---|---|
| M1 | `lib/models/restaurant.dart` `sampleRestaurants` (L86–348) | **4 restaurants**, 11 dishes, distances, ratings, review counts, promo codes, badges, Unsplash URLs | `GET /restaurants` + `/menu` |
| M2 | `auth_service.dart` `login` (L80–91) | name `'Alex Hunter'`/`'Marcus Vance'`, phone `+15550192834`, `mock_token_<ts>` | `/auth/otp/*` |
| M3 | `auth_service.dart` `register` (L128–140) | same, from form input | `/auth/rider/otp/verify` |
| M4 | `auth_service.dart` | `Future.delayed(1200/1400/1000 ms)` as fake latency | real HTTP |
| M5 | `auth_service.dart` | client-side-only validation treated as authoritative | Pydantic schemas |
| M6 | `order_tracking_screen.dart` `_MockTrackingData` (L11–29) | orderId `SM-89241`, ETA 14 min/1:42 PM, `Burger Craze`, rider `Tariq Mehmood`/`Speedy Rider #104`/`Honda 125 (KHI-7821)`/4.9, 2 items at **USD** prices | `GET /orders/{id}/track` |
| M7 | `home_navigation.dart` L24–27 | `orderId: 'ORD-2024-001'`, `status: OrderStatus.prepared` | a real order id |
| M8 | `checkout_screen.dart` L176–187, 382–470 | 2 hardcoded items (650, 520); subtotal 1,170; delivery 50; **platform 25**; **tax 199**; total **1,444** | `checkout-preview` |
| M9 | `checkout_screen.dart` L120–160 | address "Street 5, Block B, Clifton / Clifton, Karachi" | `/users/me/addresses` |
| M10 | `checkout_screen.dart` L37–40 | navigate to tracking with literal `'SM-89241'` | placed order id |
| M11 | `cart_service.dart` | whole cart is an in-memory `List`, **global not per-restaurant** | Redis cart endpoints |
| M12 | `notification_service.dart` `_seed()` | 5 fake notifications referencing order `SM-89241` and rider `Tariq` | no backend equivalent exists |
| M13 | `rider_dashboard_screen.dart` L175–250 | `$142.50`, 8 deliveries, `5.2 hrs`, `$27/hr`, `$38.00` tips, `4.95 ★` | `/wallet/earnings` |
| M14 | `rider_dashboard_screen.dart` L266–285 | 2 fake orders `#SPD-9402`, `#SPD-9415` | assignment list |
| M15 | `dashboard_screen.dart` L1343–1403 | hardcoded category/popular-item lists + 4 Google-hosted image URLs | `GET /restaurants` |
| M16 | `app_constants.dart` L21 | `defaultAddress = 'Home • Street 5, Block B, Clifton'` | `/users/me/addresses` |
| M17 | `app_constants.dart` L4–7, 14, 17 | `deliveryFeeBase=50` ✅, `deliveryFeePerKm=20` ✅ — **but `platformServiceFee=25` and `taxRate=0.17` do not exist in the backend or the spec** | see §19 |
| M18 | `lib/models/restaurant.dart` fields | `distance` (`"2.1 km"`), `reviewCount` (`"2.4k+"`), `deliveryTime` (`"20-25 min"`), `badges`, `promoCode`, `promoDiscount` | backend returns numeric `distance_km`, `avg_rating`, `opening_time` — **no rating count, no delivery-time estimate, no promo codes** |
| M19 | `lib/screens/auth/*` | Google social buttons rendered but inert | no backend support |
| M20 | `login_screen.dart` `PhoneOtpLoginScreen` | "OTP Code sent! Logged in." + jump to Home with **no credentials** | `/auth/otp/*` |

**Mock-auth reachability:** the app can reach `HomeNavigation` with **no credentials at all**, via the unreachable-by-design OTP screen or the guest dashboard paths. Nothing enforces a session.

### Web (`website/`)

| # | Location | Faked | Replaces |
|---|---|---|---|
| W1 | `lib/api/client.ts` | `API_BASE_URL` defaults to `http://localhost:8000`; **no auth header** | real env + interceptor |
| W2 | `lib/api/{admin,restaurant}.ts` | comment-only, zero calls | 32 real endpoint calls |
| W3 | `lib/auth/index.ts` | comment-only | token storage + role guards |
| W4 | `middleware.ts` | auth checks commented out → **everything is public** | JWT verification |
| W5 | 23 `app/admin/**` + `app/restaurant/**` pages | `<h1>` + `TODO` — no data, no state | real dashboards |
| W6 | `types/*.ts` | draft interfaces; `order.ts` status union is **already out of sync** with the backend | generated/mirrored types |
| W7 | `app/admin/layout.tsx` | `<AdminSidebar/>` is a comment | real nav |

**No hardcoded business data was found in `website/`** — because no page renders data at all yet. That is the one advantage it has over the Flutter app: it has no mocks to unwind. **Its `apiClient` wrapper is the only working integration artifact in the entire repository.**

---

## 10. Missing Functionality

### A. Flutter missing functionality

| # | Missing | Why required | Priority |
|---|---|---|---|
| A-F1 | **HTTP/API layer** — no client, base URL, interceptor, JSON parsing, DTOs | Prerequisite for everything | 🔴 Critical |
| A-F2 | **Token + session persistence** (secure storage, refresh, auto-login) | `/auth/refresh` is currently unreachable; users lose sessions on restart | 🔴 Critical |
| A-F3 | **Phone+OTP auth screens** for customer *and* rider (request → verify → resend cooldown) | The only backend-supported credential | 🔴 Critical |
| A-F4 | **Address management + picker** | `address_id` is mandatory for browse, preview and checkout | 🔴 Critical |
| A-F5 | **Checkout wired to the cart**; remove platform fee + tax | Checkout shows fabricated totals | 🔴 Critical |
| A-F6 | **Order history screen** | `GET /orders` exists, no UI | 🟠 High |
| A-F7 | Rider: real order list, accept/reject, delivery-status progression | Core rider job | 🟠 High |
| A-F8 | Rider: location push (no GPS dependency installed) | Required for assignment eligibility | 🟠 High |
| A-F9 | Rider: earnings/wallet/cash-deposit/document-upload screens | Backend fully supports all of these | 🟠 High |
| A-F10 | Real polling + status mapping for tracking | 9 backend statuses → 5-stage tracker | 🟠 High |
| A-F11 | Profile edit (`PUT /users/me`) | Backend supports it | 🟡 Medium |
| A-F12 | Payment method mapping (4 UI → 2 backend) | Silent incompatibility | 🟡 Medium |
| A-F13 | Route table + auth guard | ~25 ad-hoc pushes; no guards | 🟡 Medium |
| A-F14 | Centralised PKR currency formatter | Rider dashboard is in USD; money hand-formatted | 🟡 Medium |
| A-F15 | Remove dead code (unreachable `MenuScreen`, unused `Order` model, 12 dead controls) | Hygiene | 🟡 Medium |
| A-F16 | Dark theme, `intl`, l10n, offline/error states | Polish | 🟢 Low |

### B. Backend missing functionality

| # | Missing | Priority |
|---|---|---|
| B-B1 | **Real SMS OTP provider** — console `print()` only (ADR-001 defers deliberately; **PTA registration is a 2–4 week lead time and should be started now**) | 🔴 Critical (prod) |
| B-B2 | **CORS middleware** — blocks the entire `website/` app | 🟠 High |
| B-B3 | **Rider `approval_status` enforcement** on rider endpoints | 🔴 Critical |
| B-B4 | **Order status history** (table + endpoint) | 🟠 High |
| B-B5 | **Persist `payment_reference`** (column + write) | 🟠 High |
| B-B6 | **Indexes** on all FK/status/date columns | 🟠 High |
| B-B7 | **Customer list endpoint** — blocks `website/app/admin/customers` | 🟡 Medium |
| B-B8 | **Restaurant-side settlements/reports/profile endpoints** — blocks 3 website routes | 🟡 Medium |
| B-B9 | **`GET /restaurants/{id}` detail endpoint** | 🟡 Medium |
| B-B10 | **Customer-facing order cancel** | 🟡 Medium |
| B-B11 | **`special_instructions` accepted at checkout** | 🟡 Medium |
| B-B12 | **Notification module** — spec-sanctioned deferral (§14) | 🟡 Medium (deferred) |
| B-B13 | **`rating_count` / review count** for restaurants | 🟡 Medium |
| B-B14 | **Delivery-time estimate field** | 🟢 Low |
| B-B15 | Customer wallet endpoints (`users.wallet_balance` is dead; spec does not require it) | 🟢 Low |
| B-B16 | Real digital payment gateway (spec §14 defers to one method + COD) | 🟡 Medium (deferred) |
| B-B17 | Automated payouts (spec §14: manual at MVP) | 🟢 Low (deferred) |
| B-B18 | Refresh-token cleanup + revoke-all-sessions | 🟡 Medium |
| B-B19 | Global/IP-level rate limiting | 🟡 Medium |

### C. Integration missing (both clients)

| # | Missing | Priority |
|---|---|---|
| C1 | **Any working API call** — Flutter has none; web has one wrapper with no auth header | 🔴 Critical |
| C2 | **Auth contract reconciliation** (phone+OTP vs email+password) | 🔴 Critical |
| C3 | **Dart models mirroring backend schemas** | 🔴 Critical |
| C4 | **Type-sync between `website/types/*` and the backend** (`order.ts` already wrong) | 🟠 High |
| C5 | **Error handling for 400/401/402/403/404/429/503** — neither client distinguishes them | 🟠 High |
| C6 | **`restaurant_id` propagation** in Flutter (cart is global, must be per-restaurant) | 🟠 High |
| C7 | **`address_id` propagation** | 🔴 Critical |
| C8 | **UUID vs string id mismatch** — backend ids are UUIDs; Flutter uses `rest_001`/`SM-89241` | 🟡 Medium |
| C9 | **API base URL config for Flutter** (no `--dart-define`); Android emulator needs `10.0.2.2`, iOS `localhost` | 🟠 High |
| C10 | **Two divergent brand palettes** (Flutter `#DC2626/#1D4ED8` vs web `#E23A2E/#1E5FA8`) | 🟡 Medium |

### D. Database missing functionality
See §5 D1–D13. Headline: no status history, no payment reference, no indexes, no CHECK constraints.

### E. Authentication / security missing
See §6.3 A1–A15. Headline: credential mismatch, unenforced rider approval, console OTP, seeded admin defaults, no CORS, no token storage on either client, web middleware bypassed.

### F. API issues

| # | Issue | Priority |
|---|---|---|
| F1 | `GET /restaurants` requires a saved address — and **neither client has an address feature**, so browse 400s for every new user | 🔴 Critical |
| F2 | `GET /restaurants` default `radius_km=5`, hard max 50 — distant addresses see an empty list | 🟠 High |
| F3 | No idempotency key on checkout; duplicate orders possible | 🟠 High |
| F4 | `payment_reference` returned but not persisted | 🟠 High |
| F5 | `orders.special_instructions` unreachable | 🟡 Medium |
| F6 | Restaurant status PATCH can transit to `Rider Assigned` as a side effect of `Ready for Pickup` | 🟡 Medium |
| F7 | `POST /auth/refresh` unthrottled (documented as intentional) | 🟢 Low |
| F8 | Inconsistent `DELETE` cart shapes (204 vs body) | 🟢 Low |

### G. Payment / wallet issues

| # | Issue | Priority |
|---|---|---|
| G1 | **Flutter adds a Rs. 25 platform fee + 17% GST that contradict spec §3.3/§11 and do not exist in the backend.** Totals can never match. | 🔴 Critical |
| G2 | Digital payment is a stub that always succeeds | 🟠 High |
| G3 | Flutter offers 4 payment methods; backend accepts 2 (spec §14: one digital + COD) | 🟠 High |
| G4 | `payment_reference` never persisted | 🟠 High |
| G5 | Rider wallet minimum (Rs. 500) + Rs. 10/delivery appear nowhere in Flutter | 🟠 High |
| G6 | No customer-side payment history endpoint | 🟡 Medium |
| G7 | No refund flow of any kind | 🟡 Medium |
| G8 | Customer `users.wallet_balance` is dead | 🟢 Low |
| G9 | Settlements/payouts are manual-transfer by design (spec §14) | 🟢 Low (deferred) |

### H. Rider / delivery issues

| # | Issue | Priority |
|---|---|---|
| H1 | **`approval_status="pending"` riders are not blocked** from rider endpoints | 🔴 Critical |
| H2 | Flutter rider surface is a static mock (no orders, no reject, no status flow) | 🟠 High |
| H3 | No GPS dependency — rider location can never be pushed | 🟠 High |
| H4 | No document upload UI → a rider can never become `approved` through the app | 🟠 High |
| H5 | Assignment needs `is_online` + wallet ≥ 500 + fresh Redis location; if any is missing the order **silently stays at `Ready for Pickup`** with no notification to restaurant, customer or admin | 🟠 High |
| H6 | Flutter rider signup collects a `city` that **does not exist** on `riders` | 🟡 Medium |
| H7 | No rider-side order history | 🟡 Medium |
| H8 | Rider dashboard renders USD while the system is PKR | 🟡 Medium |
| H9 | Rider signup has **no CNIC field**, which the backend requires | 🟠 High |

### I. Restaurant issues

| # | Issue | Priority |
|---|---|---|
| I1 | `website/app/restaurant/**` — 10 routes, **all TODO shells**; 0 of 9 restaurant endpoints called | 🟠 High |
| I2 | No restaurant login form; `/restaurant/login` is a shell | 🟠 High |
| I3 | 3 of 10 restaurant routes (`settlements`, `reports`, `profile`) have **no backend endpoint at all** | 🟡 Medium |
| I4 | No restaurant-side new-order notification (poll-only) | 🟡 Medium |
| I5 | S3 credentials mandatory — no local-disk fallback for menu photo upload | 🟡 Medium |
| I6 | Restaurant self-signup does not exist (admin-created by design — correct) | ✅ by design |

### J. Admin issues

| # | Issue | Priority |
|---|---|---|
| J1 | `website/app/admin/**` — 13 routes, **all TODO shells**; 0 of 23 admin endpoints called | 🟠 High |
| J2 | `/admin/customers` has **no backend endpoint** to call | 🟡 Medium |
| J3 | `AdminSidebar` unimplemented; admin layout is a bare wrapper | 🟡 Medium |
| J4 | Auto-seeded admin with placeholder password; nothing forces a change | 🔴 Critical |
| J5 | No admin 2FA / IP allow-list / action audit log | 🟡 Medium |

### K. Notification issues

| # | Issue | Priority |
|---|---|---|
| K1 | Backend notification module is a README stub — **spec-sanctioned (§14)** | 🟡 Medium (deferred) |
| K2 | Flutter `NotificationService` is seeded with fakes referencing `SM-89241` | 🟡 Medium |
| K3 | No push permission handling or device-token registration anywhere | 🟡 Medium |
| K4 | Tracking is poll-only by design; **nothing on either client polls** | 🟠 High |

### L. Testing issues

| # | Issue | Priority |
|---|---|---|
| L1 | **Backend tests need a live PostgreSQL + Redis** (`conftest.py` explicitly avoids sqlite — all PKs are `PG UUID`). **Whether they pass is Unknown / Requires Verification** — not executed during this read-only audit. | 🟠 High |
| L2 | Backend tests roll back DB transactions but **do not flush Redis** — OTP/cart/rate-limit keys leak between tests | 🟡 Medium |
| L3 | Flutter tests are widget/nav smoke only — **zero service unit tests** | 🟡 Medium |
| L4 | **`website/` has no tests at all** (no test runner configured, `typecheck` script exists but no CI) | 🟡 Medium |
| L5 | **Zero integration/E2E tests spanning any client → HTTP → backend** | 🔴 Critical |
| L6 | No contract tests for Dart models **or** `website/types/*` against Pydantic schemas | 🟠 High |
| L7 | No golden tests, no coverage gate, **no CI at all** (`.github/workflows` absent) | 🟡 Medium |
| L8 | Password-rule inconsistency (login ≥6 vs register ≥8) unspecified and untested | 🟢 Low |

### M. Deployment / configuration issues

| # | Issue | Priority |
|---|---|---|
| M1 | **No `.env`** anywhere — only `.env.example`. Backend cannot start. | 🔴 Critical (operational) |
| M2 | **Committed work deleted from the working tree** (`website/`, `docs/`, `mobile_app/`, root `docker-compose.yml`) — see §0 | 🔴 Critical |
| M3 | **AWS + Maps keys are mandatory Settings fields** with no defaults — the app refuses to boot without real credentials | 🟠 High |
| M4 | `docs/schema.jpeg` (cited by 5 model files) does not exist; the ERD is `docs/Schema_Updated.png`, **and neither is in the working tree** | 🟠 High |
| M5 | **README materially wrong** — claims the backend is unimplemented; never mentions `website/`, `docs/` or `mobile_app/` | 🟠 High |
| M6 | **Two Flutter apps in `HEAD`, a third in the working tree** — canonical location unresolved | 🟠 High |
| M7 | No reverse proxy / TLS / CORS origin config | 🟡 Medium |
| M8 | No Dockerfile production hardening, no CI/CD, no monitoring (Phase 12 unstarted) | 🟡 Medium |
| M9 | `backend/docker-compose.yml` uses the obsolete `version:` key; mounts `./app` requiring CWD `/backend` | 🟡 Medium |
| M10 | Flutter has no build-time API base URL (`--dart-define`) | 🟠 High |
| M11 | Web needs `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (Bun); no CORS origin configured server-side to match | 🟠 High |
| M12 | Brand tokens differ between the two clients | 🟡 Medium |

---

## 11. Broken / Incomplete Functionality

| # | Item | Nature | Priority |
|---|---|---|---|
| X1 | Customer/rider login | **Functionally broken against the backend** — password sent to OTP-only accounts | 🔴 Critical |
| X2 | Checkout totals | **Provably wrong** — constants unrelated to the cart, plus 2 fees that contradict the locked spec | 🔴 Critical |
| X3 | Track tab | permanently fake order `ORD-2024-001` | 🟠 High |
| X4 | Rider dashboard | 100% static; accept shows only a snackbar | 🟠 High |
| X5 | Place order → tracking | literal `'SM-89241'`; **cart is never cleared** after "placing" | 🟠 High |
| X6 | `PhoneOtpLoginScreen` | unreachable dead code, but the only UI matching the real auth contract | 🟠 High |
| X7 | `website/` restaurant + admin portals | 32 route files' worth of shells, all TODO | 🟠 High |
| X8 | `website/middleware.ts` | auth checks commented out — portals publicly reachable | 🟠 High |
| X9 | `MenuScreen` | unreachable, 365 lines dead | 🟡 Medium |
| X10 | `lib/models/order.dart` | unused; checkout bypasses it | 🟡 Medium |
| X11 | Splash | always routes to Register As; never auto-logs-in | 🟡 Medium |
| X12 | Profile menu | 3 of 4 rows → "coming soon" | 🟡 Medium |
| X13 | Order rating | stars update locally; nothing persists | 🟡 Medium |
| X14 | Rider signup `city` | collected but discarded (no DB column) | 🟡 Medium |
| X15 | Dead controls | 12 verified `onPressed/onTap: () {}` sites | 🟡 Medium |
| X16 | Promo codes | displayed with no backend promo system (spec §14 excludes loyalty/referral) | 🟢 Low |
| X17 | `IndexedStack` animations | hidden tabs keep animating, incl. 3 controllers in tracking | 🟢 Low |
| X18 | `pubspec.yaml` asset path | goes through a directory literally named `*.png` | 🟢 Low |
| X19 | `website/types/order.ts` | status union already out of sync with the backend machine | 🟡 Medium |

---

## 12. Security Issues

| # | Issue | Priority |
|---|---|---|
| S1 | **Rider endpoints do not enforce `approval_status`** — unapproved riders have full access | 🔴 Critical |
| S2 | **OTP delivered only to the server console** (`print()`) | 🔴 Critical (non-dev) |
| S3 | **Auto-seeded admin with a placeholder password** from `.env.example` | 🔴 Critical |
| S4 | **No CORS middleware** — blocks the entire `website/` app | 🟠 High |
| S5 | **`website/middleware.ts` is a pass-through** — `/admin/*` and `/restaurant/*` are unprotected | 🟠 High |
| S6 | **No token storage on either client** (no secure-storage dependency in Flutter; comment-only in web) | 🟠 High |
| S7 | **No idempotency on checkout** — duplicate orders possible | 🟠 High |
| S8 | `JWT_SECRET` default is a placeholder string | 🟠 High |
| S9 | **`is_active` never enforced at token-verification time** — deactivation doesn't stop a live token | 🟡 Medium |
| S10 | **Per-identifier rate limits are IP-rotation-bypassable**; no global limiter, no lockout | 🟡 Medium |
| S11 | No session/device management, no revoke-all, no refresh-token cleanup | 🟡 Medium |
| S12 | No admin 2FA / IP allow-list / action audit log | 🟡 Medium |
| S13 | Digital payment stub cannot fail → the 402 path is effectively untested | 🟡 Medium |
| S14 | `POST /auth/refresh` unthrottled (documented as intentional) | 🟢 Low |

**Positives (verified):** bcrypt everywhere a password exists; refresh tokens stored as hashes, never raw; the `type` claim prevents refresh-as-access; one-time-use OTP deleted on success; **45 s resend cooldown enforced server-side**; every request body Pydantic-validated; all queries ORM-parameterised; rate limits on every credential-accepting endpoint; uploads size-capped; **no card numbers, CVVs or gateway secrets are accepted or stored anywhere**.

---

## 13. Database Issues

See §5 D1–D13. The schema is **structurally sound** and matches spec §12 field-for-field, with one documented deviation (Redis carts). Gaps are operational: **no indexes, no status history, no persisted payment reference, no CHECK constraints**, and an **ERD filename mismatch** (`docs/schema.jpeg` cited vs `docs/Schema_Updated.png` present) that makes five models' "matches exactly" claims **Unknown / Requires Verification**. In the working tree neither exists.

---

## 14. API Issues

See §10.F. The two that gate all client work:
- **F1:** browse requires a saved address; **neither client has an address feature** → every new user would see an empty home screen.
- **F3/F4:** no checkout idempotency; `payment_reference` never persisted.

Plus three endpoints the web routes assume but which do not exist: **customer list**, **restaurant-side settlements/reports/profile**.

---

## 15. Customer Flow Audit

Spec flow (§7): Register/Login → Browse → Select restaurant → Select food → Add to cart → Checkout → Place order → Restaurant receives → Rider assignment → Rider accepts → Pickup → Delivery → Completed → Rating.

| Step | Backend | Flutter | End-to-end |
|---|---|---|---|
| Register/Login | ✅ OTP find-or-create | ❌ mock password login | ❌ **mismatched credential type** |
| Browse restaurants | ✅ `GET /restaurants` (needs address) | ✅ against hardcoded list | ❌ would 400 without an address |
| Select restaurant | ⚠️ no detail endpoint | ✅ | ❌ |
| Select food / menu | ✅ `GET /restaurants/{id}/menu` | ✅ hardcoded menus | ❌ |
| Add to cart | ✅ Redis cart CRUD | ✅ in-memory, **global not per-restaurant** | ❌ |
| Checkout | ✅ preview, real Maps distance | ❌ hardcoded totals/address, no `address_id` | ❌ |
| Place order | ✅ frozen snapshot, commission, cart cleared | ❌ fake delay, cart never cleared | ❌ |
| Restaurant receives | ✅ dashboard endpoints | ❌ web shell only | ❌ |
| Rider assignment | ✅ nearest eligible rider on `Ready for Pickup` | ❌ none | ❌ |
| Rider accepts | ✅ accept/reject | ❌ accept = snackbar, no reject | ❌ |
| Pickup → Delivery | ✅ 4 status endpoints + side effects | ❌ none | ❌ |
| Completed | ✅ `delivered_at`, wallet deduction | ❌ none | ❌ |
| Rating/review | ✅ `POST /orders/{id}/rating` | ❌ local `setState` | ❌ |

**Verdict: the backend implements the entire customer flow end-to-end and matches the spec's money model exactly. The Flutter app implements the visual shape of roughly the first half, with an invented fee structure, and none of it is connected.**

---

## 16. Rider Flow Audit

| Step | Backend | Flutter | End-to-end |
|---|---|---|---|
| Signup | ✅ `/auth/rider/otp/verify` (CNIC + vehicle) | ⚠️ collects name/email/phone/vehicle/**city** — **no CNIC field**; `city` not in DB | ❌ |
| Login | ✅ OTP | ❌ mock password | ❌ |
| Document upload | ✅ `POST /wallet/documents/{doc_type}` | ❌ missing | ❌ |
| Admin approves | ✅ `/admin/riders/{id}/approval` | ❌ no UI (web shell) | ❌ |
| Online/offline | ✅ Rs. 500 minimum enforced | ⚠️ local toggle, no minimum, no call | ❌ |
| Available orders | ✅ via assignment state | ❌ 2 static USD cards | ❌ |
| Accept | ✅ | ⚠️ snackbar only | ❌ |
| Reject | ✅ | ❌ **missing entirely** | ❌ |
| Location push | ✅ Redis, 45 s TTL | ❌ **no GPS dependency** | ❌ |
| Delivery status | ✅ 4 endpoints | ❌ **missing entirely** | ❌ |
| Earnings / wallet | ✅ `/wallet/earnings`, `/balance`, `/cod-eligibility` | ❌ static mock | ❌ |
| Cash deposit | ✅ `/wallet/cash-deposit` | ❌ missing | ❌ |
| Weekly payout | ✅ admin-generated | ❌ missing | ❌ |

**Verdict: the rider backend is the most complete rider surface in the project; the Flutter rider side is the least implemented surface in the repo. This is the single largest volume of missing UI work.**

---

## 17. Restaurant Flow Audit

Spec §9: manual onboarding (email/password/phone) → 10% commission → menu management → order accept/status → weekly settlement → reports. Spec §14: **"Restaurant mobile app — Web Dashboard only for MVP."**

| Step | Backend | Web (`website/app/restaurant/*`) |
|---|---|---|
| Admin onboarding | ✅ `POST /admin/restaurants` | ❌ admin route is a shell |
| Login (email+password **or** OTP) | ✅ both paths | ❌ `/restaurant/login` is a `<h1>` shell |
| Menu CRUD + photo upload | ✅ 6 endpoints | ❌ `/restaurant/menu` + `/[itemId]` shells |
| Order list + detail | ✅ 3 endpoints | ❌ `/restaurant/orders` + `/[orderId]` shells |
| Status: Accepted→Preparing→Ready | ✅ state machine, 400 on invalid | ❌ shell |
| Ready → rider assignment | ✅ automatic nearest-rider | ❌ shell |
| Settlements view | ⚠️ **admin-side only** | ❌ `/restaurant/settlements` has **no endpoint to call** |
| Reports | ⚠️ **admin-side only** | ❌ `/restaurant/reports` has **no endpoint to call** |
| Profile | ❌ **no endpoint** | ❌ `/restaurant/profile` has nothing to call |

**Verdict: fully specified and implemented server-side; the intended client (`website/`) has correct routes but 0% implementation, and 3 of its 10 routes have no backend endpoint behind them.**

---

## 18. Admin Flow Audit

Spec §10: dashboard → restaurant/rider/order/customer management → settlement + payout processing → cash reconciliation → reports.

| Step | Backend | Web (`website/app/admin/*`) |
|---|---|---|
| Dashboard summary | ✅ `GET /admin/dashboard` | ❌ shell |
| Restaurant management | ✅ 6 endpoints | ❌ `/admin/restaurants` + `/[id]` shells |
| Rider management | ✅ 4 endpoints | ❌ `/admin/riders` + `/[id]` shells |
| Order management | ✅ 4 endpoints | ❌ `/admin/orders` + `/[orderId]` shells |
| Settlement processing | ✅ 3 endpoints | ❌ `/admin/settlements` shell |
| Rider payout processing | ✅ 3 endpoints | ❌ `/admin/payouts` shell |
| Cash reconciliation | ✅ `GET /admin/cash-discrepancies` | ⚠️ no dedicated route (expected under `/admin/payouts`) |
| Reports | ✅ `GET /admin/reports` | ❌ `/admin/reports` shell |
| **Customer management** (spec §10) | ❌ **no endpoint exists** | ❌ `/admin/customers` shell with nothing to call |
| Auth gate | ✅ RBAC enforced server-side | ❌ middleware pass-through |

**Verdict: 23 admin endpoints implemented and RBAC-protected; the entire admin UI is untouched shells, one required screen (customers) has no backend support, and the client-side auth gate is disabled.**

---

## 19. Payment & Wallet Audit

| Aspect | Backend / Spec | Flutter | Verdict |
|---|---|---|---|
| COD | ✅ `"COD"`, cash at delivery (spec §5) | ✅ UI option | not connected |
| Digital | ⚠️ `"Digital"`, always-succeeding stub (spec §14 defers real gateway) | ✅ 3 separate options | **UI offers 4, backend accepts 2** |
| Delivery fee `50 + km×20` | ✅ `Decimal`, quantized (spec §3.3) | ✅ constants match exactly | not connected |
| **Platform fee Rs. 25** | ❌ **does not exist in backend or spec** | ✅ added client-side | 🔴 **invented — totals can never match** |
| **17% GST** | ❌ **does not exist in backend or spec** | ✅ added client-side | 🔴 **invented — totals can never match** |
| Minimum order Rs. 500 | ❌ not in spec or backend | ✅ constant defined (unused) | invented |
| Commission 10% | ✅ frozen per order (spec §3.2) | ❌ absent | fine (server-side) |
| Restaurant 90% | ✅ `restaurant_payable` | ❌ absent | fine |
| Rider 100% of delivery fee | ✅ `rider_earning` | ❌ absent | fine |
| `payment_reference` | ⚠️ returned, never persisted | ❌ not read | gap |
| Rider wallet min Rs. 500 | ✅ enforced on go-online (spec §3.1) | ❌ absent | gap |
| Rs. 10 per delivery | ✅ deducted on `Delivered` (spec §3.1) | ❌ absent | gap |
| Cash deposits + discrepancy | ✅ (spec §3.4) | ❌ absent | gap |
| Cash cap Rs. 10,000 | ✅ `CASH_COLLECTION_CAP` | ❌ absent | gap |
| Settlements | ✅ manual transfer (spec §14) | ❌ absent | out of mobile scope |
| Rider payouts | ✅ manual transfer (spec §14) | ❌ absent | out of mobile scope |
| Customer wallet | ⚠️ column exists, no endpoints; spec does not require one | ❌ absent | dead column |

**Critical money-math finding:** spec §11's worked example is unambiguous — `Rs. 1,000 food + 3 km → fee Rs. 110 → customer pays Rs. 1,110`. SpeedyMeals' revenue is **10% commission + Rs. 10 wallet deduction only**. There is no platform fee and no tax anywhere in the LOCKED specification. The Flutter app's `platformServiceFee = 25` and `taxRate = 0.17` are **inventions that contradict the spec**, and they guarantee the cart total can never equal `checkout-preview`. **Remove both from the Flutter side** — this is the correct resolution, since the backend matches the spec exactly. Adding them to the backend would change `orders.total_amount`, restaurant commission, restaurant payable and every settlement number, invalidating the locked §11 model.

---

## 20. Order Lifecycle Audit

Backend machine (`ORDER_STATUS_TRANSITIONS`), verified:

```
[checkout] → Accepted
Accepted ──→ Preparing ──→ Ready for Pickup
                              │ (auto-assign nearest eligible rider)
                              ▼
                        Rider Assigned ──→ Accepted by Rider ──→ Arrived at Restaurant
                                                                        │
        Rejected ◀──(reject)────────────────────────────────────────────┘
           │                                                             ▼
           └──→ Rider Assigned (reassign)                          Picked Up ──→ On the Way ──→ Delivered
                                                                                                    │
                                                                              side effects: wallet −Rs.10, delivered_at
Admin:  any non-terminal ──→ Cancelled  (+ force-reassign a rider)
```

| Aspect | Finding | Priority |
|---|---|---|
| Transitions | ✅ Enforced server-side; skip/backward/unknown = 400, DB untouched (test-verified) | — |
| Terminal states | ✅ `Delivered` and `Cancelled` locked against admin mutation | — |
| Placement status | ⚠️ Orders land as **`Accepted`**, not `Placed`; no `Placed` state exists. Flutter's `OrderStatus.placed`/`confirmed` are fiction. | 🟠 High |
| Status mapping | ❌ **Required and missing.** Flutter has 5 states; backend has 9 + `Rejected` + `Cancelled`. The tracker cannot distinguish `Rider Assigned` / `Accepted by Rider` / `Arrived`. `website/types/order.ts` is **already wrong** (omits 3 states). | 🔴 Critical |
| Stuck orders | ⚠️ No eligible rider → order silently remains at `Ready for Pickup`; no notification to anyone. Admin reassign exists but requires noticing. | 🟠 High |
| Customer cancel | ❌ admin only | 🟡 Medium |
| Status history | ❌ not recorded | 🟠 High |
| Duplicate submission | ⚠️ no idempotency key; acknowledged in code as accepted MVP risk | 🟠 High |
| Rejection loop | ⚠️ `exclude_rider_ids` prevents immediate re-offer, but no cap on reject rounds | 🟡 Medium |
| COD cash flow | ✅ `pending_cash_owed` accrues, capped at Rs. 10,000 blocking further COD (spec §3.4) | — |
| Wallet deduction | ✅ exactly-once per delivery (tested in `test_delivered_side_effects.py`) | — |
| Spec conformance | ✅ Status flow and money side effects match spec §5/§7/§11 | — |

---

## 21. Notification Audit

| Aspect | Status |
|---|---|
| Backend `platform/notification` | ❌ README stub. No model, table, router, FCM/APNs. **Spec-sanctioned deferral** (§14: "Push notifications — in-app status refresh is enough for MVP") |
| Device tokens | ❌ nothing |
| Flutter `NotificationService` | ⚠️ Real `ChangeNotifier` (read/unread, unread count, mark-all-read, remove) but **seeded with 5 hardcoded items**, one referencing the fake order `SM-89241` |
| Flutter `NotificationsScreen` | ✅ fully implemented UI (swipe-dismiss, read state, empty state) |
| Live badge | ✅ wired via `AnimatedBuilder` in dashboard + bottom nav |
| Web notifications | ❌ none |
| Tracking updates | ❌ poll-only by design; **nothing on either client polls** |
| OS integration | ❌ no `firebase_messaging`, no permission handling, no deep links |

**Verdict:** the Flutter notification UI is production-quality but fed by fabricated data with no backend to supply it. Because the backend module does not exist, **this is greenfield, not integration** — and the spec explicitly departs it from MVP. The pragmatic path is to derive in-app notifications from `/orders` polling rather than build a push pipeline.

---

## 22. Testing Audit

| Suite | Files | Tests | Coverage |
|---|---|---|---|
| **Backend** (`backend/app/tests/`) | 19 | **293 test functions** | auth, auth refresh, cart, checkout, delivered side effects, delivery status, food delivery, order history/rating, **order lifecycle E2E**, order tracking, restaurant browse, rider accept/reject, rider assignment, rider documents, rider location, wallet money math, wallet payment, admin |
| **Flutter** (`test/`) | 2 | smoke only | `widget_test.dart` (1), `critical_flows_test.dart` (nav: Cart→Checkout→Tracking) |
| **Web** (`website/`) | 0 | 0 | no test runner configured |
| **Cross-stack** | 0 | 0 | ❌ nothing |

**Backend coverage is genuinely strong** — `test_order_lifecycle_e2e.py` walks the full lifecycle, `test_wallet_money_math.py` covers fee/commission math, `test_delivered_side_effects.py` asserts exactly-once deduction. Backend Phase 11 is effectively satisfied.

**Not tested:**
- Any client↔backend path (L5) — the entire subject of this report
- Dart model **or** TypeScript type ↔ Pydantic schema contract (L6) — and `website/types/order.ts` is **already drifting**
- Whether backend tests currently pass — **Unknown / Requires Verification** (live Postgres + Redis required; not run)
- Redis isolation between backend tests (L2)
- Flutter service units — `AuthService`, `CartService`, `NotificationService` are pure Dart and trivially testable; currently untested
- `website/` entirely — no runner, no tests, no CI

---

## 23. Deployment / Environment Configuration Audit

| Item | Status | Notes |
|---|---|---|
| `backend/app/.env.example` | ✅ | Keys: `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`, `REDIS_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `GOOGLE_MAPS_API_KEY`, `SMS_PROVIDER_MODE`, `SMS_API_KEY`, `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD` |
| Actual `.env` | ❌ **absent** | Backend cannot start. `.env.example` also opens with a stray `[TEMPLATE]` line. |
| Config source | ✅ `pydantic-settings`, resolved relative to `core/config.py` (not CWD) |
| Mandatory-without-default keys | ⚠️ `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, AWS ×3, `S3_BUCKET_NAME`, `GOOGLE_MAPS_API_KEY`, `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD` — cannot boot without real AWS/Maps creds |
| `.gitignore` | ✅ root + `backend/.gitignore` (`.env` ignored) |
| Backend Dockerfile | ✅ `backend/Dockerfile`; production multi-stage hardening is Phase 12, unstarted |
| `backend/docker-compose.yml` | ✅ api + postgres:15 + redis:7; obsolete `version:` key; mounts `./app` → requires CWD `/backend` |
| Web Docker | ✅ `website/Dockerfile` multi-stage `oven/bun:1-alpine`, Next.js standalone |
| Web env | ⚠️ `website/.env.example` → `NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"`; needs `.env.local` |
| CI/CD | ❌ **no `.github/workflows`** |
| Flutter API base URL | ❌ nothing — no `--dart-define`, no config class, no environment switching |
| Emulator host mapping | ❌ undocumented — Android `10.0.2.2`, iOS `localhost`, physical device LAN IP |
| Client secrets | ✅ Flutter/Web correctly hold none — but also hold no config at all |
| Docs | ⚠️ `docs/` exists in `HEAD` (spec, ERD, ADRs, journey diagrams) but is **deleted from the working tree** |
| Monitoring/logging | ❌ none |

**Config each client will need:** Flutter → `API_BASE_URL` via `--dart-define`. Web → `NEXT_PUBLIC_API_BASE_URL` (already scaffolded). Everything else (JWT secret, DB URL, S3, Maps) stays server-side.

---

## 24. Required Changes Before Integration

**Blockers — resolve before writing any integration code**

1. **Decide the customer/rider auth model.** Flutter collects email+password; the backend only accepts phone+OTP, matching the spec. Rebuild the Flutter auth screens around phone → OTP → verify, collecting name/email afterwards via `PUT /users/me`.
2. **Remove the invented Rs. 25 platform fee and 17% GST** from the Flutter cart and checkout. Spec §3.3/§11 define revenue as 10% commission + Rs. 10/delivery only. The backend is already correct; changing it would invalidate the locked money model.
3. **Restore or confirm the working-tree deletions** (`website/`, `docs/`, `mobile_app/`, root `docker-compose.yml`) — a commit right now would destroy the locked spec, the ERD, both ADRs, the entire web scaffold, and a second Flutter app. (See §0.)
4. **Resolve which Flutter app is canonical** — `HEAD` has two, the working tree a third.
5. **Create `backend/app/.env`**; decide whether AWS/Maps keys become optional for local dev.
6. **Add CORS middleware** (`http://localhost:3000` for the web app; `10.0.2.2`/device origins for Flutter web).
7. **Enforce `approval_status` on rider endpoints** — a security defect independent of all client work.
8. **Reconcile the ERD filename** (`docs/Schema_Updated.png` vs the `docs/schema.jpeg` cited by five model files), or drop the "matches exactly" claims.
9. **Start PTA Sender-ID registration for a real SMS provider now** — ADR-001 explicitly warns of a 2–4 week lead time that must not become the launch blocker.

**Design decisions required**

10. **Address capture strategy.** `GET /restaurants` 400s without a saved address, so the first screen after login must obtain one. GPS auto-detect, map picker, or lat/lng form? This decides whether Flutter needs a location package.
11. **Cart model alignment.** Backend carts are per-restaurant and the spec's v6.0 change *mandates multi-cart*; `CartService` is global. Add `restaurantId` to `CartService` and support concurrent per-restaurant carts.
12. **Status mapping.** Define one authoritative mapping for all 9 order states + `Rejected`/`Cancelled`, and fix `website/types/order.ts` to match.
13. **Payment vocabulary.** Map Flutter's 4 options to `COD`/`Digital` (spec §14: one digital method + COD).
14. **Notification strategy.** Greenfield backend push vs. derive in-app notifications from order polling. Recommend polling for MVP (spec-sanctioned).
15. **Shared contract artifacts.** Decide where Dart models and TS types are generated/validated from so both clients stay in sync with Pydantic.
16. **Brand reconciliation** — Flutter `#DC2626`/`#1D4ED8` vs web `#E23A2E`/`#1E5FA8`.

**Then, in order**

17. Add dependencies: Flutter `http` + secure storage (+ GPS if decision 10 needs it); web already has everything except real calls.
18. Build the Flutter `data/` layer (see §25) and wire `website/lib/api/*` + `lib/auth` + `middleware.ts`.
19. Persist tokens in both clients; add splash rehydration and route guards.
20. Rewrite Flutter auth screens; wire logout.
21. Wire Flutter browse → menu → cart → checkout → place order → tracking, replacing M1–M20.
22. Build the Flutter rider surface (largest missing UI).
23. Implement the web restaurant and admin portals (32 route shells).
24. Backfill tests: Dart service units, TS type/Pydantic contract tests, at least one true E2E.
25. Fix the documentation (README, `Backend_development.md`, `docs/` references).

---

## 25. Recommended Integration Architecture

```
lib/                                        FLUTTER
├── core/
│   ├── config/app_config.dart              API_BASE_URL from --dart-define
│   ├── network/
│   │   ├── api_client.dart                 http, base URL, headers, timeouts
│   │   ├── auth_interceptor.dart           Bearer + 401 → refresh → retry-once
│   │   └── api_exception.dart              typed 400/401/402/403/404/429/503
│   └── storage/token_storage.dart          flutter_secure_storage (access + refresh)
├── data/
│   ├── models/                             DTOs 1:1 with Pydantic schemas
│   │   ├── auth_dto.dart, user_dto.dart
│   │   ├── restaurant_dto.dart, cart_dto.dart
│   │   └── order_dto.dart, wallet_dto.dart
│   ├── mappers/                            DTO → existing UI models
│   └── repositories/
│       ├── auth_repository.dart            /auth/*
│       ├── user_repository.dart            /users/me, addresses
│       ├── restaurant_repository.dart      /restaurants, /menu
│       ├── cart_repository.dart            /restaurants/{id}/cart/*
│       ├── order_repository.dart           /orders/*, checkout
│       └── rider_repository.dart           /wallet/*
└── state/                                  AuthController, CartController,
                                            OrderController, RiderController
```

```
website/                                    NEXT.JS
├── lib/
│   ├── api/
│   │   ├── client.ts         ✅ EXISTS — add Bearer + 401 refresh + typed errors
│   │   ├── admin.ts          fill in the 23 admin calls
│   │   └── restaurant.ts     fill in the 9 restaurant calls
│   ├── auth/index.ts         token storage + role guards
│   └── hooks/
├── middleware.ts             uncomment and implement the guards
├── types/                    resync against Pydantic (order.ts is already wrong)
└── app/{admin,restaurant}/*  implement the 32 route shells
```

**Principles**

- **Preserve every existing Flutter screen's widget tree and visual design.** This is a data-source swap, not a redesign. `RestaurantDetailScreen`, `CartScreen`, `DashboardScreen` keep their layouts; only what feeds them changes.
- **Reuse `website/lib/api/client.ts` as the template** for Flutter's `ApiClient` — it is the only working integration artifact in the repo, and its shape (base URL → headers → status check → typed body) is already correct. It just needs the auth header and error typing.
- **Map at the boundary.** Keep `Restaurant` / `CartLine` UI models and add `data/mappers/` so a backend field change doesn't ripple through screens.
- **One place per HTTP concern.** No screen calls `http` directly — mirrors the backend's own `core/maps_client.py` / `core/storage.py` single-touchpoint discipline.
- **Retire `AuthService`'s mock internals, not its interface.** Its singleton + `currentUser`/`isLoggedIn` surface is already consumed by `profile_screen` and `rider_dashboard_screen`; keep the shape, replace the body.
- **Extend `CartService` with `restaurantId`** rather than replacing it, so existing `AnimatedBuilder` wiring in `home_navigation`, `cart_screen` and `dashboard_screen` keeps working — and to satisfy the spec's mandated multi-cart model.
- **State management:** the project deliberately avoids Provider/Riverpod. Keep `ChangeNotifier` singletons + controllers, or introduce one state library in a single deliberate step. Do not mix both styles.
- **Backend stays the source of truth.** The one place this is debated — platform fee and tax — the spec and the backend agree against the client.

---

## 26. Step-by-Step Integration Roadmap

**Phase 0 — Stabilise the repository (do this first)**
Confirm the deletion of `website/`, `docs/`, `mobile_app/`, root `docker-compose.yml` is intentional; restore what is missing. Decide the canonical Flutter location. Resolve §24 decisions 1–16. Create `backend/app/.env`; `docker-compose up`; confirm `GET /health`; run `pytest` and record the result.
*Exit:* repo stable; all decisions recorded; backend runs locally; test status known.

**Phase 1 — Networking foundation (both clients)**
Flutter: add `http` + `flutter_secure_storage`; build `app_config`, `api_client`, `api_exception`, `token_storage`. Web: add Bearer injection + typed errors to the existing `client.ts`.
*Exit:* each client reaches `GET /health` locally and surfaces a typed error on failure.

**Phase 2 — Auth (customer + rider in Flutter; restaurant + admin in web)**
Flutter: rebuild the four auth screens around phone → OTP → verify; add CNIC to rider signup; drop `city`; wire refresh + persistence; splash auto-login; route guards; logout → `/auth/logout`. Web: build `/admin/login` and `/restaurant/login`; wire `lib/auth`; uncomment `middleware.ts` guards.
*Exit:* real accounts log in on both clients; restart preserves sessions; logout revokes server-side; `/admin/*` redirects when unauthenticated.

**Phase 3 — Profile & addresses (Flutter)**
`GET/PUT /users/me`; build the address list/add/edit/delete/pick screens; remove "coming soon" rows.
*Exit:* profile shows real data; ≥1 address exists, satisfying Phase 4's prerequisite.

**Phase 4 — Browse & menu (Flutter)**
Replace `sampleRestaurants` with `GET /restaurants` and `GET /restaurants/{id}/menu`; feed existing layouts via mappers; switch search to the server.
*Exit:* real restaurants with real distances; real menus; server search returns server results.

**Phase 5 — Cart & checkout (Flutter) — the money phase**
Add `restaurantId` to `CartService`; back it with the Redis endpoints; **delete the platform fee and tax**; replace hardcoded items/totals/address with `checkout-preview`; map payments to `COD`/`Digital`; place the order; clear the cart; navigate with the real id; handle 400/402/503.
*Exit:* a placed order's `total_amount` equals the preview exactly, and the cart is empty afterwards.

**Phase 6 — Tracking, history, ratings (Flutter)**
Poll `GET /orders/{id}/track`; add the status mapping layer; build order history (`GET /orders`) and reorder (`POST /orders/{id}/reorder`, surfacing `skipped_items`); wire the rating sheet.
*Exit:* tracking reflects real transitions; history lists real orders; reorder repopulates the cart; a rating persists.

**Phase 7 — Rider surface (Flutter) — largest remaining volume**
Real order list; accept/reject; the 4-step delivery progression; GPS location push; document upload; wallet/earnings/cash-deposit screens; enforce the Rs. 500 minimum; switch all currency to PKR.
*Exit:* a rider completes a full delivery from the app, with wallet deduction and earnings reflected.

**Phase 8 — Web restaurant portal**
Implement 8 of the 10 restaurant routes (settlements/reports/profile need backend work first — see Phase 10).
*Exit:* a restaurant logs in, manages its menu, and moves orders through Accepted→Ready for Pickup.

**Phase 9 — Web admin panel**
Implement the 13 admin routes; wire `AdminSidebar`; keep the customer route pending its endpoint.
*Exit:* an admin runs a settlement and a payout cycle end-to-end from the browser.

**Phase 10 — Backend gap-fill**
Order status history; persist `payment_reference`; add indexes; customer list endpoint; restaurant-side settlements/reports/profile; `GET /restaurants/{id}`; customer order cancel; accept `special_instructions`; rider `approval_status` enforcement (if not done in Phase 0); CORS.
*Exit:* every client route has a real endpoint behind it.

**Phase 11 — Notifications & polish**
Decide push vs. poll-derived (recommend poll-derived). Seed `NotificationService` from real order events. Remove dead Flutter code (`MenuScreen`, `models/order.dart`, 12 dead controls) and duplicate artifacts. Pin PKR formatting. Reconcile brand tokens.
*Exit:* no dead code; notifications reflect real activity; one brand palette.

**Phase 12 — Tests, CI, deployment**
Dart service units; TS type + Dart model contract tests against Pydantic; one true E2E (register → order → deliver → rate). CI running `flutter analyze` + `flutter test` + `pytest` + `bun run typecheck` + `bun run lint`. Production Dockerfile hardening, secrets manager, monitoring.
*Exit:* CI green on every PR; contract tests catch schema drift; deployed and reachable.

---

## 27. Priority List

### 🔴 Critical — block integration

| # | Item | Section |
|---|---|---|
| 1 | **Committed work deleted from the working tree** (`website/`, `docs/` incl. the locked spec + ERD + ADRs, `mobile_app/`, root `docker-compose.yml`) | §0, §10.M M2 |
| 2 | **Auth model mismatch** — Flutter email+password vs backend phone+OTP | §6.3 A1, §15 |
| 3 | **Invented Rs. 25 platform fee + 17% GST contradict the locked spec §3.3/§11**; totals can never match the backend | §19, §10.G G1 |
| 4 | **No HTTP client / API layer / base URL in Flutter** | §10.C C1 |
| 5 | **Unapproved riders (`approval_status="pending"`) have full API access** | §6.3 A2, §10.H H1 |
| 6 | Flutter's 5 order states cannot express the backend's 9 + `Rejected`/`Cancelled`; no mapping exists; `website/types/order.ts` is **already wrong** | §20 |
| 7 | `GET /restaurants` 400s without a saved address; **neither client has an address feature** | §10.F F1 |
| 8 | OTP delivered only to the server console (`print()`) — PTA registration has a 2–4 week lead time | §6.3 A3, ADR-001 |
| 9 | Auto-seeded admin with a placeholder password | §6.3 A4, §10.J J4 |
| 10 | No `.env` — backend cannot start | §23 |
| 11 | Zero client↔backend or contract tests | §22 L5, L6 |

### 🟠 High

| # | Item | Section |
|---|---|---|
| 12 | No token persistence/secure storage in either client | §6.3 A6 |
| 13 | No CORS middleware — blocks the entire `website/` app | §6.3 A5, §10.B B-B2 |
| 14 | `website/middleware.ts` is a pass-through — portals publicly reachable | §6.3 A7, §4.1 |
| 15 | `website/` restaurant + admin portals: 32 route shells, 0% implemented | §17, §18 |
| 16 | `website/lib/api/{admin,restaurant}.ts` are comment-only; `client.ts` has no auth header | §4.1 |
| 17 | No idempotency on checkout | §10.F F3 |
| 18 | `payment_reference` returned but never persisted | §5 D3 |
| 19 | No indexes on any FK/status/date column | §5 D4 |
| 20 | No order status history | §5 D2 |
| 21 | Flutter rider surface: no real orders, no reject, no status flow | §16 |
| 22 | No GPS dependency → rider location can never be pushed | §10.H H3 |
| 23 | No rider document upload → riders can never self-approve | §10.H H4 |
| 24 | Rider signup has **no CNIC field**, which the backend requires | §10.H H9 |
| 25 | Flutter offers 4 payment methods; backend accepts 2 | §19 |
| 26 | Stuck orders silently remain at `Ready for Pickup` | §20, §10.H H5 |
| 27 | Backend tests need live Postgres+Redis; pass/fail unverified | §22 L1 |
| 28 | AWS + Maps keys are mandatory — backend refuses to boot without them | §10.M M3 |
| 29 | No Flutter API base-URL config for device/emulator/CI | §10.M M10 |
| 30 | ERD filename mismatch (`schema.jpeg` cited vs `Schema_Updated.png`) | §5 D12, §10.M M4 |
| 31 | README materially wrong; never mentions `website/`, `docs/`, `mobile_app/` | §10.M M5 |
| 32 | Two Flutter apps in `HEAD`, a third in the working tree — canonical location unresolved | §2.1, §10.M M6 |
| 33 | Rider wallet minimum (Rs. 500) + Rs. 10/delivery absent from Flutter | §10.G G5 |
| 34 | No customer order-cancel endpoint; no order-history screen | §20, §10.A A-F6 |

### 🟡 Medium

| # | Item | Section |
|---|---|---|
| 35 | No CHECK constraints on enum-like string columns | §5 D5 |
| 36 | No unique constraint on `ratings.order_id` | §5 D6 |
| 37 | `refresh_tokens` unindexed, never cleaned, no session management | §5 D7, §10.B B-B18 |
| 38 | No customer list endpoint — blocks `/admin/customers` | §10.B B-B7 |
| 39 | No restaurant-side settlements/reports/profile endpoints — blocks 3 routes | §10.B B-B8 |
| 40 | No `GET /restaurants/{id}` detail endpoint | §10.B B-B9 |
| 41 | Notification module absent (spec-sanctioned deferral) | §21 |
| 42 | Tracking is poll-only by design; nothing polls | §10.K K4 |
| 43 | `special_instructions` unreachable | §5 D10 |
| 44 | `menu_items.variants` JSONB has no schema | §5 D9 |
| 45 | No customer-facing order cancel | §10.B B-B10 |
| 46 | `is_active` never enforced at token verification | §6.3 A9 |
| 47 | Rate limits are IP-rotation-bypassable | §6.3 A10 |
| 48 | `JWT_SECRET` default is a placeholder | §6.3 A11 |
| 49 | Flutter rider signup `city` is discarded | §11 X14 |
| 50 | Rider dashboard renders USD, not PKR | §10.H H8 |
| 51 | Flutter tests cover no services; web has no tests; no coverage gate | §22 L3, L4 |
| 52 | No CI/CD pipeline | §23 |
| 53 | No dark theme / `intl` / l10n | §10.A A-F16 |
| 54 | ~25 ad-hoc `Navigator.push`; no route table/guards | §10.A A-F13 |
| 55 | Dead Flutter code (`MenuScreen`, `Order`, 12 dead controls) | §11 |
| 56 | Dynamic multi-cart: spec v6.0 mandates it; `CartService` is global | §2.2, §24 item 11 |
| 57 | Brand palettes diverge between clients | §10.C C10 |
| 58 | No admin 2FA / audit log; no refund flow | §12 S12, §10.G G7 |
| 59 | Duplicate backend docs; stale root `REPORT.md`/`Check.md` | §2.1 |

### 🟢 Low

| # | Item | Section |
|---|---|---|
| 60 | `IndexedStack` keeps hidden-tab animations running | §11 X17 |
| 61 | `pubspec.yaml` asset path through a directory named `*.png` | §11 X18 |
| 62 | `POST /auth/refresh` unthrottled (documented as intentional) | §12 S14 |
| 63 | `.env.example` stray `[TEMPLATE]` line | §4.2 |
| 64 | `@app.on_event("startup")` deprecated | §4.2 |
| 65 | Mid-file import in `wallet_payment/routes.py` | §4.2 |
| 66 | Inconsistent `DELETE` cart shapes | §10.F F8 |
| 67 | Password rule inconsistency (login ≥6, register ≥8) | §22 L8 |
| 68 | Promo codes shown with no backend promo system | §11 X16 |
| 69 | No monitoring/alerting; compose `version:` key obsolete | §23 |
| 70 | Customer `users.wallet_balance` is a dead column | §5 D11 |

---

## Closing Statement

**Audited, changed nothing.** Every finding above comes from reading source. No file was created, edited, deleted, renamed or moved; no dependency installed; nothing run against a database or service. Three items remain genuinely unverified and are labelled rather than guessed:

1. Whether the backend test suite currently passes (requires live Postgres + Redis).
2. What the ERD (`docs/Schema_Updated.png`) actually depicts — it is a PNG and could not be read as text; consequently the five models' "matches schema.jpeg exactly" claims are unverifiable, and no file of that name exists.
3. Which Flutter app is canonical — `HEAD` contains two, the working tree a third (larger) variant that matches neither.

**Two decisive insights:**

**First, the repository is in a fragile state.** Roughly 280 committed files — including the **locked specification the entire project is built against**, the ERD, both ADRs, the restaurant/admin web scaffold, and a second Flutter app — are deleted from the working tree. They exist only in git history. A single `git add -A && git commit` would destroy them. This outranks every integration concern.

**Second, this is not primarily a wiring project.** The Flutter app and the backend describe two different products: one authenticates with email and password and prices orders with a platform fee and GST; the other authenticates with a phone number and an OTP, and prices orders exactly as spec §11 defines — `subtotal + 50 + km×20`, with revenue from 10% commission and a flat Rs. 10 per delivery. On both counts **the spec and the backend agree, and the Flutter client is wrong.** Building an API client before fixing those two contracts would produce code that compiles and then fails at runtime — and, on the money path, would silently mis-price every order.

The backend and the locked spec are the strongest artifacts here and should be treated as the source of truth. The Flutter app's UI is worth preserving; its *data and auth logic* is worth replacing. The web scaffold has the right shape and no mocks to unwind — its `apiClient` is the one working integration pattern in the repository, and worth copying rather than reinventing.

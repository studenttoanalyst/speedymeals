# SpeedyMeals Backend — Technical Documentation Report

> Generated from actual code inspection. Code is the source of truth.

---

## 1. Backend Overview

SpeedyMeals is a food delivery platform backend supporting four user roles: **Customer**, **Restaurant**, **Rider**, and **Admin**. The backend handles restaurant discovery, menu management, order placement, rider assignment and delivery, wallet/payments, COD cash collection, admin operations, and weekly settlements.

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.11 |
| Framework | FastAPI 0.115.0 |
| ORM | SQLAlchemy 2.0.35 |
| Database | PostgreSQL (psycopg2-binary 2.9.9) |
| Migrations | Alembic 1.13.2 |
| Validation | Pydantic 2.9.2 + pydantic-settings 2.5.2 |
| Auth | JWT (python-jose 3.3.0), bcrypt (passlib 1.7.4) |
| Cache/Queue | Redis 5.0.8 |
| Storage | AWS S3 (boto3 1.35.24) |
| HTTP Client | httpx 0.27.2 (Google Maps) |
| Testing | pytest 8.3.3, pytest-asyncio 0.24.0 |

### Architecture Summary

```
Client → FastAPI Route → Auth/RBAC → Pydantic Validation → Service Layer → PostgreSQL
                                                              ↕
                                                           Redis (OTP, carts, rate limits, rider location)
                                                              ↕
                                                           AWS S3 (menu photos, rider documents)
                                                              ↕
                                                           Google Maps API (distance calculation)
```

---

## 2. Project Structure

```
backend/
├── app/
│   ├── core/                    # Shared infrastructure
│   │   ├── base_model.py        # BaseModel + UpdatedAtMixin
│   │   ├── config.py            # Settings (env vars via pydantic-settings)
│   │   ├── database.py          # SQLAlchemy engine + get_db() dependency
│   │   ├── maps_client.py       # Google Maps Distance Matrix
│   │   ├── rate_limiter.py      # Redis-based rate limiting
│   │   ├── redis_client.py      # Shared Redis connection
│   │   ├── security.py          # bcrypt password hashing
│   │   └── storage.py           # AWS S3 upload (menu photos + rider docs)
│   ├── platform/                # Domain-agnostic platform services
│   │   ├── auth/                # Authentication (OTP, JWT, RBAC)
│   │   ├── users/               # Customer profile + addresses
│   │   ├── wallet_payment/      # Rider wallet, cash deposits, delivery status
│   │   ├── location/            # Placeholder (README only)
│   │   ├── notification/        # Placeholder (README only)
│   │   └── payments/            # Placeholder (empty)
│   ├── modules/                 # Business domain modules
│   │   ├── food_delivery/       # Restaurant menu, orders, checkout, delivery
│   │   ├── admin/               # Admin dashboard, management, settlements
│   │   ├── ride_hailing/        # Placeholder (README only)
│   │   ├── logistics/           # Placeholder (empty)
│   │   └── medicine/            # Placeholder (empty)
│   ├── migrations/              # Alembic migration files
│   │   └── versions/
│   │       ├── ea1fe1cee296_create_all_13_tables.py
│   │       ├── b1c2d3e4f5a6_create_refresh_tokens_table.py
│   │       └── b3f8a2d1_add_rider_kit_fields.py
│   ├── tests/                   # 309 tests across 20 test files
│   ├── main.py                  # FastAPI app entry point
│   ├── alembic.ini              # Alembic configuration
│   ├── .env                     # Environment variables (not in repo)
│   └── requirements.txt         # Python dependencies
├── docs/                        # Documentation
├── docker-compose.yml
├── Dockerfile
└── pytest.ini
```

---

## 3. Architecture

### Request Flow

1. **Route** — FastAPI router handles HTTP request, applies role-based dependency
2. **Authentication** — `get_current_user()` or `require_role()` extracts identity from JWT Bearer token
3. **Schema Validation** — Pydantic schema validates request body/query params
4. **Service** — Business logic in dedicated service module (no logic in route handlers)
5. **Database** — SQLAlchemy ORM session (injected via `get_db()` dependency)
6. **Response** — Service returns data, FastAPI serializes via response_model

### Key Design Patterns

- **Thin routes, fat services** — Route handlers delegate immediately to service functions
- **Ownership in WHERE clause** — Every query filters by the authenticated user's ID; another user's resource is a 404, not a 403
- **Single shared connections** — One engine, one Redis client, one S3 client; never create new connections per request
- **BaseModel pattern** — All tables inherit `BaseModel` (UUID PK + created_at); `UpdatedAtMixin` added only where needed

---

## 4. Configuration & Environment

All configuration loaded from `backend/app/.env` via `pydantic-settings`. See `backend/app/.env.example` for the template.

| Setting | Purpose | Source | Required |
|---------|---------|--------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `.env` | Yes |
| `JWT_SECRET` | JWT signing key | `.env` | Yes |
| `JWT_ALGORITHM` | JWT algorithm | Default: `HS256` | No |
| `JWT_EXPIRE_MINUTES` | Access token TTL | Default: `30` | No |
| `REDIS_URL` | Redis connection string | `.env` | Yes |
| `AWS_ACCESS_KEY_ID` | S3 access key | `.env` | Yes |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | `.env` | Yes |
| `AWS_REGION` | S3 region | Default: `us-east-1` | No |
| `S3_BUCKET_NAME` | S3 bucket for docs/photos | `.env` | Yes |
| `GOOGLE_MAPS_API_KEY` | Maps Distance Matrix API | `.env` | Yes |
| `FIRST_ADMIN_EMAIL` | Auto-seeded admin email | `.env` | Yes |
| `FIRST_ADMIN_PASSWORD` | Auto-seeded admin password | `.env` | Yes |
| `CASH_COLLECTION_CAP` | COD cap for riders | Default: `5000` | No |

**Security:** Actual secret values are never written to documentation or committed to the repo.

---

## 5. Authentication & Authorization

### Roles

| Role | Registration | Login Method |
|------|-------------|--------------|
| `customer` | OTP verify (auto-create) | Phone + OTP |
| `rider` | OTP verify + signup fields | Phone + OTP |
| `restaurant` | Admin-created only | Email + password or Phone + OTP |
| `admin` | Auto-seeded on startup | Email + password |

### Auth Flow

1. `POST /auth/otp/request` — Generates 6-digit OTP, stores in Redis (5-min TTL), 45s resend cooldown
2. `POST /auth/otp/verify` — Verifies OTP, returns JWT access + refresh token pair
3. `GET /auth/me` — Returns current user identity from access token

### JWT Tokens

- **Access token:** Short-lived (30 min), stateless, contains `sub` (user ID), `role`, `type: "access"`
- **Refresh token:** Long-lived (30 days), stored as SHA-256 hash in `refresh_tokens` table, supports rotation on use
- **Logout:** Revokes refresh token in DB (access token expires naturally)

### RBAC Implementation

`require_role(["admin"])` returns a FastAPI dependency that:
1. Decodes JWT from `Authorization: Bearer <token>` header
2. Checks token type is "access"
3. Verifies role matches allowed roles
4. Returns 401 (invalid token) or 403 (wrong role)

### Rate Limiting

Redis-based, 5 attempts per minute per identifier. Applied to: OTP request, OTP verify, rider OTP verify, restaurant login, admin login.

### Password Handling

bcrypt hashing via passlib. Used for: restaurant accounts, admin accounts. Customers and riders never have passwords (OTP-only).

### Admin Auto-Seed

On app startup, if no admin row exists, one is created from `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` env vars (password bcrypt-hashed).

---

## 6. Database Architecture

### Tables (16 total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Customer accounts | phone_number (unique), name, email, wallet_balance, country_code |
| `addresses` | Customer delivery addresses | user_id (FK), latitude, longitude, is_default |
| `restaurants` | Restaurant accounts | email (unique), phone_number (unique), password_hash, commission_rate, status, lat/lng |
| `menu_items` | Restaurant menu items | restaurant_id (FK), name, price, category, variants (JSONB), is_available |
| `riders` | Rider accounts | phone_number (unique), cnic_number (unique), approval_status, wallet_balance, is_online, kit_* fields |
| `orders` | Customer orders | user_id, restaurant_id, rider_id (nullable), delivery_address_id, status, payment_method, financials |
| `order_items` | Order line items | order_id (FK), menu_item_id (FK), quantity, price_at_order |
| `ratings` | Order ratings | order_id (FK), user_id (FK), restaurant_rating, rider_rating, comment |
| `wallet_transactions` | Rider wallet audit | rider_id (FK), order_id (nullable FK), type, amount, balance_after |
| `cash_deposits` | Rider COD cash submissions | rider_id (FK), amount_submitted, expected_amount, discrepancy |
| `admins` | Admin accounts | email (unique), password_hash, role |
| `refresh_tokens` | JWT refresh token tracking | subject_id, role, token_hash, status, expires_at |
| `settlements` | Restaurant weekly payouts | restaurant_id (FK), period, financials, status |
| `rider_payouts` | Rider weekly payouts | rider_id (FK), period, total_earning, status |

### Relationships

```
User (customer) → Orders → OrderItems → MenuItems
                                  ↓
Restaurant → MenuItems    Order → Rider
                        Order → Address
Rider → WalletTransactions
Rider → CashDeposits
Rider → RiderPayouts
Restaurant → Settlements
```

### Key Constraints

- `users.phone_number` — unique
- `riders.phone_number` — unique
- `riders.cnic_number` — unique
- `restaurants.email` — unique
- `restaurants.phone_number` — unique
- `admins.email` — unique
- `refresh_tokens.token_hash` — unique

---

## 7. Database Migrations

### Migration System

Alembic with PostgreSQL backend. Migrations stored in `backend/app/migrations/versions/`.

### Migration History

| ID | Description |
|----|-------------|
| `ea1fe1cee296` | Creates all 13 initial tables |
| `b1c2d3e4f5a6` | Creates `refresh_tokens` table |
| `b3f8a2d1` | Adds rider kit deposit/handover fields (6 columns) |

### Kit Fields Added (Migration 3)

Columns added to `riders` table: `kit_deposit_paid`, `kit_deposit_date`, `kit_shirts_issued`, `kit_box_issued`, `kit_verified_by`, `kit_completed`.

---

## 8. Customer System

### Registration & Auth

- Customer registers via OTP verification (auto-created on first verify)
- Phone number is the identity; no password
- Profile update: `PUT /users/me` (name, email only)

### Addresses

- CRUD: `GET/POST/PUT/DELETE /users/me/addresses`
- One address can be marked as default
- Address ownership enforced in queries

### Restaurant Discovery

- `GET /restaurants` — Browse active restaurants within radius of customer's address
- Uses Google Maps Distance Matrix for road distance
- Haversine distance for bounding-box prefilter, exact distance from Maps API
- Sort by distance or rating

### Menu Browsing

- `GET /restaurants/{id}/menu` — View restaurant menu, grouped by category
- Optional category filter
- Sold-out items shown with `is_available=false`

---

## 9. Restaurant System

### Account Management

- Created by admin via `POST /admin/restaurants` with email, password, phone
- Two login paths: email+password or phone+OTP
- Status: `active` or `inactive`

### Menu Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/restaurants/me/menu-items` | GET | List own menu items |
| `/restaurants/me/menu-items` | POST | Create menu item |
| `/restaurants/me/menu-items/{id}` | PUT | Update menu item |
| `/restaurants/me/menu-items/{id}` | DELETE | Delete menu item |
| `/restaurants/me/menu-items/{id}/availability` | PATCH | Toggle availability |
| `/restaurants/me/menu-items/{id}/photo` | POST | Upload photo (S3) |

### Menu Item Features

- Categories (free-form string)
- Variants (JSONB, flexible structure)
- Photo upload to S3 (5MB limit, JPG/PNG only)
- Availability toggle (sold out without deleting)

### Order Dashboard

- `GET /restaurants/me/orders` — List orders with status/date filters
- `GET /restaurants/me/orders/{id}` — Full order detail
- `PATCH /restaurants/me/orders/{id}/status` — Advance order status

---

## 10. Rider System

### Complete Rider Lifecycle

```
Registration (OTP + signup fields)
    → approval_status="pending"
        ↓
Document Submission (CNIC/license/vehicle photos to S3)
        ↓
Admin Approval (PATCH /admin/riders/{id}/approval → "approved")
        ↓
Kit Deposit (Rs. 5,000 cash at outlet)
Kit Handover (2 shirts + 1 delivery box)
Staff Verification (PATCH /admin/riders/{id}/kit → kit_completed=true)
        ↓
Initial Wallet Recharge (exactly Rs. 500)
        ↓
Go Online (PATCH /wallet/status)
        ↓
Order Assignment (nearest eligible rider)
        ↓
Delivery Status Flow (Arrived → Picked Up → On the Way → Delivered)
        ↓
Wallet Deduction (Rs. 10 per delivery)
        ↓
COD Cash Settlement (POST /wallet/cash-deposit)
        ↓
Auto-Offline (when balance < Rs. 100)
```

### Rider Registration

- `POST /auth/rider/otp/verify` — Phone+OTP + signup fields (name, cnic_number, vehicle_type, vehicle_registration)
- First-time: creates Rider with `approval_status="pending"`, `kit_completed=false`
- Existing phone: plain login

### Rider Document Upload

- `POST /wallet/documents/{doc_type}` — Upload CNIC/license/vehicle photo
- Validated: 5MB max, JPG/PNG only, magic-bytes check
- Stored in S3 under `rider-docs/` prefix (private, not public-read)

### Rider Approval

- `PATCH /admin/riders/{rider_id}/approval` — Admin sets `approval_status` to `approved` or `rejected`
- `PATCH /admin/riders/{rider_id}/status` — Admin deactivates/reactivates rider

### Rider Online Status

- `PATCH /wallet/status` — Toggle online/offline
- Going online requires: `kit_completed=true` AND `wallet_balance >= 500`
- Going offline: always allowed

### Rider Assignment

- Triggered when restaurant marks order as "Ready for Pickup"
- `_find_nearest_rider()` searches all approved, active, online riders with valid Redis location
- Eligibility check: `is_online` + `wallet_balance >= 100` + valid Redis location key
- Nearest rider by haversine distance from restaurant coordinates
- SELECT FOR UPDATE prevents concurrent assignment

### Rider Response

- `POST /wallet/assignments/{order_id}/respond` — Accept or reject
- Accept: "Rider Assigned" → "Accepted by Rider"
- Reject: "Rider Assigned" → "Rejected" → re-assign to next nearest rider (excluding rejector)

### Delivery Status Flow

```
Accepted by Rider → Arrived at Restaurant → Picked Up → On the Way → Delivered
```

Each status has a dedicated endpoint:
- `PATCH /wallet/deliveries/{order_id}/status/arrived`
- `PATCH /wallet/deliveries/{order_id}/status/picked-up`
- `PATCH /wallet/deliveries/{order_id}/status/on-the-way`
- `PATCH /wallet/deliveries/{order_id}/status/delivered`

---

## 11. Rider Kit Deposit

### Implementation

| Requirement | Status | Implementation |
|------------|--------|---------------|
| Rs. 5,000 cash deposit | Implemented | `KIT_DEPOSIT_AMOUNT = 5000` constant; `kit_deposit_paid` bool on Rider |
| Cash payment at outlet | Implemented | `kit_deposit_paid` + `kit_deposit_date` fields |
| 2 shirts issued | Implemented | `kit_shirts_issued` int field |
| 1 delivery box issued | Implemented | `kit_box_issued` bool field |
| Staff verification | Implemented | `kit_verified_by` UUID field; admin-only endpoint |
| Kit completion required | Implemented | `kit_completed` bool; checked in `set_online_status()` |

### Relevant Code

- **Model:** `Rider` in `platform/wallet_payment/models.py` — 6 kit fields
- **Service:** `record_kit_completion()` in `platform/wallet_payment/service.py` — auto-computes `kit_completed` from deposit + shirts (≥2) + box
- **Route:** `PATCH /admin/riders/{id}/kit` in `modules/admin/routes.py` — admin-only
- **Schema:** `RiderKitUpdateSchema`, `RiderKitResponseSchema` in `modules/admin/schemas.py`

### Activation Gate

`set_online_status()` checks `rider.kit_completed` before allowing online. Rider cannot go online without kit completion.

---

## 12. Rider Wallet System

### Constants

| Constant | Value | File |
|----------|-------|------|
| `MIN_WALLET_BALANCE_TO_GO_ONLINE` | 500 | `wallet_payment/service.py` |
| `WALLET_REMINDER_THRESHOLD` | 100 | `wallet_payment/service.py` |
| `WALLET_AUTO_OFFLINE_THRESHOLD` | 100 | `wallet_payment/service.py` |
| `DELIVERY_WALLET_DEDUCTION` | 10 | `wallet_payment/service.py` |
| `INITIAL_WALLET_RECHARGE` | 500 | `wallet_payment/service.py` |
| `KIT_DEPOSIT_AMOUNT` | 5000 | `wallet_payment/service.py` |

### First Recharge

- Must be exactly Rs. 500
- Detection: queries `WalletTransaction` for existing recharge count; if zero, amount must equal `INITIAL_WALLET_RECHARGE`
- Subsequent recharges: any positive amount

### Go Online

- Requires: `kit_completed=true` AND `wallet_balance >= 500`
- Going offline: always allowed

### Delivery Deduction

- Rs. 10 flat per delivered order
- Deducted in `deduct_delivery_fee()` called from `rider_advance_delivery_status()` on "Delivered" status
- Exactly-once guaranteed by order state machine (Delivered→Delivered is invalid)
- Returns `None` if balance < Rs. 10 (prevents negative balance)

### Auto-Offline

- `_force_offline_if_below_min()` checks `wallet_balance < 100`
- Called after every deduction
- If balance drops below 100: `is_online = False`

### Wallet Thresholds Behavior

```
Rs. 500 → Online allowed
Rs. 490 → Still online
Rs. 200 → Still online
Rs. 110 → Still online
Rs. 100 → Reminder threshold (crosses from above)
Rs. 90  → Automatically offline
```

### Negative Balance Prevention

`deduct_delivery_fee()` returns `None` (no deduction, delivery still completes) if `wallet_balance < 10`.

### Wallet Transaction Audit Trail

Every recharge and deduction creates a `WalletTransaction` record with: `rider_id`, `order_id` (nullable), `type` ("recharge"/"deduction"), `amount`, `balance_after`, `created_at`.

---

## 13. Delivery Charges

### Formula

```
Delivery Fee = Rs. 100 + (Distance in KM × Rs. 25)
```

### Implementation

- **Constants:** `DELIVERY_FEE_BASE = Decimal("100")`, `DELIVERY_FEE_PER_KM = Decimal("25")`
- **Function:** `calculate_delivery_fee()` in `modules/food_delivery/service.py`
- **Precision:** `Decimal` throughout, quantized to 2 decimal places (paisa)
- **Minimum charge:** Rs. 100 (at 0 km)
- **Maximum charge:** None
- **Distance source:** Google Maps Distance Matrix API (`core/maps_client.py`)
- **Used in:** `_build_checkout_context()` → `place_order()` and `preview_checkout()`

### Examples

| Distance | Calculation | Fee |
|----------|------------|-----|
| 0 km | 100 + 0×25 | Rs. 100.00 |
| 1 km | 100 + 1×25 | Rs. 125.00 |
| 3 km | 100 + 3×25 | Rs. 175.00 |
| 5 km | 100 + 5×25 | Rs. 225.00 |
| 10 km | 100 + 10×25 | Rs. 350.00 |
| 3.72 km | 100 + 3.72×25 | Rs. 193.00 |

---

## 14. COD System

### Cap

- `CASH_COLLECTION_CAP = 5000` (in `core/config.py`)
- Checked via `can_assign_cod()`: returns `False` when `pending_cash_owed >= 5000`

### Behavior

| Condition | Result |
|-----------|--------|
| `pending_cash_owed < 5000` | Rider can receive COD orders |
| `pending_cash_owed >= 5000` | Rider cannot receive new COD orders |
| Digital orders | Unaffected by COD cap |
| Rider online/offline | Unaffected by COD cap (separate system) |

### COD Order Flow

1. Order placed with `payment_method="COD"`
2. On delivery: `pending_cash_owed += order.total_amount`
3. Rider submits cash deposit: `pending_cash_owed` reduced by deposited amount (floored at 0)
4. When `pending_cash_owed` drops below 5000: rider eligible for COD again

### Recovery

Rider must submit a cash deposit via `POST /wallet/cash-deposit`. This reduces `pending_cash_owed` and restores COD eligibility.

---

## 15. Cash Deposit System

### Flow

1. Rider submits: `POST /wallet/cash-deposit` with `amount_submitted` and `submission_method`
2. Server computes: `expected_amount` = sum of COD Delivered orders since last deposit
3. Server computes: `discrepancy = amount_submitted - expected_amount`
4. `pending_cash_owed` reduced by `amount_submitted` (floored at 0)
5. `CashDeposit` record created for admin review

### Submission Methods

`bank_transfer`, `mobile_wallet`, `hub`

### Admin Review

- `GET /admin/cash-discrepancies` — Lists deposits where `discrepancy != 0`
- Filter: `?unresolved_only=true` (default) shows only unverified deposits

---

## 16. Payment System

### Supported Methods

| Method | Implementation | Status |
|--------|---------------|--------|
| COD | Order placed, cash collected at delivery | Implemented |
| Digital | Simulated stub (`STUB-DIGITAL-{uuid}`) | Stub/Mock |

### Digital Payment

- `_process_digital_payment()` returns a fake gateway reference string
- No real payment gateway integration
- Can be monkeypatched in tests for failure scenarios

### Commission

- Default 10% per restaurant (configurable per-restaurant)
- `commission_amount = food_subtotal × (commission_rate / 100)`
- `restaurant_payable = food_subtotal - commission_amount`
- `rider_earning = delivery_fee` (100% of delivery fee)
- All values frozen on order at placement time

---

## 17. Cart System

### Architecture

- **Storage:** Redis (not SQL)
- **Key pattern:** `cart:{customer_id}:{restaurant_id}`
- **TTL:** 7 days (auto-expire stale carts)
- **Multi-cart:** Independent carts per restaurant per customer

### Operations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/restaurants/{id}/cart` | GET | View cart |
| `/restaurants/{id}/cart/items` | POST | Add item |
| `/restaurants/{id}/cart/items/{item_id}` | PATCH | Update quantity |
| `/restaurants/{id}/cart/items/{item_id}` | DELETE | Remove item |
| `/restaurants/{id}/cart` | DELETE | Clear cart |

### Validation

- Menu item must exist, belong to restaurant, and be available
- Variant validation: item must support variants if variant is provided
- Duplicate items merge quantities

### Checkout Behavior

- Cart is NOT cleared during preview
- Cart is cleared ONLY after successful order placement (after DB commit)

---

## 18. Order System

### Order Status State Machine

```
Accepted → Preparing → Ready for Pickup → Rider Assigned → Accepted by Rider
    ↓
Arrived at Restaurant → Picked Up → On the Way → Delivered
```

Additional transitions:
- `Rider Assigned → Rejected → Rider Assigned` (re-assignment)
- Admin can cancel from any non-terminal status
- `Delivered` and `Cancelled` are terminal (no further transitions)

### Order Creation

1. Customer calls `POST /restaurants/{id}/cart/checkout` with `address_id` and `payment_method`
2. Server re-reads all prices from DB (not Redis)
3. Delivery fee calculated from Maps distance
4. Commission calculated from restaurant's rate
5. Order + OrderItems created atomically
6. Redis cart cleared after successful commit
7. Digital payment processed before DB write (failure = no order)

### Order Fields

All financial values frozen at placement: `food_subtotal`, `delivery_fee`, `total_amount`, `commission_amount`, `restaurant_payable`, `rider_earning`.

---

## 19. Rider Assignment

### Assignment Trigger

Restaurant marks order as "Ready for Pickup" → `_find_nearest_rider()` is called.

### Eligibility Conditions

All must be true simultaneously:
1. `Rider.approval_status == "approved"`
2. `Rider.is_active == True`
3. `Rider.is_online == True` (set via `set_online_status()`)
4. `Rider.wallet_balance >= 100` (auto-offline threshold)
5. Valid Redis location key (not expired)
6. `kit_completed == True` (required to go online)

### Selection Algorithm

1. Fetch all approved, active riders
2. Filter by eligibility (online + wallet + Redis location)
3. Calculate haversine distance from each rider to restaurant
4. Select nearest rider
5. Assign via `SELECT FOR UPDATE` lock on order row

### Rider Response

- **Accept:** Order moves to "Accepted by Rider"
- **Reject:** Order moves to "Rejected", rider cleared, re-assignment attempted (rejector excluded)

---

## 20. Delivery Flow

### Status Transitions

| From | To | Side Effects |
|------|----|-------------|
| Accepted by Rider | Arrived at Restaurant | None |
| Arrived at Restaurant | Picked Up | None |
| Picked Up | On the Way | None |
| On the Way | Delivered | Wallet deduction (Rs. 10), COD cash owed update, delivered_at timestamp |

### Delivered Side Effects (Atomic)

1. `order.delivered_at = now`
2. `deduct_delivery_fee()` — Rs. 10 deduction, creates WalletTransaction, auto-offline if < 100
3. If COD: `rider.pending_cash_owed += order.total_amount`

### Duplicate Protection

Order state machine rejects "Delivered → Delivered" transition. Side effects can only fire once per order.

### Transaction Safety

All three side effects (status update, wallet deduction, COD update) happen in a single DB transaction via one `db.commit()`.

---

## 21. Redis

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `otp:{phone}` | OTP storage | 5 minutes |
| `otp:cooldown:{phone}` | Resend cooldown | 45 seconds |
| `rate_limit:{action}:{id}` | Rate limiting | 60 seconds |
| `cart:{customer_id}:{restaurant_id}` | Shopping cart | 7 days |
| `rider_location:{rider_id}` | Rider GPS location | 45 seconds |

---

## 22. External Integrations

| Service | Purpose | Location | Status |
|---------|---------|----------|--------|
| Google Maps Distance Matrix | Delivery distance calculation | `core/maps_client.py` | Implemented |
| AWS S3 | Menu photos (public) + rider docs (private) | `core/storage.py` | Implemented |
| Redis | OTP, rate limiting, carts, rider location | `core/redis_client.py` | Implemented |
| SMS Provider | OTP delivery | `platform/auth/service.py` | Console stub only |

### Maps Integration

- Uses Distance Matrix API for road distance (driving mode)
- 10-second timeout
- Raises `MapsError` on failure; service layer returns 503
- Distance converted from meters to km

### S3 Storage

- Menu photos: `menu-items/{restaurant_id}/{menu_item_id}.{ext}` — public-read
- Rider docs: `rider-docs/{rider_id}/{doc_type}.{ext}` — private (no public ACL)

---

## 23. Notifications

**Status: Not implemented (placeholder only)**

- `platform/notification/` contains only a README
- No push notification, SMS, or email infrastructure
- Wallet reminder threshold (Rs. 100) is defined as a constant but no notification is sent
- OTP is sent via console log (not real SMS)

---

## 24. API Documentation

### Auth Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/otp/request` | None | Request OTP |
| POST | `/auth/otp/verify` | None | Verify OTP (customer) |
| POST | `/auth/rider/otp/verify` | None | Verify OTP + signup (rider) |
| POST | `/auth/restaurant/login` | None | Email+password login |
| POST | `/auth/restaurant/otp/verify` | None | Phone+OTP login |
| POST | `/auth/admin/login` | None | Email+password login |
| POST | `/auth/logout` | None | Revoke refresh token |
| POST | `/auth/refresh` | None | Rotate refresh token |
| GET | `/auth/me` | Any role | Current identity |

### Customer Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/users/me` | Get profile |
| PUT | `/users/me` | Update profile |
| GET | `/users/me/addresses` | List addresses |
| POST | `/users/me/addresses` | Create address |
| PUT | `/users/me/addresses/{id}` | Update address |
| DELETE | `/users/me/addresses/{id}` | Delete address |
| GET | `/restaurants` | Browse restaurants |
| GET | `/restaurants/{id}/menu` | View menu |
| GET | `/restaurants/{id}/cart` | View cart |
| POST | `/restaurants/{id}/cart/items` | Add to cart |
| PATCH | `/restaurants/{id}/cart/items/{id}` | Update cart item |
| DELETE | `/restaurants/{id}/cart/items/{id}` | Remove cart item |
| DELETE | `/restaurants/{id}/cart` | Clear cart |
| GET | `/restaurants/{id}/cart/checkout-preview` | Preview checkout |
| POST | `/restaurants/{id}/cart/checkout` | Place order |
| GET | `/orders/{id}/track` | Track order |
| GET | `/orders/{id}/rider-location` | Live rider GPS (read from Redis) |
| GET | `/orders` | Order history |
| POST | `/orders/{id}/reorder` | Reorder |
| POST | `/orders/{id}/rating` | Rate order |

### Restaurant Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/restaurants/me/menu-items` | List menu |
| POST | `/restaurants/me/menu-items` | Create item |
| PUT | `/restaurants/me/menu-items/{id}` | Update item |
| DELETE | `/restaurants/me/menu-items/{id}` | Delete item |
| PATCH | `/restaurants/me/menu-items/{id}/availability` | Toggle availability |
| POST | `/restaurants/me/menu-items/{id}/photo` | Upload photo |
| GET | `/restaurants/me/orders` | List orders |
| GET | `/restaurants/me/orders/{id}` | Order detail |
| PATCH | `/restaurants/me/orders/{id}/status` | Update status |

### Rider Endpoints (all require `rider` role)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/wallet/recharge` | Recharge wallet |
| GET | `/wallet/balance` | Get wallet balance |
| PATCH | `/wallet/status` | Go online/offline |
| POST | `/wallet/cash-deposit` | Submit COD cash |
| GET | `/wallet/cod-eligibility` | Check COD cap |
| GET | `/wallet/earnings` | Earnings summary |
| GET | `/wallet/profile` | Combined rider wallet profile view |
| GET | `/wallet/assignments` | List this rider's assigned orders |
| PATCH | `/wallet/location` | Push GPS location |
| POST | `/wallet/assignments/{id}/respond` | Accept/reject order |
| PATCH | `/wallet/deliveries/{id}/status/arrived` | Mark arrived |
| PATCH | `/wallet/deliveries/{id}/status/picked-up` | Mark picked up |
| PATCH | `/wallet/deliveries/{id}/status/on-the-way` | Mark on the way |
| PATCH | `/wallet/deliveries/{id}/status/delivered` | Mark delivered |
| POST | `/wallet/documents/{doc_type}` | Upload document |

### Admin Endpoints (all require `admin` role)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/dashboard` | Dashboard summary |
| POST | `/admin/restaurants` | Create restaurant |
| GET | `/admin/restaurants` | List restaurants |
| GET | `/admin/restaurants/{id}` | Restaurant detail |
| PATCH | `/admin/restaurants/{id}/status` | Activate/deactivate |
| PATCH | `/admin/restaurants/{id}/commission` | Set commission rate |
| POST | `/admin/restaurants/{id}/reset-credentials` | Reset credentials |
| GET | `/admin/riders` | List riders |
| GET | `/admin/riders/{id}` | Rider detail |
| PATCH | `/admin/riders/{id}/approval` | Approve/reject rider |
| PATCH | `/admin/riders/{id}/status` | Activate/deactivate rider |
| PATCH | `/admin/riders/{id}/kit` | Record kit completion |
| GET | `/admin/orders` | List all orders |
| GET | `/admin/orders/{id}` | Order detail |
| POST | `/admin/orders/{id}/cancel` | Cancel order |
| PATCH | `/admin/orders/{id}/reassign` | Reassign rider |
| POST | `/admin/settlements/generate` | Generate settlements |
| GET | `/admin/settlements` | List settlements |
| POST | `/admin/settlements/{id}/mark-paid` | Mark paid |
| POST | `/admin/rider-payouts/generate` | Generate rider payouts |
| GET | `/admin/rider-payouts` | List rider payouts |
| POST | `/admin/rider-payouts/{id}/mark-paid` | Mark paid |
| GET | `/admin/cash-discrepancies` | Cash discrepancy flags |
| GET | `/admin/reports` | Period reports |

### Health Check

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | API health check |

---

## 25. Business Rules

### Kit Deposit

- Kit deposit = Rs. 5,000 cash at outlet
- Kit contents = 2 shirts + 1 delivery box
- Kit completion required before rider can go online
- Admin records kit via `PATCH /admin/riders/{id}/kit`

### Wallet Rules

| Rule | Value |
|------|-------|
| First recharge | Exactly Rs. 500 |
| Go online requirement | wallet >= Rs. 500 |
| Delivery deduction | Rs. 10 per delivered order |
| Wallet reminder threshold | Rs. 100 |
| Auto-offline threshold | Below Rs. 100 |

### Delivery Fee

- Formula: `Rs. 100 + (Distance KM × Rs. 25)`
- Decimal precision: 2 decimal places
- No minimum/maximum beyond formula

### COD

- COD cap: Rs. 5,000
- When `pending_cash_owed >= 5000`: rider cannot receive new COD orders
- Digital orders unaffected
- Cash deposit restores eligibility

### Commission

- Default: 10% of food subtotal
- Configurable per restaurant
- Frozen on order at placement time

### Order Status

- One-step-at-a-time transitions only
- `Delivered` and `Cancelled` are terminal
- Admin can cancel from any non-terminal status

---

## 26. Validation & Error Handling

### Pydantic Validation

- Request bodies validated by Pydantic schemas before reaching service layer
- Query params validated by FastAPI (type coercion, regex patterns)
- Response models ensure consistent output shape

### HTTP Errors

| Code | Meaning |
|------|---------|
| 400 | Bad request (invalid data, business rule violation) |
| 401 | Unauthorized (missing/invalid/expired token) |
| 403 | Forbidden (valid token, wrong role) |
| 404 | Not found (or ownership check failed) |
| 402 | Payment required (digital payment declined) |
| 413 | File too large |
| 415 | Unsupported media type |
| 429 | Rate limited |
| 500 | Internal error (S3 upload failure) |
| 503 | Service unavailable (Maps API failure) |

### Ownership Checks

Every protected resource query includes the authenticated user's ID in the WHERE clause. Another user's resource returns 404 (not 403), preventing existence leaks.

---

## 27. Transaction & Data Integrity

### Atomic Operations

- **Order placement:** Order + OrderItems created in single transaction; cart cleared only after commit
- **Delivery completion:** Status update + wallet deduction + COD update in single commit
- **Wallet recharge:** Balance update + WalletTransaction in single commit

### Duplicate Prevention

- Order state machine rejects invalid transitions (e.g., Delivered → Delivered)
- `SELECT FOR UPDATE` on order row during rider assignment prevents concurrent assignment
- Refresh token hash has unique constraint (prevents duplicate tokens)

### Race Condition Protection

- Rider assignment uses `SELECT FOR UPDATE` to lock order row
- Wallet deduction + auto-offline happen in same transaction
- No optimistic locking (MVP stage)

---

## 28. Tests

### Test Organization

| Test File | Tests | Focus |
|-----------|-------|-------|
| `test_wallet_payment.py` | 17 | Recharge, go-online, deduction, auto-offline, COD cap |
| `test_wallet_money_math.py` | 11 | Cash deposit, discrepancy, earnings summary |
| `test_delivered_side_effects.py` | 11 | Digital/COD deduction, duplicate prevention |
| `test_checkout.py` | 36 | Checkout flow, cart, payment, delivery fee formula |
| `test_admin.py` | 48 | Admin dashboard, restaurant/rider/order management, settlements |
| `test_auth.py` | 14 | OTP, login, rate limiting |
| `test_auth_refresh.py` | 3 | Refresh token rotation |
| `test_cart.py` | 12 | Cart CRUD |
| `test_food_delivery.py` | 12 | Menu CRUD, order status transitions |
| `test_order_lifecycle_e2e.py` | 2 | Full COD and Digital order lifecycle |
| `test_order_tracking.py` | 7 | Customer order tracking |
| `test_order_history_rating.py` | 5 | Order history, ratings, reorder |
| `test_restaurant_browse.py` | 7 | Restaurant discovery, distance/rating sort |
| `test_rider_assignment.py` | 13 | Nearest rider selection, eligibility |
| `test_rider_accept_reject.py` | 8 | Rider accept/reject flow |
| `test_rider_location.py` | 12 | GPS location, Redis TTL, eligibility |
| `test_rider_documents.py` | 7 | Document upload validation |
| `test_delivery_status.py` | 10 | Delivery status transitions |

### Test Infrastructure

- PostgreSQL-backed (not SQLite in-memory) — UUID columns require Postgres
- Each test runs in its own DB transaction (rolled back at end)
- Redis used directly (no mock) — cleaned up per-test
- Maps API mocked via monkeypatch

---

## 29. Current Test Status

```
Total tests: 351
Passed: 351
Failed: 0
Skipped: 0
Errors: 0
```

---

## 30. Known Limitations / Missing Features

### Not Implemented

- **SMS provider:** OTP sent to console log only (not real SMS)
- **Push notifications:** No notification infrastructure (reminder threshold defined but not wired)
- **Payment gateway:** Digital payment is a stub returning fake reference
- **Real-time tracking:** Implemented via WebSocket Pub/Sub with fallback polling
- **Automated settlements:** Admin manually triggers generation and marks paid

### Partially Implemented

- **Notification system:** `platform/notification/` has only a README
- **Location platform:** `platform/location/` has only a README
- **Payments platform:** `platform/payments/` is empty
- **Ride hailing module:** `modules/ride_hailing/` has only a README
- **Logistics module:** `modules/logistics/` is empty
- **Medicine module:** `modules/medicine/` is empty

### Technical Debt

| Item | Status | Implementation |
|------|--------|----------------|
| Dynamic delivery fee calculation in test helpers | **[RESOLVED]** | Replaced hardcoded `delivery_fee=110` values in `_make_order` test helpers with dynamic `calculate_delivery_fee()` formula calls. |
| Idempotency key middleware & Redis caching on `POST /orders` | **[RESOLVED]** | Integrated idempotency key header middleware and Redis caching on `POST /orders` to cache order responses and block duplicate submissions. |
| Database indexing on FKs, status, and composite columns | **[RESOLVED]** | Applied migration adding database indexes across foreign keys, status fields, and composite query columns for performance optimization. |
| Individual serial number tracking for Admin Kit items | **[RESOLVED]** | Updated Admin kit serial schemas, migrations, and endpoints to track individual serial numbers for shirts and delivery boxes. |

### Recently Resolved Gaps

| Gap | Status | Implementation |
|-----|--------|----------------|
| Rider wallet read endpoints (`GET /wallet/profile`, `GET /wallet/assignments`) | **[COMPLETED]** | Available on the `wallet_payment` router (`/wallet` prefix) in `platform/wallet_payment/routes.py`; responses via `RiderWalletProfileResponseSchema` and `RiderAssignmentsResponseSchema` |
| Order tracking payload (`restaurant_name`) | **[COMPLETED]** | `restaurant_name` is included in `get_order_tracking()` (joined from `restaurants` in the same read) and `OrderTrackingResponseSchema` |
| Rider live location read path (`GET /orders/{id}/rider-location`) | **[COMPLETED]** | Customer-facing endpoint on the `food_delivery` router reads rider GPS coordinates from Redis (`rider_location:{rider_id}`, 45s TTL); nulls when no fresh location exists, 409 on terminal orders |

---

## 31. Development & Setup

### Prerequisites

- Python 3.11
- PostgreSQL
- Redis
- AWS S3 bucket
- Google Maps API key

### Setup

```bash
# Virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Dependencies
pip install -r app/requirements.txt

# Environment
cp app/.env.example app/.env
# Edit .env with actual values

# Database migration
cd app
alembic upgrade head

# Run server (from backend/ folder)
uvicorn app.main:app --reload

# Run tests
cd backend
python -m pytest app/tests/ -v
```

### Docker

```bash
cd backend
docker-compose up
```

---

## 32. Deployment

### Docker

- `Dockerfile` exists in both `backend/` and `backend/app/`
- `docker-compose.yml` in `backend/`

### Server

- Uvicorn with standard extras
- Health check: `GET /health` returns `{"status": "ok"}`

### Environment Variables

All secrets configured through environment variables. No hardcoded values in source code.

---

## 33. Security Checklist

| Control | Status | Implementation |
|---------|--------|---------------|
| Authentication | Implemented | JWT access + refresh tokens |
| Authorization | Implemented | Role-based access control (4 roles) |
| Password hashing | Implemented | bcrypt via passlib |
| JWT | Implemented | HS256, 30-min access, 30-day refresh |
| Role checks | Implemented | `require_role()` dependency |
| Ownership checks | Implemented | User ID in every query WHERE clause |
| Input validation | Implemented | Pydantic schemas |
| Secret management | Implemented | Environment variables via pydantic-settings |
| SQL injection | Protected | SQLAlchemy ORM parameterized queries |
| Wallet manipulation | Protected | Server-side only, never from client input |
| Admin-only operations | Protected | All admin routes require admin role |
| Rate limiting | Implemented | Redis-based, 5/min per endpoint |
| File upload validation | Implemented | Size limit, type check, magic bytes |

---

## 33. Google Maps Platform Cost Optimization Matrix (Phase B0-B5)

### Phase B0 – Key Hygiene & Circuit Breaker
- Isolation of Google Maps API calls in `backend/app/core/maps_client.py`.
- Daily call budget enforced via Redis key `maps:daily_usage:{YYYY-MM-DD}` with `MAPS_DAILY_CALL_BUDGET=300`.
- Haversine fallback formula with driving multiplier 1.3 used when budget exceeded.

### Phase B1 – Checkout Single-Call Optimization
- `_build_checkout_context()` caches distance in Redis key `checkout_dist:{restaurant_id}:{address_id}` with 600‑second TTL, preventing duplicate Distance Matrix calls between `preview_checkout` and `place_order`.

### Phase B2 – Geocoding Proxy & Rate Limiting
- Reverse geocoding endpoint `GET /api/v1/location/reverse-geocode` caches results for 24 h under `geocode:{lat}:{lng}`.
- Addresses persisted in PostgreSQL `addresses` table; subsequent order placements reuse stored coordinates.
- Rate limiting applied via `core/rate_limiter.py` – 20 requests/min per IP, returns 429 on excess.

### Phase B3 – WebSocket Real-Time Rider Tracking
- WebSocket `WS /api/v1/orders/{order_id}/track` authenticates via JWT query token, validates order ownership, streams JSON location frames from Redis Pub/Sub channel `order:location:{order_id}`.
- Auto‑disconnect on terminal status (`Delivered` / `Cancelled`) with close code 1000.
- REST fallback `GET /orders/{order_id}/rider-location` still supported.

### Phase B4 – Admin Governance & Financial Surfacing
- Admin role bypasses ownership check, allowing live tracking of any order.
- `AdminOrderDetailResponseSchema` includes `delivery_distance_km`, `delivery_fee`, `commission_amount`, `restaurant_payable`, `rider_earning`.

### Phase B5 – Automated Test Suite & Regression Safeguards
- Comprehensive tests covering all above features; total 351 tests passing.

---

## 34. File-to-Feature Mapping

| Feature | Model | Schema | Service | Route | Tests |
|---------|-------|--------|---------|-------|-------|
| Auth (OTP/JWT) | `auth/models.py` | `auth/schemas.py` | `auth/service.py` | `auth/routes.py` | `test_auth.py` |
| Customer Profile | `users/models.py` | `users/schemas.py` | `users/service.py` | `users/routes.py` | `test_auth.py` |
| Restaurant Menu | `food_delivery/models.py` | `food_delivery/schemas.py` | `food_delivery/service.py` | `food_delivery/routes.py` | `test_food_delivery.py` |
| Cart | — | `food_delivery/schemas.py` | `food_delivery/service.py` | `food_delivery/routes.py` | `test_cart.py` |
| Checkout/Orders | `food_delivery/models.py` | `food_delivery/schemas.py` | `food_delivery/service.py` | `food_delivery/routes.py` | `test_checkout.py` |
| Rider Wallet | `wallet_payment/models.py` | `wallet_payment/schemas.py` | `wallet_payment/service.py` | `wallet_payment/routes.py` | `test_wallet_payment.py` |
| Rider Kit | `wallet_payment/models.py` | `admin/schemas.py` | `wallet_payment/service.py` | `admin/routes.py` | `test_admin.py` |
| Delivery Status | `food_delivery/models.py` | `wallet_payment/schemas.py` | `food_delivery/service.py` | `wallet_payment/routes.py` | `test_delivery_status.py` |
| Rider Assignment | `wallet_payment/models.py` | `wallet_payment/schemas.py` | `food_delivery/service.py` | `wallet_payment/routes.py` | `test_rider_assignment.py` |
| Cash Deposits | `wallet_payment/models.py` | `wallet_payment/schemas.py` | `wallet_payment/service.py` | `wallet_payment/routes.py` | `test_wallet_money_math.py` |
| Admin Dashboard | — | `admin/schemas.py` | `admin/service.py` | `admin/routes.py` | `test_admin.py` |
| Settlements | `wallet_payment/models.py` | `admin/schemas.py` | `admin/service.py` | `admin/routes.py` | `test_admin.py` |
| Ratings | `food_delivery/models.py` | `food_delivery/schemas.py` | `food_delivery/service.py` | `food_delivery/routes.py` | `test_order_history_rating.py` |

---

## 35. Important Constants Reference

| Constant | Value | Purpose | File |
|----------|-------|---------|------|
| `KIT_DEPOSIT_AMOUNT` | 5000 | Rider kit deposit | `wallet_payment/service.py` |
| `INITIAL_WALLET_RECHARGE` | 500 | First wallet recharge | `wallet_payment/service.py` |
| `MIN_WALLET_BALANCE_TO_GO_ONLINE` | 500 | Online eligibility | `wallet_payment/service.py` |
| `DELIVERY_WALLET_DEDUCTION` | 10 | Per delivery deduction | `wallet_payment/service.py` |
| `WALLET_REMINDER_THRESHOLD` | 100 | Low balance reminder | `wallet_payment/service.py` |
| `WALLET_AUTO_OFFLINE_THRESHOLD` | 100 | Auto-offline trigger | `wallet_payment/service.py` |
| `DELIVERY_FEE_BASE` | 100 | Delivery base fee | `food_delivery/service.py` |
| `DELIVERY_FEE_PER_KM` | 25 | Delivery per km | `food_delivery/service.py` |
| `CASH_COLLECTION_CAP` | 5000 | COD cap | `core/config.py` |
| `JWT_EXPIRE_MINUTES` | 30 | Access token TTL | `core/config.py` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 30 | Refresh token TTL | `auth/jwt_utils.py` |
| `OTP_EXPIRY_SECONDS` | 300 | OTP validity (5 min) | `auth/service.py` |
| `RESEND_COOLDOWN_SECONDS` | 45 | OTP resend cooldown | `auth/service.py` |
| `LOCATION_TTL_SECONDS` | 45 | Rider location TTL | `wallet_payment/service.py` |
| `CART_TTL_SECONDS` | 604800 | Cart TTL (7 days) | `food_delivery/service.py` |
| `MAX_MENU_PHOTO_SIZE_BYTES` | 5242880 | Menu photo limit (5MB) | `food_delivery/service.py` |
| `MAX_RIDER_DOC_SIZE_BYTES` | 5242880 | Rider doc limit (5MB) | `wallet_payment/service.py` |

---

## 36. Backend Workflow Summary

### Customer Journey

```
Customer Registration (OTP)
    → Profile Setup
    → Address Saved
    → Restaurant Discovery (distance/rating)
    → Menu Browsing
    → Cart Management
    → Checkout Preview (distance + fee)
    → Order Placement (COD or Digital)
    → Order Tracking (poll-based)
    → Order History + Reorder
    → Rating
```

### Rider Lifecycle

```
Rider Registration (OTP + signup)
    → Document Upload (CNIC/license/vehicle)
    → Admin Approval
    → Kit Deposit (Rs. 5,000)
    → Kit Handover (2 shirts + 1 box)
    → Staff Verification
    → Initial Wallet Recharge (Rs. 500)
    → Go Online
    → Order Assignment (nearest eligible)
    → Accept/Reject
    → Delivery Status Flow
    → Wallet Deduction (Rs. 10)
    → COD Cash Settlement
    → Auto-Offline (balance < Rs. 100)
```

### Restaurant Flow

```
Admin Creates Restaurant
    → Restaurant Login
    → Menu Management (CRUD + photos)
    → Order Received
    → Status Updates (Accepted → Preparing → Ready for Pickup)
    → Rider Auto-Assigned
    → Order Delivered
    → Weekly Settlement
```

### Admin Flow

```
Admin Login
    → Dashboard (today's stats)
    → Restaurant Management (create, approve, commission)
    → Rider Management (approve, kit, activate/deactivate)
    → Order Management (view, cancel, reassign)
    → Settlement Generation + Mark Paid
    → Rider Payout Generation + Mark Paid
    → Cash Discrepancy Review
    → Reports
```

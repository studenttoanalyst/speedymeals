# SpeedyMeals - Admin RBAC Infrastructure
## Implementation Plan (Industry-Standard PBAC/RBAC System with Discord-Style Dynamic Profiling)

---

## 1. Executive Summary & Problem Analysis

### Current State Assessment (from `speedymeals/backend/docs/report.md`):
- **Admins Table:** Contains only `email`, `password_hash`, `role` (flat string: `"super_admin"` or `"support"`), and `is_active`.
- **Authorization Layer:** Enforced via `require_role(["admin"])` at the FastAPI dependency layer (`app/platform/auth/dependencies.py`). It performs a binary check: the user is either an admin with full operational power or blocked.
- **Frontend Dashboard:** Admin routes (`app/admin/*`) exist, but lack granular permission gating or view-level conditional rendering.
- **Admin Provisioning:** Only seeded via environment variables (`FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD`). There is no interface or secure service for provisioning new staff, sending credentials, or assigning granular scopes.

### Target State:
An enterprise-grade, fine-grained **Permission-Based Access Control (PBAC / NIST Level 2 RBAC)** system enabling:
1. **Dynamic Discord-Style Role Creation:** The Superadmin can create custom roles with tailored color badges, descriptive labels, and toggleable atomic permissions grouped across all operational domains.
2. **Automated Admin Credential & Email Provisioning:** End-to-end admin account onboarding with secure temporary password generation, automated welcome email with login credentials or one-time setup link, and mandatory first-login password rotation.
3. **Exhaustive Business Domain Coverage:** Tailored to SpeedyMeals' specific operational model (cash-on-delivery cap, rider kit deposits and serial tracking, per-restaurant commissions, weekly settlements, rider payouts, and live dispatch intervention).
4. **Defense-in-Depth Security:** Immediate session revocation upon role alteration, cryptographic password rotation enforcement, comprehensive audit logging, and strict rate-limiting.

---

## 2. Industry-Standard Data Architecture

To support granular permissions, dynamic custom roles, credential lifecycle tracking, and complete auditability, the database schema expands from a flat role column into a normalized relational model.

```
permissions                 admin_roles                   admin_role_permissions
--------------------        --------------------------    ------------------------
id (UUID, PK)               id (UUID, PK)                 role_id (FK -> admin_roles.id ON DELETE CASCADE)
key (VARCHAR, UNIQUE)       name (VARCHAR, UNIQUE)        permission_id (FK -> permissions.id ON DELETE CASCADE)
label (VARCHAR)             slug (VARCHAR, UNIQUE)        PRIMARY KEY (role_id, permission_id)
domain (VARCHAR)            color (VARCHAR(7), Hex)       
description (TEXT)          icon (VARCHAR(50), Nullable)
risk_level (VARCHAR)        is_system (BOOLEAN)
created_at (TIMESTAMPTZ)    created_by (FK -> admins.id)
                            created_at (TIMESTAMPTZ)
                            updated_at (TIMESTAMPTZ)

admins                                                    admin_audit_logs
---------------------------------------------------       ---------------------------------------------------
id (UUID, PK)                                             id (UUID, PK)
first_name (VARCHAR(50))                                  admin_id (FK -> admins.id, Nullable on system action)
last_name (VARCHAR(50))                                   action (VARCHAR(100))
email (VARCHAR(255), UNIQUE)                              domain (VARCHAR(50))
password_hash (VARCHAR(255))                              target_type (VARCHAR(50), e.g. "order", "restaurant")
role_id (FK -> admin_roles.id)                            target_id (VARCHAR(100), Nullable)
phone (VARCHAR(20), Nullable)                             changes_diff (JSONB, Nullable)
is_active (BOOLEAN, Default True)                         ip_address (VARCHAR(45), Nullable)
must_change_password (BOOLEAN, Default True)              user_agent (VARCHAR(255), Nullable)
invitation_token (VARCHAR(255), Nullable)                 created_at (TIMESTAMPTZ)
invitation_expires_at (TIMESTAMPTZ, Nullable)
last_login_at (TIMESTAMPTZ, Nullable)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

### Key Schema Decisions:
- **`permissions` (System Seeded, Immutable via UI):** Granular capabilities maintained in code. Each record includes a `risk_level` (`low`, `medium`, `high`, `critical`) to warn the Superadmin during role creation when granting high-impact permissions (e.g., executing financial payouts or resetting credentials).
- **`admin_roles` (Dynamic Role Store):** Contains both system-defined roles (`is_system = True`: Superadmin and Support) and user-defined custom roles. System roles cannot be deleted or have their critical flags mutated.
- **`admins` Extended Profile:**
  - `must_change_password`: Guards against compromised initial provisioning passwords.
  - `invitation_token` & `invitation_expires_at`: Supports 48-hour secure onboarding links.
  - `last_login_at`: Tracks dormant admin accounts for security reviews.
- **`admin_audit_logs`:** Immutable audit trail capturing every state change, credential reset, manual dispatch override, and financial disbursement.

---

## 3. Exhaustive Permission Matrix (Mapped to SpeedyMeals Architecture)

Every permission maps directly to real endpoints, database tables, and business rules documented in `backend/docs/report.md`.

### Domain 1: Restaurant Operations (`restaurants.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `restaurants.view` | View Restaurants | Low | Browse restaurant profiles, contact info, ratings, and active status. |
| `restaurants.create` | Onboard Restaurant | Medium | Register new restaurants and generate initial owner credentials. |
| `restaurants.edit_profile` | Update Profile | Medium | Modify restaurant name, phone, address coordinates, and operating hours. |
| `restaurants.toggle_status` | Activate/Deactivate | High | Suspend or activate a restaurant storefront on the customer app. |
| `restaurants.commission.view` | View Commission | Low | View negotiated commission rates per restaurant (default 10%). |
| `restaurants.commission.edit` | Modify Commission | Critical | Alter contract commission rates affecting platform revenue. |
| `restaurants.menu.view` | View Menus | Low | View full menu catalog, items, categories, and variant pricing. |
| `restaurants.menu.manage` | Manage Menus | Medium | Add/edit menu items, upload photos to S3/Supabase, toggle item availability. |
| `restaurants.credentials.reset` | Reset Credentials | High | Trigger password resets for restaurant management accounts. |

### Domain 2: Rider Fleet & Logistics (`riders.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `riders.view` | View Rider Roster | Low | List riders, phone numbers, vehicle types, wallet balances, and status. |
| `riders.approve` | Approve/Reject KYC | High | Review CNIC, driving license, and vehicle registration documents. |
| `riders.toggle_status` | Activate/Suspend | High | Deactivate or suspend riders from taking deliveries. |
| `riders.kit.manage` | Manage Kit & Deposit | Medium | Record Rs. 5,000 cash deposit and assign individual serials for shirts and box. |
| `riders.live_fleet.view` | Live Fleet Tracking | Low | View live GPS positions (Redis 45s TTL), online/offline states on dispatch map. |
| `riders.documents.view_private`| View Sensitive KYC | High | Access pre-signed S3/Supabase URLs for private CNIC and license images. |

### Domain 3: Orders & Dispatch Operations (`orders.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `orders.view` | View Orders | Low | View live and historical orders, line items, and delivery addresses. |
| `orders.cancel` | Cancel Orders | High | Cancel active orders from non-terminal states and trigger reversal rules. |
| `orders.reassign_rider` | Reassign Rider | High | Intervene in auto-assignment engine to manually reassign order to a rider. |
| `orders.live_tracking.view` | Live Order Journey | Low | Monitor customer-to-restaurant-to-rider delivery progression. |
| `orders.status.override` | Override Order State | Critical | Force state machine transitions in emergency/system breakdown cases. |

### Domain 4: Financial Operations & Settlements (`finance.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `finance.settlements.view` | View Settlements | Low | View weekly restaurant settlement ledgers and commission deductions. |
| `finance.settlements.generate`| Generate Settlements| High | Calculate and generate weekly billing cycles for restaurant payouts. |
| `finance.settlements.mark_paid`| Disburse Settlement | Critical | Mark restaurant payouts as disbursed with bank transfer reference. |
| `finance.rider_payouts.view` | View Rider Payouts | Low | View rider earnings ledgers (Rs. 100 base + Rs. 25/km delivery fees). |
| `finance.rider_payouts.generate`| Generate Rider Payouts| High | Batch generate weekly payment schedules for rider delivery earnings. |
| `finance.rider_payouts.mark_paid`| Disburse Rider Payout | Critical | Confirm cash or bank transfer disbursement to riders. |
| `finance.cash_discrepancies.view`| Audit COD Deposits | Medium | Monitor rider cash deposits where submitted amount != expected COD collection. |
| `finance.cash_discrepancies.resolve`| Reconcile Cash Variance| Critical | Forgive, adjust, or mark resolved cash discrepancies up to Rs. 5,000 COD cap. |
| `finance.wallet.adjust` | Manual Wallet Credit | Critical | Manually credit/debit rider wallet balances (e.g. kit refunds, dispute fixes). |

### Domain 5: Customer Management & Support (`customers.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `customers.view` | View Customers | Low | Inspect customer accounts, delivery addresses, and past order frequency. |
| `customers.toggle_status` | Block/Unblock Customer| High | Ban abusive customer accounts or block repeat COD fraudulent orderers. |
| `customers.ratings.view` | View Ratings | Low | Read food quality and delivery service reviews and ratings. |
| `customers.ratings.moderate`| Moderate Reviews | Medium | Hide defamatory or abusive customer reviews from public storefronts. |

### Domain 6: Marketing, Promotions & Global Pricing (`marketing.*` / `pricing.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `marketing.promotions.view` | View Promotions | Low | Review active discount voucher codes, banners, and campaign rules. |
| `marketing.promotions.manage` | Manage Discounts | Medium | Create coupon codes, percentage discounts, minimum spends, and expiry dates. |
| `pricing.delivery_fee.view` | View Delivery Rates | Low | View global delivery fee formula (Rs. 100 base + Rs. 25/km). |
| `pricing.delivery_fee.edit` | Modify Delivery Rates | Critical | Alter base delivery fee or per-km charge matrix across the platform. |

### Domain 7: Analytics, Intelligence & Audit (`analytics.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `analytics.dashboard.view` | View Main Dashboard | Low | Inspect top-level daily GMV, active order count, and delivery metrics. |
| `analytics.reports.export` | Export CSV Reports | Medium | Download periodic accounting, settlement, and sales performance reports. |
| `analytics.audit_logs.view` | View Audit Trail | High | Review complete chronological administrative actions and change logs. |

### Domain 8: System Administration & Access Control (`admins.*`)
| Permission Key | Label | Risk | Scope & Description |
|---|---|---|---|
| `admins.roles.manage` | Manage Custom Roles | Critical | Create, edit, recolor, and delete custom admin roles. |
| `admins.accounts.view` | View Admin Accounts | Medium | View all internal staff profiles, assigned roles, and activity status. |
| `admins.accounts.create` | Provision Admin User | Critical | Create new admin profiles, generate emails, and issue initial credentials. |
| `admins.accounts.manage` | Edit Staff Accounts | High | Modify staff details, reassign roles, and activate/deactivate accounts. |
| `admins.accounts.reset_credentials`| Reset Admin Passwords| Critical | Revoke active sessions and force credential resets for internal staff. |

---

## 4. Admin Profile Creation, Email Generation & Credential Provisioning

### 4.1 Automated Onboarding Architecture

```
[Superadmin]
    │
    ▼
1. Fills Onboarding Form:
   - First Name, Last Name
   - Corporate Email Option (auto-generated vs custom)
   - Role Selection (from custom/system roles)
   - Contact Phone
    │
    ▼
2. Backend Provisioning Service (`app/modules/admin_accounts/service.py`):
   - Generates secure corporate email if requested:
     `{first_name}.{last_name}@speedymeals.pk`
   - Generates cryptographically secure 16-character temporary password:
     `secrets.choice(alpha_upper) + choice(alpha_lower) + choice(digits) + choice(symbols) + secrets.token_urlsafe(12)`
   - Computes bcrypt hash: `hash_password(temp_password)`
   - Generates signed invitation token (48-hour TTL)
   - Inserts admin record with `must_change_password = True`
   - Commits transaction & logs action in `admin_audit_logs`
    │
    ├────────────────────────────────────────┬────────────────────────────────────────┐
    ▼                                        ▼                                        ▼
3A. Transactional Email Dispatch         3B. One-Time Secure UI Modal             3C. Direct Setup Link
    - Sends corporate welcome email           - Displays generated email & temp pass   - One-time invitation link:
    - Contains login portal URL,               - "Copy Credentials" button             `https://admin.speedymeals.pk/`
      temporary password & expiry warning      - Warning: "Will not be shown again"      `setup-password?token=...`
```

### 4.2 Temporary Password Generation & Security
```python
import secrets
import string

def generate_secure_temporary_password(length: int = 16) -> str:
    """
    Generate an industry-standard, high-entropy temporary password.
    Ensures at least 2 uppercase, 2 lowercase, 2 digits, and 2 special characters.
    """
    specials = "!@#$%^&*()-_=+"
    required_chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.digits),
        secrets.choice(specials),
        secrets.choice(specials),
    ]
    all_alphabet = string.ascii_letters + string.digits + specials
    remaining_chars = [secrets.choice(all_alphabet) for _ in range(length - len(required_chars))]
    password_list = required_chars + remaining_chars
    secrets.SystemRandom().shuffle(password_list)
    return "".join(password_list)
```

### 4.3 Transactional Welcome Email Template
Delivered via transactional email client (AWS SES, Resend, or SMTP):
- **Subject:** `Welcome to SpeedyMeals Operations - Your Admin Account Credentials`
- **Body Content:**
  - Personalized greeting: `Hello {first_name},`
  - Assigned Role: `{role_name}` badge
  - Portal Access URL: `https://admin.speedymeals.pk/login`
  - Login Email: `{email}`
  - Temporary Password: `{temporary_password}`
  - Expiration & Security Notice: *This temporary password expires in 48 hours. Upon first login, you will be required to configure a new personal password before accessing the system.*
  - Alternative One-Click Onboarding Link: `https://admin.speedymeals.pk/setup-password?token={invitation_token}`

### 4.4 Mandatory First-Login Password Rotation Flow
1. **Initial Login (`POST /auth/admin/login`):**
   - Admin enters email and temporary password.
   - Credentials verify against bcrypt hash.
   - If `admin.must_change_password == True`:
     - Backend issues a restricted JWT with `scope: "password_change_only"` and short TTL (15 minutes).
     - Response:
       ```json
       {
         "status": "password_change_required",
         "message": "Temporary password must be updated before accessing the platform.",
         "session_token": "<restricted_jwt>"
       }
       ```
2. **Password Update Request (`POST /auth/admin/change-initial-password`):**
   - Dependency validates `scope == "password_change_only"`.
   - Validates that the new password conforms to password complexity rules and is distinct from the temporary password.
   - Updates `password_hash`, sets `must_change_password = False`, clears `invitation_token`, and updates `last_login_at`.
   - Issues full-privilege Access Token + Refresh Token pair.

---

## 5. Dynamic Profiling Angles (Preset Operational Personas)

To provide the Superadmin with instant dynamic profiling capability, the system supports one-click template initialization alongside custom role creation.

### Angle 1: Fleet Dispatch & Logistics Controller
- **Target Staff:** On-duty shift managers handling live deliveries.
- **Permissions:**
  - `orders.view`, `orders.reassign_rider`, `orders.cancel`, `orders.live_tracking.view`
  - `riders.view`, `riders.live_fleet.view`
  - `restaurants.view`, `customers.view`
- **Access Boundary:** Full visibility of live moving fleet and active orders. No access to financial settlements, commission rates, or user credential modification.

### Angle 2: Onboarding & KYC Compliance Officer
- **Target Staff:** Personnel screening new restaurant applications and rider onboarding.
- **Permissions:**
  - `riders.view`, `riders.approve`, `riders.documents.view_private`, `riders.toggle_status`
  - `restaurants.view`, `restaurants.create`, `restaurants.edit_profile`
- **Access Boundary:** Access to private CNIC/license documents and restaurant setup. No access to order cancellation or financial disbursements.

### Angle 3: Hub & Kit Inventory Manager
- **Target Staff:** Outlet supervisors managing physical deposits and equipment handover.
- **Permissions:**
  - `riders.view`, `riders.kit.manage`
  - `finance.cash_discrepancies.view`
- **Access Boundary:** Records Rs. 5,000 kit cash deposits and logs shirt/box serial numbers. Cannot modify restaurant settings or alter commission structures.

### Angle 4: Finance & Settlements Accountant
- **Target Staff:** Accounting and finance department.
- **Permissions:**
  - `finance.settlements.view`, `finance.settlements.generate`, `finance.settlements.mark_paid`
  - `finance.rider_payouts.view`, `finance.rider_payouts.generate`, `finance.rider_payouts.mark_paid`
  - `finance.cash_discrepancies.view`, `finance.cash_discrepancies.resolve`
  - `restaurants.commission.view`
  - `analytics.reports.export`, `analytics.dashboard.view`
- **Access Boundary:** Manages the entire financial ledger. Cannot alter menu items, assign riders, or cancel orders.

### Angle 5: Customer & Merchant Support Lead (Level 2)
- **Target Staff:** Escalated dispute resolution agents.
- **Permissions:**
  - `customers.view`, `customers.toggle_status`, `customers.ratings.view`, `customers.ratings.moderate`
  - `orders.view`, `orders.cancel`
  - `restaurants.view`, `restaurants.menu.view`, `restaurants.menu.manage`
  - `finance.wallet.adjust` (for approved customer compensation / rider goodwill credits)
- **Access Boundary:** Read-only access to riders and settlements. Gated actions focused strictly on resolving active complaints.

### Angle 6: Growth & Campaign Marketer
- **Target Staff:** Marketing specialists driving platform adoption.
- **Permissions:**
  - `marketing.promotions.view`, `marketing.promotions.manage`
  - `restaurants.view`, `restaurants.menu.view`
  - `analytics.dashboard.view`, `analytics.reports.export`
- **Access Boundary:** Create discount codes, banner promotions, and view conversion metrics. No access to customer private data, rider KYC, or internal admin controls.

### Angle 7: Executive Auditor & Compliance Inspector
- **Target Staff:** External auditors or internal executive review.
- **Permissions:**
  - All `.view` permissions across all domains.
  - `analytics.audit_logs.view`, `analytics.reports.export`
- **Access Boundary:** Pure read-only observability across the entire platform. Zero mutation rights.

### Angle 8: Superadmin (System Immutable Role)
- **Target Staff:** Platform owners and technical directors.
- **Permissions:** Implicit wildcard (`*`). Bypasses all individual permission checks.
- **Exclusive Powers:** Managing roles (`admins.roles.manage`), adjusting global delivery fee formulas (`pricing.delivery_fee.edit`), and provisioning admin profiles (`admins.accounts.create`).

---

## 6. Backend API & Dependency Architecture

### 6.1 Dependency Layer Rework (`app/platform/auth/dependencies.py`)

```python
from fastapi import Depends, HTTPException, status
from app.platform.auth.models import Admin
from app.platform.auth.jwt_utils import get_current_user

def require_permission(permission_key: str):
    """
    Enforces atomic permission check on the authenticated admin user.
    Superadmin accounts (is_system=True on superadmin role) automatically bypass.
    """
    def _dependency(current_admin: Admin = Depends(get_current_user)) -> Admin:
        if current_admin.role_name == "super_admin" or getattr(current_admin, "is_superadmin", False):
            return current_admin
            
        user_permissions = current_admin.cached_permissions
        if permission_key not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{permission_key}'",
            )
        return current_admin

    return _dependency
```

### 6.2 New Endpoint Specification

#### Role Management (`/admin/roles`)
- `GET /admin/roles`: List all custom and system roles with active admin member counts.
- `POST /admin/roles`: Create a new custom role with name, color, icon, and permission keys list.
- `GET /admin/roles/{role_id}`: Detail view of a role including assigned admins.
- `PATCH /admin/roles/{role_id}`: Rename, recolor, or modify assigned permission keys.
- `DELETE /admin/roles/{role_id}`: Delete custom role (blocked if `is_system == True` or actively assigned).
- `GET /admin/permissions`: List full categorized permission catalog for the Discord-style UI picker.

#### Admin Account Provisioning (`/admin/accounts`)
- `GET /admin/accounts`: List all internal staff accounts with role badges, email, last login, and status.
- `POST /admin/accounts`: Provision new staff profile (generates email, temporary password, sends email).
- `GET /admin/accounts/{admin_id}`: Detailed profile with assigned permissions and recent audit logs.
- `PATCH /admin/accounts/{admin_id}`: Update name, phone, or status (activate/suspend).
- `PATCH /admin/accounts/{admin_id}/role`: Reassign staff to a different role (revokes active sessions).
- `POST /admin/accounts/{admin_id}/reset-password`: Force-reset credentials and send new temporary password.

---

## 7. Frontend UI/UX Design (Discord-Style Role & User Management)

### 7.1 Role Builder Modal / Screen (`website/app/admin/roles/`)
1. **Header & Live Preview Banner:**
   - Role Name input field.
   - Interactive Color Picker swatch palette (incorporating SpeedyMeals signature brand accents: Red `#DC2626`, Amber `#F59E0B`, Emerald `#10B981`, Indigo `#6366F1`, Slate `#475569`).
   - Live Role Badge Preview: renders the pill badge exactly as it appears next to the staff member's name throughout the dashboard.
2. **Preset Template Selector:**
   - Quick-select dropdown: "Load Template" (e.g. "Dispatch Manager", "Settlement Accountant", "KYC Officer").
   - Populates permission switches automatically with the optimal baseline.
3. **Categorized Permission Switches (Accordion Groups):**
   - Each domain displayed in an accordion card with search/filter bar at the top.
   - Each row features:
     - Clear human-readable title (e.g., "Reconcile Cash Discrepancies").
     - Concise explanatory subtitle detailing the exact operational scope.
     - Severity indicator pill (Low, Medium, High, Critical).
     - Smooth toggle switch.
4. **Safety Verification:**
   - When any `Critical` permission is toggled, an inline warning alert highlights the financial or system risk.

### 7.2 Admin Account Provisioning Modal (`website/app/admin/accounts/`)
1. **Staff Identity Fields:** First Name, Last Name, Phone Number.
2. **Corporate Email Mode Toggle:**
   - Option A: *Auto-Generate Corporate Email* (`{first}.{last}@speedymeals.pk`).
   - Option B: *Enter Existing Work Email*.
3. **Role Assignment Dropdown:** Lists all active custom and system roles with their color badges and member counts.
4. **Onboarding Method Selection:**
   - `[X] Send Welcome Email with Temporary Password`
   - `[X] Require Password Change on First Login`
5. **Success Handover Card (One-Time Modal):**
   - Displays created login credentials with a one-click "Copy Credentials" button.
   - Explicit confirmation: *"Credentials have been dispatched to the user's email. A mandatory password rotation will be enforced upon initial sign-in."*

---

## 8. Rollout & Migration Plan

| Phase | Action Item | Artifacts / Components | Verification Gate |
|---|---|---|---|
| **Phase 1** | Schema Migration | Alembic migration for `permissions`, `admin_roles`, `admin_role_permissions`, `admin_audit_logs`, and `admins` columns. | `alembic upgrade head` succeeds; seed script populates 35 permissions and 2 system roles. |
| **Phase 2** | Backfill Existing Admins | Map existing `super_admin` accounts to Superadmin role; map `support` accounts to Support role. | Zero NULL `role_id` entries on `admins` table. |
| **Phase 3** | Backend Roles Module | Implement `app/modules/admin_roles/` (models, schemas, service, routes). | Unit tests verify role CRUD, permission association, and deletion safeguards. |
| **Phase 4** | Staff Provisioning Engine | Implement `app/modules/admin_accounts/` (credential generator, email dispatch, must-change-password flow). | Integration test confirms admin creation, bcrypt hash, and first-login password rotation gate. |
| **Phase 5** | Auth Dependency Retrofit | Update `require_permission()` and replace flat `require_role(["admin"])` across all ~25 admin endpoints. | Full test suite (`pytest app/tests/`) passes without regression; permission denial returns 403. |
| **Phase 6** | Frontend Role Builder UI | Build Discord-style `/admin/roles` manager and `<RequirePermission>` UI wrappers. | Superadmin can visually create a role, customize colors, toggle permissions, and test assignment. |
| **Phase 7** | Frontend Staff Manager UI | Build `/admin/accounts` staff list, provisioning modal, and one-time credentials card. | Superadmin creates new staff account, views credentials, and staff logs in with forced rotation. |
| **Phase 8** | Final Security Audit | Verify session invalidation upon role change, rate limiting on admin login, and audit log generation. | Red-team penetration check confirms no privilege escalation paths. |

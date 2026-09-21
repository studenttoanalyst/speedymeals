# SpeedyMeals — Admin & Restaurant Portal Build Plan
### Frontend: Next.js 15 App Router (`website/`) | Repo: studenttoanalyst/speedymeals

---

## 0. Current State (as of last repo audit)

**Frontend (`website/`)**
- Route stubs already scaffolded: `app/admin/*` and `app/restaurant/*` (login, dashboard, orders, menu, settlements, reports, profile, riders, restaurants, payouts, customers) — all 8–13 line placeholders.
- `lib/api/admin.ts`, `lib/api/restaurant.ts` — empty (2 lines each).
- `lib/auth/index.ts` — empty stub.
- `middleware.ts` — pass-through, no real JWT verification wired.
- Dead `app/dashboard` scaffold — **already removed**, no longer a concern.
- New placeholder folders (`modules/logistics|medicine|ride_hailing`, `platform/location|notification`) — README-only, future ecosystem, **ignore for MVP**.

**Backend (`backend/`)**
- ✅ Phase 2 (Auth) — complete: OTP flows, JWT + refresh, RBAC (`require_role`), rate limiting, all 4 role logins (customer, rider, restaurant email/pass+OTP, admin email/pass with auto-seed).
- ✅ Phase 3 (Wallet) — mostly done, rider-side only: recharge, balance, online/offline gating, cash-deposit reconciliation, COD eligibility, earnings summary.
- ❌ `food_delivery` module — **0 lines** in routes/service/schemas. Only DB models exist. No menu CRUD, no order endpoints, no status transitions.
- ❌ Settlements / RiderPayout — DB tables exist, **zero service/route logic anywhere**.
- ❌ No admin-specific endpoints at all (restaurant/rider approval, commission override, global order intervene, customer block, dashboard KPI aggregation).

**Design references available**
- `docs/demo_landing_page.png` — **not** the brand reference (per explicit correction), disregard for portal styling.
- `docs/adminjourney.jpeg`, `docs/restaurantjourney.jpeg` — IA/flow diagrams, useful for nav structure and screen groupings, not visual styling.
- `docs/revflow.jpeg` — money-flow diagram, useful for settlement/reconciliation screen logic.
- `docs/Schema_Updated.png` — ER diagram, cross-check for field completeness.
- No existing Figma/mockups for admin or restaurant screens — visual direction to be sourced externally (see Phase 1).

**Bottom line:** Frontend scaffolding is ahead of backend. Backend has no menu, order, settlement, or admin endpoints. This shapes the entire plan below — build against frozen contracts + mocks first, wire real API as backend delivers.

---

## 1. Design Direction & Component Sourcing

### 1.1 Visual direction
Target: **Stripe / Mercury / Linear / Retool-grade fintech-serious SaaS**, not playful marketing-site aesthetic. Reasoning: both portals are money-heavy (commission, settlements, cash reconciliation) — density, restraint, and trustworthy data presentation matter more than decoration.

### 1.2 Where to find real reference UI
| Source | Use for |
|---|---|
| mobbin.com | Real production screenshots/flows of Stripe, Linear, Retool, Mercury, Ramp |
| land-book.com | Curated real SaaS sites, filterable by category |
| screenlane.com | UI pattern search (tables, empty states, settings) |
| Dribbble/Behance | Mood/color reference only — do not copy non-functional concept layouts |

### 1.3 21st.dev — component sourcing during build
**Use [21st.dev](https://21st.dev) as a primary lookup during Phase 3 (shared components) and whenever building a new screen-level component.** It's a community-driven registry of copy-paste React/Tailwind/shadcn components, purpose-built for exactly this kind of dashboard work.

**How to use it effectively:**
- Search by component type before hand-rolling anything: `data table`, `sidebar navigation`, `stat card`, `dashboard`, `settings form`, `empty state`, `command palette`, `filter bar`, `status badge`, `pagination`, `date range picker`.
- Prioritize components tagged for **admin panel / dashboard / SaaS** categories specifically over generic marketing components.
- Treat every pulled component as a **starting point, not a final** — re-theme to match locked design tokens (Phase 1.4), strip unused variants, verify it doesn't pull in libraries outside the approved stack (recharts, lodash, d3, etc. already available; avoid adding new heavy deps for a single component).
- Cross-check accessibility (keyboard nav, ARIA) on anything interactive (dropdowns, modals, tables) pulled from there — community components vary in quality.
- Good candidates to source from 21st.dev directly: `DataTable`, `Sidebar`, `StatCard`/`KPI card`, `StatusBadge`, `ConfirmDialog`, `Toast`, `DateRangePicker`, `FilterBar`, `EmptyState`, `CommandPalette` (optional, nice-to-have for admin power users).

### 1.4 Lock tokens before building
Before any component work: fix color palette (muted neutral background, single sparing accent for actions/alerts), type scale, spacing scale, border treatment (hairline, not heavy shadows), currency formatting convention (monospace figures recommended). Run the `frontend-design` skill (and one taste skill — `design-taste-frontend` recommended) to formalize this into reusable tokens before Phase 3 starts.

---

## 2. Phase Plan

### **Phase A — Contracts First**
*Goal: no UI code written against undefined shapes.*

1. Extract exact field names from `backend/app/modules/food_delivery/models.py` and `platform/wallet_payment/models.py` (Restaurant, MenuItem, Order, Rider, Settlement, RiderPayout, CashDeposit).
2. Freeze TypeScript types in `website/types/*.ts` — 1:1 match with DB columns, including snapshot fields (`commission_amount`, `restaurant_payable`, `rider_earning`, `delivery_distance_km`). **Frontend never recomputes money math** — backend is the single source of truth.
3. Draft matching Pydantic `schemas.py` shapes (even if backend hasn't built the routes yet) — this is the shared contract both sides build against.
4. Lock auth mechanism: httpOnly cookie + JWT, `jose` for edge-compatible verification in `middleware.ts`. Two guards: `isAdminRoute` (role in `[super_admin, support]`), `isRestaurantRoute` (restaurant session).

**Exit criteria:** `types/*.ts` frozen and reviewed; auth mechanism decided and documented; no ambiguity left for Phase B builders.

---

### **Phase B — Mocking Strategy**
*Goal: unblock UI work while backend catches up.*

1. Stand up **MSW (Mock Service Worker)** handlers shaped exactly to Phase A contracts — one handler per planned endpoint (menu CRUD, orders, settlements, admin management, dashboard KPIs).
2. Seed realistic mock data (multiple restaurants, varied order statuses, pending/settled settlements, rider discrepancies) so UI states are exercised properly, not just happy-path.
3. Document the swap plan: MSW handler → real `lib/api/*.ts` call, per endpoint, as backend ships — contracts frozen in Phase A mean this should be a near-zero-rewrite swap.

**Exit criteria:** Every planned screen has a working mock data source; toggling MSW on/off is a single config flag.

---

### **Phase C — Shared Foundation Components**
*Goal: build once, reuse across both portals — search 21st.dev first per Section 1.3.*

Build in `components/dashboard/` (shared, not duplicated per role):
- `Sidebar` — role-aware nav items, grouped sections (mirror the 3-category color grouping from `adminjourney.jpeg`: management/access, monitoring/operations, finance/reporting)
- `Topbar` — user menu, logout, breadcrumb
- `DataTable` — sort, paginate, filter, loading skeleton, empty state (core of 80% of both portals — orders, riders, restaurants, settlements lists)
- `StatCard` / KPI tile — dashboard summary numbers
- `StatusBadge` — order/settlement/rider status pill, color-mapped
- `ConfirmDialog` — destructive actions (reject rider, deactivate restaurant)
- `Toast` — notification system
- `FilterBar` / `DateRangePicker` — used across orders, settlements, reports
- Form primitives — input, select, file upload (docs/photos)
- `OrderStatusCard` / `StatusTimeline` — reusable across restaurant orders, admin orders, customer tracking

**Exit criteria:** Component library storybook-able or at minimum demoable in isolation; visually consistent with locked tokens (Section 1.4).

---

### **Phase D — Data Layer**
*Goal: typed, cached, validated data access.*

1. Extend `lib/api/client.ts` — attach `Authorization` header from auth lib, centralize error handling (401 → redirect login, 403 → forbidden page).
2. Adopt **TanStack Query** for all fetching — caching + mutations, optimistic updates for status changes (order → "Ready for Pickup", rider approve/reject) so UI feels instant.
3. `lib/api/admin.ts` / `restaurant.ts` — one typed function per endpoint, matching Phase A contracts exactly.
4. **Zod** schemas to validate API responses at runtime — catches backend/frontend drift immediately instead of silent bad data reaching UI.

**Exit criteria:** Every planned endpoint has a typed client function + Zod schema, whether backed by MSW or real API.

---

### **Phase E — Restaurant Portal Build** *(smaller surface, build first, proves patterns)*

Build order:
1. **Login** — email+password OR phone+OTP toggle (spec Sec 9 Step 2)
2. **Dashboard** — today's order count, pending settlement amount
3. **Orders** — list + detail, status transitions (Preparing → Ready for Pickup triggers backend rider-assignment — real mutation, not decorative button)
4. **Menu CRUD** — add/edit/remove item, photo upload, available/sold-out toggle
5. **Settlements** — read-only ledger: total sales, commission deducted, net payable (spec Sec 9 Step 9)
6. **Reports** — daily/weekly counts + revenue
7. **Profile** — name, hours, logo, login credential update

**Exit criteria:** Full restaurant flow demoable end-to-end against MSW; visual pattern proven for reuse in admin.

---

### **Phase F — Admin Portal Build** *(reuses restaurant-portal patterns)*

Build order:
1. **Login** — email+password, role-based (super_admin / support)
2. **Dashboard** — platform KPIs: today's orders, gross revenue, net revenue, pending payouts, total wallet balances, pending COD cash
3. **Restaurants management** — list, approve/deactivate, commission rate override, credential reset
4. **Riders management** — document review/approve/reject, wallet + pending-cash monitor, deactivate
5. **Orders** — global view, filter by status/date/restaurant, manual intervene (cancel/reassign)
6. **Settlements** — process weekly restaurant payout, mark settled
7. **Payouts** — rider weekly payout, cash reconciliation (expected vs. actual, flag discrepancy)
8. **Customers** — view/block
9. **Reports** — trends, top restaurants, discrepancy reports

**Exit criteria:** Full admin flow demoable end-to-end against MSW; matches `adminjourney.jpeg` IA.

---

### **Phase G — Backend Catch-Up (runs in parallel with C–F, not after)**
*Goal: real endpoints ready roughly when frontend needs to swap off MSW.*

Recommend inserting into `Backend_development.md` as new phases:
- **Phase 4 (existing, unstarted)** — `food_delivery`: menu CRUD, order list/detail, status transitions with commission snapshot logic (spec Sec 11 math).
- **Phase 4.5 (new — currently missing from the plan entirely)** — Admin & Settlement API:
  - Settlement endpoints: `GET /restaurant/settlements`, `GET /admin/settlements`, `POST /admin/settlements/{id}/mark-paid`
  - RiderPayout + cash reconciliation endpoints for admin
  - Admin restaurant/rider management: approve/reject, deactivate, commission override, credential reset
  - Admin dashboard aggregation endpoint (single call for KPI tile data, avoid N round-trips)
  - Reports endpoints (both roles)

**Exit criteria:** Each MSW handler has a real backend counterpart; swap-over checklist tracked per endpoint.

---

### **Phase H — Production-Grade Hardening**

- Error boundaries per route segment
- Loading skeletons (matching DataTable/StatCard shapes, not generic spinners)
- Empty states designed, not blank
- Accessibility: keyboard nav on DataTable, ARIA on modals/dropdowns (especially anything pulled from 21st.dev — verify, don't assume)
- Responsive down to tablet width (restaurant counter staff likely on tablet)
- `code-review-and-quality` skill run before every merge
- Playwright e2e: login (both roles), order status transition, settlement mark-paid — money-adjacent flows, must not silently break
- No client-side money recalculation anywhere — always trust backend snapshot fields
- `.env` hygiene per existing team convention; `NEXT_PUBLIC_API_BASE_URL` per environment
- Alembic migration rules apply unchanged if backend schema touched alongside frontend work

---

## 3. Sequencing Summary

```
Phase A (contracts)
   → Phase B (mocks) ──────────────┐
   → Phase C (shared components)   │
   → Phase D (data layer)          │  parallel with:
   → Phase E (restaurant portal)   │  Phase G (backend build-out)
   → Phase F (admin portal)        │
   → Phase H (hardening) ──────────┘
```

Backend Phase G should start **now**, in parallel with frontend Phase C, not after Phase F completes — it's the real bottleneck for anything beyond login/shell screens going live with real data.

---

*Plan version 1.0 — reflects repo state as of latest audit. Re-verify backend endpoint status before starting Phase E/F swap-over from MSW to real API.*

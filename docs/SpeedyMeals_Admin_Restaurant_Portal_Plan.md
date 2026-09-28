# SpeedyMeals — Admin & Restaurant Portal Master Architecture & Build Plan
### Frontend: Next.js 15 App Router (`website/`) | Stack: Tailwind CSS v4, Lucide React, Supabase Storage
### Version: 2.0 (Redesigned with Video Playlist Insights, Image Compatibility, Google UI Design & Dashboard Designer Standards)

---

## 0. Executive Summary & Vision

This blueprint unifies the operational requirements extracted from the multi-part food delivery video series (`https://www.youtube.com/playlist?list=PLXzsMkGHouBCY23OMsh-gP7A49XtBWcoK`) with SpeedyMeals' strict business model and design doctrine:
- **Core Financial Model**: Flat **10% restaurant platform commission**, **100% courier delivery fee retention**, and automated **COD cash float risk gating** (blocking dispatch if unremitted cash exceeds threshold).
- **Design Standard**: Built upon `/google-ui-design` (clean white surfaces, crisp typography, subtle borders, high contrast, accessible states, zero AI slop or loud gradients) and layered with `/dashboard-designer` (Level 1 Headline KPIs, Level 2 Contextual Distribution Trends, Level 3 Actionable Operational Tables).
- **Universal Image & Media Support**: First-class image asset handling for restaurant logos (1:1), storefront hero banners (16:9 / 3:1), dish photography (4:3 / 1:1), and marketing campaign banners (3:1) backed by Supabase Storage and drag-and-drop client uploads.
- **Frontend Architecture**: Strict `/frontend-dev-guidelines` (feature-based isolation, Suspense-first data fetching with geometric skeletons, strict TypeScript contracts, zero client-side money recalculation) verified under `/code-review-and-quality` (5-axis standards).

---

## 1. Essential Workflows Filtered for SpeedyMeals Scope

Analysis of the 2026 food delivery production patterns identified the following essential, scalable workflows to adopt, while rejecting heavy, irrelevant bloat (e.g., complex multi-tier tax matrices, white-label CMS engine builders, multi-country localization engines):

### 1.1 Kitchen Terminal & Order Lifecycle
- **Audio/Visual New Order Alert**: Persistent sound chime + visual badge when an order enters `placed` status.
- **Acceptance with Prep Time Estimator**: Kitchen selects estimated preparation duration (15m, 25m, 35m, custom) upon acceptance.
- **Structured Rejection Handling**: Mandatory rejection reason (e.g., "Kitchen overloaded", "Out of ingredients", "Closed early") triggering automated customer notification and refund/cancellation.
- **Milestone State Transitions**: `placed` → `accepted` → `preparing` → `ready_for_pickup` → `out_for_delivery` → `delivered`.
- **Pickup Trigger Dispatch**: Transitioning to `ready_for_pickup` pings the assigned courier or broadcasts to nearby couriers if auto-dispatch is queued.

### 1.2 Menu, Modifier Groups & Media Catalog
- **Category Hierarchy**: Drag-and-drop or ordered categories (e.g., Appetizers, Mains, Beverages, Desserts).
- **Modifier / Add-on Groups**: Configurable option groups attached to dishes:
  - `min_selection` & `max_selection` (e.g., mandatory single-choice crust, optional multi-choice toppings).
  - Price modifiers (+PKR 150 for extra cheese).
- **Item Availability & 86-ing**: Instant toggle for `is_available` to immediately pause orders for sold-out dishes.
- **Media Assets**: Every dish supports high-resolution food imagery, dish tags (Spicy, Vegan, Chef's Special), and dietary badges.

### 1.3 Rider Geofenced Dispatch & Float Guard
- **Geofenced Proximity Assignment**: Broadcasts pending deliveries to couriers within 5–8 km of the pickup restaurant.
- **Acceptance Countdown**: 30-second timer for couriers to accept before waterfall assignment to the next closest rider.
- **Strict COD Float Guard**: Real-time validation preventing a courier from receiving cash-on-delivery (COD) orders if their unremitted cash balance exceeds the configured limit (e.g. PKR 15,000 / AED 500).
- **Delivery Milestones**: `assigned` → `arrived_at_store` → `order_picked_up` → `arrived_at_customer` → `proof_of_delivery_and_cash_collected` → `completed`.

### 1.4 Transparent Financial Ledgers & Settlement
- **Restaurant Weekly Ledger**:
  - `Gross Food Sales` − `10% Platform Commission` + `Approved Adjustments` = `Net Weekly Payable`.
  - Exportable CSV/PDF breakdown with per-order line items.
- **Rider Daily/Weekly Payouts**:
  - `100% Delivery Fees Retained` + `Tips` − `COD Cash Collected` = `Net Wallet Settlement`.
- **Admin Settlement Action**: One-click settlement generation, review, and marking as `paid` with transaction reference recording.

### 1.5 Marketing, Banners & Promotional Campaigns
- **Platform-wide Promos (Admin)**: Create discount codes (percentage or flat PKR off), min order thresholds, start/end dates, and hero promotional carousel banners.
- **Restaurant-specific Offers (Restaurant)**: Target discounts (e.g., 15% off first order, free delivery sponsored by restaurant).

---

## 2. Universal Image & Media Pipeline

### 2.1 Media Asset Specifications
| Asset Type | Ratio | Recommended Size | Max File Size | Target Usage |
|---|---|---|---|---|
| **Restaurant Logo** | 1:1 (Square/Circle) | 512 × 512 px | 2 MB | Store listings, order cards, invoices |
| **Storefront Cover Banner** | 16:9 or 3:1 | 1200 × 400 px | 4 MB | Restaurant portal header, customer storefront |
| **Menu Item Photo** | 4:3 or 1:1 | 800 × 600 px | 3 MB | Menu cards, customer cart, order review |
| **Promotional Carousel Banner**| 3:1 (Wide) | 1200 × 400 px | 4 MB | Customer app home carousel, marketing campaigns |
| **Rider Verification Docs** | Variable / Card | 1200 × 800 px | 5 MB | Admin rider KYC review (CNIC, License) |

### 2.2 Reusable Component: `website/components/common/ImageUpload.tsx`
- **Capabilities**:
  - Drag-and-drop dropzone with click-to-browse.
  - Client-side validation: MIME type (`image/png`, `image/jpeg`, `image/webp`), file size limits.
  - Aspect ratio preview container with zoom/contain/cover options.
  - Image preview with delete/replace actions and progress spinner during upload.
  - Safe fallbacks: Default placeholder graphics (`/images/placeholder-dish.svg`, `/images/placeholder-store.svg`) when URL is missing.
- **Storage Strategy**:
  - Supabase Storage public buckets: `restaurant-assets`, `menu-items`, `promotional-banners`.
  - Upload route handler `/api/upload` handles direct upload to Supabase Storage with authenticated user/admin checks.

---

## 3. Design System Standard: `/google-ui-design`

The visual language follows Chris Tech's Google-inspired Material standard — prioritizing **clarity, whitespace, restrained color, excellent typography, accessible contrast, and functional component states**.

### 3.1 Color System & Tokens
```
Background:         #FFFFFF (Main content surface)
App Canvas:         #F8F9FA (Subtle page backdrop)
Muted Surface:      #F1F3F4 (Hover states, table headers, disabled)
Text Primary:       #202124 (High-contrast body & headings)
Text Secondary:     #5F6368 (Subtitles, metadata, timestamps)
Border Neutral:     #DADCE0 (Crisp 1px hairline dividers)
Brand Primary:      #E11D48 (SpeedyMeals Crimson Red — primary actions)
Brand Primary Hover:#BE123C
Success / Active:   #137333 / #E6F4EA (Green 700 / 50 bg)
Warning / Pending:  #B06000 / #FEF7E0 (Amber 700 / 50 bg)
Error / Alert:      #C5221F / #FCE8E6 (Red 700 / 50 bg)
Info / In-Transit:  #1A73E8 / #E8F0FE (Blue 700 / 50 bg)
```

### 3.2 Typography & Radius Hierarchy
- **Font Stack**: Clean modern sans-serif (`Inter`, `Geist`, or system sans).
- **Type Scale**:
  - `Display / KPI`: 28–32px, Font-bold, Monospace numerals for financial figures.
  - `H1 (Page Title)`: 22–24px, Font-semibold, Tracking-tight.
  - `H2 (Section Header)`: 16–18px, Font-semibold.
  - `H3 / Card Title`: 14–15px, Font-medium.
  - `Body`: 13–14px, Regular, Leading-relaxed.
  - `Caption / Badge`: 11–12px, Medium / Semibold.
- **Corner Radii**:
  - Small elements (badges, buttons, inputs): `8px` (`rounded-lg`).
  - Cards, panels, dialogs: `12px` (`rounded-xl`).
  - Floating sheets, modal dialogs: `16px` (`rounded-2xl`).
  - Status pills / avatars: `999px` (`rounded-full`).

### 3.3 State Completeness
Every single interactive element and screen must implement:
1. **Normal / Resting**: Crisp border, high text readability.
2. **Hover / Focus**: 2px focus ring with high contrast (`focus:ring-2 focus:ring-rose-500/20`).
3. **Loading**: Structural skeleton shimmer matching the exact component layout geometry (no blank screens or generic center spinners).
4. **Empty State**: Dedicated vector icon, friendly 2-sentence explanation, and an explicit primary CTA button.
5. **Error State**: Non-blocking alert banner with explicit error text and a "Try Again" action button.

---

## 4. Analytical Hierarchy: `/dashboard-designer` Layer

The overview dashboard for both Admin and Restaurant follows the structured **F-Pattern 3-Level Information Architecture**:

### 4.1 Admin Portal Overview Dashboard (`/admin/dashboard`)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: HEADLINE PLATFORM KPIS (3-5 Cards across top)                                 │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────────┐ │
│ │ Today's GMV      │ │ Net Comm. (10%)  │ │ Active Deliveries│ │ Pending Cash Float  │ │
│ │ PKR 482,500      │ │ PKR 48,250       │ │ 42 In-Flight     │ │ PKR 124,000 (Alert) │ │
│ │ +14.2% vs target │ │ +14.2% vs target │ │ 98.4% SLA Met    │ │ 3 Riders > Limit    │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └─────────────────────┘ │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ LEVEL 2: CONTEXTUAL TRENDS & PIPELINE  │ LEVEL 2: REGIONAL & DISPATCH HEATMAP          │
│ - 24-Hour Order Volume & Revenue Trend │ - Live Dispatch Funnel: Placed(12) → Prep(18) │
│ - Line & Bar comparison vs yesterday   │   → Ready(8) → In-Transit(42) → Delivered(310)│
├────────────────────────────────────────┴───────────────────────────────────────────────┤
│ LEVEL 3: ACTIONABLE OPERATIONAL TABLES & EXCEPTION QUEUES                              │
│ - [Tab 1] Urgent Action Orders (Delayed prep > 25m, unassigned couriers)               │
│ - [Tab 2] Pending Partner Approvals (3 Restaurants awaiting KYC, 5 Riders)             │
│ - [Tab 3] Cash Limit Breaches (Couriers holding > PKR 15,000 unremitted COD)          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Restaurant Portal Overview Dashboard (`/restaurant/dashboard`)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: RESTAURANT OPERATIONAL KPIS                                                   │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────────┐ │
│ │ Today's Sales    │ │ Net Payout (90%) │ │ Active Orders    │ │ Avg Kitchen Prep    │ │
│ │ PKR 64,800       │ │ PKR 58,320       │ │ 6 in Kitchen     │ │ 16.4 mins (Target 18│ │
│ │ 38 orders today  │ │ Weekly Settl. Fri│ │ 2 Ready for Pick │ │ -2.1 mins vs avg    │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └─────────────────────┘ │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ LEVEL 2: HOURLY RUSH TREND             │ LEVEL 2: TOP PERFORMING DISHES TODAY          │
│ - Orders per hour (Lunch vs Dinner peak│ - #1 Classic Beef Smash Burger (24 orders)   │
│ - Real-time Kitchen SLA compliance     │ - #2 Truffle Parmesan Fries (19 orders)      │
├────────────────────────────────────────┴───────────────────────────────────────────────┤
│ LEVEL 3: LIVE KITCHEN QUEUE & RAPID ACTION TERMINAL                                    │
│ - Immediate Accept/Reject buttons with countdown timer                                 │
│ - Step transitions: [Mark Preparing] -> [Mark Ready for Pickup]                        │
│ - Instant "86 / Sold Out" quick-toggle panel for 3 lowest stock items                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Portal Route Matrix & Screen Specifications

### 5.1 Shared Foundation Components (`website/components/dashboard/`)
1. `Sidebar.tsx`: Grouped navigation with badge counts (e.g. pending orders, KYC requests), collapse state, active indicator.
2. `Topbar.tsx`: Search command bar (`Cmd+K`), role badge, notifications chime popover, user profile & logout dropdown.
3. `DataTable.tsx`: Generic sortable, filterable, paginated table with column formatting, bulk actions, loading skeleton, and empty state.
4. `StatCard.tsx`: Level 1 KPI card with icon, numeric value, period delta pill (`+12.5%`), benchmark indicator, and optional sparkline.
5. `StatusBadge.tsx`: Color-coded status badge with dot indicator (`placed`, `preparing`, `ready_for_pickup`, `out_for_delivery`, `delivered`, `cancelled`).
6. `ConfirmDialog.tsx`: Accessible dialog for destructive actions (cancel order, suspend restaurant, reject rider).
7. `ImageUpload.tsx`: Reusable media uploader with aspect ratio presets and preview.

### 5.2 Restaurant Portal Screens (`website/app/restaurant/`)
- `/login`: Email + Password or Phone + OTP toggle, session persistence, direct redirect to `/restaurant/dashboard`.
- `/dashboard`: Level 1–3 KPI hierarchy, quick kitchen terminal link, real-time alert toast.
- `/orders`: Live kitchen order board with 2 view modes:
  - **Kanban Board**: Columns for `New`, `Preparing`, `Ready for Pickup`, `Completed`.
  - **List View**: Dense data table with customer name, item summary, order total, timer, and action buttons.
- `/orders/[orderId]`: Detailed ticket breakdown, special instructions, modifier breakdown, delivery rider contact, print receipt view.
- `/menu`: Category tabs, item grid with dish images, price, availability switch, and "Add New Dish" modal.
- `/menu/edit/[itemId]`: Full dish editor including image upload, title, description, base price, category, and modifier groups configuration.
- `/settlements`: Weekly financial breakdown, gross sales, 10% commission deduction, net payout status, bank account details.
- `/reports`: Date range picker, sales by category, peak hour volume chart, cancellation rate breakdown.
- `/profile`: Restaurant brand management: logo upload (1:1), hero banner upload (16:9), opening hours, phone, address, and credentials.

### 5.3 Admin Portal Screens (`website/app/admin/`)
- `/login`: Clean super-admin and operational support login screen.
- `/dashboard`: Platform-wide Level 1–3 executive KPI dashboard with live operations queue.
- `/restaurants`: Restaurant directory, verification status (`pending`, `active`, `suspended`), 10% commission override control, profile & menu inspection.
- `/riders`: Courier fleet monitoring, KYC document verification (CNIC / License inspection), active orders, wallet balance, and cash float guard limit tracker.
- `/orders`: Universal real-time order monitor with multi-filter (restaurant, status, payment type, date), emergency manual order reassign / cancellation.
- `/settlements`: Restaurant payout management, weekly automated settlement calculation, marking payouts as settled with reference IDs.
- `/payouts`: Courier payout management, COD cash reconciliation (expected COD collected vs remitted), flagged discrepancies.
- `/promotions`: Platform banner management (upload 3:1 promo banners), coupon codes creation (flat / percentage off), restaurant participation rules.
- `/customers`: Registered customer directory, order history count, customer block/unblock security control.
- `/reports`: Platform-wide business intelligence, delivery heatmaps, courier delivery time SLA trends, top performing partners.

---

## 6. Data Architecture & API Contracts

### 6.1 Entity Additions for Image & Media Compatibility
- **`Restaurant`**:
  - `logo_url`: String (URL to Supabase storage)
  - `banner_url`: String (URL to Supabase storage)
  - `rating`: Float (default 4.8)
  - `prep_time_minutes`: Integer (default 20)
- **`MenuItem`**:
  - `image_url`: String (URL to Supabase storage)
  - `is_available`: Boolean (default True)
  - `is_popular`: Boolean (default False)
  - `modifier_groups`: JSON array of `{ id, name, min_selection, max_selection, options: [{ id, name, price_delta }] }`
- **`Promotion`**:
  - `banner_url`: String (URL to Supabase storage)
  - `code`: String (e.g. `SPEEDY50`)
  - `discount_type`: Enum (`percentage`, `flat`)
  - `discount_value`: Float
  - `valid_from`: Timestamp
  - `valid_until`: Timestamp
  - `is_active`: Boolean

### 6.2 Frontend Data Layer Strategy
1. **Mock Service & Real API Dual Mode**:
   - `lib/api/admin.ts` and `lib/api/restaurant.ts` provide strongly typed async functions.
   - Built-in comprehensive mock data seeded with real images (high-quality Unsplash food & restaurant photography) to ensure UI states, images, and dashboards are immediately live and testable.
   - Clean toggle to point to FastAPI backend endpoints as each phase is deployed.
2. **Strict Currency & Calculations**:
   - Currency formatting utility: `formatCurrency(amount: number, currency = 'PKR')`.
   - Never compute commission or settlement totals on client — rely on backend snapshot fields (`commission_amount`, `restaurant_payable`, `rider_earning`).

---

## 7. Execution Phases & Milestones

```
Phase 1: Shared Design Tokens & Primitives
├── Google-inspired design token CSS variables & Tailwind config
├── ImageUpload component (drag-drop, aspect presets, validation)
└── Base UI primitives (StatCard, DataTable, StatusBadge, Topbar, Sidebar)

Phase 2: Restaurant Portal Rebuild
├── Auth & session check (email/pass + phone/OTP)
├── Overview Dashboard (Level 1-3 KPIs, Rush trend, Top dishes, Live queue)
├── Kitchen Terminal & Orders Kanban/List with audio alert
├── Menu Management with Dish Images & Modifier Group builder
├── Weekly Settlements Ledger & Profile Media management
└── Sales Reports & Analytics

Phase 3: Admin Portal Rebuild
├── Super-admin & Support Auth
├── Executive Dashboard (GMV, 10% Comm, Active fleet, Cash Float risk)
├── Restaurant Directory & KYC Verification
├── Rider Fleet Management & COD Float Guard Tracker
├── Universal Live Orders Monitor with intervention controls
├── Restaurant Weekly Settlements & Rider Payouts Reconciliation
├── Marketing & Promotional Banners Manager
└── BI Reports & SLA Observability

Phase 4: Production Hardening & Quality Gate
├── Suspense boundaries with matching layout skeletons
├── Empty and Error states across all tables and cards
├── Accessible keyboard navigation & ARIA compliance
└── 5-Axis Code Review pass (Correctness, Readability, Architecture, Security, Performance)
```

---

*SpeedyMeals Engineering Architecture — Maintained under Google UI Design & Dashboard Designer Guidelines.*

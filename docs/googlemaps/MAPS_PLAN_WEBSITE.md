# `website/` (admin panel) — Google Maps Platform Plan

**Stack (assumed Next.js, per repo structure — folder previously referred to as `admin_web/`):** internal admin dashboard, restaurant-facing views
**Role in this system:** read-only map visualization for staff. Never writes location data, never triggers Distance Matrix — purely displays what `backend/` already computed and stored.

**Naming note:** confirm whether "website" refers to the same folder previously seen as `admin_web/` in the repo listing, or a separate public-facing site. This plan assumes it's the admin/restaurant panel — flag if that's wrong before building against it.

---

## Status Snapshot

| Item | Status |
|---|---|
| Admin order-detail data (distance, fee) | Backend fields exist on `orders` table; surfaced in admin API — unconfirmed, see `MAPS_PLAN_BACKEND.md` Phase B4 |
| Admin rider-location read access | Not started — current `GET /orders/{id}/rider-location` scoped to customer, needs role check confirmed/extended |
| Web map rendering | Not started |
| Restaurant-facing map (if applicable) | Not started, lower priority |

---

## Phase W0 — Confirm Data Availability (blocks everything else)

**Depends on:** `MAPS_PLAN_BACKEND.md` Phase B4

1. Don't start frontend work until backend confirms: (a) admin order-detail response includes `delivery_distance_km` + fee breakdown fields, and (b) an admin-permitted endpoint exists for reading a given order's live rider location.
2. If B4 hasn't landed yet, this whole plan is blocked — flag it rather than building against fields that don't exist yet.

---

## Phase W1 — Key Setup (Web)

1. Generate a **separate** Maps JavaScript API key in Cloud Console, restricted by HTTP referrer (the admin panel's domain) — do not reuse the backend's server-side key or mobile's app-restricted keys.
2. Enable Maps JavaScript API (for interactive map rendering) — Maps Embed API is a cheaper/simpler alternative if the admin view only needs a static-ish map with no custom marker interactivity; decide based on whether staff need to click/hover markers for order details or just glance at a position.
3. Store key in Next.js environment config appropriately (public env var, since it's a browser-side key by nature — this is normal for Maps JS API, the HTTP-referrer restriction is what protects it, not secrecy).

---

## Phase W2 — Order Detail Map View

**Where:** admin order-detail page (per report.md Section 24: `GET /admin/orders/{id}`)

1. Use `@react-google-maps/api` (or equivalent React wrapper) to render restaurant, customer, and rider markers for a single order.
2. Display the stored distance/fee breakdown (from W0) as a data panel alongside the map — no live recalculation, just reading persisted values.
3. If order is active (has an assigned rider, non-terminal status): poll or subscribe to the rider-location endpoint from W0(b) to show a live-updating rider marker, same pattern as the customer app's tracking screen.
4. If order is terminal (Delivered/Cancelled): static map, no location polling — matches backend's existing 409 behavior on terminal orders, so the frontend should stop querying once it sees that status rather than erroring repeatedly.

**Exit criteria:** staff can open any order and see a map with relevant markers, live if active, static if completed.

---

## Phase W3 — Fleet Overview (Optional, Later Phase)

**Where:** new admin dashboard section, e.g. `/admin/riders/map`

1. Broader view: all currently-online riders plotted on one map, not scoped to a single order.
2. Requires a new backend endpoint (not currently planned in `MAPS_PLAN_BACKEND.md` — would need to be added: something like `GET /admin/riders/locations` returning all online riders' latest Redis-stored positions).
3. Useful for operational visibility (are riders clustered in the right areas, coverage gaps) but not required for MVP order-tracking — treat as a stretch goal, sequence it after W2 is solid.

**Exit criteria:** N/A for MVP — revisit after core admin map view (W2) ships and is validated.

---

## Phase W4 — Restaurant-Facing View (If In Scope)

Report.md's restaurant endpoints (Section 9) don't mention any map-facing feature for restaurant accounts — only order dashboard and menu management. Before building anything here, confirm whether restaurants need to see rider location (e.g. "your rider has arrived") or whether that's purely a customer/admin concern. If restaurant status updates already convey what's needed ("Rider Assigned" → "Accepted by Rider" → "Arrived at Restaurant"), a map may be unnecessary for this role — flag as a scope question rather than assuming it's needed.

---

## Phase W5 — Testing

1. Verify Maps JS API key's HTTP-referrer restriction actually blocks requests from other origins (test from a non-admin domain, confirm it's rejected).
2. Load-test the order-detail map view's polling behavior if multiple staff have the same order open simultaneously — confirm this doesn't multiply backend load unreasonably (each browser tab polling independently could add up faster than mobile's single-customer-per-order pattern).
3. Confirm terminal-order handling stops polling cleanly in the UI, matching backend's 409 response, no retry loops.

---

## Summary

| Phase | Priority | Depends on |
|---|---|---|
| W0 Confirm data availability | Blocker | Backend B4 |
| W1 Key setup | First | — |
| W2 Order detail map | Core | W0, W1 |
| W3 Fleet overview | Stretch | W2 |
| W4 Restaurant view | Scope question | Product decision |
| W5 Testing | Ongoing | W2 |

Website carries no direct Distance Matrix cost (reads persisted backend data only) and minimal Maps JS API cost — free up to 10,000 loads/month, trivial at internal-staff usage volume. Main risk here isn't billing, it's polling load on the backend if W5's multi-tab scenario isn't checked.

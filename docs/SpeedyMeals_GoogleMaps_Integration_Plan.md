# SpeedyMeals — Google Maps Platform Integration Plan (Revised)
### Phase-by-Phase Work Breakdown — updated against `report.md` (backend code inspection)

**Key change from previous plan:** the backend already implements two of the phases assumed to be future work. This revision separates **Done**, **In Progress / Partial**, and **Not Started** so effort isn't duplicated.

**Scope correction:** `report.md` documents the FastAPI `backend/` only. It contains no evidence of Geocoding, Places Autocomplete, or Maps SDK integration — those live in `mobile_app/` / `admin_web/` (outside this report's scope) and their status is unconfirmed, not "not started." Flagged accordingly below.

**Delivery fee formula correction:** actual implemented formula is `Rs. 100 base + Rs. 25/km` (`DELIVERY_FEE_BASE`, `DELIVERY_FEE_PER_KM` in `modules/food_delivery/service.py`) — not the Rs. 50 + Rs. 20/km used in the earlier draft.

---

## Status Summary

| Phase | Component | Status | Evidence in report.md |
|---|---|---|---|
| 0 | Cloud setup | Partial | Single `GOOGLE_MAPS_API_KEY` in `.env` — one server key only, no separate mobile/web keys confirmed |
| 1 | Map rendering (mobile) | Unconfirmed | Not covered by this backend report |
| 2 | Address resolution (Geocoding) | Unconfirmed | `addresses` table stores lat/lng directly (Section 6); no geocoding endpoint in backend |
| 3 | Address autocomplete (Places) | Unconfirmed | No mention in backend |
| 4 | Delivery fee (Distance Matrix) | **Done** | Section 13, `core/maps_client.py`, `calculate_delivery_fee()` |
| 5 | Rider live location | **Partial — poll-based only** | Section 22/23/30: Redis `rider_location:{rider_id}` (45s TTL), `PATCH /wallet/location` push, `GET /orders/{id}/rider-location` poll read. Explicitly listed as a known limitation: "no WebSocket/push" |
| 6 | Rider navigation hand-off | Unconfirmed | Not covered by this backend report |
| 7 | Admin visibility | Partial | Admin dashboard/order endpoints exist (Section 24); no map-specific admin UI confirmed |
| 8 | Testing & cost validation | Not started | 309/309 tests pass, but none scoped to Maps cost/quota behavior |

---

## Phase 0 — Cloud Setup: Close the Gap

**Current state:** one `GOOGLE_MAPS_API_KEY` env var, used server-side only (`core/maps_client.py`).

**Remaining work:**
1. Confirm whether mobile/admin apps need their own restricted keys (Maps SDK, Autocomplete) or whether all map-facing work stays server-mediated. If mobile renders its own map (Phase 1), it needs its own Android/iOS keys — separate from the backend's Distance Matrix key.
2. Restrict the existing backend key to server IP only (verify this is set in Cloud Console — not visible from code).
3. Confirm budget alert exists; report gives no evidence either way.

**Where:** Cloud Console + `backend/app/.env` (already wired) + new keys in `mobile_app/` config if Phase 1 proceeds.

---

## Phase 1 — Map Rendering Foundation (mobile_app)

**Status: unconfirmed — not in backend scope.**

No change to prior guidance, but before starting: confirm with whoever owns `mobile_app/` whether `google_maps_flutter` is already integrated. Don't duplicate.

**Where:** `mobile_app/lib/features/maps/` (assumed path, verify against actual repo).

**Exit criteria:** unchanged from previous plan — map renders, draggable pin returns lat/lng.

---

## Phase 2 — Address Resolution (Geocoding)

**Status: unconfirmed, likely not started on backend side.**

Report's `addresses` table (Section 6) has `latitude`, `longitude` fields but no evidence of a geocoding round-trip — coordinates may currently be captured directly from device GPS or a mobile-side Google SDK call, bypassing backend entirely.

**Action before building anything:** check whether `mobile_app/` already calls Google Geocoding client-side. If yes, Phase 2 as previously scoped (backend proxy endpoint) is unnecessary — only add it if there's a reason to keep the key server-side (recommended, but confirm current behavior first rather than building a redundant path).

**Where (if built):** `backend/app/modules/food_delivery/` or a new small `platform/location/` service — notably, `platform/location/` already exists in the codebase as a **placeholder (README only)**. This is the natural home for Geocoding logic if/when it's added — don't create a new module when one is already scaffolded for this purpose.

---

## Phase 3 — Address Autocomplete (Places)

**Status: unconfirmed — no backend involvement expected.**

Unchanged from prior plan: this stays entirely mobile-side with session tokens, backend never touches it. No action needed here unless `mobile_app/` inspection shows it's missing.

---

## Phase 4 — Delivery Fee Calculation (Distance Matrix) — DONE

**No remaining work.** Confirmed implemented:
- `core/maps_client.py` — Google Maps Distance Matrix client, driving mode, 10-second timeout
- `calculate_delivery_fee()` in `modules/food_delivery/service.py` — `Decimal("100")` base + `Decimal("25")`/km, quantized to 2 decimals
- Used in `_build_checkout_context()` → both `place_order()` and `preview_checkout()` — meaning distance is calculated at preview time too, not just final placement (worth confirming this doesn't mean **two** Distance Matrix calls per order — one at preview, one at checkout, if the customer previews before placing)
- `MapsError` on failure → 503 to client — correct failure handling, no silent fallback

**One open question to verify against actual code (not stated in report):** does `preview_checkout()` cache/reuse the same distance value if the customer proceeds to `place_order()` immediately after, or does it call Distance Matrix twice? If it's two calls per completed order instead of one, the Phase 4 cost estimate (~$25/month at 500 orders/day) roughly doubles to ~$50/month. Worth a 10-minute code check before finalizing budget.

**Remaining action:** none functionally required; recommend the cache check above as a small follow-up task.

---

## Phase 5 — Rider Live Location — PARTIALLY DONE (poll-based, no push)

**What's implemented (Section 21, 22, 30):**
- Rider app pushes location: `PATCH /wallet/location` → written to Redis key `rider_location:{rider_id}`, 45-second TTL
- Customer reads location: `GET /orders/{id}/rider-location` — reads from Redis, returns null if location stale/expired, returns 409 if order is in a terminal status (Delivered/Cancelled)
- This endpoint was recently completed per Section 30's "Recently Resolved Gaps" table

**What's explicitly missing (Section 30, "Known Limitations"):**
> Real-time tracking: Poll-based only (no WebSocket/push)

This means the *backend data layer* for rider tracking is done, but the *delivery mechanism* to the customer app is polling, not a live stream. The earlier plan's Phase 5 assumed a WebSocket push architecture — that layer does not exist yet.

**Remaining work, if push-based tracking is still wanted:**
1. Add a WebSocket endpoint (e.g. `WS /orders/{id}/track`) in `backend/app/modules/food_delivery/` that subscribes to the same Redis key and pushes updates to connected clients instead of requiring the client to poll `GET /orders/{id}/rider-location` every few seconds.
2. Decide whether polling is actually good enough for MVP — polling `GET /orders/{id}/rider-location` every 3–5 seconds from the customer app achieves the same visible result as a WebSocket, at the cost of slightly more HTTP overhead and no Google Maps billing impact either way (this is entirely internal infrastructure, zero-cost on the Maps Platform side regardless of which approach is used).
3. If staying poll-based: no backend change needed, just confirm `mobile_app/` is actually polling this endpoint on the tracking screen (Customer Journey, "Order Tracking (poll-based)" — matches what the backend already supports).

**Recommendation:** treat WebSocket upgrade as a nice-to-have, not a blocker — the existing poll endpoint is functionally complete and already has correct edge-case handling (staleness null, terminal-order 409).

---

## Phase 6 — Rider Navigation Hand-off

**Status: unconfirmed — not in backend scope.** Unchanged from prior plan: deep-link approach (`google.navigation:q=lat,lng`) recommended over building in-app Directions rendering, since it's zero backend involvement and zero Maps Platform cost.

---

## Phase 7 — Admin Visibility (admin_web)

**Status: partial.** Backend already exposes everything needed:
- `GET /admin/orders/{id}` — order detail, would include `delivery_distance_km` and fee breakdown if that's returned in the response schema (verify — report doesn't confirm this field is in the admin order-detail response specifically)
- No dedicated admin endpoint for rider location exists — admin would need to either reuse `GET /orders/{id}/rider-location` (currently scoped as a customer-facing endpoint per Section 24's endpoint table — check if admin role is permitted to call it, or if a role check would reject it) or a new admin-specific read path

**Remaining work:**
1. Confirm `GET /orders/{id}/rider-location` accepts the admin role, or add an equivalent admin-scoped endpoint.
2. Confirm order-detail response schema includes distance/fee breakdown fields for admin display.
3. Frontend: `admin_web/` map view, using Maps JavaScript API (free up to 10,000 loads/month) — no backend blocker once the above two are confirmed.

---

## Phase 8 — Testing & Cost Validation

**Status: not started, but foundation is strong.** 309/309 tests pass, Maps API already mocked via monkeypatch in test suite (Section 28) — meaning the Distance Matrix integration is under test, just not for cost/quota behavior specifically.

**Remaining work (unchanged in substance from prior plan):**
1. Verify preview-vs-checkout call count (see Phase 4's open question) using real Cloud Console metrics on `speedymeals-dev`, not just mocked tests.
2. Load-test the poll-based rider-location endpoint under concurrent active orders — confirm Redis TTL/staleness behavior holds up, since this is now confirmed as the actual production mechanism, not a placeholder.
3. Confirm budget alert (Phase 0) fires correctly.

---

## Revised Cost Estimate

| Item | Status | Monthly cost @ ~500 orders/day |
|---|---|---|
| Distance Matrix | Done, in production | ~$25 (or ~$50 if preview+checkout double-calls — verify) |
| Rider location (Redis + poll) | Done, in production | $0 — not a Google API |
| Maps SDK, Geocoding, Autocomplete, Directions | Unconfirmed (mobile-side) | Assume $0–low per prior estimates, pending confirmation these exist and use session tokens/caching correctly |

**Immediate next action:** two verification tasks — (1) confirm single vs. double Distance Matrix call per order, (2) confirm current state of `mobile_app/` Maps integration — before doing any further planning, since both materially change scope and cost.

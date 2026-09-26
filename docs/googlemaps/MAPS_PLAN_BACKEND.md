# `backend/` — Google Maps Platform Plan

**Stack:** FastAPI, PostgreSQL, Redis, `core/maps_client.py`
**Role in this system:** the only component allowed to hold the server-side Maps API key; the only component that talks to Google directly except where explicitly noted for mobile/website.

---

## Status Snapshot

| Item | Status |
|---|---|
| Distance Matrix (delivery fee) | **Done** — `core/maps_client.py`, `calculate_delivery_fee()` |
| Rider location store + poll read | **Done, poll-based** — Redis `rider_location:{rider_id}`, `PATCH /wallet/location`, `GET /orders/{id}/rider-location` |
| WebSocket push for rider location | Not started |
| Geocoding proxy endpoint | Not started — `platform/location/` exists as placeholder, natural home for this |
| Admin-scoped location/distance read | Not started |
| Preview-vs-checkout double-call check | Unverified — needs a 10-min code read |

---

## Phase B0 — Key & Config Hygiene

**Where:** `app/.env`, `core/config.py`

1. Confirm `GOOGLE_MAPS_API_KEY` is IP-restricted in Cloud Console (not visible from code, verify manually).
2. Confirm this key is used **only** by `core/maps_client.py` — no other module should construct its own Maps client. If Geocoding gets added (Phase B2), it reuses this same client/key, doesn't get a new one.
3. Add a `MAPS_DAILY_CALL_BUDGET` soft-limit constant (optional) if you want an application-level circuit breaker in addition to the Cloud Console budget alert — not required, but cheap insurance against a bug that loops Distance Matrix calls.

---

## Phase B1 — Verify Distance Matrix Call Count (do this first, blocks cost estimate)

**Where:** `modules/food_delivery/service.py` — `_build_checkout_context()`, `preview_checkout()`, `place_order()`

1. Read `_build_checkout_context()` and confirm whether it's invoked once and the result passed to both preview and place, or invoked separately by each.
2. If separate: refactor so `preview_checkout()`'s computed distance is cached (Redis, keyed by cart/session, short TTL e.g. 5 min) and reused by `place_order()` if the customer proceeds within that window. Falls back to a fresh call if the cache misses (cart changed, TTL expired).
3. This directly changes the cost model — don't build Phase B3 alerting against unverified numbers.

**Exit criteria:** confirmed and, if needed, fixed to exactly one Distance Matrix call per completed order.

---

## Phase B2 — Geocoding Proxy (only if mobile isn't already doing this client-side)

**Where:** `platform/location/` — currently a README-only placeholder, this is its first real use

1. Coordinate with mobile team first (see `mobile_app` plan, Phase M2) — don't build this if addresses are already being geocoded on-device before reaching the backend.
2. If needed: `POST /location/geocode/reverse` (lat/lng → address string) and `POST /location/geocode/forward` (address → lat/lng), both server-side calls to Google Geocoding using the existing backend key.
3. Wire into `users/service.py` address-save flow: geocode once on save, store the resolved string on the `addresses` row, never re-call for that address.
4. Add rate limiting (reuse `core/rate_limiter.py`, same pattern as OTP) — this is a new externally-triggerable Google-billed action, worth protecting from abuse same as anything else user-triggered.

**Exit criteria:** address save round-trips through geocoding exactly once per new address, cached thereafter.

---

## Phase B3 — WebSocket Push for Rider Location (upgrade from poll)

**Where:** `modules/food_delivery/` — new `WS /orders/{id}/track` alongside existing REST `GET /orders/{id}/rider-location`

1. New WebSocket route, same auth model as the REST endpoint (customer must own the order, same ownership-in-query pattern used everywhere else in this codebase).
2. On rider's `PATCH /wallet/location` write to Redis, also publish to a Redis pub/sub channel keyed by `order_id`.
3. WebSocket handler subscribes to that channel for the connection's lifetime, pushes updates to the connected client as they arrive instead of the client polling.
4. Keep the existing REST poll endpoint as a fallback — don't remove it. Some clients (e.g. slow networks, older app versions) may not maintain a WebSocket reliably.
5. Close subscription server-side on terminal order status, mirroring the existing 409 behavior on the REST endpoint.

**Exit criteria:** customer app can get live updates via WebSocket; REST polling still works as fallback.

**Note:** zero Google Maps Platform cost impact either way — this entire phase is internal infra, not a billed API.

---

## Phase B4 — Admin-Scoped Location & Distance Access

**Where:** `modules/admin/routes.py`, `modules/admin/schemas.py`

1. Check whether `GET /orders/{id}/rider-location` currently permits the `admin` role or is hard-restricted to the customer who owns the order. If restricted, either loosen the role check or add a parallel `GET /admin/orders/{id}/rider-location`.
2. Confirm `RiderKitResponseSchema`-style admin order-detail schema actually includes `delivery_distance_km` and the frozen fee fields (`delivery_fee`, `commission_amount`, `restaurant_payable`, `rider_earning`) — these exist on the `orders` table per Section 6 but need confirming they're surfaced in the admin response model, not just stored.

**Exit criteria:** admin can pull distance/fee breakdown and rider live location for any order via API, ready for the website's admin dashboard to render.

---

## Phase B5 — Testing

**Where:** `tests/test_checkout.py`, `tests/test_rider_location.py`, new `tests/test_maps_cost_behavior.py` if warranted

1. Add a test asserting `place_order()` after `preview_checkout()` does not trigger a second `maps_client` call (mock call-count assertion, not just response correctness) — closes the loop on Phase B1.
2. Extend `test_rider_location.py` coverage to the new WebSocket path once B3 lands.
3. Add an admin-role test for the new/loosened location endpoint from B4.

**Exit criteria:** call-count regression is now covered by an automated test, not just a one-time manual check.

---

## Cost Ownership

Backend is the only component incurring Distance Matrix and (if built) Geocoding costs — both billed server-side. Rider location and WebSocket infra are zero-cost regardless of volume. Estimated ~$25–50/month at 500 orders/day pending Phase B1 verification.

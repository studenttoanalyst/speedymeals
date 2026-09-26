# SpeedyMeals — Google Maps Platform Integration Plan
### Phase-by-Phase Work Breakdown

**Repo structure referenced:** `mobile_app/` (Flutter — customer + rider apps), `backend/` (order/fee/tracking logic), `admin_web/` (Next.js), `docs/`

**APIs in scope:** Maps SDK (Android/iOS), Geocoding, Places Autocomplete, Distance Matrix (Legacy), rider live-location (custom WebSocket, not a Google product)

**Cost baseline (from prior analysis, ~500 orders/day):** ~$25/month, driven almost entirely by Distance Matrix once past the 10,000/month free cap. Maps SDK, cached Geocoding, and session-based Autocomplete stay near $0.

---

## Phase 0 — Google Cloud Setup (Pre-work, ~1 day)

**Where:** Google Cloud Console (outside repo) → record output in `docs/maps-setup.md`

| Task | Detail |
|---|---|
| Create project | `speedymeals-prod` (+ separate `speedymeals-dev` for testing, keeps dev usage off prod billing/quota) |
| Enable billing | Required even for free-tier usage |
| Enable APIs | Maps SDK for Android, Maps SDK for iOS, Geocoding API, Places API (New), Distance Matrix API |
| Generate keys | 3 separate keys minimum: Android key, iOS key, Backend/server key |
| Restrict keys | Android → package name + SHA-1 cert fingerprint. iOS → bundle ID. Backend → server IP whitelist |
| Set budget alert | e.g. Rs. 20,000/month threshold, email notification |
| Store secrets | Backend key → `.env` / secrets manager, never committed. Mobile keys → platform-native config files, not hardcoded in Dart source |

**Exit criteria:** all 3 keys generated, restricted, budget alert active, keys stored (not committed to git).

---

## Phase 1 — Map Rendering Foundation (mobile_app)

**Goal:** map displays on screen with static markers. No live tracking yet, no backend calls yet.

**Where:** `mobile_app/lib/` — new module e.g. `lib/features/maps/`

**Steps:**
1. Add `google_maps_flutter` package to `pubspec.yaml`.
2. Android: insert Android key into `android/app/src/main/AndroidManifest.xml` meta-data tag.
3. iOS: insert iOS key into `ios/Runner/AppDelegate.swift` via `GMSServices.provideAPIKey()`.
4. Build a reusable `MapView` widget wrapping `GoogleMap()` — accepts a list of markers as input, used by both customer and rider apps.
5. Wire into customer app: **Step 4 (Set Delivery Address)** screen — show map with draggable pin for address confirmation.
6. Wire into rider app: not yet — this phase is customer-side pin-drop only.

**Exit criteria:** customer can open the app, see a map, drag a pin, and the app reads back a lat/lng.

**Cost:** $0 (Maps SDK always free).

---

## Phase 2 — Address Resolution (Geocoding)

**Goal:** convert pin-drop coordinates into a readable address string, and vice versa.

**Where:** `backend/` — new endpoint, e.g. `POST /api/geocode/reverse` and `POST /api/geocode/forward`

**Steps:**
1. Backend service wraps Google Geocoding REST endpoint (`maps.googleapis.com/maps/api/geocode/json`), using the backend key.
2. Reverse geocode: mobile app sends `{lat, lng}` after pin-drop → backend calls Google → returns formatted address string → shown to customer for confirmation before saving.
3. Cache: store resolved address string against the saved address record in `addresses` table, so the same address is never re-geocoded.
4. Mobile app calls this backend endpoint (never Google directly) — keeps the backend key server-side only.
5. Wire into customer app **Step 4** flow: after pin confirm → call reverse geocode → show address label → customer taps "Save as Home/Work/Other."

**Exit criteria:** saved addresses have both coordinates and a human-readable label, geocoded exactly once per address.

**Cost:** ~$0 at MVP volume (new addresses only, well under 10k free/month; repeat orders don't re-trigger this).

---

## Phase 3 — Address Autocomplete (Places)

**Goal:** faster address entry via search-as-you-type, as an alternative to manual pin-drop.

**Where:** `mobile_app/lib/features/maps/` — new widget, e.g. `AddressSearchField`

**Steps:**
1. Add `google_places_flutter` (or `flutter_google_places_sdk`) package.
2. **Session token handling is mandatory** — generate one session token when the user starts typing, reuse it for every keystroke request and the final Place Details call, discard it once a place is picked or the search is abandoned. This is what keeps Autocomplete free (session billing) instead of per-character billing.
3. On place selection: fetch lat/lng via Place Details, feed into the same reverse-geocode/save flow from Phase 2.
4. Wire into customer app **Step 4**: offer both entry paths — "Search address" (this phase) and "Drop pin on map" (Phase 1) — customer picks either.

**Exit criteria:** customer can type a partial address, select from suggestions, and have it resolve to saved coordinates — zero incremental cost if session tokens are correctly scoped.

**Cost:** $0 at MVP volume (session billing, free at all volumes when implemented correctly).

---

## Phase 4 — Distance-Based Delivery Fee (Distance Matrix)

**Goal:** calculate road distance between restaurant and customer at checkout, per the locked formula (Base Rs. 50 + Rs. 20/km).

**Where:** `backend/` — checkout/order-creation service, e.g. `backend/services/pricing/deliveryFee.ts` (or equivalent)

**Steps:**
1. Backend endpoint (called during **Step 8: Checkout**) takes restaurant coordinates (from restaurant profile) + confirmed customer delivery coordinates.
2. Calls Distance Matrix API (Legacy) server-side, using the backend key.
3. Computes `delivery_fee = 50 + (distance_km * 20)`, computes commission/rider-earning splits per Section 3 of the product spec.
4. Persists `delivery_distance_km` on the order record at creation — **never re-calls Distance Matrix for an existing order**, even if the app screen reloads. This single-call-per-order rule is what keeps this API's cost bounded and predictable.
5. Returns the price breakdown (food subtotal + delivery fee + total) to the mobile app for display before order confirmation.

**Exit criteria:** every order has a stored `delivery_distance_km` and fee snapshot; distance is never recalculated after order placement.

**Cost:** ~$25/month at 500 orders/day (15,000 calls/month, 5,000 over the 10k free cap × $5/1000).

---

## Phase 5 — Rider Live Location (Custom, not a Google API)

**Goal:** rider's live position streams to the customer's tracking screen and updates the map marker in real time.

**Where:** `backend/` (WebSocket/streaming layer) + `mobile_app/` (rider app sends, customer app receives)

**Steps:**
1. **Rider app** (background service while "Online" or on an active delivery): sends `{order_id, lat, lng, timestamp}` every 3–5 seconds via WebSocket (or lightweight POST if WebSocket infra isn't ready yet) to backend.
2. **Backend**: maintains rider's latest position — use Redis (or equivalent in-memory store) keyed by `rider_id`/`order_id`, not the main relational DB, to avoid write amplification from high-frequency pings.
3. **Backend**: exposes a subscription channel per active order (WebSocket room, or a service like Supabase Realtime / Firebase Realtime DB if you want to avoid rolling your own).
4. **Customer app**: on reaching **Step 10 (Track Order Live)** with status "Rider Assigned" or later, subscribes to that order's channel, receives position updates, moves the marker on the `MapView` widget built in Phase 1.
5. Subscription closes automatically on "Delivered" status or order cancellation — stop rider pings too, to avoid unnecessary battery drain and backend load.

**Exit criteria:** customer sees rider's marker move on the map roughly every 3–5 seconds during an active delivery; stream stops cleanly on delivery completion.

**Cost:** $0 in Google Maps billing terms — this is entirely your own infrastructure. Only cost impact on Google's side is indirect: more frequent map marker redraws on the customer's open map screen do not themselves trigger new billable Maps SDK events (SDK is unlimited/free), so this phase adds no Maps Platform cost.

---

## Phase 6 — Rider Navigation Hand-off

**Goal:** rider taps "Navigate" and gets turn-by-turn guidance to restaurant, then to customer.

**Where:** `mobile_app/lib/features/rider/` — navigation trigger on **Rider Journey Step 7 and Step 9**

**Steps (recommended, zero-cost approach):**
1. Add `url_launcher` package.
2. On "Navigate" tap, construct a Google Maps deep-link intent: `google.navigation:q=<lat>,<lng>` (Android) or the equivalent Apple Maps/Google Maps URL scheme on iOS.
3. This hands off to the user's installed Google Maps app for actual turn-by-turn — no Directions API call, no billing, and riders get Google's full live-traffic navigation experience (better than anything built in-house at MVP stage).

**Alternative (only if in-app route rendering is a hard product requirement):**
- Use Directions API (Legacy) server-side, draw the returned polyline on the in-app `MapView`. Adds ~$5/1000 calls cost and engineering overhead — not recommended for MVP.

**Exit criteria:** rider taps Navigate, external Maps app opens with correct destination pre-filled.

**Cost:** $0 (deep-link approach).

---

## Phase 7 — Admin Visibility (admin_web)

**Goal:** Admin can see rider locations and delivery distance/fee breakdowns per the Admin Journey (Section 10, Steps 5 and 9).

**Where:** `admin_web/` — Next.js dashboard, order detail view

**Steps:**
1. Reuse the Phase 5 backend subscription channel (or a simple polling endpoint) to show live rider positions on an admin map view — use `@react-google-maps/api` (React wrapper) with a web-restricted Maps JavaScript API key, or Maps Embed API if only a static/simple view is needed (also free).
2. Order detail page: display stored `delivery_distance_km` and fee breakdown from Phase 4 — read-only, no new API calls, since it's already persisted on the order.

**Exit criteria:** Admin can open an active order and see rider position + distance/fee breakdown without triggering any new billable Maps events.

**Cost:** Maps JavaScript API web map loads — free up to 10,000 loads/month (Essentials tier), trivial at admin-panel usage volume.

---

## Phase 8 — Testing & Cost Validation

**Where:** `docs/maps-testing.md` + Cloud Console billing dashboard

**Steps:**
1. Load-test checkout flow, confirm exactly one Distance Matrix call per order (check Cloud Console API metrics, not just app logs).
2. Confirm Autocomplete session tokens are actually reducing billing to session-rate, not per-character — verify in Cloud Console under Places API usage.
3. Confirm reverse-geocode is not re-triggered on repeat visits to a saved address.
4. Run one full day of test traffic on `speedymeals-dev` project, check the Cloud Console cost breakdown against the Phase-by-phase cost estimates above before going live on `speedymeals-prod`.
5. Confirm budget alert actually fires (test by temporarily lowering threshold).

**Exit criteria:** actual per-API costs during test traffic match projections within reasonable margin; budget alert confirmed functional.

---

## Summary Table

| Phase | Component | API(s) | Repo location | Cost impact |
|---|---|---|---|---|
| 0 | Cloud setup | — | Console + `docs/` | $0 |
| 1 | Map rendering | Maps SDK | `mobile_app/` | $0 |
| 2 | Address resolution | Geocoding | `backend/` | ~$0 |
| 3 | Address search | Places Autocomplete | `mobile_app/` | $0 (session billing) |
| 4 | Delivery fee calc | Distance Matrix | `backend/` | ~$25/mo @ 500 orders/day |
| 5 | Rider live tracking | Custom WebSocket | `backend/` + `mobile_app/` | $0 (not a Google API) |
| 6 | Rider navigation | Deep-link (no API) | `mobile_app/` | $0 |
| 7 | Admin visibility | Maps JS API / Embed | `admin_web/` | ~$0 |
| 8 | Testing | — | `docs/` | validation only |

**Total projected Maps Platform cost at MVP scale (~500 orders/day): ~$25/month**, concentrated entirely in Phase 4.

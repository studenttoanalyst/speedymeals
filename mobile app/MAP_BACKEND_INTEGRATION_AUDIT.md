# Flutter M1–M5 ↔ FastAPI Backend — Maps/Location Integration Audit

Audit date: 2026-09-28
Scope: `lib/`, `android/`, `ios/`, `test/` of the Speedy Meals Flutter app, compared against the
backend audit of `backend/app` (FastAPI + Postgres + Redis + Google Maps server-side).

This file was written **before any code change** (Phase 1). It records what exists today, what the
backend actually offers, and the change required. No Flutter file was modified during this audit.

---

## 0. Audit method

- Static inspection of every Dart file under `lib/` (65 files), `test/` (7 files), `pubspec.yaml`,
  `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle.kts`, `ios/Runner/Info.plist`,
  `ios/Runner/AppDelegate.swift`.
- Backend contracts taken from the backend audit of `backend/app` (routes, schemas, services) — not
  invented. Endpoint paths below are the ones the backend actually mounts.

---

## 1. Backend endpoints available for integration

| # | Endpoint | Method | Auth | Backend file |
|---|---|---|---|---|
| 1 | `/wallet/location` | PATCH | rider JWT (`require_role(["rider"])`) | `platform/wallet_payment/routes.py` |
| 2 | `/orders/{order_id}/rider-location` | GET | customer owner or admin | `modules/food_delivery/routes.py` |
| 3 | `/orders/{order_id}/track` | WS | customer/admin JWT as `?token=` query param | `modules/food_delivery/routes.py` |
| 4 | `/orders/{order_id}/track` | GET | customer owner | `modules/food_delivery/routes.py` |
| 5 | `/wallet/assignments` | GET | rider JWT | `platform/wallet_payment/routes.py` |
| 6 | `/users/me/addresses` (+`/{id}`) | GET/POST/PUT/DELETE | customer JWT | `platform/users/routes.py` |
| 7 | `/api/v1/location/places/autocomplete` | GET | **none (public)** | `platform/location/routes.py` |
| 8 | `/api/v1/location/places/details` | GET | **none (public)** | `platform/location/routes.py` |
| 9 | `/api/v1/location/reverse-geocode` | GET | **none (public, 20 req/min per IP)** | `platform/location/routes.py` |

Exact wire contracts (from the backend code):

```text
PATCH /wallet/location
  body: {"latitude": float -90..90, "longitude": float -180..180}   (rider id never in body)
  200:  {"rider_id": uuid, "lat": float, "lng": float, "updated_at": ISO-8601}
  404 rider row missing · 422 bounds · 503 Redis unavailable

GET /orders/{order_id}/rider-location
  200:  {"order_id": uuid, "latitude": float|null, "longitude": float|null, "updated_at": str|null}
        nulls when no rider assigned or the 45 s Redis TTL lapsed
  404 not found / other customer's order · 409 terminal order · 403 wrong role

WS /orders/{order_id}/track?token=<access JWT>
  frame 1 (immediately on accept): {"event":"location_update","data":{order_id,latitude,longitude,updated_at}}
  then one frame per Redis Pub/Sub message on channel order:location:{order_id}:
        {"event":"location_update","data":{order_id,latitude,longitude,updated_at}}
  on terminal order: {"event":"order_completed","detail":"…"} then close code 1000
  bad/missing/expired token or wrong owner: close code 4003

GET /orders/{order_id}/track
  200: {id,status,payment_method,food_subtotal,delivery_distance_km,delivery_fee,total_amount,
        restaurant_name,rider_name,rider_phone,placed_at,delivered_at,items[]}
  NOTE: contains **no coordinates of any kind**

POST /users/me/addresses
  body: {"latitude": float, "longitude": float, "label"?, "full_address"?, "is_default"?}

GET /api/v1/location/reverse-geocode?lat=&lng=
  200: {"formatted_address", "place_id", "components":{"street","neighborhood","city"}}
  404 ZERO_RESULTS · 429 rate limited · 503 outage

GET /api/v1/location/places/autocomplete?q=&session_token?
  200: [{"place_id", "description"}]

GET /api/v1/location/places/details?place_id=&session_token?
  200: {"place_id","formatted_address","lat","lng","components":{...}}
```

**Backend does NOT provide:** Directions/Routes, polyline, ETA/duration, restaurant coordinates in
any response, customer coordinates in tracking responses, or rider-facing delivery address/coordinates
on `GET /wallet/assignments`.

---

## 2. Flutter component audit

| # | Existing component | Current behavior | Backend endpoint required | Current status | Required change |
|---|---|---|---|---|---|
| 1 | `lib/core/config/api_config.dart` | base URL resolution: `--dart-define=API_BASE_URL` → release `https://api.speedymeals` → debug `10.0.2.2:8000` (Android) / `localhost:8000`. No WS URL helper. | — | OK, but WS URL missing | **ADD** `wsBaseUrl` + `orderTrackingSocketUri(orderId, token)` (http→ws, https→wss, same host). No behaviour change to existing HTTP resolution. |
| 2 | `lib/core/network/api_client.dart` | Single HTTP entry point. Attaches `Bearer` token, 20 s timeout (45 s upload), single-flight 401 refresh + one replay, maps failures to `ApiException`. | all REST | OK — **do not replace** | No change. All new REST calls go through it. |
| 3 | `lib/core/storage/token_storage.dart` | Secure-storage session: access + refresh token, role, subject, phone. | — | OK | No change. Supply the WS token from here. |
| 4 | `lib/features/maps/map_view.dart` | Reusable `MapView` (Google Maps SDK), markers, optional polylines, `fitBoundsOnMarkers`, graceful fallback builder. | — | OK (M1) | No change. |
| 5 | `lib/features/maps/map_markers.dart` | `MapMarkers.restaurant/customer/rider` factories. | — | OK (M1) | No change. |
| 6 | `lib/data/repositories/user_repository.dart` | Address CRUD over `/users/me/addresses` incl. required lat/lng. | #6 | OK (M2) | No change. |
| 7 | `lib/features/address/address_search_field.dart` | Address autocomplete via `google_places_flutter` using compile-time `PLACES_API_KEY` (`--dart-define`). Renders "Map services are not configured yet." when the key is empty. | #7/#8 (exists, but Flutter uses Google directly) | Works; client-side key | **KEEP AS IS.** Decision: M2 search stays on the existing Direct-Places path (client key, never the server key). Changing it would redesign the search field UI, which is out of scope. Documented as the chosen architecture for address *search*. |
| 8 | `lib/features/address/location_picker_screen.dart` | Pin-drop + "Use current location" produce coordinates only; address text falls back to a coordinate string. Explicit comment: "This screen does NOT perform reverse geocoding … deferred to a later phase." | #9 | Gap: no reverse geocoding | **ADD** backend reverse-geocode call after pin-drop / current-location so the confirmation bar shows a real address. No UI redesign (same widgets); failures fall back to the existing coordinate string. |
| 9 | `lib/features/address/selected_location.dart` | `SelectedLocation` (lat, lng, address?, placeId?) + `displayAddress`. | — | OK (M2) | No change. |
| 10 | `lib/data/models/rider_location.dart` | `RiderLocation` with strict coordinate validation, `tryFromJson`, `isStale`, and a **required** `riderId`. | #2 | Mostly OK; `riderId` is not in the real contract | **CHANGE** `riderId` to optional (`String?`) — the backend's rider-location response has no `rider_id` field (only `order_id`). Keep all validation. |
| 11 | `lib/data/repositories/rider_location_repository.dart` | `HttpRiderLocationRepository` calls **`GET /orders/{orderId}/track`** and only returns a value if that response happens to contain `rider_location` or flat `latitude`/`longitude`. | #2 | **WRONG ENDPOINT** | **CHANGE** to `GET /orders/{order_id}/rider-location`, parse `{order_id, latitude, longitude, updated_at}`, return `null` for documented null/404/409/error cases. |
| 12 | `lib/screens/tracking/order_tracking_screen.dart` | Polls `GET /orders/{id}/track` every 15 s; polls rider location every 8 s while a rider is assigned; keeps last known marker; single-flight guard; disposes timers. Map shows a rider marker at an interpolated midpoint when no location is known. | #2, #3, #4 | Polling works against the wrong rider-location endpoint; no WebSocket; fabricated rider marker | **CHANGE**: (a) consume the new repository contract, (b) add the WebSocket as preferred transport with REST polling as fallback, (c) render the rider marker **only** from a real backend/REST location. |
| 13 | WebSocket support | **None.** No `dart:io`/`web_socket_channel` usage anywhere in `lib/`. `AppConstants` comment says "The backend has no WebSockets or push (spec §14)". | #3 | Missing | **ADD** a small reusable `LiveLocationSocket` service (+ conditional `dart:io` transport) and wire it into the tracking screen. No new package dependencies. |
| 14 | `lib/services/rider_location_service.dart` | GPS permission + validated position stream (30 m distance filter, 15 s Android interval, high accuracy), injectable geolocator seams. | — | OK (M5) | No change. |
| 15 | `lib/services/rider_location_publisher.dart` | Throttled (30 s) single-flight publisher → `RiderRepository.updateLocation` → `PATCH /wallet/location`. Catches `ApiException` and keeps running. | #1 | **Already integrated** | No change needed; add test coverage for 401/5xx/timeout/concurrency. |
| 16 | `lib/data/repositories/rider_repository.dart` | `updateLocation()` → `PATCH /wallet/location` with `{latitude, longitude}` (rider id from token). | #1 | **Already integrated, contract-correct** | No change. |
| 17 | `lib/screens/rider/rider_dashboard_screen.dart` | 40 s TTL-refresh push while online; M5 active-delivery stream; map preview renders restaurant marker (falls back to Islamabad default), **customer marker at a fabricated +0.012° offset when the address is null**, rider marker from live GPS. | #1, #5 | Push works; map preview fabricates coordinates | **CHANGE** the preview only: draw the restaurant marker only when real coordinates exist, the customer marker only when the assignment carries a real address, and never invent an offset. Keep the rider marker (real GPS) and the M4 navigation hand-off untouched. |
| 18 | `lib/data/models/rider_models.dart` | `RiderAssignment` parses `restaurant_latitude/longitude` and `delivery_address`, but **no backend endpoint emits those fields**, so both are null in practice. | #5 | Model ahead of backend | **NO CODE CHANGE** (parsing already tolerates absence). Backend gap to be reported. |
| 19 | `lib/features/maps/rider_navigation_service.dart` | Validates coordinates, builds `google.navigation:` / `comgooglemaps://` / universal HTTPS URIs, graceful failure. | — | OK (M4) | No change. |
| 20 | `lib/features/maps/rider_navigation_section.dart` | Restaurant/Customer tabs, "unavailable" message when coordinates are null. | — | OK (M4) | No change. |
| 21 | `lib/data/repositories/order_repository.dart` | `track()` → `GET /orders/{id}/track`; checkout preview/place/history/reorder/rating. | #4 | OK | No change. |
| 22 | `lib/data/models/order_models.dart` | `OrderTracking` mirrors the backend response exactly (no coordinates). | #4 | OK, accurate | No change. |
| 23 | `lib/core/constants/app_constants.dart` | Order statuses / payment methods copied from the backend; `orderPollInterval` 15 s. | — | OK | Note: the `deliveryFeeBase`/`deliveryFeePerKm` display fallbacks (50/20) do **not** match the backend's real formula (100 + 25/km) — backend-authoritative values are always used for money, so this is display-only drift. Reported, not "fixed" (money must keep coming from the server). |
| 24 | `test/maps_m1..m5_test.dart`, `test/critical_flows_test.dart` | 77 tests. M3 repository tests assert the **old** `/orders/{id}/track` rider-location contract. | — | Passing but asserting a wrong contract | **UPDATE** the M3 repository tests to the dedicated endpoint; **ADD** a backend-integration test file. No test deleted, no unrelated test weakened. |
| 25 | `android/app/src/main/AndroidManifest.xml` | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `INTERNET`; `com.google.android.geo.API_KEY = ${MAPS_API_KEY}`; cleartext allowed only for `10.0.2.2`, `localhost`, `127.0.0.1`. | — | OK (M1/M5) | No change. |
| 26 | `android/app/build.gradle.kts` | `manifestPlaceholders["MAPS_API_KEY"]` from gitignored `android/local.properties` / env var; debug signing. | — | OK | No change. |
| 27 | `ios/Runner/Info.plist` / `AppDelegate.swift` | `GoogleMapsAPIKey = $(GOOGLE_MAPS_API_KEY)`, conditional `GMSServices.provideAPIKey`, `NSLocation*UsageDescription`, `UIBackgroundModes=location`, `NSAllowsLocalNetworking`. | — | OK | No change. |
| 28 | `lib/screens/profile/saved_addresses_screen.dart` | Address list/add via `/users/me/addresses`; GPS or typed coordinates; never fabricates. | #6 | OK (M2) | No change. |
| 29 | `lib/data/repositories/location_repository.dart` | **Does not exist.** | #7/#8/#9 | Missing | **ADD** a thin repository over the three location-proxy endpoints (used by the picker's reverse geocoding; available for later use). |

---

## 3. Gaps this integration cannot close (backend limitations)

Confirmed from the backend audit — these are **BLOCKED**, not "to be faked":

1. **Directions/Routes/polyline/ETA** — not implemented server-side. M4 keeps external Google Maps
   hand-off; no in-app route is drawn. No ETA is computed.
2. **Restaurant coordinates in any API response** — so the customer map's restaurant marker and the
   rider's restaurant destination cannot come from real data. M4's "Navigate to restaurant" therefore
   reports "destination unavailable" against the live backend.
3. **Customer/delivery coordinates in tracking or rider assignment responses** — the customer map's
   delivery pin and the rider's customer pin have no real source.
4. **`GET /wallet/assignments` returns no address and no restaurant coordinates** — the rider UI cannot
   display a real address for a job.

Because of (2) and (3), the existing M1 map views keep their documented placeholder pins; what this
integration removes is the *fabrication* of a rider position and of a customer offset.

## 4. Security constraints observed during the audit

- No `AIza…` literal, backend host, JWT, password, or database URL exists anywhere in `lib/`,
  `android/`, or `ios/` (Phase 12 re-verified after the changes).
- The backend `GOOGLE_MAPS_API_KEY` is never referenced by Flutter; Flutter keeps its own
  `MAPS_API_KEY` (native manifest placeholder) and `PLACES_API_KEY` (`--dart-define`).
- The JWT used for the WebSocket travels in the query string because that is the backend's existing
  contract; it is never logged (the socket logs the path only).

## 5. Resulting change list (what Phase 2–13 will do)

| File | Change |
|---|---|
| `lib/core/config/api_config.dart` | add `wsBaseUrl` + `orderTrackingSocketUri` |
| `lib/data/models/rider_location.dart` | `riderId` becomes optional |
| `lib/data/repositories/rider_location_repository.dart` | use `GET /orders/{id}/rider-location` |
| `lib/services/location_socket_transport.dart` | **new** transport abstraction |
| `lib/services/websocket_connector.dart` / `_io.dart` / `_stub.dart` | **new** conditional `dart:io` connector |
| `lib/services/live_location_socket.dart` | **new** reusable WS service |
| `lib/data/repositories/location_repository.dart` | **new** backend places/reverse-geocode proxy |
| `lib/screens/tracking/order_tracking_screen.dart` | WS + polling fallback; real rider marker only |
| `lib/screens/rider/rider_dashboard_screen.dart` | stop fabricating map coordinates |
| `lib/features/address/location_picker_screen.dart` | backend reverse geocoding for pin-drop/current location |
| `test/maps_m3_test.dart` | update rider-location repository tests to the real endpoint |
| `test/maps_backend_integration_test.dart` | **new** upload / tracking / WebSocket coverage |

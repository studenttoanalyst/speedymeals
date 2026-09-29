# Maps + Backend Integration Final Report

Date: 2026-09-28
App: `speedy_meals` (Flutter 3.47.2 / Dart 3.13.2, Android + iOS)
Backend: existing FastAPI app (`backend/app`) — **no backend file was modified**
Companion document: `MAP_BACKEND_INTEGRATION_AUDIT.md`

---

## 1. Overall Status

**PASS WITH LIMITATIONS**

Reason: every Flutter↔backend contract that this phase was asked to connect is implemented and
verified by automated tests (107/107), including a real WebSocket round-trip against a local server
speaking the backend's exact frame format. What is **not** verified is the live end-to-end run
against a running FastAPI instance and on a physical device: the backend API was not listening on
this machine (Postgres and Redis were, port 8000 was not) and no Android/iOS device or emulator is
attached. Those two items are reported as BLOCKED/UNVERIFIED below, not claimed as working.

---

## 2. M1 — Map Rendering

**PASS**

Evidence:
- `lib/features/maps/map_view.dart` and `map_markers.dart` unchanged; still used by customer tracking,
  the address picker and the rider dashboard (no second map implementation).
- `test/maps_m1_test.dart` — 5/5 pass.
- Full `flutter test` suite green (107/107), `flutter analyze` clean, `flutter build apk --debug`
  succeeded (`√ Built build\app\outputs\flutter-apk\app-debug.apk`, 121.2 s).

## 3. M2 — Address / Places

**PARTIAL**

Evidence:
- Address **autocomplete** intentionally stays on the existing direct `google_places_flutter` path
  with the client-side `PLACES_API_KEY` (`lib/features/address/address_search_field.dart`). Decision
  and rationale are recorded in the audit: replacing that widget would redesign the search UI, and
  the architecture brief explicitly permits Flutter's own client Places key. No server key is used.
- **New**: pin-drop and "use current location" now resolve a readable address through the **backend**
  proxy `GET /api/v1/location/reverse-geocode` (new `LocationRepository`, wired in
  `LocationPickerScreen`). The old code did no reverse geocoding at all. On 404/429/503/offline it
  silently keeps the coordinate-string label — no crash, no fabricated address.
- Address persistence still uses the existing `POST /users/me/addresses` with real lat/lng
  (`lib/data/repositories/user_repository.dart`, unchanged).
- `test/maps_backend_integration_test.dart` D1–D4 verify the proxy paths, the `lat`/`lng` query
  parameters, the parsed components, that **no** `Authorization` header is sent to the public
  endpoints, and that failures degrade to `null`.
- Why PARTIAL: `test/maps_m2_test.dart` (6/6) still passes, but the address→map flow cannot be shown
  end-to-end without a real Places/Maps key on device.

## 4. M3 — Customer Rider Tracking

**PASS**

Evidence:
- **Corrected endpoint**: `HttpRiderLocationRepository` previously called `GET /orders/{id}/track`
  and hoped for a `rider_location` object that the backend never sends. It now calls the dedicated
  `GET /orders/{order_id}/rider-location` and parses the documented
  `{order_id, latitude, longitude, updated_at}` (no `rider_id` is assumed — the model's `riderId` is
  now optional).
- **Live WebSocket added** as the preferred transport (`WS /orders/{id}/track?token=…`) with REST
  polling as the fallback; polling pauses while live frames flow and resumes immediately when the
  socket drops.
- Screen lifecycle preserved: single-flight poll guard, poll stop on terminal status, poll stop when
  the order has no rider, timers cancelled and socket closed on `dispose()`, last-known marker kept,
  camera never re-centred (`fitBoundsOnMarkers: false`).
- The rider marker is now drawn **only** from a real backend coordinate; the previous interpolated
  "midpoint" rider position is gone.
- Tests: `test/maps_m3_test.dart` (19/19, updated to the real contract) + `test/maps_backend_integration_test.dart`
  B1–B6 (200 valid, null-coordinates, stale timestamp, malformed/out-of-range, 401/403/404/409/422/429/500/503,
  timeout, network) and E1–E2 (live frame pauses polling; drop resumes polling).
- Unchanged limitation: the customer map's restaurant and delivery pins have **no** backend source
  (see §12) and remain the documented M1 placeholders.

## 5. M4 — Rider Navigation

**PASS (code unchanged) — live-data result UNVERIFIED**

Evidence:
- `lib/features/maps/rider_navigation_service.dart` and `rider_navigation_section.dart` were not
  modified. External Google Maps hand-off, native/HTTPS URI fallbacks, lifecycle destination rules
  and the "destination unavailable" path are intact.
- `test/maps_m4_test.dart` — 18/18 pass.
- No Directions/Routes/polyline/ETA code was added (backend does not implement any of it).
- UNVERIFIED: against the live backend, `GET /wallet/assignments` returns **no** restaurant
  coordinates and **no** delivery address, so both navigation buttons correctly report
  "destination location is unavailable" rather than navigating. This is a backend data gap, not a
  client regression. No coordinates were invented to hide it.

## 6. M5 — Rider GPS Publishing

**PASS**

Evidence:
- Already wired to `PATCH /wallet/location` via `RiderRepository.updateLocation` with body
  `{latitude, longitude}` (rider id from the token, never the body) — verified by HTTP capture in
  test A1, which asserts the method, path, exact body and `Authorization: Bearer …` header.
- Validation: `RiderLocationService.isValidCoordinate` (±90/±180, NaN, ±Infinity); A2 proves the
  publisher drops invalid readings without any request being made.
- Throttle (30 s), 30 m distance filter, and single-flight guard preserved; A7 proves concurrent
  uploads are prevented (one request for three positions).
- Failure handling: A4/A5 confirm 401/403/404/422/429/500/503 → the shared `ApiException` kinds
  (`unauthorized`, `forbidden`, `notFound`, `validation`, `rateLimited`, `server`, `unavailable`),
  timeout → `timeout`, `ClientException` → `network`. A6 proves a persistently failing upload never
  terminates tracking.
- `test/maps_m5_test.dart` — 22/22 pass (unchanged) plus the M6 regression test.
- Background GPS remains **unproven** — see §12.

## 7. Backend API Integration

Endpoints actually integrated from Flutter (no invented endpoints):

| Endpoint | Method | Where | Auth | Verified by |
|---|---|---|---|---|
| `PATCH /wallet/location` | PATCH | `RiderRepository.updateLocation` ← `RiderLocationPublisher` | rider Bearer JWT | A1, A3, A6, A7 (+ mocked `RiderLocationPublisher` in M5 tests) |
| `GET /orders/{order_id}/rider-location` | GET | `HttpRiderLocationRepository.getRiderLocation` | customer/admin JWT | B1–B6, E2, M3 tests |
| `WS /orders/{order_id}/track?token=` | WS | `LiveLocationSocket` ← `OrderTrackingScreen` | JWT query param | C1–C11, E1, E2 |
| `GET /orders/{order_id}/track` | GET | `OrderRepository.track` (existing) | customer JWT | M3 screen tests (unchanged) |
| `GET/POST/PUT/DELETE /users/me/addresses` | REST | `UserRepository` (existing) | customer JWT | existing M2/screen tests (unchanged) |
| `GET /api/v1/location/reverse-geocode` | GET | `LocationRepository.reverseGeocode` ← `LocationPickerScreen` | public | D1, D2 |
| `GET /api/v1/location/places/autocomplete` | GET | `LocationRepository.autocompletePlaces` | public | D3 |
| `GET /api/v1/location/places/details` | GET | `LocationRepository.placeDetails` | public | D3, D4 |

Not integrated (and not faked): Directions/Routes/polyline/ETA, restaurant coordinates, customer
coordinates in tracking, rider-facing delivery address. All four are missing from the backend.

## 8. WebSocket

**PASS (client + transport contract) / UNVERIFIED against a live backend**

Actual result:
- `lib/services/live_location_socket.dart` + conditional `dart:io` transport
  (`websocket_connector_io.dart` / `_stub.dart`) — **no new package dependency was added**.
- Parses exactly the backend's two frames: `location_update` (data → validated coordinates) and
  `order_completed` (terminal → close, no reconnect). Unknown events and malformed frames are
  ignored.
- Duplicate connections prevented (C8: three `connect` calls → one socket; C9: changing order closes
  the previous socket). Bounded reconnects (C6), no reconnect after completion (C4), no-token case
  never opens a socket (C10).
- **Real transport test (C11)**: a local `HttpServer` with `WebSocketTransformer.upgrade` speaking the
  backend's exact frames — verified path `/orders/ord-io/track`, `token` query parameter, frame
  parsing, and the completion close. This exercises the real `dart:io` WebSocket, not a mock of our
  own service.
- UNVERIFIED: no live FastAPI instance was available to confirm Redis Pub/Sub delivery end-to-end
  (see §10).

## 9. Automated Tests

| Check | Result |
|---|---|
| `flutter clean` / `flutter pub get` | succeeded (`Got dependencies!`) |
| `flutter analyze` | **No issues found!** (0 errors, 0 warnings, 0 infos) |
| `flutter test` | **All tests passed! — 107 passed, 0 failed, 0 skipped** |
| Test count before → after | 77 → **107** (+30 new integration tests; no test deleted) |
| `flutter build apk --debug` | **PASS** — `√ Built build\app\outputs\flutter-apk\app-debug.apk` (121.2 s) |
| iOS build | **NOT RUN** — no macOS/Xcode in this environment |

Per-suite counts (all passing): `critical_flows` 6 · `maps_m1` 5 · `maps_m2` 6 · `maps_m3` 19 ·
`maps_m4` 18 · `maps_m5` 22 · `maps_backend_integration` 30 · `widget_test` 1.

New coverage added in `test/maps_backend_integration_test.dart`:
- Rider upload: real HTTP contract, invalid/hostile coordinates, 401/403/404/422/429/500/503 mapping,
  timeout, network failure, upload keeps running after failures, single-flight concurrency.
- Customer tracking: valid, null, stale, malformed, every documented failure status, timeout, network.
- WebSocket: connect + auth, initial frame, update frame, completion, malformed/unknown frames,
  disconnect + reconnect, bounded retries, failed connect, duplicate prevention, order switching,
  no-session, real `dart:io` round-trip.
- Location proxy: reverse geocode, places autocomplete/details, unauthenticated requests, failure
  degradation.
- Screen: goes live on a WS frame and pauses polling; falls back to polling on drop; clean disposal.

## 10. Real Device Test

**NOT PERFORMED — BLOCKED**

Evidence gathered:
- `flutter devices` → only `Windows (desktop)`, `Chrome (web)`, `Edge (web)`. No Android/iOS device.
- `adb devices` → empty list ("List of devices attached" with no entries).
- No emulator was started (none was claimed to exist).

Also blocking the Phase 14 live flow:
- `curl http://localhost:8000/health` → **HTTP 000 (connection refused)** — the FastAPI app was not
  running.
- `netstat` shows PostgreSQL `:5432` and Redis `:6379` **listening**, so only the API process was
  missing. Starting it would have required running migrations against the configured database, which
  is outside this task's read-only/verification scope and was not done.

Therefore **none** of Test A (rider GPS → Redis), Test B (WebSocket live tracking), Test C (polling
fallback against the live backend) or Test D (navigation with live assignment data) was executed
end-to-end. They are contract-verified in code and tests only.

## 11. Security

| Check | Result |
|---|---|
| Google API key literal (`AIza…`) in `lib/`, `android/`, `ios/`, `test/` | **None** — the only matches are documentation comments showing the `--dart-define` placeholder form |
| Backend server key (`GOOGLE_MAPS_API_KEY` semantics) inside Flutter | **Not present as a value.** No `.env`, no backend URL, no server credential is bundled |
| JWT / token logging | **None.** `LiveLocationSocket` logs the order id only; `ApiConfig.redact()` exists for safely logging a socket URI. The `accessToken` is read but never printed |
| Passwords / database URLs / Redis credentials in Flutter | **None found** |
| Secrets hardcoded in feature screens | **None** — every request goes through the single `ApiClient` and `ApiConfig.baseUrl`/`wsBaseUrl` |
| Fake rider coordinates / fake backend responses | Removed: no interpolated rider position, no +0.012° customer offset, no mocked production responses. Tests use a local server/fake *transport*, never fake production data |

One **finding to flag (not a leak)**: `ios/Runner/Info.plist` reads the Maps SDK key from an Xcode
build setting literally named `$(GOOGLE_MAPS_API_KEY)` — the same name as the backend's server-side
Distance Matrix/Geocoding key. No value is committed (the setting is empty unless a developer fills
it in), but the name collision is a foot-gun: a developer could paste the backend key there. Not
changed here because it requires an unverifiable Xcode/`project.pbxproj` edit; recommended follow-up
is to rename it to `MAPS_SDK_API_KEY`/`MAPS_CLIENT_KEY` and document that it must be a
platform-restricted client key.

## 12. Known Limitations

Only confirmed limitations:

1. **No live end-to-end verification.** The FastAPI app was not running locally and no device/emulator
   is attached, so rider→Redis→WebSocket→customer movement was never observed live (§10).
2. **Backend does not expose restaurant or customer/delivery coordinates** in any response
   (`GET /orders/{id}/track`, `GET /orders/{id}/rider-location`, `GET /wallet/assignments`). The
   customer map's restaurant/delivery pins and the rider's restaurant/customer destinations therefore
   remain placeholders/“unavailable”; no coordinates were invented.
3. **No Directions/Routes/polyline/ETA** anywhere — in-app routing is not implemented, by design
   (`MAPS_PLAN`/backend audit).
4. **M2 address search still requires a client `PLACES_API_KEY`**; without it the field renders the
   existing "Map services are not configured yet." placeholder (pre-existing behaviour).
5. **Background GPS is not claimed.** Android declares `ACCESS_BACKGROUND_LOCATION` without a
   foreground-service notification and the iOS background mode capability is a manual Xcode step;
   neither was verified on a device.
6. **Decorative rider pin on the customer map.** The stylised overlay pin at a fixed screen position
   (part of the original M1 design) still renders when a rider is assigned; it is a design element,
   not a geo-coordinate. The *map marker* is strictly real-data-driven.
7. **WebSocket requires a raw socket.** On Flutter web the transport stub reports unavailable, so web
   builds automatically use REST polling only.
8. **Reconnect budget is per tracking session**, reset only when a real location frame arrives; after
   the budget is exhausted the client stays on REST polling (by design).
9. **Display-only fee constants drift**: `AppConstants.deliveryFeeBase/PerKm` (50/20) do not match the
   backend's real formula (100 + 25/km). Money always comes from the backend, so this affects
   placeholders only — reported, not silently changed.
10. **`docs/maps-status.md`** previously stated that no rider-location endpoint and no WebSocket
    exist; a new M7 section was appended to record the integration.

## 13. Files Changed

Modified:
- `lib/core/config/api_config.dart` — added `wsBaseUrl`, `orderTrackingSocketUri()`, `redact()`
- `lib/data/models/rider_location.dart` — `riderId` now optional (the endpoint sends none)
- `lib/data/repositories/rider_location_repository.dart` — now uses `GET /orders/{id}/rider-location`
- `lib/screens/tracking/order_tracking_screen.dart` — WebSocket + polling fallback, real rider marker
- `lib/screens/rider/rider_dashboard_screen.dart` — no fabricated restaurant/customer coordinates
- `lib/features/address/location_picker_screen.dart` — backend reverse geocoding for pin-drop/GPS
- `test/maps_m3_test.dart` — repository tests updated to the correct endpoint contract
- `docs/maps-status.md` — appended Phase M7 integration record

Created:
- `lib/services/location_socket_transport.dart` — transport abstraction
- `lib/services/websocket_connector.dart` / `websocket_connector_io.dart` / `websocket_connector_stub.dart`
- `lib/services/live_location_socket.dart` — reusable live-tracking WebSocket service
- `lib/data/models/location_models.dart` — proxy response models
- `lib/data/repositories/location_repository.dart` — backend places/reverse-geocode client
- `test/maps_backend_integration_test.dart` — 30 integration tests
- `MAP_BACKEND_INTEGRATION_AUDIT.md` — Phase 1 audit
- `MAP_BACKEND_INTEGRATION_FINAL_REPORT.md` — this report

**No backend file, database schema, migration, or environment file was modified. No package was added.**

## 14. Final Recommendation

**READY WITH LIMITATIONS**

The client-side integration is complete and verified against the backend's real contracts (107/107
tests, analyzer clean, Android debug APK builds). It is not certified as a finished live feature
because the live backend run and the physical-device run could not be performed in this environment,
and because three map elements (restaurant pin, delivery pin, rider navigation destinations) have no
backend data source yet. Those items must be closed before this is treated as production-ready.

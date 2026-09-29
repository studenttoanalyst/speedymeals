# Google Maps Platform — Mobile App Status

## Audit & Integration Date

2026-09-26

## Project

Speedy Meals Flutter Mobile App

## M0 Status

COMPLETE WITH MANUAL ACTIONS

## Flutter Package Status

| Package | Status | Version | Purpose |
|---|---|---|---|
| google_maps_flutter | Present | 2.18.2 (`^2.18.2` in `pubspec.yaml`) | In-app Google Map rendering widget for customer and rider screens (Phase M1) |
| google_places_flutter | Missing | None | Address autocomplete search field (Phase M2) |
| flutter_polyline_points | Missing | None | Polyline decoding (route display) (Phase M2/M3) |
| geolocator | Present | 14.0.3 (`^14.0.3` in `pubspec.yaml`) | Device GPS location acquisition (used in `SavedAddressesScreen` and `RiderDashboardScreen`) |
| location | Missing | None | Alternative location package (not used; `geolocator` is used) |
| url_launcher | Missing | None | External navigation hand-off (`google.navigation:q=` / Apple Maps) (Phase M4) |

### Additional Relevant Packages Discovered
- `flutter_secure_storage: ^11.1.1` (resolved `11.1.1`): Secure token storage
- `http: ^1.6.0`: REST API networking client (`ApiClient`)

## Android Configuration

### Application ID

`com.example.speedy_meals` (verified in `android/app/build.gradle.kts`)

### Google Maps API Key Reference

Configured via Gradle manifest placeholder `${MAPS_API_KEY}` in `AndroidManifest.xml`, loaded securely from `android/local.properties` (key `MAPS_API_KEY`) or environment variable `MAPS_API_KEY`. Defaults to empty string when not provided.

### Key Storage Method

Gradle `manifestPlaceholders["MAPS_API_KEY"]` in `android/app/build.gradle.kts` sourced from `local.properties` (gitignored).

### SHA-1

- **Debug Keystore SHA-1 (Verified):**
  `74:3B:1C:A3:C5:18:85:E3:AE:32:98:91:25:E0:A2:79:46:F7:B4:7C`
  - Keystore path: `~/.android/debug.keystore`
  - Alias: `androiddebugkey`
  - SHA-256: `64:AD:C1:66:80:CB:A1:8C:A6:EF:B2:FE:10:F0:54:69:B3:C2:63:78:6B:15:45:0C:C1:78:65:2D:BB:FB:7A:01`
- **Release Keystore SHA-1:**
  `SHA-1: Not determined` (no production keystore or `key.properties` exists; release builds currently sign with debug keys per `build.gradle.kts`)

### AndroidManifest Configuration

- `<meta-data android:name="com.google.android.geo.API_KEY" android:value="${MAPS_API_KEY}" />`: Present
- Cleartext traffic: Configured via `android:networkSecurityConfig="@xml/network_security_config"` permitting cleartext HTTP only to `10.0.2.2`, `localhost`, and `127.0.0.1`

### Location Permissions

Present:
- `android.permission.ACCESS_FINE_LOCATION` (Present in `android/app/src/main/AndroidManifest.xml`)
- `android.permission.ACCESS_COARSE_LOCATION` (Present in `android/app/src/main/AndroidManifest.xml`)
- `android.permission.INTERNET` (Present in `android/app/src/main/AndroidManifest.xml`)

## iOS Configuration

### Bundle Identifier

`com.example.speedyMeals` (verified in `ios/Runner.xcodeproj/project.pbxproj` under `PRODUCT_BUNDLE_IDENTIFIER`)

### Google Maps API Key Reference

Configured in `ios/Runner/AppDelegate.swift` calling `GMSServices.provideAPIKey(mapsApiKey)` when `GoogleMapsAPIKey` is supplied in `Info.plist` or via `$(GOOGLE_MAPS_API_KEY)` build setting.

### Key Storage Method

`Info.plist` key `GoogleMapsAPIKey` mapped to `$(GOOGLE_MAPS_API_KEY)` build setting.

### AppDelegate Configuration

Configured with `import GoogleMaps` and conditional initialization guarded against empty or unexpanded variables.

### Location Permissions

Present (verified in `ios/Runner/Info.plist`):
- `NSLocationWhenInUseUsageDescription`: Present ("Speedy Meals uses your location to show nearby restaurants, set your delivery address, and (for riders) to receive nearby delivery orders.")
- `NSLocationAlwaysAndWhenInUseUsageDescription`: Present ("Speedy Meals uses your location to show nearby restaurants and (for riders) to receive delivery orders while online.")
- `NSAppTransportSecurity` / `NSAllowsLocalNetworking`: Present (`true`)

## Existing Google Maps Integration

- **Map Rendering:** Implemented via reusable `MapView` widget (`lib/features/maps/map_view.dart`).
- **Address Autocomplete:** None (Phase M2).
- **Location Services:** `geolocator: ^14.0.3` is used in:
  - `lib/screens/profile/saved_addresses_screen.dart` to fetch the device's current GPS position (`Geolocator.getCurrentPosition()`) and fill coordinates into the address form.
  - `lib/screens/rider/rider_dashboard_screen.dart` to fetch the rider's current position and send it to the backend via `RiderRepository.updateLocation(...)`.
- **Coordinate Data Models:**
  - `Address` (`lib/data/models/user_models.dart`): includes `double latitude` and `double longitude`.
  - `RiderLocation` (`lib/data/models/rider_models.dart`): includes `double latitude` and `double longitude`.
  - `ActiveDeliveryOrder` (`lib/data/models/rider_models.dart`): includes `restaurantLatitude` and `restaurantLongitude`.
- **Navigation Hand-off:** None (Phase M4).

## Backend Key Separation

- **Separation Status:** CONFIRMED.
- The server-side Distance Matrix API key is defined in `backend/app/core/config.py` (`GOOGLE_MAPS_API_KEY: str`) and consumed exclusively in `backend/app/core/maps_client.py` for calling `https://maps.googleapis.com/maps/api/distancematrix/json`.
- The mobile application (`lib/`, `android/`, `ios/`) does not contain, reference, or import the backend Distance Matrix key or backend code.
- Only a dummy placeholder (`GOOGLE_MAPS_API_KEY=dummy`) exists in local `.env` files for the backend service. No live or backend secrets are leaked into the mobile application.

---

## Phase M1 — Map Rendering

### Status

COMPLETE WITH MANUAL ACTIONS

### Package

google_maps_flutter: 2.18.2 (`^2.18.2` added to `pubspec.yaml`, resolved in `pubspec.lock`)

### Reusable Map Component

`mobile_app/lib/features/maps/map_view.dart` (exported via `lib/features/maps/maps.dart`)

The reusable `MapView` component supports:
- Initial camera position and zoom configuration (`initialPosition`, `initialZoom`, safe default: Islamabad `33.6844, 73.0479`)
- Multiple marker rendering (`Set<Marker>`)
- Optional polyline rendering (`Set<Polyline>`)
- Map callbacks (`onMapCreated`, `onTap`, `onLongPress`, `onCameraMove`, `onCameraIdle`)
- Multi-marker auto-bounds fitting (`fitBoundsOnMarkers`)
- Graceful error boundary fallback (`fallbackBuilder`) ensuring the app never crashes when platform map views or keys are uninitialized
- Map styling and border radius clipping (`borderRadius`, `padding`, `mapType`)

### Customer Integration

`mobile_app/lib/screens/tracking/order_tracking_screen.dart`
- Integrated `MapView` as the base map layer inside the customer order tracking view (`_MapView`).
- Renders static restaurant pin (`MapMarkers.restaurant`), customer destination pin (`MapMarkers.customer`), and rider marker (`MapMarkers.rider` when rider is assigned).
- Gracefully falls back to existing themed grid overlay if native map rendering is uninitialized or unsupported.
- Zero disruption to existing customer tracking layout, progress bar, order items, or chat drawers.

### Rider Integration

`mobile_app/lib/screens/rider/rider_dashboard_screen.dart`
- Integrated `MapView` into `_AssignmentCard` inside `_buildMapPreview()`.
- Renders static restaurant pin (`MapMarkers.restaurant`) and customer delivery pin (`MapMarkers.customer`) with automatic camera bounds fitting.
- Completely contained within the card without altering rider status actions, wallet, or document flows.

### Marker Support

Implemented via `MapMarkers` factory helper (`mobile_app/lib/features/maps/map_markers.dart`):
- `MapMarkers.restaurant(...)`: Red hue pin with restaurant name and address.
- `MapMarkers.customer(...)`: Azure hue pin with delivery destination details.
- `MapMarkers.rider(...)`: Orange hue pin with rider name and label.
- Supports tap callbacks and info window configuration.

### Polyline Rendering Support

Implemented at the component level:
- `MapView` exposes `polylines: Set<Polyline>` accepting standard Google Maps polyline configurations.
- Route calculation, navigation polylines, and Directions API were intentionally NOT implemented in M1 per plan specifications (belonging to subsequent phases).

### API Key Status

Real Android/iOS Google Cloud keys are not yet configured.
- Android: Secure placeholder `${MAPS_API_KEY}` integrated in `AndroidManifest.xml` via `build.gradle.kts`. Developers configure their key in `android/local.properties` (e.g. `MAPS_API_KEY=AIzaSy...`).
- iOS: Configuration hook `GMSServices.provideAPIKey` integrated in `AppDelegate.swift` via `Info.plist` key `GoogleMapsAPIKey` (`$(GOOGLE_MAPS_API_KEY)`).

### Validation

- flutter pub get: PASS (Resolved 11 new packages cleanly)
- flutter analyze: PASS (No issues found in `speedy_meals` project)
- flutter test: PASS (12/12 unit and widget tests passed, including `test/maps_m1_test.dart`)
- Android build: PASS (`gradlew.bat assembleDebug --dry-run` succeeded; `import java.util.Properties` fix applied for AGP 9 Kotlin DSL sandbox compatibility)
- Real Google Maps runtime test: REQUIRES API KEYS (Code-level verification complete; runtime tile streaming requires active Google Cloud keys)

### Manual Actions Remaining

1. Log in to Google Cloud Console for Speedy Meals.
2. Enable:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
3. Create Android restricted key:
   - Package name: `com.example.speedy_meals`
   - Debug SHA-1: `74:3B:1C:A3:C5:18:85:E3:AE:32:98:91:25:E0:A2:79:46:F7:B4:7C`
   - Add to `android/local.properties`: `MAPS_API_KEY=AIza...`
4. Create iOS restricted key:
   - Bundle Identifier: `com.example.speedyMeals`
   - Set in Xcode build settings or pass via `--dart-define=GOOGLE_MAPS_API_KEY=AIza...`

### M1 Scope Confirmation

M2+ features such as autocomplete, pin drop, rider live tracking, navigation, background GPS, and Directions API were NOT implemented.

---

## Security Notes

- Never commit unrestricted Google API keys.
- Never expose complete API keys in documentation or logs.
- Android and iOS keys should use platform-specific restrictions.
- Backend Distance Matrix credentials must remain server-side.
- Do not place backend secrets inside the Flutter application.

## M1 Exit Criteria

**COMPLETE WITH MANUAL ACTIONS**

**Reason:**
Phase M1 Map Rendering is fully implemented in code. The reusable `MapView` component and `MapMarkers` factory are active and integrated in both Customer and Rider screens. Android and iOS native configurations are prepared cleanly without fake credentials. All automated tests and static analysis pass with 0 warnings. Real Google Maps rendering against Google's production SDK awaits developer key provisioning in Google Cloud Console.

---

## Phase M2 — Address Capture

### M2 STATUS

**COMPLETE WITH MANUAL ACTIONS**

### Selected Places Package & Version
- `google_places_flutter: ^2.1.1` (resolved `2.1.1`)

### Files Created
- `lib/features/address/selected_location.dart`
- `lib/features/address/address_search_field.dart`
- `lib/features/address/location_picker_screen.dart`
- `lib/features/address/address.dart`
- `test/maps_m2_test.dart`

### Files Modified
- `pubspec.yaml` (added `google_places_flutter: ^2.1.1`)
- `lib/screens/profile/saved_addresses_screen.dart` (integrated "Pick on Map" button)
- `mobile_app/docs/maps-status.md`

### Address Search & Autocomplete Implementation
- Implemented via `AddressSearchField` wrapping `GooglePlaceAutoCompleteTextField`.
- Reads `PLACES_API_KEY` from `--dart-define=PLACES_API_KEY=AIza...`.
- Debounced (800ms) to prevent excessive API requests.
- Renders fallback placeholder ("Map services are not configured yet.") when no API key is provided.
- Emits clean `SelectedLocation` on suggestion selection.

### Pin-Drop Implementation
- Customer taps on `MapView` in `LocationPickerScreen`.
- Marker moves immediately to tapped coordinates.
- Selected latitude and longitude captured; address text defaults to formatted coordinates (`${lat}, ${lng}`).
- No direct Geocoding API calls from Flutter client (deferred to later phase).

### Selected Location Model
- `SelectedLocation` (`lib/features/address/selected_location.dart`):
  - `latitude`: `double` (required)
  - `longitude`: `double` (required)
  - `address`: `String?` (optional, from Places autocomplete)
  - `placeId`: `String?` (optional, from Places autocomplete)
  - `displayAddress`: getter returning formatted address or coordinate string fallback.

### Session-Token Handling
- Deferred. `google_places_flutter` does not expose session-token control, firing requests per standard Places Web API endpoints. Documented per specification without introducing unnecessary proxy infrastructure.

### Current-Location Handling
- Reused existing `geolocator: ^14.0.3` permission and location acquisition logic.
- Graceful handling of permissions (denied, permanently denied) and disabled location services.

### Google Cloud APIs Required
- **Maps SDK for Android** (M1)
- **Maps SDK for iOS** (M1)
- **Places API (legacy / Web Service)** (M2)

### API Key Strategy & Status
- Separate keys: `MAPS_API_KEY` (Maps SDK) and `PLACES_API_KEY` (Places Autocomplete).
- Keys injected via build-time `--dart-define` and `local.properties`. Never hardcoded in source control.

### Tests & Verification
- Unit & widget tests implemented in `test/maps_m2_test.dart` and `test/maps_m1_test.dart`.
- All tests pass without real Google API keys.

---

## Phase M3 — Customer Live Rider Tracking

### M3 STATUS

**BLOCKED — BACKEND LOCATION CONTRACT REQUIRED**

### Backend Audit & Findings
- **Audit Performed:** Exhaustive codebase audit of `backend/app` covering routes, schemas, models, services, and tests.
- **Rider-side location publishing:** The backend includes `PATCH /wallet/location` (storing rider coordinates into Redis with key `rider_location:{rider.id}` and a 45-second TTL).
- **Customer-side tracking:** `GET /orders/{order_id}/track` provides `status`, `rider_name`, `rider_phone`, `delivery_distance_km`, `restaurant_name`, and item totals (`OrderTrackingResponseSchema`), but **NO live coordinates** (`latitude`, `longitude`, `timestamp`, `rider_id`).
- **WebSockets / Sockets:** No WebSocket servers or endpoints exist in the backend.
- **Missing Contract:** There is no existing customer-facing endpoint or WebSocket that provides live rider coordinates for an active order.
- **Contract Adherence (Case B):** In accordance with Scope Lock and Case B instructions, **zero backend code was created or modified**. No artificial or fake endpoints were invented. The required contract is cleanly abstracted on the mobile client and documented below.

### Mobile Architecture Completed
1. **`RiderLocation` Model** (`lib/data/models/rider_location.dart`):
   - Fields: `riderId` (`String`), `latitude` (`double`), `longitude` (`double`), `timestamp` (`DateTime?`).
   - Coordinate validation: `isValidCoordinate(lat, lng)` strictly enforcing `[-90.0, 90.0]` and `[-180.0, 180.0]` boundaries, guarding against `NaN`, infinite, or null values.
   - Parsing: `tryFromJson` and `fromJson` supporting both snake_case (`rider_id`, `updated_at`, `lat`, `lng`) and camelCase.
   - Serialization: `toJson()`.
   - Staleness detection: `isStale(threshold: Duration(minutes: 2))` helper.
2. **`RiderLocationRepository` Abstraction** (`lib/data/repositories/rider_location_repository.dart`):
   - Clean interface: `Future<RiderLocation?> getRiderLocation(String orderId)`.
   - Production implementation: `HttpRiderLocationRepository` communicating via authenticated `ApiClient`.
   - Error handling: Gracefully handles 404 (endpoint unmounted or rider not assigned), 501 (not implemented), network dropouts, timeouts, and malformed responses by returning `null` without throwing or crashing the UI.
3. **Customer Screen Integration** (`lib/screens/tracking/order_tracking_screen.dart`):
   - Injected repository with default fallback: `RiderLocationRepository` and `OrderRepository` optional constructor parameters enable full isolation and deterministic testing.
   - Polling lifecycle: 8-second interval (`_riderLocationPollInterval`), active only when an order is active and has an assigned rider (`view.hasRider && !view.status.isTerminal`).
   - Polling safety: Single-flight lock `_isFetchingRiderLocation` prevents overlapping requests.
   - Resource disposal: Timers (`_pollTimer`, `_riderLocationPollTimer`) and animation controllers are strictly cancelled/disposed in `dispose()`. Every `setState()` is mounted-guarded, preventing memory leaks and post-disposal errors.
   - Marker updates: `_MapView` renders `MapMarkers.rider` using live `riderLocation` coordinates when available.
   - Map Camera behavior: `fitBoundsOnMarkers: false` during live tracking updates so user camera movement is never hijacked or forcefully recentered.
   - Error & Stale handling: When rider location is pending or temporarily unavailable, a subtle non-intrusive status banner ("Rider location is currently unavailable.") is presented. The last known valid marker position is retained instead of disappearing on transient network drops.

### Required Backend Contract
To complete end-to-end live tracking when backend development resumes, the backend must expose:
- **Endpoint:** `GET /orders/{order_id}/rider-location` (or augment `GET /orders/{order_id}/track` with a `rider_location` object).
- **HTTP Method:** `GET`
- **Authentication:** `require_customer` (Customer Bearer JWT token, verifying that `order.customer_id == current_user.id`).
- **Response Schema (200 OK):**
  ```json
  {
    "rider_id": "uuid-string",
    "latitude": 33.6922,
    "longitude": 73.0539,
    "timestamp": "2026-09-26T20:00:00Z"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid token.
  - `404 Not Found`: Order does not exist, order does not belong to customer, rider is not yet assigned, or rider location in Redis has expired (`LOCATION_TTL_SECONDS`).
- **Backend Data Source:** Read from Redis key `rider_location:{order.rider_id}` where the rider pushes location via `PATCH /wallet/location`.

### Verification & Validation Results
- `flutter pub get`: **PASS**
- `flutter analyze`: **PASS** (No issues found).
- `flutter test`: **PASS** (36/36 tests passing, including 18 dedicated unit and widget tests in `test/maps_m3_test.dart`).
- Android Build: **PASS** (`.\gradlew.bat assembleDebug --dry-run` succeeded in 44s with 4/4 actionable tasks up-to-date and all plugins registered).
- Real Live Location Status: Awaiting backend contract implementation and deployment.

### Manual Actions Remaining
1. Implement the `GET /orders/{order_id}/rider-location` endpoint on the backend.
2. Verify end-to-end location streaming with active Android/iOS Maps SDK keys.

---

## Phase M4 — Rider Navigation & Directions

### M4 STATUS

**COMPLETE**

### Navigation Approach

**Option A — External Google Maps Navigation (Platform Hand-off)**

`url_launcher: ^6.3.2` was already installed in `pubspec.yaml` (no new dependency required).

When the rider taps a navigation button:

1. Coordinates are validated (null / NaN / infinite / out-of-bounds checks).
2. A **platform-native URI** is constructed and attempted first:
   - Android: `google.navigation:q=<lat>,<lng>&mode=d`
   - iOS: `comgooglemaps://?daddr=<lat>,<lng>&directionsmode=driving`
3. If the native URI cannot be launched, a **universal fallback URI** is used:
   - `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=driving`
4. If both fail, a user-friendly SnackBar message is shown — the app never crashes.

No Google Directions/Routes API key is required (no in-app polyline routing was implemented — see Limitations).

### Files Created

| File | Purpose |
|---|---|
| `lib/features/maps/rider_navigation_service.dart` | Service with coordinate validation, URI builders (Android / iOS / Universal), and async `launchNavigation()` with graceful fallback |
| `lib/features/maps/rider_navigation_section.dart` | UI widget — destination selector (Restaurant / Customer tabs), Navigate action buttons, unavailable fallback message |
| `test/maps_m4_test.dart` | 13 focused M4 unit + widget tests |

### Files Modified

| File | Change |
|---|---|
| `lib/features/maps/maps.dart` | Exported `rider_navigation_service.dart` and `rider_navigation_section.dart` |
| `lib/screens/rider/rider_dashboard_screen.dart` | Added `navigationService` param to `RiderDashboardScreen`; added `_currentRiderLocation` field; `_pushLocation` now records rider LatLng; passed `riderLocation` and `navigationService` to `_AssignmentCard`; `_AssignmentCard` renders `RiderNavigationSection` when `isInProgress`; rider location marker added to map preview |

### Restaurant Navigation

- **Source:** `RiderAssignment.restaurantLatitude` / `restaurantLongitude` (existing model fields, `double?`).
- **Default:** shown before pickup (`acceptedByRider`, `arrivedAtRestaurant`).
- **Button:** "Navigate to Restaurant" (blue).
- **Coordinate guard:** Button hidden and "Destination location is unavailable." shown when `restaurantLatitude` or `restaurantLongitude` is null.

### Customer Navigation

- **Source:** `RiderAssignment.deliveryAddress.latitude` / `deliveryAddress.longitude` (existing `AssignmentAddress` model).
- **Default:** shown after pickup (`pickedUp`, `onTheWay`).
- **Button:** "Navigate to Customer" (green).
- **Coordinate guard:** Button hidden and message shown when `deliveryAddress` is null or coordinates are invalid.

### Google Maps App Hand-off

- Android `<queries>` for `google.navigation`, `geo`, `https` were already present in `AndroidManifest.xml` (added in M1/M4 setup).
- iOS `LSApplicationQueriesSchemes` for `comgooglemaps`, `googlechromes`, `https` were already present in `Info.plist`.
- No new platform manifest changes were required.

### Destination Selection Lifecycle

| Delivery Status | Default Destination |
|---|---|
| `acceptedByRider` | Restaurant |
| `arrivedAtRestaurant` | Restaurant |
| `pickedUp` | Customer |
| `onTheWay` | Customer |
| `delivered` / `cancelled` | Navigation hidden entirely |
| `riderAssigned` (not yet accepted) | Navigation hidden entirely |

The rider can manually toggle between Restaurant and Customer tabs at any time during an active delivery.

### In-App Route / Polyline

**NOT IMPLEMENTED** — The Google Directions/Routes API requires a server-side API key that is not currently present in the Flutter client architecture. Exposing an unrestricted key in Flutter source code is a security anti-pattern. The current architecture provides external Google Maps navigation (Option A), which gives the rider full turn-by-turn directions inside the native Google Maps app. In-app polyline rendering can be added in a future phase if a safe backend proxy for the Directions API is established.

### Rider Location Marker on Map Preview

The `_buildMapPreview()` method inside `_AssignmentCard` now renders a third orange "You" marker at `_currentRiderLocation` when the rider's GPS position has been acquired by `_pushLocation()`. This reuses the existing `MapMarkers.rider()` factory from M1.

### Tests

- `test/maps_m4_test.dart` — 13 M4-specific tests:
  1. Valid restaurant destination coordinates resolved
  2. Valid customer destination coordinates resolved
  3. Missing destination coordinates returns null
  4. Invalid latitude rejected by coordinate validation
  5. Invalid longitude rejected by coordinate validation
  6. Navigation URI generation (Android, iOS, Universal schemes)
  7. Restaurant navigation action renders and launches restaurant coords
  8. Customer navigation action renders and launches customer coords
  9. Navigation unavailable — both URIs fail, graceful error returned
  10. Completed / cancelled orders do not show navigation
  - Lifecycle destination resolution (Restaurant before pickup, Customer after)
  - Destination selector toggles between Restaurant and Customer
  - Navigation failure displays SnackBar and triggers `onError`

### Verification & Validation Results

- `flutter pub get`: **PASS** (no new dependencies added)
- `flutter analyze`: **PASS** (No issues found)
- `flutter test`: **PASS** (55/55 tests passing, including 13 new M4 tests — all prior M1/M2/M3 tests continue to pass)
- Android Build: **PASS** (`flutter build apk --debug` — `✓ Built build/app/outputs/flutter-apk/app-debug.apk` in ~262s)

### Manual Actions Remaining

1. Provision a real Google Maps API key in `android/local.properties` (`MAPS_API_KEY=AIza...`) and iOS Xcode build settings (`GOOGLE_MAPS_API_KEY`) to enable live map tile rendering.
2. For in-app polyline routing: establish a backend proxy endpoint for the Google Directions/Routes API, then implement polyline decoding in a future phase.

---

## M4 Scope Confirmation

| Item | Status |
|---|---|
| Rider GPS upload / background location | NOT IMPLEMENTED (M5) |
| Background GPS service | NOT IMPLEMENTED (M5) |
| Continuous rider location publishing | NOT IMPLEMENTED (M5) |
| `PATCH /wallet/location` changes | NOT IMPLEMENTED (M5) |
| Backend API changes | NOT IMPLEMENTED |
| Redis / WebSocket changes | NOT IMPLEMENTED |
| Customer live tracking changes | NOT IMPLEMENTED |

---

## Phase M5 — Rider Location Push (Sender Side)

### M5 STATUS

**PARTIAL — FOREGROUND COMPLETE, BACKGROUND PREPARED ONLY**

Foreground GPS reading and throttled publishing are implemented, wired into the
Rider Dashboard, and covered by 21 passing tests. Background location is
**declared but not proven** (see Background Tracking below).

### GPS Service

New reusable service: `lib/services/rider_location_service.dart`
(`RiderLocationService`) built on the existing `geolocator: ^14.0.3`.

Responsibilities:
- `checkAndRequestPermission()` — checks location services, then permission.
  Returns a `LocationPermissionResult` with a UI-safe `message`.
- `startTracking()` / `stopTracking()` — controls a single continuous stream.
- `getCurrentPosition()` — one-shot read.
- `positionStream` — broadcast `Stream<Position>` of validated positions.
- `dispose()` — closes the internal `StreamController`.

The service is constructor-injectable (function seams for every geolocator
static call) so it can be unit-tested without a device.

### Location Validation

Every incoming position is validated in `RiderLocationService._onPosition` and
again in `RiderLocationPublisher._onPosition`:
- latitude ∈ `[-90, 90]`
- longitude ∈ `[-180, 180]`
- NaN rejected
- ±Infinity rejected
- null rejected

Invalid coordinates are logged and dropped — never published, never crash.

### Permission Handling

| Condition | Result | UI message |
|---|---|---|
| Services disabled | `serviceDisabled` | `Turn on location services` |
| Denied | `denied` | `Location permission required` |
| Denied forever | `deniedForever` | `Location permission required` |
| Granted (while-in-use / always) | `granted` | `Location sharing active` |

The app requests **while-in-use** permission only when the rider needs it
(going online or starting an active delivery). It never requests background
location permission on startup, and no code path crashes when permission is
denied — the result object drives a non-blocking UI chip instead.

### Foreground Tracking

Implemented. `RiderLocationPublisher` (`lib/services/rider_location_publisher.dart`)
bridges the GPS stream to the existing backend endpoint.

### Active-Delivery-Only Policy

Tracking starts only when **all** of these are true:
- rider profile `approval_status == approved` and active
- driver `is_online == true`
- at least one assignment with status accepted / arrived / picked up / on the way

Tracking stops when the active delivery ends (delivered/cancelled), the
assignment list becomes empty, the rider goes offline/logs out, or the widget is
disposed. A separate 40 s `_locationTimer` keeps the online rider's Redis TTL
fresh while they are simply online (existing M4 behaviour, unchanged).

### Location Publishing

- **Existing endpoint used:** `PATCH /wallet/location` (already served by
  `backend/app/platform/wallet_payment/routes.py`).
- **HTTP method:** `PATCH`
- **Request body:** `{ "latitude": <double>, "longitude": <double> }`
- **Authentication:** rider Bearer JWT via the existing `ApiClient`
  (`require_rider` on the backend). The rider id comes from the token, never
  the body. No Redis access, no keys or secrets in Dart.
- **Response:** `{ "rider_id", "lat", "lng" }` (200). 404 when the rider row is
  missing, 503 when Redis is unavailable.
- Publishing reuses `RiderRepository.updateLocation(...)` through the single
  `ApiClient`, so token refresh / 401 handling is inherited unchanged.

### Update / Throttle Policy

| Layer | Setting |
|---|---|
| GPS distance filter | 30 m (`RiderLocationService.distanceFilterMetres`) |
| Android interval | 15 s (`AndroidSettings.intervalDuration`) |
| Accuracy | `LocationAccuracy.high` |
| Min time between uploads | 30 s (`RiderLocationPublisher.minUploadInterval`) |
| Overlap protection | single-flight boolean guard — an in-flight upload drops the next GPS callback (no queue) |

Flow: GPS update → validate → throttle check → single-flight check →
`PATCH /wallet/location` → clear in-flight guard.

### Duplicate / Overlap Protection

`RiderLocationPublisher._uploadInFlight` guarantees at most one outstanding
HTTP request; further positions are skipped until it completes.

### Network Error Handling

- Network / timeout / 401 / 403 / 404 / 500 / 503 are all caught as
  `ApiException`, logged via `dart:developer`, and **never crash** the app.
- Tracking stays alive; the next valid update retries naturally.
- Authentication errors reuse `ApiClient`'s existing refresh + `onSessionExpired`
  path — no second auth system.
- No blocking snackbar is shown per failed GPS upload; status is surfaced by the
  lightweight location status chip only.

### Rider Dashboard UI

`lib/screens/rider/rider_dashboard_screen.dart` gains a small
`rider_location_status_indicator` chip inside the online banner with the four
states:
- `Location sharing active`
- `Location permission required`
- `Turn on location services`
- `Location will sync when connection returns`

No redesign of the dashboard; no technical errors shown to the rider.

### Map Marker

Reuses the existing M1 `MapView` / `MapMarkers.rider`. Valid live positions
update `_currentRiderLocation`, which feeds the rider marker in
`_buildMapPreview()`. There is no second map.

### Camera Behaviour

`fitBoundsOnMarkers: false` for the rider preview; GPS updates never re-centre
the camera, so the rider's manual pan/zoom is preserved.

### Lifecycle Safety

`_RiderDashboardScreenState.dispose()` cancels `_locationTimer`, cancels
`_positionMarkerSub`, stops the publisher, and disposes it when owned.
`_logout()` stops tracking before clearing the session. Every `setState` is
`mounted`-guarded. No `setState()` after disposal, no leaked subscriptions.

### Android Configuration

- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET` (pre-existing).
- **Added:** `android.permission.ACCESS_BACKGROUND_LOCATION` in
  `android/app/src/main/AndroidManifest.xml` for Android 10+.
- No foreground service was introduced (the selected while-in-use
  implementation does not require one).
- **Play Store note:** shipping `ACCESS_BACKGROUND_LOCATION` requires completing
  Google Play's Background Location Declaration and passing review. This is a
  manual, non-code action and is **not** verified here.

### iOS Configuration

- `NSLocationWhenInUseUsageDescription` (pre-existing).
- `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationAlwaysUsageDescription`
  present in `ios/Runner/Info.plist`.
- **Added:** `UIBackgroundModes` = [`location`] in `Info.plist`.
- Enabling the **Location updates** Background Mode capability in the Xcode
  project (Signing & Capabilities) is a manual step that cannot be safely
  automated here.
- **App Store note:** background location usage must be justified during review;
  approval is not claimed.

### Background Tracking (Honest Status)

**PREPARED, NOT VERIFIED.**
The Android background-location permission and the iOS `location` background
mode are declared. However:
- `geolocator` on Android 10+ only continues in the background when a foreground
  service notification is configured (`AndroidSettings.foregroundNotificationConfig`),
  which was intentionally **not** added.
- No real-device background test has been performed in this environment.

Therefore background updates are **not claimed to work**; they are documented as
an enablement-ready configuration awaiting a foreground-service decision and
device testing.

### Tests

`test/maps_m5_test.dart` — 21 focused M5 tests:
1. Valid GPS coordinate 2. Invalid latitude 3. Invalid longitude 4. NaN coordinate
5. Infinite coordinate 6. Permission denied 7. Permission permanently denied
8. Location service disabled 9. GPS stream starts 10. GPS stream stops cleanly
11. Active delivery starts tracking 12. Completed delivery stops tracking
13. Cancelled delivery stops tracking 14. Rider logout stops tracking
15. Upload throttling (min interval) 16. Overlapping upload prevention
17. Network failure handling 18. Authentication error handling
19. Rider marker update 20. No camera auto-recenter 21. Widget/service disposal cleanup

No existing M1–M4 test was deleted or modified.

### Verification & Validation Results

- `flutter pub get`: **PASS**
- `flutter analyze`: **PASS** (No issues found)
- `flutter test`: **PASS** (76/76 tests passing, including all 21 M5 tests)
- Android Build: **PASS** (`flutter build apk --debug` → `✓ Built build/app/outputs/flutter-apk/app-debug.apk`)
- iOS build/configuration: **NOT RUN** (no macOS in this environment); plist/edit-time configuration reviewed only.

### Manual Actions Remaining

1. Configure a foreground-service notification (or an equivalent background
   location strategy) before claiming reliable background updates on Android 10+.
2. Enable the iOS **Location updates** Background Mode capability in Xcode.
3. Complete Google Play's Background Location Declaration for the
   `ACCESS_BACKGROUND_LOCATION` permission.
4. Field-test GPS drift/accuracy on real devices (not simulators).

### Known Limitations

- Background tracking is configuration-only; not proven on a device.
- `_pushLocation()` (M4 online/TTL refresh path) still calls `Geolocator`
  statics directly; only the active-delivery stream goes through
  `RiderLocationPublisher`. Consolidating these is future cleanup.
- No offline queue: a dropped upload is simply retried by the next throttled
  position, not persisted.

---

## M5 Scope Confirmation

| Item | Status |
|---|---|
| New backend endpoint | NOT CREATED |
| Redis logic / direct Redis access | NOT ADDED |
| WebSocket | NOT ADDED |
| Backend code changed | NO |
| Customer tracking changes | NOT CHANGED (remains M3) |
| Navigation / Directions | NOT CHANGED (remains M4) |
| Payment / order workflow | NOT CHANGED |
| M6 final testing phase | NOT STARTED |

---

## Phase M6 — Final Testing, QA & Release Readiness

### M6 STATUS

**PARTIAL — VERIFIED IN CODE AND AUTOMATED TESTS; BACKGROUND GPS NOT PROVEN ON A REAL DEVICE**

Audit date: 2026-09-27
Canonical document: this file (`docs/maps-status.md`). The copy at
`mobile_app/docs/maps-status.md` is a byte-for-byte mirror kept in sync for the
mobile plan; there are no intentionally divergent copies.

M1–M5 were re-verified against the actual code (not the previous reports).
M6 added no new features: it is strictly test → find bugs → fix → re-test →
document.

### Verification Method

- Static audit of every M1–M5 source file, native config, and test file.
- `flutter pub get`, `flutter analyze`, `flutter test`, `flutter build apk --debug`,
  `flutter build apk --release` all re-run after the M6 change.
- No physical Android/iOS device available in this environment, so on-device
  runtime, GPS, background tracking, and navigation hand-off could not be
  exercised end-to-end (see Real Device Testing).

### M1 — Map Rendering

- `MapView` (`lib/features/maps/map_view.dart`) and `MapMarkers`
  (`lib/features/maps/map_markers.dart`) are intact and reused by customer
  tracking, the location picker, and the rider dashboard — no duplicate map
  implementation.
- Restaurant / customer / rider marker factories all present and used.
- Fallback builder still renders when the native map/key is unavailable;
  map never crashes on missing coordinates (camera resolves from markers or
  the safe Islamabad default).
- Camera behaviour: `fitBoundsOnMarkers` is `false` in both live-tracking and
  rider-preview paths, so GPS/status updates never hijack the camera.
- Not broken by M2–M5.

### M2 — Address / Location

- `AddressSearchField` wraps `google_places_flutter`, debounced 800 ms,
  `isLatLngRequired: true`, and renders a non-interactive placeholder when
  `PLACES_API_KEY` is absent.
- Place selection resolves lat/lng, rejects out-of-range values, and emits a
  `SelectedLocation`; pin-drop and current-location paths both populate
  coordinates.
- No Google Geocoding REST call is made from Flutter (reverse-geocoding is
  deferred by design).
- `MAPS_API_KEY` (native SDK, via `local.properties`) and `PLACES_API_KEY`
  (Dart `--dart-define`) remain separate; neither is hardcoded.
- Known display limitation: tapping the **fallback** (unconfigured) map in the
  picker selects `MapView.defaultCoordinates` rather than a real point. This is
  a fallback-only behaviour and is documented, not a regression.

### M3 — Customer Rider Tracking

- `RiderLocation` validation, `RiderLocationRepository`, 8 s polling that runs
  only while an order is active **and** a rider is assigned, single-flight
  lock, terminal-state stop, last-known-marker retention, and no camera
  auto-recenter are all present and covered by `test/maps_m3_test.dart`.
- No fake rider movement and no mock live GPS data anywhere.
- **Blocked on external dependency (unchanged):** the backend still has no
  customer-facing live rider location endpoint. The client queries
  `GET /orders/{order_id}/track` and treats absent coordinates as
  "unavailable". No backend endpoint was created in M6.
- Known limitation: the customer map's restaurant and customer markers are
  placeholders, because `OrderTrackingResponseSchema` carries no
  restaurant/customer coordinates. Only the rider marker reflects real data.
  Fixing this requires a backend field and is out of M6 scope.

### M4 — Rider Navigation

- `RiderNavigationService` validates coordinates, builds Android
  (`google.navigation:`), iOS (`comgooglemaps://`), and universal HTTPS URIs,
  and falls back gracefully; both failure paths surface a SnackBar instead of
  crashing.
- Restaurant/Customer destination resolution and lifecycle defaults are
  correct; terminal/unaccepted orders hide navigation.
- Android `<queries>` and iOS `LSApplicationQueriesSchemes` are present.
- Known limitation (unchanged): no in-app Directions/Routes polyline; the rider
  is handed off to the external Google Maps app.

### M5 — Rider GPS (Foreground)

- Permission request, denied, permanently denied, and services-disabled paths
  all return a UI-safe result and never crash.
- Single continuous validated stream; start/stop tied to active delivery,
  delivery completion/cancellation, logout, and widget disposal.
- GPS is **not** started when there is no active delivery (verified in code and
  by tests); validation rejects null/NaN/±Infinity/out-of-bounds readings.

### M5 — Location Publishing

- Uses the existing `ApiClient` / rider JWT against the existing
  `PATCH /wallet/location`; the rider id comes from the token, never the body.
  No Redis access, keys, or secrets in Dart.
- 30 m GPS distance filter, 15 s Android interval, `LocationAccuracy.high`,
  30 s minimum upload throttle, and the `_uploadInFlight` single-flight guard
  are all present.
- Network/timeout/401/403/404/500/503 are caught as `ApiException`, logged, and
  never crash tracking; the next valid update retries naturally.

### Background GPS Verification

**NOT VERIFIED ON REAL DEVICE.**

- Android: `ACCESS_BACKGROUND_LOCATION` is declared, but no foreground-service
  notification is configured, so on Android 10+ background updates are not
  claimed to work. No device available to test.
- iOS: `UIBackgroundModes = [location]` and the usage-description keys are
  present; the Xcode "Location updates" capability is a manual step and no macOS
  environment is available.
- Per M6 rules this is reported as **unverified**, not PASS, and no new
  background-location implementation was added.

### Bugs Found

1. **Online / TTL location push published unvalidated GPS coordinates.**
   `RiderDashboardScreen._pushLocation()` (the 40 s `PATCH /wallet/location`
   TTL-refresh path) called `Geolocator` statics directly and sent
   `position.latitude/longitude` straight to the backend, bypassing the
   `RiderLocationService.isValidCoordinate` guard that the active-delivery
   publisher applies. A NaN / ±Infinity / out-of-bounds reading could therefore
   reach the backend and be assigned to the rider map marker.
2. **Documentation-only mismatch:** the M3 notes claimed
   `HttpRiderLocationRepository` handles HTTP 501 explicitly; the code returns
   `null` for every `ApiException`, which is safe and equivalent in effect. No
   code change required.

No dead code, duplicate timers/services, `setState()`-after-dispose, missing
`mounted` guards, hardcoded secrets, or unused imports were found. `flutter
analyze` is clean.

### Bugs Fixed

1. `_pushLocation()` now reads permission and position through the single
   injectable `RiderLocationService` (no second direct `Geolocator` read) and
   rejects any position that fails `RiderLocationService.isValidCoordinate`
   before touching the marker or `PATCH /wallet/location`. All existing UI
   messages and status chips are preserved. Regression test added:
   `test/maps_m5_test.dart` test 22.

### Tests Performed

- Existing suite (M1–M5 + critical flows) — unchanged and still passing.
- New M6 regression test 22 — online/TTL push rejects an invalid reading and
  never publishes it, and never flips the rider online on the strength of it.
- No tests were deleted, skipped, or weakened. No unnecessary tests were added
  merely to inflate the count.

### Automated Test Results (post-fix)

- `flutter pub get`: **PASS**
- `flutter analyze`: **PASS** — No issues found
- `flutter test`: **PASS** — **77/77** passed (was 76; +1 M6 regression test),
  0 failed, 0 skipped
- `flutter build apk --debug`: **PASS** — `√ Built build\app\outputs\flutter-apk\app-debug.apk`
- `flutter build apk --release`: **PASS** — `√ Built build\app\outputs\flutter-apk\app-release.apk (55.2MB)`
  (debug-signed per the existing `build.gradle.kts`; no production keystore
  exists and none was created in M6)
- iOS build: **NOT RUN** — no macOS/Xcode in this environment

### Manual QA Checklist (for device testers)

Customer

- [ ] Open map / restaurant marker / customer marker
- [ ] Address search autocomplete and place selection
- [ ] Pin-on-map location and "use current location"
- [ ] Order tracking view with rider marker architecture
- [ ] Map pan / zoom is not hijacked by updates

Rider

- [ ] Rider dashboard loads profile, jobs, wallet
- [ ] Restaurant and customer markers on the assignment preview
- [ ] Navigate to Restaurant / Navigate to Customer open Google Maps
- [ ] GPS permission prompt, grant/deny/permanent-deny
- [ ] Active delivery starts tracking; completion/decline stops it
- [ ] Location publishing reaches `PATCH /wallet/location`
- [ ] Logout stops tracking and clears the session

Error cases

- [ ] GPS disabled
- [ ] Permission denied / permanently denied
- [ ] Network unavailable during status polling and location upload
- [ ] Invalid / missing destination coordinates
- [ ] Missing destination (no coordinates) shows the unavailable message
- [ ] Google Maps app not installed / launch failure
- [ ] API error (401/403/404/500/503) does not crash tracking
- [ ] App backgrounded then foregrounded (foreground behaviour)

### Real Device Testing

Android: **NOT PERFORMED** — no physical Android device in this environment.

- Install / GPS / navigation / background GPS / publishing: unverified on device.

iOS: **NOT PERFORMED** — no macOS/iOS development environment available.

### Known Limitations

- Background location is configuration-only and unproven on a device; Android
  10+ needs a foreground-service notification, and the iOS Xcode capability is
  a manual step.
- M3 customer live tracking is blocked on the absent backend rider-location
  endpoint; restaurant/customer markers on the customer map are placeholders
  (the rider marker uses real coordinates).
- M4 provides external hand-off only — no in-app polyline/route.
- The rider assignment map preview fabricates a customer marker offset when the
  delivery address has no coordinates.
- No offline queue: a dropped location upload is retried by the next throttled
  position, not persisted.
- Release APK is debug-signed; production signing and Google Cloud key
  provisioning remain manual actions.

### Security

- No Google private/server keys, Redis credentials, database credentials, JWTs,
  or passwords are present in Dart or native config.
- Places key is build-time `--dart-define`; Maps key is injected from the
  gitignored `android/local.properties` / `$(GOOGLE_MAPS_API_KEY)`.
- No Redis access from Flutter; no backend secrets exposed to the client.

### Backend Boundary

| Item | Status |
|---|---|
| Backend code changed | NO |
| New backend endpoint created | NO |
| Redis changed | NO |
| WebSocket added | NO |
| Payment functionality added | NO |
| Auth architecture changed | NO |

### Release Readiness

**READY WITH LIMITATIONS.**

The Flutter frontend is code-complete, analyzer-clean, and builds both debug and
release APKs. It is not fully release-ready because (a) background GPS is
unproven on a real device, (b) M3 customer live tracking needs a backend
rider-location endpoint, and (c) no production signing/Google Cloud key
provisioning has been done. None of these are regressions introduced by M6.


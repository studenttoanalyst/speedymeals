# SpeedyMeals — Flutter mobile app

Cross-platform food delivery app for the Pakistani market, built with **Flutter**
and backed by the **FastAPI** service in `../backend`. The app ships three
surfaces in one binary: customer ordering and live tracking, rider delivery
work, and the customer/rider account-deletion flows required by Google Play.

- **Package name:** `speedy_meals`
- **Version:** `1.0.0+1` (`pubspec.yaml`)
- **Android application id:** `com.speedymealservices.app`
- **Dart SDK:** `^3.13.2`

---

## 1. Features

### Customer

- Phone + OTP login (passwordless), JWT access/refresh with single-flight
  refresh and secure token storage.
- Profile view/edit and a saved-address book (add, edit, delete, default).
- Restaurant browsing by real distance from the selected address, menu
  browsing, search and popular items.
- Per-restaurant cart, backend-priced checkout preview (subtotal, delivery fee,
  platform fee, GST, total), order placement with an idempotency key.
- Cash on Delivery checkout. **Online payment is hidden** while the backend
  reports `online_payments_enabled: false` (the digital gateway is still a stub).
- Order history, reorder, one-per-order rating.
- Live order tracking: `WS /orders/{id}/track` when available, REST polling
  every 15 s as the fallback; rider position from `GET /orders/{id}/rider-location`.
- In-app notification feed derived from real orders (no fake entries).

### Rider

- Phone OTP login/registration, admin approval state.
- Online/offline toggle (backend-enforced minimum wallet balance).
- Assignment list, accept/reject, delivery progression
  (arrived → picked up → on the way → delivered).
- Wallet balance, earnings, recharge, cash deposit, COD eligibility.
- KYC document upload (CNIC, licence, vehicle) with a client-side 5 MB guard.
- Foreground GPS publishing (`PATCH /wallet/location`, 30 s throttle) with
  permission/GPS failure handling; background tracking is configured but
  **not verified on a device**.
- External Google Maps navigation hand-off to restaurant/customer.

### Account deletion (Google Play requirement)

- **Customer:** `DELETE /users/me` deletes immediately (204), blocked with a
  clear 409 while an order is active. Data is anonymised; order/payment history
  is retained in anonymised form.
- **Rider:** `DELETE /users/me` creates a deferred request (7-day grace, admin
  review); the account is deactivated immediately, and the request can be
  cancelled from the app while it is still cancellable. Riders must have a zero
  wallet balance and no active delivery.
- The rider screen lives at **Rider dashboard → Account & deletion**.
- Hosted web deletion page (outside this repository):
  `https://speedymealservices.com/delete-account`.

### Legal links

Terms, Privacy Policy and the account-deletion URL are defined once in
`lib/core/constants/app_constants.dart` and rendered on every auth screen, the
profile screen and the rider account screen:

- `https://speedymealservices.com/terms`
- `https://speedymealservices.com/privacy`
- `https://speedymealservices.com/delete-account`

---

## 2. Tech stack

| Area | Choice |
|---|---|
| Framework | Flutter 3.x, Dart 3.13 |
| State | `StatefulWidget`/`setState` + `ChangeNotifier` service singletons (`AuthService`, `CartService`, `NotificationService`) |
| HTTP | `package:http` behind the single `ApiClient` (`lib/core/network/api_client.dart`) |
| Storage | `flutter_secure_storage` (JWTs), `shared_preferences` (settings, cart scope) |
| Location | `geolocator` |
| Maps | `google_maps_flutter`, custom `MapView`/`MapMarkers` widgets |
| Push | `firebase_core`, `firebase_messaging`, `flutter_local_notifications` |
| Files | `file_picker` (rider KYC uploads) |
| External links | `url_launcher` |
| Misc | `uuid` (idempotency keys), `shimmer` (skeletons), `http_parser` |
| Backend | FastAPI, PostgreSQL, Redis, SQLAlchemy 2, Alembic |

---

## 3. Folder structure

```
mobile_app/
├── lib/
│   ├── core/
│   │   ├── config/          # API base URL + WebSocket URI (dart-defines)
│   │   ├── constants/       # wire enums, brand strings, legal URLs
│   │   ├── network/         # ApiClient, ApiException
│   │   ├── storage/         # TokenStorage (secure storage)
│   │   └── theme/           # Material 3 theme
│   ├── data/
│   │   ├── models/          # user, catalog, cart, order, rider, deletion models
│   │   └── repositories/    # one repository per API area
│   ├── features/
│   │   ├── address/         # search field, picker, selected location
│   │   └── maps/            # MapView, markers, rider navigation
│   ├── screens/
│   │   ├── auth/            # register-as, OTP login/signup/verification
│   │   ├── cart/            # cart + checkout
│   │   ├── dashboard/       # restaurant discovery
│   │   ├── menu/            # restaurant detail + menu
│   │   ├── tracking/        # order tracking, live socket, order tabs
│   │   ├── profile/         # profile, edit profile, saved addresses
│   │   ├── rider/           # dashboard, wallet, documents, account deletion
│   │   ├── notifications/
│   │   └── splash_screen.dart
│   ├── services/            # auth, cart, notifications, push, GPS, socket
│   ├── widgets/             # skeleton loaders, legal links, shared UI
│   └── main.dart
├── test/                    # widget/unit/contract tests
├── android/ ios/ linux/ macos/ web/ windows/
├── docs/                    # maps status + account-deletion docs
├── CHANGELOG.md
├── RELEASE_AUDIT.md
└── pubspec.yaml
```

Layer rules: screens never call HTTP directly; repositories own endpoint paths
and JSON mapping; `ApiClient` owns base URL, auth headers, timeouts and error
classification.

---

## 4. Prerequisites

- Flutter SDK 3.x with Dart 3.13+ (`flutter --version`).
- Android Studio / Android SDK for Android builds; Xcode on macOS for iOS.
- A running SpeedyMeals backend (see `../backend/README` notes and
  `../docs/production-config-checklist.md`) with PostgreSQL and Redis.
- Google Maps keys for map tiles (optional for tests): Android
  `MAPS_API_KEY` in `android/local.properties`, iOS `GOOGLE_MAPS_API_KEY` build
  setting.

---

## 5. Setup

```bash
cd mobile_app
flutter pub get
```

### Environment / build-time variables (names only)

| Name | Where | Required | Purpose |
|---|---|---|---|
| `API_BASE_URL` | `--dart-define` | **Yes for release** | Backend origin, e.g. `https://api.example.com`. Release builds throw a clear `StateError` without it. |
| `MAPS_API_KEY` | `android/local.properties` (not committed) | For Android maps | Native Maps SDK key injected as a manifest placeholder. |
| `GOOGLE_MAPS_API_KEY` | Xcode build setting / `Info.plist` | For iOS maps | Native Maps SDK key. |

No secrets are stored in Dart source. The backend's own variables (database,
JWT, Redis, SMS, S3, Maps server key, `ONLINE_PAYMENTS_ENABLED`, deletion job)
are listed by name in `../docs/production-config-checklist.md`.

### Firebase

`android/app/google-services.json` **is tracked on purpose**: it contains only
public Firebase client identifiers and the Android build needs it. Backend
service-account keys are never committed.

---

## 6. How to run

```bash
# Android emulator (host backend is reachable at 10.0.2.2)
flutter run

# Physical device on the same network: pass your machine's LAN IP
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:8000

# Chrome / desktop during development
flutter run -d chrome
```

Base URL resolution (`lib/core/config/api_config.dart`):

1. `--dart-define=API_BASE_URL=...` wins everywhere.
2. Debug Android emulator → `http://10.0.2.2:8000`.
3. Debug iOS simulator/desktop/web → `http://localhost:8000`.
4. **Release build with no override → loud `StateError`; there is no hardcoded
   production host.**

---

## 7. Backend API configuration

- Base URL: see resolution above. Every request goes through `ApiClient`.
- Auth: `Authorization: Bearer <access token>`; 401 triggers one refresh
  attempt, then the session is cleared and the user is returned to login.
- Timeouts and errors are normalised into `ApiException` kinds
  (`validation`, `unauthorized`, `forbidden`, `notFound`, `conflict`,
  `rateLimited`, `network`, `timeout`, `unavailable`).
- Live tracking: `WS {wsBaseUrl}/orders/{id}/track?token=...`, derived from the
  same base (`https`→`wss`, `http`→`ws`). No separate WebSocket host.
- HTTPS is required in production; cleartext HTTP is permitted only for
  `10.0.2.2`, `localhost` and `127.0.0.1` through
  `android/app/src/main/res/xml/network_security_config.xml`.
- OTP delivery is server-side (`SMS_MODE=console` in local dev prints the code
  to the backend console instead of sending SMS).

---

## 8. Build a release AAB

```bash
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.your-domain.com
```

Output: `build/app/outputs/bundle/release/app-release.aab`.

Notes:

- `API_BASE_URL` is **mandatory**; a release build without it fails on the
  first network call with the configuration message. Replace the domain with
  the real production API origin.
- **Release signing is strict.** The build reads `android/key.properties`
  (gitignored) and signs with that keystore. When it is missing the build fails
  with `Release signing is not configured` — a release artifact is **never**
  signed with the debug key. Create the upload keystore once (keep it offline,
  never commit or share it):

  ```bash
  keytool -genkey -v -keystore ~/speedymeals-upload.jks     -keyalg RSA -keysize 2048 -validity 10000 -alias speedymeals-upload
  ```

  then add `android/key.properties` (gitignored):

  ```properties
  storeFile=/absolute/path/to/speedymeals-upload.jks
  storePassword=<keystore password>
  keyAlias=speedymeals-upload
  keyPassword=<key password>
  ```

  and enrol the upload key in Play Console → *Setup → App signing*.
- Release builds run **R8 with code minification and resource shrinking**; the
  plugin keep rules live in `android/app/proguard-rules.pro`.
- The same command with `flutter build apk --release --dart-define=...`
  produces an APK for sideloading/testing.
- Bump `version:` in `pubspec.yaml` before uploading; Play requires a unique
  `versionCode` (currently `1.0.0+1`).

---

## 9. Testing

```bash
flutter analyze     # static analysis — must be clean
flutter test        # 136 unit/widget/contract tests
```

The suite mocks HTTP with `MockClient` and fakes the WebSocket transport, so it
runs without a backend. Live backend checks are listed in `RELEASE_AUDIT.md`
(511 backend tests, run twice against the local dev database).

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `StateError: API_BASE_URL is required for release builds` | Rebuild with `--dart-define=API_BASE_URL=https://...`. |
| “The app is not configured” / network error on first request | Base URL missing or wrong scheme; check the dart-define value. |
| API unreachable on an Android emulator | Use `10.0.2.2`, not `localhost` (the emulator's loopback is itself). |
| API unreachable on a physical device | Pass your machine's LAN IP via `API_BASE_URL`; ensure the backend binds `0.0.0.0` and the firewall allows port 8000. |
| Cleartext HTTP blocked | Only dev hosts are allow-listed; use HTTPS for anything else. |
| OTP never arrives | Local dev runs `SMS_MODE=console`: read the code from the backend log. Production requires `SMS_MODE=sendpk` and SendPK credentials. |
| Blank/grey map | No native Maps key configured, or the platform map failed to initialise; the app shows its fallback panel. |
| “Pay Online” missing | Expected: the backend reports `online_payments_enabled: false` while the gateway is a stub. |
| Live tracking falls back to polling | WebSocket unavailable or the token was rejected (`auth_failed`, close 4003); polling continues automatically. |
| 401 loop / signed out | Refresh token expired or revoked; sign in again. |
| Android build fails on signing | `android/key.properties` or the keystore is missing; see section 8. |

---

## 11. Known limitations

- **Online payments are disabled** (`ONLINE_PAYMENTS_ENABLED=false`): the
  backend digital path is a stub, so the app offers COD only.
- **Background GPS is not verified on a device** (foreground publishing is
  implemented and tested).
- Restaurant/admin surfaces have no UI in this repository (APIs only).
- In-app route polylines / turn-by-turn are not implemented; navigation is
  handed to the external Google Maps app.
- The hosted deletion page and the privacy-policy text live outside this
  repository (`website/` is not modified by mobile work).

---

## 12. Related documents

- `RELEASE_AUDIT.md` — full parity audit, Phase 4 fixes, verification counts.
- `CHANGELOG.md` — release history.
- `docs/maps-status.md` — Maps / live-tracking phase record.
- `docs/account-deletion/` — API contract, deployment checklist, web page copy,
  privacy addendum.
- `../docs/production-config-checklist.md` — backend environment variables and
  the launch-readiness snapshot.
- `../docs/websocket-token-proposal.md` — token-in-URL risk and proposed fix.
- `docs/play-store-listing.md` — store copy, assets checklist, console answers.
- `docs/play-console-data-safety.md` — Data safety form, field by field.
- `docs/release-smoke-test.md` — physical-device checklist for the release
  build.

---

## License

Private project; not published to pub.dev.

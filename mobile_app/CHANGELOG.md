# Changelog

All notable changes to the SpeedyMeals mobile app are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
version matches `pubspec.yaml` (`version: 1.0.0+1`, versionCode 1).

## [1.0.0] — 2026-10-19

First Google Play release candidate. Customer and rider flows are wired to the
real FastAPI backend; no mock restaurants, fake orders or invented fees remain.

### Added

- Customer phone + OTP login, session restore, single-flight token refresh and
  logout, with JWTs in `flutter_secure_storage`.
- Profile editing, saved addresses and address-driven restaurant browsing by
  real distance.
- Cart, backend-priced checkout preview, COD order placement with an
  idempotency key, order history, reorder and order rating.
- Live order tracking over `WS /orders/{id}/track`, with 15 s REST polling as
  the fallback and real rider positions from `GET /orders/{id}/rider-location`.
- Rider dashboard: assignments, accept/reject, delivery progression, wallet,
  earnings, recharge, cash deposit, COD eligibility and KYC document upload
  with a 5 MB client guard.
- Foreground rider GPS publishing (`PATCH /wallet/location`, 30 s throttle,
  validated coordinates) and external Google Maps navigation hand-off.
- Account deletion (Google Play requirement):
  - customers delete immediately via `DELETE /users/me` (409 while an order is
    active);
  - riders request deletion from **Account & deletion**, with a 7-day grace
    period, admin review, status display and cancellation;
  - in-app link to the hosted deletion page
    `https://speedymealservices.com/delete-account`.
- Terms, Privacy Policy and account-deletion links on every auth screen, the
  profile screen and the rider account screen.
- Firebase device-token registration for push notifications.
- Unit, widget and API-contract tests, including the checkout payment flag, the
  WebSocket auth-denial path and the account-deletion flows.

### Changed

- Checkout reads `online_payments_enabled` from the backend. The “Pay Online”
  option is rendered **only** when the server enables it; a stale Digital
  selection is snapped back to COD and a backend 400 falls back gracefully.
- Diagnostics use named `developer.log` calls instead of `debugPrint`, so
  handled-error detail is structured rather than printed to release stdout.
- Brand name, tagline and legal URLs come from one constants file.

### Fixed

- The live-tracking WebSocket no longer retries a session the backend has
  rejected (`auth_failed` frame / close 4003); it stops immediately and falls
  back to REST polling.
- Rider location is validated before upload (null, NaN, infinity and
  out-of-range coordinates are dropped).
- Signup-profile save failures no longer block a successful login.
- Removed the unused password-reset screens: customer and rider auth are
  passwordless OTP only.

### Known limitations

- Online payments are disabled until a real gateway replaces the backend stub.
- Background GPS is declared/configured but not verified on a physical device.
- No restaurant or admin UI in this repository (APIs only).
- In-app route polylines are not implemented; navigation opens Google Maps.

## [Unreleased]

- Proposed short-lived WebSocket tracking ticket to remove the access token from
  the socket URL (see `../docs/websocket-token-proposal.md`). Not implemented.

# `mobile_app/` — Google Maps Platform Plan

**Stack (assumed Flutter, per repo structure):** customer app + rider app
**Role in this system:** all rendering, address capture, autocomplete, and navigation hand-off. Never holds the backend's Distance Matrix key. Holds its own Android/iOS keys for on-device SDKs only.

**Prerequisite:** none of this phase-by-phase work should start until someone actually opens `mobile_app/` and confirms what's already there — the earlier assumption that this folder has zero Maps integration is unverified. Treat every phase below as "confirm, then build if missing."

---

## Phase M0 — Audit + Key Setup

1. Open `mobile_app/` and check for `google_maps_flutter`, `google_places_flutter` or equivalent packages already in `pubspec.yaml`.
2. Check `android/app/src/main/AndroidManifest.xml` and `ios/Runner/AppDelegate.swift` for existing key references.
3. If missing: generate Android key (restrict by package name + SHA-1 cert) and iOS key (restrict by bundle ID) in Cloud Console — separate from backend's key.
4. Record findings in `mobile_app/docs/maps-status.md` so this doesn't get re-audited from scratch next time.

**Exit criteria:** known, documented state of what's already built vs. missing, before any new code is written.

---

## Phase M1 — Map Rendering (Customer + Rider)

**Where:** `mobile_app/lib/features/maps/` (adjust to actual path once M0 audit is done)

1. Add `google_maps_flutter` if not present.
2. Build one reusable `MapView` widget — takes a list of markers + optional polyline, used by both customer and rider apps rather than two separate implementations.
3. Customer app: used in address-confirmation screen and order-tracking screen.
4. Rider app: used in the active-delivery screen, showing restaurant → customer markers.

**Exit criteria:** both apps can render a map with static markers, shared widget code (not duplicated).

**Cost:** $0, always free regardless of load count.

---

## Phase M2 — Address Capture: Pin Drop + Autocomplete

**Where:** `mobile_app/lib/features/address/` (customer app)

1. Pin-drop: draggable marker on `MapView`, reads back lat/lng on release.
2. Autocomplete: add `google_places_flutter` (or equivalent), build `AddressSearchField` widget as an alternative entry method alongside pin-drop.
3. **Session token discipline is the single most important detail here** — one token per search session (first keystroke → place selection or abandonment), reused across every request in that session, discarded after. Implemented wrong, this is the one part of the whole Maps integration that can meaningfully blow up cost.
4. Decide, with backend (`MAPS_PLAN_BACKEND.md` Phase B2): does this screen call Google Geocoding directly for reverse-geocoding the pin-drop coordinate, or send the raw coordinate to the backend and let it geocode server-side? Recommendation: send raw coordinate to backend — keeps the geocoding key server-side only, and avoids two different systems independently deciding how to geocode the same address.

**Exit criteria:** customer can set an address via either method; whichever geocoding path is chosen, it's agreed upon rather than duplicated between mobile and backend.

**Cost:** Autocomplete $0 at MVP scale with correct session tokens. Geocoding: $0 if backend-mediated per B2's caching, otherwise mobile-side calls need their own dedupe logic.

---

## Phase M3 — Live Rider Tracking Display (Customer App)

**Where:** `mobile_app/lib/features/tracking/`

**Depends on:** `MAPS_PLAN_BACKEND.md` Phase B3/B5 (WebSocket) — but works today against the existing poll endpoint.

1. **Immediate (works now):** poll `GET /orders/{id}/rider-location` every 3–5 seconds while order status is "Rider Assigned" or later, update marker position on `MapView`. Stop polling on terminal status or when response indicates stale/null location.
2. **Upgrade path (once backend Phase B3 lands):** switch to WebSocket subscription instead of polling — same visual result, lower request overhead, no billing difference either way since this isn't a Google API call.
3. Handle the documented 409 (terminal order) and null (stale location) cases explicitly in UI — don't just show a frozen or broken marker.

**Exit criteria:** customer sees a moving rider marker during active delivery, using whichever transport (poll or WebSocket) backend currently supports — this phase shouldn't block on B3 landing first.

**Cost:** $0 — not a Google-billed interaction, only the underlying `MapView` render is a Maps SDK component and that's already free.

---

## Phase M4 — Rider Navigation Hand-off (Rider App)

**Where:** `mobile_app/lib/features/rider/navigation/`

1. Add `url_launcher`.
2. "Navigate" button constructs a deep-link: `google.navigation:q=<lat>,<lng>` (Android) or the iOS equivalent Maps URL scheme, targeting restaurant coordinates first, then customer coordinates after pickup.
3. This hands off to the installed Google Maps app — no Directions API call, no in-app route rendering, no additional billing.
4. Only build in-app Directions rendering instead of this if there's a firm product requirement to keep the rider inside the SpeedyMeals app during navigation — flag this as a decision point, not a default.

**Exit criteria:** rider taps Navigate, external Maps app opens pre-filled with the correct destination for the current delivery stage.

**Cost:** $0.

---

## Phase M5 — Rider Location Push (Sender Side)

**Where:** `mobile_app/lib/features/rider/location/`

1. Background service (while rider is "Online" or on an active order) sends `{order_id, lat, lng}` via `PATCH /wallet/location` every 3–5 seconds — this backend endpoint already exists and is confirmed working.
2. Stop sending when rider goes offline or order reaches terminal status — matches backend's TTL-based staleness handling, and saves battery.
3. No Google API involved on the sending side either — this is a plain HTTPS call to your own backend.

**Exit criteria:** rider's position reliably reaches Redis via the existing endpoint; verify against real device GPS drift/accuracy, not just simulator coordinates.

---

## Phase M6 — Testing

1. Verify Autocomplete session billing empirically: run a test address-search session, check Cloud Console → Places API usage shows session-rate billing, not per-keystroke.
2. Verify map load count roughly matches expected screen-open frequency (sanity check against Cloud Console, even though it's free — catches accidental re-render loops early).
3. Field-test rider location push + customer poll/WebSocket display together on real devices, not just emulators — GPS behavior differs meaningfully.

---

## Summary

| Phase | Depends on backend? | Cost |
|---|---|---|
| M0 Audit | No | — |
| M1 Map rendering | No | $0 |
| M2 Address capture | Optional (B2) | $0 |
| M3 Live tracking display | Works now, better with B3 | $0 |
| M4 Navigation hand-off | No | $0 |
| M5 Location push | Existing endpoint | $0 |
| M6 Testing | — | — |

Mobile app carries no Google Maps Platform billing risk on its own — every cost driver in this whole system lives in `backend/`'s Distance Matrix usage. Mobile's job is correctness and UX, not cost containment (aside from Autocomplete session tokens, which is about correctness of implementation, not active cost management).

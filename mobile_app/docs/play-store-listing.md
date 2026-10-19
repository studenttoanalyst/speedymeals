# Play Console — Store listing pack

Everything below is ready to paste into Google Play Console → **Store listing**.
Character limits (title ≤ 30, short description ≤ 80, full description ≤ 4000)
are verified by command at the end of this document.

---

## 1. Identity

| Field | Value |
|---|---|
| App title (≤ 30) | `SpeedyMeals - Food Delivery` (27 chars) |
| Short description (≤ 80) | `Order food from local restaurants, follow your rider live, pay cash on delivery` (79 chars) |
| Full description | see §4 (≈ 1,600 chars, well under 4,000) |
| Application id | `com.speedymealservices.app` (final — cannot change after publish) |
| Version | `versionName 1.0.0` / `versionCode 1` (`pubspec.yaml`) |
| Category (primary) | **Food & Drink** |
| Alternative category (optional) | Maps & Navigation (rider live tracking) |
| Contact email | `support@speedymealservices.com` (from `AppConstants.supportEmail`) |
| Contact name / phone (Play requires) | **ACTION NEEDED — your details** |
| Website | `https://speedymealservices.com` |
| Privacy policy URL | `https://speedymealservices.com/privacy` |

## 2. Graphics assets (checklist)

| Asset | Size | Status |
|---|---|---|
| App icon | 512 × 512 PNG, 32-bit, no transparency | ⚠️ **ACTION NEEDED** — the project only ships density mipmaps up to 192×192; export 512×512 from the same artwork (adaptive icon background is `#E53935`, foreground `launcher_icon`) |
| Feature graphic | 1024 × 500 | ⚠️ **ACTION NEEDED** — design asset, none in repo |
| Phone screenshots | min 2, max 8; 16:9 or 9:16; min 1080 px short edge | ⚠️ **ACTION NEEDED** — must be captured from the **release build** (§3) |
| Tablet / 7" screenshots | optional (1 per device class) | optional for launch |

## 3. Screens to capture (release build, light theme, real-ish data)

1. **Dashboard** — restaurant list with distances and ratings.
2. **Restaurant + menu** — items, prices, GST-inclusive total.
3. **Cart / checkout preview** — COD-only payment section, backend totals.
4. **Live order tracking** — rider marker on the map + progress steps.
5. **Order history** — past orders with statuses.
6. **Rider dashboard** (separate listing or the same app's other mode) —
   online toggle, active job card with map preview.
7. **Account & deletion / Profile** — proves the Play requirement exists
   (nice-to-have, not mandatory).

Capture on a **portrait physical device** at 1080 × 1920 or 1080 × 2340.
Hide your real phone number/name in order data — use a test account.

## 4. Full description (paste as-is)

```
SpeedyMeals delivers food from restaurants near you, with a rider you can
follow on the map, and cash on delivery.

FOR CUSTOMERS
• Sign in with your phone number and a one-time code — no password to remember.
• Browse restaurants near a saved address, with real distances, ratings and
  delivery times.
• Build a cart and see the real bill before you order: subtotal, GST, delivery
  fee and platform fee are all calculated by the server — the app never invents
  a price.
• Pay with Cash on Delivery. (Online payment is intentionally not offered in
  this release: the gateway is not connected yet, so SpeedyMeals will never ask
  you for money through a payment method that does not work.)
• Watch your order live: follow your rider's position on the map in real time,
  with order status from accepted to delivered.
• Reorder a past order in one tap and rate the restaurant and rider afterwards.
• Saved addresses, order history, notifications and legal links (Terms,
  Privacy Policy) are always available from your profile.

FOR RIDERS
• Sign up with your phone number, submit your CNIC, licence and vehicle
  documents, and wait for admin approval.
• Go online, receive nearby delivery offers and accept or reject them.
• Follow the delivery step by step: arrived at restaurant, picked up, on the
  way, delivered.
• Navigate to the restaurant or the customer with one tap in Google Maps.
• Track your wallet: earnings, COD eligibility, recharges and cash deposits,
  with a cash collection cap that keeps your balance safe.

YOUR DATA, YOUR CHOICE
• SpeedyMeals collects only what a delivery needs: your phone number, your
  name, your addresses, your order history and — for riders — your location
  while you are working.
• Riders see a plain-language notice before location is ever requested,
  including that location continues during an active delivery while the app is
  in the background, shown as a notification you can see.
• You can delete your account from the app or on the web at
  https://speedymealservices.com/delete-account. Customers are deleted
  immediately; riders are reviewed after a short grace period. Orders and
  payments are kept in anonymised form, never under your name.
• Location is encrypted in transit, and SpeedyMeals does not sell your data and
  does not show advertising.

SpeedyMeals — lightning fast delights.
```

## 5. Content rating questionnaire (answers)

| Question | Answer |
|---|---|
| Violence | None |
| Sexual content | None |
| Fear / horror / gambling | None (no gambling, no loot boxes, no simulated gambling) |
| Drugs, alcohol, tobacco | None — menus are ordinary restaurant food; **no alcohol ordering** is supported. If any partner restaurant can list alcohol, change this answer to "Reference" before submitting |
| Offensive language | None in our copy; **user comments** on ratings are free text (see interaction) |
| User interaction | Yes — users can post a rating + comment per delivered order; comments are visible to the restaurant/platform and can be hidden by admins |
| Shares location | Yes — precise location, while the app is in use and (for riders) during an active delivery via a foreground service |
| Personal information | Yes — phone number, name, addresses |
| Users can chat / contact each other | No direct rider↔customer chat or PII exchange in-app |
| Unrestricted web access | Only the in-app Terms/Privacy/Delete-account links (owned domains) |
| **Predicted rating** | PEGI 3 / Everyone-style, **Teen** if the free-text comment interaction is counted — expect **Teen (13+)** |
| Ad declaration | **No ads** — no ad SDK, no ad slots, no advertising ID |
| Target audience | **18+ (recommended)** — COD cash handling and rider-side employment relationship; Play lets you change this later. If you prefer all ages, the questionnaire above still passes |

## 6. Data safety summary (one line each)

- Collected: name (optional), email (optional), phone number (required),
  saved addresses, precise location, order history and ratings, rider KYC
  photos, FCM device token.
- Shared for app functionality: phone number (SMS provider), addresses and
  location (Google Maps via backend), device token (Firebase), KYC photos
  (private object storage).
- Encrypted in transit: yes (HTTPS/WSS).
- Not collected: contacts, media library, advertising ID, crash/analytics data.
- Deletion: in-app and at `https://speedymealservices.com/delete-account`.
- Full text: `docs/play-console-data-safety.md`.

## 7. Release-track rules (verified by web search, 2026-10-19)

| Rule | Current requirement | Source |
|---|---|---|
| Target API level | From **31 August 2026** new apps and updates must target **Android 16 (API 36)** or higher. This project already targets **36** (Flutter 3.47 `FlutterExtension.targetSdkVersion`). | support.google.com/googleplay/android-developer/answer/11926878 and developer.android.com/google/play/requirements/target-sdk |
| Closed testing (new **personal** accounts created after 13 Nov 2023) | A **closed test with at least 12 opted-in testers, continuously for 14 days**, before you can apply for production access. Business/developer-organization accounts and accounts created before that date may be exempt — check your own account type in Play Console. | support.google.com/googleplay/android-developer/answer/14151465 |
| Play App Signing | Enrol the app; Google holds the app signing key and you upload with an **upload key** (the keystore you create locally — see README). | Play Console → Setup → App signing |

---

## 8. Length verification (run in `mobile_app/`)

```
title       = "SpeedyMeals - Food Delivery"      -> 27 / 30
short desc  = "Order food from local restaurants, follow your rider live, pay cash on delivery" -> 79 / 80
full desc   = the fenced block in §4             -> under 4000
```

Re-run the counts after any edit:

```bash
cd mobile_app
python - <<'EOF'
t="SpeedyMeals - Food Delivery"
s="Order food from local restaurants, follow your rider live, pay cash on delivery"
print("title", len(t)); print("short", len(s))
EOF
```

# Play Console — Data safety declaration

Fills in Google Play Console → **App content → Data safety**. Every line is
derived from what the code actually does (`mobile_app/lib/`, merged
`AndroidManifest.xml`, and the FastAPI endpoints) and matches
`docs/account-deletion/privacy-policy-addendum.md` and the in-app deletion flow.

**Completed by:** the developer account owner. Values are written out so the
form can be filled in directly.

---

## 1. Global answers

| Question | Answer |
|---|---|
| Does your app collect or share any of the required data types? | **Yes** |
| Is all of this data collected, shared, or both? | **Collected and shared** (shared with processors listed in §3) |
| Is data encrypted in transit? | **Yes** — all API traffic is HTTPS/TLS 1.2+; live tracking uses WSS. The release `network_security_config.xml` blocks cleartext HTTP for every host; the `localhost`/`10.0.2.2` dev allowlist exists only in the debug source set and never ships in the Play AAB (verified by artifact scan). |
| Can users request data deletion? | **Yes** — in-app (Profile → Delete account; Rider → Account & deletion) and on the web at `https://speedymealservices.com/delete-account` |
| Data handling reviewed against Play policy? | **Yes** (2026-10-19 release audit) |

**Account creation:** Yes — phone number + SMS OTP (no password, no email
verification).

---

## 2. Data types collected / shared

Legend: **C** = collected, **S** = shared with a third party, **T** = transferred
off-device, **P** = processed on-device only.

### Personal info

| Data | C | S | Collected | Shared for | Ephemeral? | Required? | Deletion |
|---|---|---|---|---|---|---|---|
| Name | ✅ | ❌ | Account creation / profile edit | — | No | Optional (required to create an account? name has a default) | Web / in-app deletion (row anonymised) |
| Email address | ✅ | ❌ | Optional profile field | — | No | Optional | Web / in-app deletion (cleared) |
| Phone number | ✅ | ✅ | Login (OTP) and account identity | **SendPK SMS gateway** sends the OTP | OTP is 5 min TTL; phone number is stored as the account id | **Required** | Deleted/anonymised to `deleted:<id>` on account deletion |
| Mailing address (street, city, label) | ✅ | ✅ | Saved delivery addresses | **Google Maps/Places via backend** for geocoding | No | **Required** to browse (the backend needs an address id) | Address rows deleted when the account is deleted |
| User IDs (account UUID, role) | ✅ | ❌ | Internal | — | No | Required | Row anonymised, kept for accounting |

### Location

| Data | C | S | Collected | Shared for | Precision | Required? |
|---|---|---|---|---|---|---|
| Precise location (customer) | ✅ | ✅ | Only when the customer taps **Use my current location** or drops a pin | Sent to the backend for geocoding/reverse geocoding (backend → Google Maps) | Precise (device GPS) | Optional — addresses can be typed manually |
| Precise location (rider) | ✅ | ✅ | Rider goes online; during an active delivery the foreground service keeps publishing (`PATCH /wallet/location`, 30 s throttle) | Sent to the backend so customers can follow the rider on the map | Precise (device GPS) | Required to work as a rider |

**Disclosure:** a prominent in-app dialog
(`lib/widgets/location_disclosure.dart`) is shown **before** the first OS
permission prompt, stating what is collected, why, and that during an active
delivery it continues while the app is in the background or the screen is off.
Background collection runs only as a **foreground service with a visible
notification**; `ACCESS_BACKGROUND_LOCATION` is not declared, so the Play
*Background location* declaration form is **not** required — the *foreground
service (location)* declaration is.

### Photos and videos

| Data | C | S | Collected | Shared for | Required? |
|---|---|---|---|---|---|
| Rider KYC documents (CNIC photo, driving licence photo, vehicle photo) | ✅ | ✅ | Rider document upload screen (`POST /wallet/documents/{cnic\|license\|vehicle}`) | Stored in the app's private object storage (AWS S3 / Supabase Storage) | Required to be approved as a rider |
| Avatar | — | — | Not collected (the app renders the account's initial) | — | — |

### App activity

| Data | C | S | Collected | Shared for |
|---|---|---|---|---|
| Order history (items, restaurant, totals, status) | ✅ | ❌ | Placing and viewing orders | Never shared with third parties |
| Ratings and comments on an order | ✅ | ❌ | Order rating (1–5 stars + optional text) | Never shared with third parties |
| Payment method used (COD) | ✅ | ❌ | Checkout | Never shared with third parties. **No online payment data is collected: online payment is disabled** |
| Wallet / earnings / cash collection (rider) | ✅ | ❌ | Rider wallet operations | Never shared with third parties |

### Device and other identifiers

| Data | C | S | Collected | Shared for |
|---|---|---|---|---|
| FCM device token | ✅ | ✅ | Push registration (`POST /devices`) | Sent to **Firebase Cloud Messaging** (Google) to deliver order notifications |
| App language/region, device model (Android build info) | ✅ | ❌ | Platform defaults | — |
| Crash / diagnostics / analytics | ❌ | ❌ | **Not collected** — no Crashlytics, Analytics, Sentry or any analytics SDK is present in `pubspec.yaml` | — |
| Advertising ID | ❌ | ❌ | **Not collected** — the app has no ads | — |

---

## 3. Third parties (processors) the data is shared with

| Party | Data they see | Purpose | Claim in the form |
|---|---|---|---|
| **SendPK** (SMS gateway) | Phone number, OTP text | Sending login/OTP SMS | Shared: Phone number — Fraud prevention / account management? → **App functionality** |
| **Google Maps Platform** (through our backend) | Addresses, search text, coordinates | Distance matrix (delivery fee), geocoding, autocomplete | Shared: Location, Address — **App functionality** |
| **Firebase Cloud Messaging** (Google) | FCM device token | Order push notifications | Shared: Device or other IDs — **App functionality** |
| **AWS S3 / Supabase Storage** | Rider KYC photos | Secure private storage of documents | Shared: Photos — **App functionality** |
| **Hosting/DB provider** (PostgreSQL host) | Everything, since the backend runs there | Operating the service | Is the backend provider a "third party"? If you host on your own VM: **No** (first party). If you use a managed platform (e.g. Supabase/Render), list it as shared for **App functionality**. |

**No data is sold, used for advertising, or used for analytics.**

---

## 4. Deletion answers (exact wording)

- **Data deletion URL:** `https://speedymealservices.com/delete-account`
- **Privacy policy URL:** `https://speedymealservices.com/privacy`
- **Account creation:** Yes — phone number verified by SMS OTP.
- **Play's "Account deletion" section:** the app offers deletion **both in the
  app and via the URL above**:
  - Customer: Profile → *Delete account* → immediate, blocked only while an
    order is active (409 with an explanatory message).
  - Rider: Rider dashboard → *Account & deletion* → request, 7-day grace, admin
    review; cancellable while `pending`/`on hold`.
  - Web: phone number + OTP request/confirm, same backend rules.
  - What happens: name/email/phone/CNIC are anonymised or cleared, addresses,
    refresh tokens and FCM tokens are removed; **orders and payments are kept in
    anonymised form** (the app is never deleted, only the personal data).
  - The web page must stay reachable **without signing in**.

Checklist before submitting the form: the privacy policy page must already be
live and contain the "Data Deletion" section from
`privacy-policy-addendum.md`.

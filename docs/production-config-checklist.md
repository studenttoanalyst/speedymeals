# SpeedyMeals production configuration checklist

**Purpose:** every environment variable the backend reads, what it controls,
and what breaks when it is missing or wrong. **Names only — no values in this
file.** Set values in the server's `.env` / systemd `Environment=` /
secret manager, never in git.

Source of truth: `backend/app/core/config.py` (`class Settings`). Anything not
listed there is not read by the backend.

Legend for **If missing**:

- **WILL NOT START** — the field has no default, so `app.core.config` raises at
  import and every worker fails to boot.
- **Degrades** — the app boots and the feature quietly stops working or falls
  back to a development behaviour. These are the dangerous ones.

---

## 1. Core / startup

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `ENVIRONMENT` | `development` | Degrades | Set to `production`. `development` keeps the password-reset link on stdout (a live token in logs) and allows local seeding behaviour. |
| `DATABASE_URL` | — | **WILL NOT START** | PostgreSQL DSN. Must point at the production database, never the dev one. |
| `JWT_SECRET` | — | **WILL NOT START** | Signs every access/refresh token. Rotating it logs every user out. |
| `JWT_ALGORITHM` | `HS256` | Degrades (uses HS256) | Leave at `HS256` unless the whole token stack is changed. |
| `JWT_EXPIRE_MINUTES` | `30` | Degrades (30 min) | Access-token lifetime. The deleted-account denylist TTL is derived from this value, so raising it widens the window in which a deleted user's live token still works if Redis is down. |
| `REDIS_URL` | — | **WILL NOT START** | See section 6 — Redis must run continuously. |

## 2. Storage (rider KYC documents, menu photos)

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | — | **WILL NOT START** | Required even when using Supabase Storage, because the storage client is constructed at import. |
| `AWS_SECRET_ACCESS_KEY` | — | **WILL NOT START** | As above. |
| `AWS_REGION` | `us-east-1` | Degrades (us-east-1) | Must match the bucket region. |
| `S3_BUCKET_NAME` | `speedymeals-docs` | Degrades (wrong bucket) | Rider document uploads and menu-item photos fail. |
| `S3_ENDPOINT_URL` | none | Degrades | Only for S3-compatible endpoints; leave empty for real AWS. |
| `SUPABASE_URL` | none | Degrades | When set, Supabase Storage is used instead of S3 for public assets. |
| `SUPABASE_STORAGE_URL` | none | Degrades | Public base URL for Supabase-hosted files. |

## 3. Google Maps / places (address + delivery pricing)

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `GOOGLE_MAPS_API_KEY` | — | **WILL NOT START** | Server-side key for distance matrix / reverse geocode. Restaurant browse, checkout delivery fee and live tracking ETA all depend on it. Restrict it to the server IP range. |
| `GOOGLE_PLACES_API_KEY` | `""` | Degrades | Address autocomplete/details return 503. The app falls back to manual pin drops. |
| `MAPS_DAILY_CALL_BUDGET` | `300` | Degrades (300) | Hard call budget; once exhausted, distance/pricing calls fail until the next day. |

## 4. Auth, SMS gateway, push

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `SMS_MODE` | `console` | **Degrades silently — critical** | Must be `sendpk` in production. `console` does not send SMS: it prints the OTP to server stdout, so nobody can log in and the OTP is written to logs. |
| `SENDPK_API_KEY` | `""` | Degrades (no SMS) | Live SMS gateway credential. Without it no customer or rider can receive an OTP. |
| `SENDPK_API_URL` | SendPK endpoint | Degrades | Leave default unless the provider changes. |
| `SENDPK_SENDER_ID` | `SpeedyMeals` | Degrades | Must be an approved sender ID. |
| `SENDPK_TEMPLATE_ID` | `""` | Degrades | Required by some SendPK accounts; empty may cause rejected sends. |
| `OTP_TEMPLATE` | built-in text | Degrades | Must contain `#code#` (or `{code}`) or the OTP is not substituted. |
| `FIREBASE_CREDENTIALS_JSON` | `""` | Degrades (push off) | Service-account JSON as a single line. Never commit it. |
| `FIREBASE_CREDENTIALS_PATH` | `""` | Degrades (push off) | Alternative to the JSON variable for file-based deployments. |
| `WEB_PUSH_BASE_URL` | `https://speedymealservices.com` | Degrades | Origin used to build click-through links in push payloads. |
| `FIRST_ADMIN_EMAIL` | `admin@speedymealservices.com` | Degrades | Seeded on startup only when no admin exists. |
| `FIRST_ADMIN_PASSWORD` | `admin123` | **Security risk** | The default is public knowledge. Set a strong value before first boot, or an admin account with a known password is created. Change it immediately if the default ever shipped. |

## 5. CORS / browser origins

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `ALLOWED_ORIGINS` | localhost + speedymeals domains | Degrades (default list) | Comma-separated or JSON list. Must contain the admin portal and website origins. `*` disables credentials and must never ship. `main.py` additionally hardcodes a regex for `speedymealservices.com`, `speedymeals.pk` and `*.vercel.app`; keep them in sync if domains change. |

## 6. Redis (must run continuously)

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `REDIS_URL` | — | **WILL NOT START** | The client is resilient: if the server is unreachable it silently switches to an in-process store. In production that is not a safe substitute. |

**Redis must run continuously in production.** It holds OTP codes, login/resend
rate limits, active carts, live rider GPS positions, and the deleted-account
access-token denylist (`deleted:<subject_id>`).

If Redis is down:

- The access-token **denylist fails open**: a deleted account's already-issued
  token keeps working until it expires (`JWT_EXPIRE_MINUTES`, 30 min by default)
  even though its refresh token is revoked. This is deliberate — blocking every
  request when Redis hiccups would be a self-inflicted outage — but it means the
  denylist is only as available as Redis.
- OTPs and rate limits move into each worker's process memory, so a code issued
  by worker A cannot be verified on worker B, and rate limits become per-worker.
- Carts and live rider locations disappear or diverge between workers.

Deploy Redis with persistence and a restart policy, monitor it, and alert on
connection failures. Do not treat the in-memory fallback as a production mode.

## 7. Rider assignment and cash

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `RIDER_ASSIGNMENT_TIMEOUT_SECONDS` | `60` | Degrades (60) | How long a rider has to accept an offer before it is re-offered. |
| `ASSIGNMENT_SWEEPER_INTERVAL_SECONDS` | `15` | Degrades (15) | Sweeper frequency. |
| `ASSIGNMENT_SWEEPER_ENABLED` | `true` | Degrades | Must stay enabled unless the sweep is scheduled out of process; otherwise offers never expire and unassigned orders are never retried. |
| `CASH_COLLECTION_CAP` | `5000` | Degrades (5000) | Maximum COD cash a rider may hold before new COD orders are refused. |

## 8. Online payments

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `ONLINE_PAYMENTS_ENABLED` | `false` | **Stays off (correct default)** | The digital payment path is a stub (`_process_digital_payment` returns `STUB-DIGITAL-...`); no money is ever collected. While false: checkout-preview returns `online_payments_enabled: false`, the app hides "Pay Online" and shows COD only, and `payment_method=Digital` is rejected with HTTP 400. Set true **only** after a real gateway replaces the stub. |

## 9. Account deletion (Google Play compliance)

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `RIDER_DELETION_GRACE_DAYS` | `7` | Degrades (7) | Grace period before a rider request becomes reviewable. |
| `ALLOW_EARLY_ADMIN_APPROVAL` | `false` | Degrades (false) | When false, admins can only approve after the grace period. Dues and active deliveries always block, regardless. |
| `DELETION_REQUEST_OVERDUE_DAYS` | `30` | Degrades (30) | Age at which a request is flagged overdue in the admin queue. |
| `DELETION_REVIEW_JOB_ENABLED` | `true` | Degrades | Must be true **or** the job must be scheduled out of process (`python -m app.core.deletion_review_job`), otherwise requests never reach the admin queue. |
| `DELETION_REVIEW_JOB_INTERVAL_SECONDS` | `3600` | Degrades (3600) | In-process job frequency. |

---

## 10. Mobile release build (not backend env)

| Variable | Default | If missing | Notes |
|---|---|---|---|
| `API_BASE_URL` | none | **App cannot reach the backend** | Passed at build time with `--dart-define=API_BASE_URL=https://<api-host>`. Without it a release build fails loudly on the first request instead of silently using localhost. |

### `google-services.json` (tracked on purpose)

`mobile_app/android/app/google-services.json` **is committed**. It contains only
public Firebase client identifiers (project id, API key, sender id) that are
embedded in every installed APK anyway; it is not a service-account key and
cannot authorise backend access. It is required for the Android FCM build, so it
stays tracked and is explicitly un-ignored in `.gitignore`. Backend service
account keys (`*-firebase-adminsdk-*.json`, `backend/app/secrets/`) and Android
signing material (`key.properties`, `*.jks`) must never be committed.

---

## 11. Minimum production set (names only)

At a minimum, a production deployment must define:

```
ENVIRONMENT
DATABASE_URL
JWT_SECRET
JWT_EXPIRE_MINUTES
REDIS_URL
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
GOOGLE_MAPS_API_KEY
GOOGLE_PLACES_API_KEY
ALLOWED_ORIGINS
SMS_MODE
SENDPK_API_KEY
SENDPK_SENDER_ID
SENDPK_TEMPLATE_ID
FIRST_ADMIN_EMAIL
FIRST_ADMIN_PASSWORD
FIREBASE_CREDENTIALS_JSON
ONLINE_PAYMENTS_ENABLED
RIDER_DELETION_GRACE_DAYS
DELETION_REVIEW_JOB_ENABLED
```

Everything else has a safe default. Re-check this list whenever
`backend/app/core/config.py` gains a field.

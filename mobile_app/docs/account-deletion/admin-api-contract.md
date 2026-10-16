# Account deletion — API contract

Authoritative for:

- the admin panel (`manage_deletion_requests` permission) — section 1
- the hosted web page (`https://speedymealservices.com/delete-account`) — section 3
- the mobile rider flow — section 4

Backend: `backend/app/platform/account_deletion/` (see `backend-deletion-proposal.patch`).
All timestamps are ISO-8601 UTC (`2026-10-23T12:00:00+00:00`); all amounts are PKR floats.

Statuses: `pending` → `ready_for_review` → `approved` → `completed`, plus `cancelled` and `on_hold`.
`approved` is transient (it exists only while one approval executes), `completed` and `cancelled` are terminal.

---

## 1. Admin endpoints

Base: `/admin/deletion-requests`
Auth: `Authorization: Bearer <admin access token>`
Permission: **`manage_deletion_requests`** (superadmin always passes; other roles need it on their admin role).
Every action writes an `admin_audit_logs` row with the acting admin id (`domain: "account_deletion"`).

### 1.1 `GET /admin/deletion-requests`

Query parameters:

| name | type | default | notes |
|---|---|---|---|
| `status` | string | – | one of `pending`, `cancelled`, `ready_for_review`, `on_hold`, `approved`, `completed`. Unknown value → `400` |
| `page` | int ≥ 1 | `1` | |
| `page_size` | int 1–100 | `20` | |

**200 response**

```json
{
  "items": [
    {
      "id": "8f1c0d2e-1111-4222-8333-444455556666",
      "user_id": "a1b2c3d4-5555-4666-7777-888899990000",
      "role": "rider",
      "subject_name": "Rider Ahmed",
      "subject_phone": "+9230*****678",
      "status": "ready_for_review",
      "requested_at": "2026-10-16T12:00:00+00:00",
      "grace_ends_at": "2026-10-23T12:00:00+00:00",
      "requested_via": "app",
      "reviewed_by": null,
      "reviewed_at": null,
      "admin_note": null,
      "hold_reason": null,
      "kyc_action": null,
      "kyc_retain_until": null,
      "kyc_purged_at": null,
      "wallet_balance": 250.0,
      "pending_cash_owed": 900.0,
      "has_active_delivery": false,
      "can_approve": false,
      "blocking_reason": "Rider has unsettled dues (wallet balance Rs 250.00, collected cash Rs 900.00). These must be settled to zero before deletion.",
      "days_in_ready_for_review": 0,
      "is_overdue": false
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

Notes for the UI:

- `wallet_balance` / `pending_cash_owed` / `has_active_delivery` are read live on every list call.
- `can_approve` false + `blocking_reason` → render the approve button disabled with the reason.
- `is_overdue` true when `days_in_ready_for_review >= 30` (admin SLA flag, `DELETION_REQUEST_OVERDUE_DAYS`).
- `subject_phone` is always masked. The panel never receives a full number or a CNIC value.

### 1.2 `POST /admin/deletion-requests/{id}/approve`

**Request**

```json
{
  "kyc_action": "delete_now",
  "kyc_retain_until": null,
  "admin_note": "Dues clear, docs verified"
}
```

- `kyc_action` is required and must be `"delete_now"` or `"retain_until"` (otherwise `422`).
- `kyc_retain_until` is an ISO timestamp; required in practice when `kyc_action = "retain_until"`.
- `admin_note` optional, shown on the record.

**200 response** (the row after execution — same shape as a list item)

```json
{
  "id": "8f1c0d2e-1111-4222-8333-444455556666",
  "status": "completed",
  "kyc_action": "delete_now",
  "kyc_purged_at": "2026-10-24T09:15:00+00:00",
  "subject_phone": "(deleted)",
  "wallet_balance": 0.0,
  "pending_cash_owed": 0.0,
  "has_active_delivery": false,
  "can_approve": false,
  "blocking_reason": null,
  "...": "remaining fields as in 1.1"
}
```

**Errors**

| status | when | body |
|---|---|---|
| `403` | admin lacks `manage_deletion_requests` | `{"detail": "Missing required permission: 'manage_deletion_requests'"}` |
| `404` | unknown request id | `{"detail": "Deletion request not found."}` |
| `400` | already `completed` or `cancelled` | `{"detail": "This deletion request is already completed."}` |
| `409` | still inside the grace period and `ALLOW_EARLY_ADMIN_APPROVAL=false` | `{"detail": "The grace period has not ended. Early approval requires ALLOW_EARLY_ADMIN_APPROVAL=true."}` |
| `409` | **dues or an active delivery exist right now** | `{"detail": "Deletion blocked: Rider has unsettled dues (wallet balance Rs 250.00, collected cash Rs 0.00). These must be settled to zero before deletion."}` |

> On a dues/delivery `409` the server **also sets `status = "on_hold"` and writes `hold_reason`**
> before answering, so the queue shows why. Refresh the list after a 409 — the row has moved.
> Dues are never overridden by an approval.

### 1.3 `POST /admin/deletion-requests/{id}/hold`

**Request**

```json
{ "reason": "Waiting for the rider's cash deposit" }
```

`reason` required, 3–1000 chars (`422` otherwise).

**200**: updated row, `"status": "on_hold"`, `"hold_reason": "Waiting for the rider's cash deposit"`.
**409**: when the request is `completed` or `cancelled` (`{"detail": "A 'completed' request cannot be put on hold."}`).

### 1.4 `POST /admin/deletion-requests/{id}/release`

No body.

- **200** → `"status": "ready_for_review"` when `grace_ends_at <= now`,
  otherwise `"status": "pending"`; `hold_reason` becomes `null`.
- **409** → `{"detail": "Only a request that is on hold can be released."}`

### 1.5 `POST /admin/deletion-requests/{id}/purge-kyc`

No body. Deletes KYC files that were kept with `kyc_action = "retain_until"` and stamps `kyc_purged_at`.

- **200** → updated row with `"kyc_purged_at": "2026-11-01T10:00:00+00:00"` and cleared document references.
- **400** → `{"detail": "KYC documents for this request were already purged."}`

---

## 2. How decisions behave (rules the panel must respect)

| rule | behaviour |
|---|---|
| Rider data is never deleted automatically | the daily job only moves `pending` → `ready_for_review` and notifies admins; no endpoint other than **approve** removes data |
| Grace period | `RIDER_DELETION_GRACE_DAYS = 7`; approve before it ends only if `ALLOW_EARLY_ADMIN_APPROVAL=true` (default `false`) |
| Dues / active delivery | block approval at any moment; approval attempt → `409` + row `on_hold` with the reason |
| KYC files | removed only on `delete_now` (at approval) or later via `purge-kyc` (when `retain_until`); until then they stay in the private `rider-docs` bucket with no public URL and are not returned by any user-facing API |
| Orders / payments | never deleted — accounts are anonymised in place so history stays intact |
| Overdue SLA | `is_overdue` after 30 days in `ready_for_review` |

---

## 3. Public web endpoints (hosted deletion page)

Both are unauthenticated and rate limited (5/min per number, plus the 45 s OTP resend cooldown).

### `POST /account-deletion/request` → `202`

```json
{ "country_code": "+92", "phone_number": "3001234567" }
```

```json
{ "message": "If an account is registered with this number, a verification code has been sent. Enter it to continue." }
```

The response is **identical whether or not the number has an account** (no user enumeration).

### `POST /account-deletion/confirm` → `200`

```json
{ "country_code": "+92", "phone_number": "3001234567", "otp_code": "481902" }
```

Rider answer:

```json
{
  "result": "pending",
  "message": "Your account has been deactivated. After 7 days your request goes to admin review. Deletion happens only after approval and only if you have no pending dues.",
  "grace_ends_at": "2026-10-23T12:00:00+00:00",
  "requires_admin_review": true
}
```

Customer answer:

```json
{
  "result": "deleted",
  "message": "Your account and personal data have been deleted. Order and payment records are kept in anonymised form for accounting and legal reasons.",
  "grace_ends_at": null,
  "requires_admin_review": false
}
```

Unknown number (OTP valid but no account):

```json
{
  "result": "no_account",
  "message": "No SpeedyMeals account is registered with this phone number. If you think this is a mistake, contact support.",
  "grace_ends_at": null,
  "requires_admin_review": false
}
```

Errors: `400` wrong/expired OTP (`{"detail": "Incorrect OTP."}`), `400` malformed number,
`409` active order (customer) or active delivery (rider) with the message below, `429` rate limited.

```json
{ "detail": "You have an active or pending order. Please wait until it is delivered or cancelled, then delete your account." }
```

```json
{ "detail": "You still have an active delivery. Complete it, then request account deletion again." }
```

---

## 4. Mobile rider endpoints (what the app calls)

| call | endpoint | success | failure |
|---|---|---|---|
| Request deletion | `DELETE /users/me` | `200` `{ "message": "...", "request": { …grace_ends_at… } }` | `409` active delivery |
| Read status | `GET /users/me/deletion-request` | `200` `{ "request": null }` when none | `401` after execution |
| Cancel | `POST /users/me/deletion-request/cancel` | `200` `{ "message": "...", "request": { "status": "cancelled" } }` | `409` when not cancellable |
| Customer deletion (unchanged) | `DELETE /users/me` | `204` | `409` active/pending order |

`request` object (user-facing, no document URLs):

```json
{
  "id": "8f1c0d2e-1111-4222-8333-444455556666",
  "role": "rider",
  "status": "pending",
  "requested_at": "2026-10-16T12:00:00+00:00",
  "grace_ends_at": "2026-10-23T12:00:00+00:00",
  "requested_via": "app",
  "reviewed_at": null,
  "admin_note": null,
  "hold_reason": null,
  "kyc_action": null,
  "kyc_retain_until": null,
  "kyc_purged_at": null,
  "can_cancel": true,
  "days_until_review": 7
}
```

Cancellation while deactivated: the rider's access token stays valid for the whole grace period
(sessions are revoked only at execution), which is what lets the app read status and cancel.
A rider who lost the device cancels from the web page with phone + OTP instead.

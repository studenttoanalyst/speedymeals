# Production deployment checklist — account deletion

Applies to the account-deletion backend merged into `release-audit` (no patch to
apply) and the mobile flows in this app. Run top to bottom; each step has a
verification.

## 0. Before you deploy

- [ ] Confirm the merged branch contains `backend/app/platform/account_deletion/`
      and the migration: `git log --oneline -1` and
      `./venv/bin/alembic -c app/alembic.ini heads` (single head `d4a7c9e1f2b3`).
- [ ] Review the 4 new settings in `backend/app/core/config.py` (all have safe defaults):

| setting | default | meaning |
|---|---|---|
| `RIDER_DELETION_GRACE_DAYS` | `7` | days before a rider request enters review |
| `ALLOW_EARLY_ADMIN_APPROVAL` | `false` | approve before the grace ends (dues still enforced) |
| `DELETION_REQUEST_OVERDUE_DAYS` | `30` | `is_overdue` flag in the admin list |
| `DELETION_REVIEW_JOB_ENABLED` | `true` | run the job inside the API process |
| `DELETION_REVIEW_JOB_INTERVAL_SECONDS` | `3600` | how often it sweeps |

## 1. Database migration

- [ ] Backup first (`pg_dump`).
- [ ] Apply from `backend/`: `alembic -c app/alembic.ini upgrade head`
      (expect revision `d4a7c9e1f2b3`).
- [ ] Verify the table:
      `SELECT column_name FROM information_schema.columns WHERE table_name='deletion_requests';`
      → 15 columns (`id`, `created_at`, `user_id`, `role`, `status`, `requested_at`,
      `grace_ends_at`, `requested_via`, `reviewed_by`, `reviewed_at`, `admin_note`,
      `hold_reason`, `kyc_action`, `kyc_retain_until`, `kyc_purged_at`).
- [ ] Verify indexes: `ix_deletion_requests_user_id`, `ix_deletion_requests_user_role`,
      `ix_deletion_requests_status`, `ix_deletion_requests_status_grace`,
      `ix_deletion_requests_reviewed_by`.
- [ ] Verify the permission:
      `SELECT key FROM permissions WHERE key='manage_deletion_requests';` → 1 row, and
      `SELECT r.slug FROM admin_roles r JOIN admin_role_permissions rp ON rp.role_id=r.id
       JOIN permissions p ON p.id=rp.permission_id WHERE p.key='manage_deletion_requests';`
      → `superadmin`.
- [ ] Existing tests still pass, including drift protection:
      `pytest backend/app/tests/test_migration_drift.py backend/app/tests/test_account_deletion.py`
      (Python dependencies in §6).

## 2. Job scheduler — pick ONE of the two options

- [ ] **In-process (default):** leave `DELETION_REVIEW_JOB_ENABLED=true`. Confirm the log line
      at startup: `Deletion review job started (interval=3600s, grace=7d, overdue=30d)`.
- [ ] **Out of process:** set `DELETION_REVIEW_JOB_ENABLED=false` and schedule daily:
      `0 6 * * * cd /srv/speedymeals/backend && ./venv/bin/python -m app.core.deletion_review_job`
      (systemd timer equivalent is fine). Expect
      `Deletion review job: N request(s) moved to ready_for_review.`
- [ ] Confirm admins are notified: the job always writes a `ADMIN ALERT:` log line; with
      Firebase configured, active admins also get a push (`click_path=/admin/deletion-requests`).
- [ ] Re-run it twice on purpose — the second run must move `0` (idempotent).

## 3. Redis

- [ ] Redis must be reachable in production: it holds the **access-token denylist**
      (`deleted:<subject_id>`, TTL = access-token lifetime + 60 s) that makes an issued token die
      the moment a deletion executes, plus OTP storage and rate limiting.
- [ ] Verify: `redis-cli SETEX deleted:test 60 1` then `redis-cli GET deleted:test` → `1`.
- [ ] If Redis falls back to the in-memory store (multi-worker deployments), denylist entries
      would be per-process: **do not run more than one worker without a shared Redis.**
- [ ] Existing behaviour note: every authenticated request now issues one Redis `EXISTS`.
      Watch latency; the check fails open (a Redis hiccup never blocks traffic).

## 4. Object storage (KYC files)

- [ ] The executing identity needs `s3:DeleteObject` on the `rider-docs` prefix
      (bucket `speedymeals-docs`, or the Supabase `rider-docs` bucket).
      AWS managed policy to attach: `AmazonS3FullAccess` is overkill — scope it down:
      `{"Effect":"Allow","Action":["s3:DeleteObject","s3:GetObject"],"Resource":"arn:aws:s3:::speedymeals-docs/rider-docs/*"}`
- [ ] Supabase: service-role key must have DELETE on the private `rider-docs` bucket
      (never expose it; there is no public URL for these objects).
- [ ] Verify with a test object: `aws s3 rm s3://speedymeals-docs/rider-docs/probe.webp`
- [ ] Confirm no user-facing endpoint returns a document URL:
      `GET /wallet/profile` returns `has_cnic_photo` / `has_license_photo` / `has_vehicle_photo` booleans only.

## 5. Permissions and admin panel

- [ ] Grant `manage_deletion_requests` to any non-superadmin role that should review deletions
      (`/admin/roles` → role → permissions). Without it the endpoints answer `403`.
- [ ] Give the web developer `admin-api-contract.md` (request/response JSON for all five
      endpoints, including the `409` + `on_hold` behaviour).
- [ ] Wire the panel: list with `status` filter + pagination, disable Approve when
      `can_approve=false` and show `blocking_reason`, badge `is_overdue`.
- [ ] Every action must show the audit trail: `admin_audit_logs` rows with
      `domain='account_deletion'`, `action` in
      `DELETION_REQUEST_APPROVED | DELETION_REQUEST_ON_HOLD | DELETION_REQUEST_HOLD |
       DELETION_REQUEST_RELEASED | DELETION_REQUEST_PURGE_KYC |
       DELETION_REQUEST_COMPLETED | DELETION_REQUEST_READY_FOR_REVIEW`.

## 6. Environment / build

- [ ] Install the backend requirements (`Pillow` is included; `app.core.storage` imports
      PIL at module load): `./venv/bin/pip install -r app/requirements.txt`, then
      `python -c "from app.core.storage import delete_rider_document_url"`.
- [ ] `.env` must define `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (already required today) and
      optionally the new deletion settings.
- [ ] Restart the API and confirm `/docs` lists the new routes:
      `DELETE /users/me`, `GET|POST /users/me/deletion-request`, `POST /account-deletion/request`,
      `POST /account-deletion/confirm`, `GET /admin/deletion-requests` and the four actions.

## 7. Smoke test (staging)

- [ ] Rider: `DELETE /users/me` → `200` with `grace_ends_at = now + 7d`, account `is_active=false`.
- [ ] `GET /users/me/deletion-request` → the same request; `POST …/cancel` → `cancelled`, account active again.
- [ ] Force a grace end (`UPDATE deletion_requests SET grace_ends_at = now() - interval '1 minute'`)
      and run the job → `ready_for_review`, rider row unchanged.
- [ ] Set `wallet_balance = 100` → approve → `409` and `status='on_hold'` with the reason.
- [ ] Set it back to `0` → approve with `kyc_action='delete_now'` → `completed`, files gone,
      `DELETE`-issued access token now answers `401`.
- [ ] Customer: `DELETE /users/me` → `204`; with an active order → `409`.
- [ ] Web: `/account-deletion/request` twice for an unknown number → identical `202` bodies.

## 8. Store listing / legal

- [ ] Play Console → Data safety / Account deletion URL: `https://speedymealservices.com/delete-account`.
- [ ] Publish the privacy-policy copy from `privacy-policy-addendum.md` and host the page from
      `web-deletion-page-copy.md` (both live outside this repo — `website/` was not touched).

## 9. Rollback

- [ ] `alembic -c app/alembic.ini downgrade -1` drops `deletion_requests` and the seeded permission (it does **not**
      touch accounts, orders or payments — this feature never deleted business data outside an
      approved request).
- [ ] Set `DELETION_REVIEW_JOB_ENABLED=false` to stop the job, or disable the new routes by
      reverting the merge commit.
- [ ] Denylist keys expire on their own (TTL ≈ 31 min), so no Redis cleanup is needed.

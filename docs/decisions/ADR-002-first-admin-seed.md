# ADR-002: First Admin Account via Auto-Seed on Startup

## Status
Accepted

## Context
Admin login is email+password only. There is no admin self-signup form (by design — anyone
being able to sign up as admin would be a security hole). This creates a chicken-and-egg
problem: on a fresh database, no admin exists, so no one can log in to create one either.

Two options were considered:
- **Option 1 — Manual seed script**: a one-off script (`create_first_admin.py`) run by hand
  on the server once, then discarded/disabled.
- **Option 2 — Auto-seed on app startup**: on every app startup, check if any admin row
  exists; if not, create one from env vars.

## Decision
**Option 2 is locked.** On startup (`main.py` / FastAPI startup event):
1. Query `admins` table — does any row exist?
2. If no row exists, read `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` from `.env`,
   bcrypt-hash the password, insert one admin row with role `super_admin`.
3. If a row already exists, do nothing (no-op, safe to run on every deploy).

## Consequence
- No manual step required when standing up a new environment (local, staging, AWS) — matches
  how this will need to work once Phase 12 (Deployment) is reached.
- `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` must never be committed with real values —
  `.env` stays gitignored; production values move to AWS Secrets Manager later (Rule 12).
- Operator should change the seeded admin's password via the Admin Panel after first login;
  the seed values in `.env.example` are placeholders only, not meant for real use.
- Rejected Option 1 (manual script) because it requires someone to remember to run it by hand
  on every fresh environment — easy to forget, and doesn't fit the "automatic deploy" direction
  the project is already headed in.

# SpeedyMeals — Admin RBAC Infrastructure
## Implementation Plan (Discord-style Role Creation)

---

## 1. Problem & Current State

Repo (`studenttoanalyst/speedymeals`, `main`, inspected live) currently has:

- `admins` table: `email`, `password_hash`, `role` (plain string: `"super_admin"` / `"support"`), `is_active`. No granularity.
- `RBAC` today = `require_role(["admin"])` at the FastAPI dependency layer (`app/platform/auth/dependencies.py`) — checks JWT `role` claim against a hardcoded allow-list. Binary: you're an admin or you're not. No per-action permission.
- Frontend admin routes exist (`app/admin/*`) but no permission-gating UI.

Goal: superadmin can create custom admin roles (like Discord role creation) — name a role, pick a color/icon, toggle specific permissions (e.g. "Manage Restaurants", "Process Payouts", "View Reports"), then assign that role to an admin account. Permission checks enforced both in UI (hide/disable) and API (source of truth).

---

## 2. Data Model

Replace the single `role: str` column on `admins` with a proper many-to-many permission system.

```
permissions               admin_roles                admin_role_permissions
------------------        ------------------------    ------------------------
id (uuid, pk)              id (uuid, pk)               role_id (fk -> admin_roles.id)
key (str, unique)          name (str, unique)          permission_id (fk -> permissions.id)
label (str)                color (str, hex)            PRIMARY KEY (role_id, permission_id)
category (str)             icon (str, optional)
description (str)          is_system (bool)             admins
                            created_by (fk admins.id)   ------------------------
                            created_at                   id, email, password_hash,
                                                          role_id (fk -> admin_roles.id, nullable during migration)
                                                          is_active, created_at
```

**Design notes:**
- `permissions` is a seeded, code-owned table (not editable via UI) — every permission maps to a real guarded action/route. Grouped by `category` for the UI (Restaurants, Riders, Orders, Settlements, Reports, System).
- `admin_roles` is the thing superadmin creates — name, color (for the pill/badge, Discord-style), optional icon.
- `admin_role_permissions` is the join table — what a role can actually do.
- `is_system = true` flags the two roles that must always exist and can't be deleted: **Superadmin** (all permissions, implicit — bypasses the permission check entirely) and a fallback **Support** role, so existing accounts migrate cleanly.
- `admins.role_id` replaces `admins.role`. Migration: create `Superadmin` and `Support` system roles, map every existing `role="super_admin"` → Superadmin role_id, every `role="support"` → Support role_id, drop the old `role` string column once verified.

### Suggested seed permission keys (extend as needed)
```
restaurants.view          restaurants.manage        restaurants.commission.edit
riders.view                riders.manage              riders.approve
orders.view                 orders.manage (cancel/reassign)
settlements.view          settlements.process
payouts.view                payouts.process
customers.view              customers.manage
promotions.view            promotions.manage
reports.view
admins.manage_roles        admins.manage_accounts     (superadmin-only in practice, but still real keys)
```

---

## 3. Backend Changes (FastAPI)

### 3.1 New module: `app/modules/admin_roles/`
- `models.py` — `Permission`, `AdminRole`, `admin_role_permissions` association table.
- `schemas.py`:
  - `PermissionResponseSchema` (id, key, label, category, description)
  - `AdminRoleCreateSchema` (name, color, icon?, permission_keys: list[str])
  - `AdminRoleUpdateSchema` (name?, color?, icon?, permission_keys?)
  - `AdminRoleResponseSchema` (id, name, color, icon, is_system, permissions: list[PermissionResponseSchema], admin_count)
- `service.py` — CRUD for roles, permission-list assignment (diff & replace on update), guard against deleting a role that still has admins assigned (block or require reassignment first), guard against deleting/editing `is_system` roles.
- `routes.py` — all routes gated by a new dependency `require_permission("admins.manage_roles")`, itself only satisfiable by Superadmin (see 3.2).

```
GET    /admin/roles                    list roles (+ permission counts)
POST   /admin/roles                    create role
GET    /admin/roles/{role_id}          role detail incl. assigned admins
PATCH  /admin/roles/{role_id}          rename / recolor / change permission set
DELETE /admin/roles/{role_id}          delete (blocked if in use or is_system)
GET    /admin/permissions              list all permissions grouped by category (for the picker UI)
PATCH  /admin/accounts/{admin_id}/role assign a role to an admin account
```

### 3.2 Auth/dependency layer rework (`app/platform/auth/dependencies.py`)
- JWT payload for admins now carries `role_id` (or a `permissions` claim baked in at issue time — see trade-off below) instead of a flat `role` string.
- Add `require_permission(key: str)`:
  ```python
  def require_permission(key: str):
      def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
          if user.role != "admin":
              raise HTTPException(403, "Admin token required.")
          if user.is_superadmin:
              return user   # bypass — superadmin implicitly has everything
          if key not in user.permissions:
              raise HTTPException(403, f"Missing permission: {key}")
          return user
      return _check
  ```
- **Trade-off to decide:** bake permission keys into the JWT at login (fast, no DB hit per request, but stale until re-login/refresh if role edited) vs. look up `admin.role_id → permissions` on every request (always fresh, one extra DB/Redis lookup). Recommendation for MVP: bake into JWT + short access-token TTL (already have refresh flow) + invalidate/force-refresh on role edit via the existing `RefreshToken` revocation mechanism. Simplest, reuses infrastructure already built.
- Every existing `require_role(["admin"])` on admin routes gets replaced incrementally with `require_permission("<specific-key>")` — this is the actual retrofit work across `app/modules/admin/routes.py`'s ~25 routes. Superadmin bypass keeps all existing behavior working during rollout.

### 3.3 Migration (Alembic)
1. Create `permissions`, `admin_roles`, `admin_role_permissions` tables.
2. Seed permissions (data migration, code-owned list).
3. Seed `Superadmin` + `Support` system roles.
4. Add `admins.role_id` (nullable), backfill from old `role` string, then set `NOT NULL`.
5. Drop `admins.role` column (separate migration, after backend + frontend both read `role_id`, to allow safe rollback window).

---

## 4. Frontend Changes (Next.js — `website/app/admin/`)

### 4.1 New route: `/admin/roles` (superadmin-only, hidden from nav for anyone lacking `admins.manage_roles`)
- **Role list view** — cards/rows per role: color dot + name, member count ("3 admins"), permission count, Edit/Delete actions. `Superadmin` and `Support` shown but locked (no delete, restricted edit — Discord's "@everyone" pattern).
- **"Create Role" button** → opens the role editor.

### 4.2 Role editor (the Discord-style piece)
Two-pane or tabbed editor, matching Discord's role creation UX:
1. **Display tab** — role name input, color picker (swatch grid, matches SpeedyMeals' red/blue/tan palette + a few extras), live preview pill showing "Name" rendered as it'll appear on an admin's profile badge.
2. **Permissions tab** — permission list grouped by category (Restaurants, Riders, Orders, Settlements, Payouts, Customers, Reports), each a toggle switch with the permission's human label + one-line description underneath (exactly like Discord's permission toggles with descriptive subtext). A search/filter box at top for long lists.
3. **Save** → `POST /admin/roles` or `PATCH /admin/roles/{id}`.

### 4.3 Role assignment
- On the existing (or new) `/admin/accounts` admin-management screen: each admin row gets a role-picker dropdown (single-select, since MVP = one role per admin — matches "created admin will have selected permissions" as a single role bundle, not Discord's multi-role stacking, which can be a documented future extension).
- Changing an admin's role calls `PATCH /admin/accounts/{admin_id}/role` and, per §3.2, forces that admin's active refresh token(s) to be revoked so the new permission set takes effect on next request rather than waiting for token expiry.

### 4.4 Permission-gated UI everywhere else
- A `usePermissions()` hook (reads permissions out of the decoded access token / an auth context) wraps the existing `lib/auth/index.ts`.
- `<RequirePermission key="settlements.process">...</RequirePermission>` wrapper component to hide/disable buttons and nav items that the logged-in admin can't use — this is UX-only; the real gate is always the backend `require_permission`.

---

## 5. Rollout Sequence

| Step | Work | Owner |
|---|---|---|
| 1 | Alembic migration: new tables + seed permissions + seed system roles | Backend |
| 2 | Backfill `admins.role_id` from old `role` string | Backend |
| 3 | `admin_roles` module (models/schemas/service/routes) | Backend |
| 4 | Rework `dependencies.py`: `require_permission`, superadmin bypass, JWT permission claim | Backend |
| 5 | Retrofit existing `admin/routes.py` endpoints from `require_role(["admin"])` → specific `require_permission(...)` | Backend |
| 6 | `/admin/roles` list + editor UI (Discord-style) | Frontend |
| 7 | Role-assignment dropdown on admin accounts screen | Frontend |
| 8 | `usePermissions()` hook + `<RequirePermission>` gating across admin nav/buttons | Frontend |
| 9 | Drop old `admins.role` string column (final migration, after 1–8 verified in staging) | Backend |

---

## 6. Open Decisions (need your call before/while building)

1. **Single role per admin (simpler, matches current schema) vs. multiple stackable roles (true Discord model, permissions = union)?** Recommend single role for MVP — matches "created admin will have selected permissions" as read, less complexity in the JWT/permission-merge logic. Multi-role is a clean additive change later (just swap `role_id` FK for a join table on `admins` too).
2. **JWT-baked permissions vs. per-request DB lookup** (§3.2) — recommend JWT-baked for MVP given existing refresh-token infra.
3. Should `Support` stay as a fixed system role, or should superadmin be able to just create their own replacement and delete the seeded `Support` once real roles exist? (Recommend: keep it non-deletable but fully editable, so it always exists as a safe fallback but isn't hardcoded.)

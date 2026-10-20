# WebSocket live-tracking: token-in-URL risk and proposed fix

**Status:** proposal only — nothing in this document has been implemented.
**Scope:** `GET WS /orders/{order_id}/track` (backend) and
`LiveLocationSocket` + `ApiConfig.orderTrackingSocketUri` (mobile).

---

## 1. Current design

The customer app connects to live tracking with the access JWT in the query
string:

```
wss://<api-host>/orders/{order_id}/track?token=<access JWT>
```

The backend reads it as a query parameter
(`backend/app/modules/food_delivery/routes.py`, `websocket_track_rider`,
`token: str = Query(...)`) and validates it with the same JWT rules as the REST
API.

The socket is only opened while the customer has the tracking screen open, but
the token itself is the normal 30-minute access token that also authorises every
REST call for that user.

## 2. The risk

1. **Query strings end up in logs.** Reverse proxies (nginx, Caddy, Cloudflare,
   Lightsail load balancer), API gateways and APM tools normally log the full
   request URI including the query string. Anyone with access to those logs can
   replay the token.
2. **It is a full API credential, not a tracking-only credential.** A leaked
   token can call `GET /users/me`, `GET /orders`, place orders, delete the
   account, etc. — not just watch one order — until it expires (default 30
   minutes).
3. **Browser-side exposure.** On Flutter web the URL is also visible in browser
   developer tools / network panels; on mobile it may appear in crash or
   network-inspection tooling.
4. **No revocation signal.** Access tokens are stateless. Unless the account is
   deleted (the only Redis denylist path today), a leaked token simply lives out
   its TTL.

Severity: **medium**. Exploitation requires read access to proxy/APM logs, but
the blast radius is the whole account for the token lifetime, and the fix is
contained.

## 3. Options considered

### Option A — short-lived, single-use tracking ticket (recommended)

Flow:

1. Client calls `POST /orders/{order_id}/track-ticket` with the normal
   `Authorization: Bearer <access JWT>` header (never in the URL).
2. Backend verifies the caller owns the order (same ownership check as the
   socket), generates a random 256-bit ticket, stores
   `track_ticket:<ticket>` → `{subject_id, role, order_id}` in Redis with a
   30–60 second TTL, and returns `{ "ticket": "...", "expires_in": 45 }`.
3. Client connects to `wss://.../orders/{order_id}/track?ticket=<ticket>`.
4. Backend resolves the ticket in Redis, checks the `order_id` matches the path,
   **deletes the key** (single use) and accepts the socket. A missing/expired/
   mismatched ticket gets the existing `auth_failed` frame + close 4003, so the
   mobile no-retry behaviour already shipped keeps working unchanged.

Why this is the recommendation:

- No JWT ever appears in a URL, on any platform.
- The credential is scoped to one order, expires in under a minute and is
  consumed on first use — log leakage is close to worthless.
- Works identically on Android, iOS and Flutter web (unlike header tricks).
- Reuses the existing 4003 / `auth_failed` contract, so the client change is
  small.

Costs: one extra round trip before connecting (milliseconds, on the same
connection pool), and Redis must be reachable when the socket opens.

### Option B — `Sec-WebSocket-Protocol` sub-protocol

Send `bearer.<jwt>` as the WebSocket sub-protocol and have the backend read it
instead of the query parameter.

- Pros: no new endpoint, no Redis key, no extra round trip.
- Cons: sub-protocols are still recorded by some proxies/loggers; the backend
  must echo a valid sub-protocol during the handshake; Flutter web support is
  workable (`protocols:` argument) but the token is still a full-access JWT and
  keeps its 30-minute life. It reduces but does not remove the leak surface.

### Option C — HttpOnly cookie

Not suitable: the API is bearer-token based for mobile, and adding a cookie
session would create a second, divergent auth model.

## 4. Effort estimate (Option A)

| Area | Work | Estimate |
|---|---|---|
| Backend | `POST /orders/{id}/track-ticket` route + ticket helpers in `food_delivery/service.py` (Redis `setex`, consume-and-delete), switch the WS handler from `token: Query` to `ticket: Query`, keep `auth_failed` + 4003 | 60–100 LOC, ~0.5 day |
| Backend tests | ticket happy path (connect succeeds once, second connect with the same ticket → 4003), expired ticket → 4003, wrong order → 4003, non-owner requesting a ticket → 403/404, no auth → 401 | ~4–6 tests, ~0.5 day |
| Mobile | `OrderRepository.createTrackTicket()`, `LiveLocationSocket.connect()` fetches a ticket then builds the URI with `?ticket=`, no token in `uriBuilder`; update `ApiConfig` docs | ~40–60 LOC, ~0.5 day |
| Mobile tests | ticket request fired before connect; ticket (not token) in the URL; a failed ticket request falls back to REST polling without retrying | ~3 tests, ~0.25 day |
| Docs / rollout | this note updated, `docs/production-config-checklist.md` Redis note, staged rollout (server accepts BOTH `ticket` and `token` for one release so old apps keep working, then remove `token`) | ~0.25 day |

**Total: ~2 days for one engineer**, including the compatibility window. No
database migration is needed (Redis only). No breaking change for existing
installs if the backend keeps accepting `token` during one release.

## 5. Interim mitigations (until this ships)

- Keep access-token TTL at 30 minutes (already the default).
- Ensure reverse-proxy access logs are access-controlled and retained briefly;
  do not ship them to third-party analytics.
- Never log the full socket URI on the client. `ApiConfig.redact` already
  removes the query string from socket diagnostics, and `LiveLocationSocket`
  logs only the route — keep it that way in any new code.

## 6. Explicit non-goal

This document does **not** authorise a schema, API or client change. The
current query-token flow remains in place until the team schedules Option A.

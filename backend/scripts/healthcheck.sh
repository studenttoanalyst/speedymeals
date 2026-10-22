#!/usr/bin/env bash
# Read-only production health check for the SpeedyMeals backend on Lightsail.
# Nothing here restarts, edits or deletes anything.
#
# Usage (from anywhere on the server):
#   bash ~/speedymeals/backend/scripts/healthcheck.sh
#   PUBLIC_URL=https://api.example.com bash backend/scripts/healthcheck.sh
#
# Exit code: 0 = no FAIL (WARNs allowed), 1 = at least one FAIL.

set -u

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_URL="${LOCAL_URL:-http://localhost:8000/health}"
PUBLIC_URL="${PUBLIC_URL:-https://api.speedymealservices.com/health}"

fails=0
warns=0

pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
warn() { printf '  \033[33mWARN\033[0m %s\n' "$1"; warns=$((warns + 1)); }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fails=$((fails + 1)); }
section() { printf '\n== %s ==\n' "$1"; }

cd "$BACKEND_DIR" || { echo "Cannot cd to $BACKEND_DIR"; exit 1; }

section "Containers"
for svc in api redis; do
  state=$(docker compose ps -a --format '{{.Service}} {{.State}}' 2>/dev/null | awk -v s="$svc" '$1==s {print $2}')
  if [ "$state" = "running" ]; then
    pass "$svc is running"
  else
    fail "$svc is '${state:-missing}' (see: docker compose logs --tail=50 $svc)"
  fi
done

section "HTTP health"
for url in "$LOCAL_URL" "$PUBLIC_URL"; do
  body=$(curl -s --max-time 10 "$url")
  if printf '%s' "$body" | grep -q '"status":"ok"'; then
    pass "$url"
  else
    fail "$url returned: ${body:-<no response>}"
  fi
done

section "Recent API errors (last 1h)"
errors=$(docker compose logs --since=1h api 2>/dev/null | grep -iE 'error|traceback|failed' | tail -5)
if [ -z "$errors" ]; then
  pass "no error lines in the last hour"
else
  warn "error lines found (latest 5):"
  printf '%s\n' "$errors" | sed 's/^/       /'
fi

section "Database migrations"
current=$(docker compose exec -T api alembic -c app/alembic.ini current 2>&1 | grep -oE '^[0-9a-f]{8,}' | head -1)
head=$(docker compose exec -T api alembic -c app/alembic.ini heads 2>&1 | grep -oE '^[0-9a-f]{8,}' | head -1)
if [ -z "$current" ]; then
  fail "could not read current revision (run: docker compose exec -T api alembic -c app/alembic.ini current)"
elif [ "$current" = "$head" ]; then
  pass "at head ($current)"
else
  fail "current=$current but code head=$head"
fi

section "Redis from the API container"
if docker compose exec -T api python -c "import redis; from app.core.config import settings; redis.from_url(settings.REDIS_URL, socket_connect_timeout=2).ping()" >/dev/null 2>&1; then
  pass "REDIS_URL reachable (no silent in-memory fallback)"
else
  fail "REDIS_URL unreachable: the API is using its in-memory fallback (check REDIS_URL host is 'redis' in app/.env)"
fi

section "Ports"
if sudo -n true 2>/dev/null; then
  ports=$(sudo -n ss -ltnp 2>/dev/null)
  printf '%s\n' "$ports" | grep -qE '127\.0\.0\.1:6379\b' && ! printf '%s\n' "$ports" | grep -qE '(0\.0\.0\.0|\[::\]):6379\b' \
    && pass "Redis 6379 bound to 127.0.0.1 only" \
    || warn "Redis 6379 is bound on all interfaces (apply the compose file: docker compose up -d redis)"
  printf '%s\n' "$ports" | grep -qE ':8000\b' && pass "something listens on 8000" || fail "nothing listens on 8000"
  printf '%s\n' "$ports" | grep -qE ':443\b.*nginx' && pass "nginx listens on 443" || fail "nginx not on 443"
else
  warn "skipped (needs passwordless sudo)"
fi

section "Legacy systemd service (must stay off)"
enabled=$(systemctl is-enabled speedymeals 2>/dev/null || true)
active=$(systemctl is-active speedymeals 2>/dev/null || true)
if [ "$active" = "active" ]; then
  fail "speedymeals.service is ACTIVE and will fight Docker for port 8000"
elif [ "$enabled" = "enabled" ]; then
  warn "speedymeals.service is enabled and will start on reboot (run: sudo systemctl disable speedymeals)"
else
  pass "speedymeals.service is ${enabled:-not installed}/${active:-inactive}"
fi

section "nginx"
if sudo -n nginx -t >/dev/null 2>&1; then pass "config valid"; else fail "nginx -t failed (run: sudo nginx -t)"; fi
[ "$(systemctl is-active nginx 2>/dev/null)" = "active" ] && pass "nginx active" || fail "nginx not active"

section "Firebase key"
if [ -s serviceAccountKey.json ]; then
  pass "serviceAccountKey.json present ($(wc -c < serviceAccountKey.json) bytes)"
else
  fail "serviceAccountKey.json missing or empty: push notifications are disabled"
fi

section "Resources"
disk=$(df -P / | awk 'NR==2 {gsub("%",""); print $5}')
[ "$disk" -lt 85 ] && pass "disk / at ${disk}%" || warn "disk / at ${disk}% (prune: docker system prune)"
mem=$(free -m | awk '/^Mem:/ {printf "%d", $7 * 100 / $2}')
[ "$mem" -gt 15 ] && pass "memory available ${mem}%" || warn "memory available only ${mem}%"

printf '\n== Result: %d FAIL, %d WARN ==\n' "$fails" "$warns"
[ "$fails" -eq 0 ]

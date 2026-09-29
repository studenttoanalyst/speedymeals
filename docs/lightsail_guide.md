# SpeedyMeals Backend — AWS Lightsail Developer Guide

Practical, battle-tested procedures for working with the FastAPI backend on our Lightsail server. No secrets included — replace placeholders with real values from your own `.env`/secrets manager access.

**Server facts:**
- Instance: Ubuntu 24.04 LTS, AWS Lightsail, Singapore region
- Static IP: `141.230.128.228`
- Domain: `api.speedymealservices.com` (points to the static IP via cPanel Zone Editor A record)
- Stack on this box: FastAPI (Docker) + Redis (Docker) + Nginx (native) + Certbot SSL
- Database: **external** — Supabase Postgres (not hosted on this server)
- Repo path on server: `~/speedymeals`
- Backend path: `~/speedymeals/backend`

---

## 1. Connecting to the server

- Via Lightsail console: instance page → **Connect** tab → **"Connect using SSH"** (browser-based, no key needed)
- Via your own terminal: use the downloaded SSH key + `ssh -i key.pem ubuntu@141.230.128.228`

---

## 2. Daily / routine commands

### Check what's running
```bash
docker ps
```
Should normally show exactly 2 containers: `backend-api-1` and `backend-redis-1`, both `Up`.

### Check ALL containers (including stopped/crashed ones)
```bash
docker ps -a
```
Use this whenever `docker ps` is missing a container you expect — shows exit codes and status.

### View logs
```bash
# Last N lines (recommended default — avoids replaying old resolved crashes)
docker logs --tail 30 backend-api-1

# Live/streaming (new lines as they happen)
docker logs -f --tail 20 backend-api-1

# With timestamps
docker logs -t --tail 50 backend-api-1

# Since a specific time window
docker logs --since 10m backend-api-1
```
**Note:** `docker logs -f` with no `--tail` limit replays the ENTIRE log history since container start, including old crashes that have since been fixed. Always use `--tail` unless you specifically need full history.

### Quick health check
```bash
curl http://localhost:8000/docs        # from the server itself
curl https://api.speedymealservices.com/docs   # from anywhere, confirms public reachability + SSL
```
A working response returns HTML (Swagger UI page source).

---

## 3. Restarting / redeploying the backend

### Preferred: let auto-deploy handle it
Any push to `backend/**` on `main` triggers a GitHub Actions workflow that SSHs in, pulls, and rebuilds automatically. Check **GitHub → Actions tab** for run status (green check = deployed).

### Manual restart (when needed — debugging, .env changes, auto-deploy failure)
```bash
cd ~/speedymeals/backend
docker compose down --remove-orphans
docker compose up -d --build api redis
docker ps
docker logs --tail 30 backend-api-1
```

### Restart without rebuilding (e.g. after only changing `.env`)
```bash
docker compose restart api
```

### Pulling latest code manually (outside auto-deploy)
```bash
cd ~/speedymeals
git fetch origin
git status                      # tells you if you're behind
git pull origin main --no-rebase   # use merge strategy if branches diverged
```

---

## 4. Environment variables (`.env`)

Location: `~/speedymeals/backend/app/.env` (never committed to git — confirm `.gitignore` covers it).

To update any value (e.g. rotate a secret):
```bash
nano app/.env
```
Edit the line, save (`Ctrl+O`, Enter, `Ctrl+X`), then:
```bash
docker compose restart api
```

**Generating a strong random secret (e.g. for JWT_SECRET):**
```bash
openssl rand -hex 32
```

⚠️ Rotating `JWT_SECRET` invalidates every currently-issued login token — all logged-in users get signed out. Avoid doing this casually once real users are active; fine during setup/testing.

---

## 5. Database migrations (Alembic)

### Check current DB migration state
```bash
docker compose run --rm api alembic -c app/alembic.ini current
```

### List all migration heads (should normally be exactly ONE)
```bash
docker compose run --rm api alembic -c app/alembic.ini heads
```

### View full migration history/graph
```bash
docker compose run --rm api alembic -c app/alembic.ini history
```

### Fixing "multiple heads" error
Happens when two migrations are created independently from the same parent (common when two people add migrations around the same time without pulling first).
```bash
docker compose run --rm api alembic -c app/alembic.ini merge -m "merge <describe branches>" <head1> <head2>
git add app/migrations/versions/
git commit -m "fix: merge alembic migration heads"
git push origin main
```
**Prevention:** always run `alembic heads` locally before creating a new migration.

### Fixing "column/table already exists" during migration
Means the schema change was already applied directly (e.g. via Supabase's SQL/table editor) without going through Alembic, so Alembic's bookkeeping is out of sync with reality.
1. Confirm what actually exists — run in **Supabase SQL Editor**:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = '<table>' AND column_name IN ('<col1>', '<col2>');

   SELECT * FROM alembic_version;
   ```
2. If the real schema already matches a given migration/revision, tell Alembic it's done without re-running it:
   ```bash
   docker compose run --rm api alembic -c app/alembic.ini stamp <target_revision>
   ```
3. Redeploy normally afterward.

**Prevention:** never make schema changes directly in Supabase's UI/SQL editor outside of a tracked Alembic migration — always go through `alembic revision` → commit → deploy.

---

## 6. Common conflicts & how to diagnose them

### "Port already in use" (Docker fails to bind 8000, 6379, 5432, etc.)
```bash
sudo lsof -i :<port>
```
Shows the process squatting the port. Common culprits found on this server before:
- A **native systemd service** re-launching FastAPI outside Docker
- A **native Redis** install (pre-existing on the OS image)
- A manually-run `uvicorn` process left over from testing

**Check for a systemd culprit:**
```bash
systemctl list-units --type=service --all | grep -i <keyword>
```

**Stop + permanently disable a systemd service (don't just kill the process — it'll respawn):**
```bash
sudo systemctl stop <service-name>
sudo systemctl disable <service-name>
systemctl status <service-name>   # confirm "inactive (dead)"
```

**Stop a native (non-Docker) background service, e.g. Redis:**
```bash
sudo systemctl stop redis-server
sudo systemctl disable redis-server
```

**Kill a stray manual process:**
```bash
sudo kill -9 <PID>
```

**Then clean-relaunch Docker:**
```bash
docker compose down --remove-orphans
docker compose up -d --build api redis
```

### DNS resolution failing *inside* Docker containers, but working fine on the host
Symptom: `psycopg2.OperationalError: could not translate host name ... Temporary failure in name resolution`, while `nslookup <host>` on the server itself works fine.

**Fix — force reliable public DNS at the Docker daemon level:**
```bash
sudo nano /etc/docker/daemon.json
```
```json
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
```
```bash
sudo systemctl restart docker
```

**If it still fails on a Compose-managed custom network specifically**, set DNS directly on the service in `docker-compose.yml` (more reliable than daemon.json alone for custom bridge networks):
```yaml
services:
  api:
    dns:
      - 8.8.8.8
      - 1.1.1.1
```

**Always force a full recreate after a DNS-related fix** — a simple restart reuses the old container's cached network config:
```bash
docker compose down
docker compose up -d --build api redis
```

**Diagnostic sequence, in order, when DNS issues are suspected:**
```bash
nslookup <hostname>                                    # host-level DNS
docker run --rm <image-name> getent hosts <hostname>   # container-level DNS (fresh container)
cat /etc/resolv.conf                                   # check if host uses systemd-resolved stub (127.0.0.53)
```

---

## 7. Git workflow on the server

### First-time SSH auth setup (avoids typing GitHub credentials every pull)
```bash
ssh-keygen -t ed25519 -C "<label>"
cat ~/.ssh/id_ed25519.pub
```
Add the public key to: GitHub repo → Settings → Deploy keys.
```bash
git remote set-url origin git@github.com:studenttoanalyst/speedymeals.git
```

### Handling divergent branches on pull
```bash
git pull origin main --no-rebase
```
If an editor opens for a merge commit message, just save and exit as-is (`Ctrl+O`, Enter, `Ctrl+X` in nano).

### Push rejected ("fetch first")
Means the remote has commits you don't have locally.
```bash
git pull origin main --no-rebase
git push origin main
```

---

## 8. Networking / Firewall (Lightsail console)

Required open ports (Lightsail instance → **Networking** tab):
| Port | Purpose |
|---|---|
| 22 | SSH |
| 80 | HTTP (needed for initial Certbot verification + HTTP→HTTPS redirect) |
| 443 | HTTPS |

Static IP: attach once via **Networking → Create static IP**, so it never changes across reboots.

---

## 9. Nginx (reverse proxy)

### Config file location
```bash
/etc/nginx/sites-available/<name>
/etc/nginx/sites-enabled/<name>   # symlink to the above
```

### Standard reverse proxy block (routes domain → local FastAPI port)
```nginx
server {
    listen 80;
    server_name api.speedymealservices.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable a new site
```bash
sudo ln -s /etc/nginx/sites-available/<name> /etc/nginx/sites-enabled/
sudo nginx -t          # validate syntax first — always do this before restarting
sudo systemctl restart nginx
```

### Fixing "conflicting server name" warning
Means two enabled site files both declare the same `server_name`. Find the duplicate:
```bash
grep -r "<domain>" /etc/nginx/sites-enabled/
ls -la /etc/nginx/sites-enabled/
```
Remove the redundant symlink (not the file in `sites-available`, unless truly unused):
```bash
sudo rm /etc/nginx/sites-enabled/<duplicate-name>
sudo nginx -t
sudo systemctl restart nginx
```

---

## 10. SSL (Let's Encrypt via Certbot)

### Issue/renew a certificate
```bash
sudo certbot --nginx -d api.speedymealservices.com
```
Auto-configures Nginx for HTTPS and sets up scheduled auto-renewal — no manual renewal needed under normal circumstances.

### Check certificate status
```bash
sudo certbot certificates
```

---

## 11. DNS (cPanel Zone Editor — where the domain's DNS lives)

Path: cPanel → **Domains → Zone Editor** → manage the domain.

| Type | Name/Host | Value | Purpose |
|---|---|---|---|
| A | `api` | `141.230.128.228` | Points `api.speedymealservices.com` to this server |

Check propagation from the server itself:
```bash
nslookup api.speedymealservices.com
```
Should return the static IP once propagated (usually minutes, can take longer).

---

## 12. Docker Compose file reference (current shape)

```yaml
version: "3.9"

services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - ./app/.env
    depends_on:
      - redis
    dns:
      - 8.8.8.8
      - 1.1.1.1
    restart: unless-stopped
    volumes:
      - ./app:/backend/app

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    restart: unless-stopped
```

Key points:
- **No local `db` service** — database is Supabase (external), not run on this box.
- `restart: unless-stopped` ensures both containers survive a server reboot automatically.
- `dns:` block added to work around Docker's custom-network DNS inconsistency (see Section 6).

---

## 13. System package updates (Ubuntu/OS level)

```bash
sudo apt update                      # refresh package index
apt list --upgradable                # see what's available, without installing
sudo apt update && sudo apt upgrade -y   # actually apply updates
```
Check installed tool versions:
```bash
docker --version
docker compose version
nginx -v
certbot --version
git --version
```
**Caution:** avoid running `apt upgrade` casually mid-pilot — a version bump to Docker/Nginx could change behavior unexpectedly. Do it during a planned maintenance window, not on a whim.

---

## 14. Quick troubleshooting checklist (in order)

1. `docker ps` — is the container even running?
2. `docker ps -a` — if missing, what was the exit code?
3. `docker logs --tail 50 backend-api-1` — what's the actual error?
4. Is it a **port conflict**? → `sudo lsof -i :<port>` → find and stop/disable the squatter (Section 6)
5. Is it a **DNS-inside-container** issue? → test with `docker run --rm <image> getent hosts <host>` (Section 6)
6. Is it a **migration** issue? → check `alembic heads` and `alembic current` (Section 5)
7. Is it a **stale container** issue? → `docker compose down` (not just `restart`) then `up -d --build` again, to force a full recreate
8. Once container's healthy → confirm public reachability: `curl https://api.speedymealservices.com/docs`

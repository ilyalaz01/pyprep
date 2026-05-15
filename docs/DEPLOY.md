# Deploying PyPrep

Pre-MVP-1 deploy reference. Single-container, single-tenant. Multi-tenant and high-scale concerns are deferred to Phase 11+.

---

## Architecture

- Single-container deploy per ADR-012. One image runs both the API and the built frontend.
- FastAPI serves the API at `/api/*` and the built frontend at `/` from the same origin. No CORS surface, no separate frontend host.
- SQLite by default, file at `/data/pyprep.db` inside the container, persisted via a host volume.
- No nginx/Caddy layer. Uvicorn handles HTTP directly. TLS is the host's responsibility (most managed hosts auto-provision; VPS users typically front with Caddy or Cloudflare).
- Image size is approximately 250–400 MB (multi-stage build, `python:3.11-slim` runtime).

---

## Pre-deploy checklist

- [ ] `PYPREP_SECRET_KEY` set (48+ char random — generate with `openssl rand -hex 48`)
- [ ] `PYPREP_SINGLE_USER=true` (default for MVP-1)
- [ ] `PYPREP_SINGLE_USER_PASSWORD` set (the login password for the single user)
- [ ] Persistent volume mount for `/data` (without it, SQLite evaporates on every container restart)
- [ ] Host selected (see options below)
- [ ] Image built and tagged: `docker build -t pyprep:latest .`

For the full env var list see `.env-example` at the repo root. The deploy-critical ones are above; everything else has sensible defaults.

---

## Quick deploy: Fly.io

Fly is the cheapest sensible target for a solo MVP-1 — free allowance covers a single small instance with a persistent volume, auto-stop pauses the machine when idle, and HTTPS is automatic.

```bash
# One-time: install flyctl and authenticate
curl -L https://fly.io/install.sh | sh
fly auth login

# In the repo root
fly launch --no-deploy   # creates fly.toml + app shell; refuses if app name taken
```

Replace `fly.toml` with the following (substitute your app name and region):

```toml
app = "pyprep-yourname"
primary_region = "fra"   # or "iad", "sjc", "lhr" — pick what's close to you

[build]
# Empty — Fly auto-detects the Dockerfile in repo root.

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = "stop"     # pause when idle — cost-saver for personal use
  auto_start_machines = true
  min_machines_running = 0

[[mounts]]
  source = "pyprep_data"
  destination = "/data"

[[services.http_checks]]
  interval = "30s"
  grace_period = "5s"
  method = "GET"
  path = "/api/health"
  protocol = "http"
  timeout = "2s"
```

Set secrets and deploy:

```bash
fly secrets set \
  PYPREP_SECRET_KEY="$(openssl rand -hex 48)" \
  PYPREP_SINGLE_USER=true \
  PYPREP_SINGLE_USER_PASSWORD="change-me-now"

fly volumes create pyprep_data --region fra --size 1   # 1 GB, plenty for MVP-1

fly deploy
```

The `auto_stop_machines = "stop"` directive is the cost-saver: the machine pauses after a few minutes of inactivity and resumes on the next request (~1s cold start). Fine for personal use; remove if you need always-on responsiveness.

---

## Self-host on VPS (Docker)

For a $5 DigitalOcean droplet, a Hetzner CX11, or any small Linux box with Docker installed:

```bash
# On the VPS, after `docker pull` from your registry OR `git clone` + `docker build`
docker run -d --name pyprep --restart unless-stopped \
  -p 80:8000 \
  -v /var/lib/pyprep/data:/data \
  -e PYPREP_SECRET_KEY="$(openssl rand -hex 48)" \
  -e PYPREP_SINGLE_USER=true \
  -e PYPREP_SINGLE_USER_PASSWORD="change-me-now" \
  pyprep:latest
```

Notes:

- `--restart unless-stopped` gives systemd-style recovery on host reboot.
- Bind-mount `/var/lib/pyprep/data` (or any host path) to the container's `/data`. Snapshot or back this up; it holds your SQLite database.
- For HTTPS, put Caddy or nginx in front and terminate TLS there. Caddy with `tls your@email` + a one-line reverse-proxy block is the lowest-friction option. Don't try to terminate TLS inside the container.
- Port 80 in the example is plaintext for first-boot smoke testing. Move to 443 + TLS termination before exposing publicly.

---

## Other hosts (brief)

The pattern is the same across managed container hosts: build the image, set env vars in the dashboard, attach a persistent volume mounted at `/data`.

- **Render**: create a Web Service from the repo, set env vars in the dashboard, attach a Disk mounted at `/data`. Render auto-provisions HTTPS and runs a TCP health check; point it at `/api/health` for accuracy. Free tier sleeps on inactivity.
- **Railway**: similar shape — create a service from the repo, set env vars, add a Volume at `/data`. Railway also auto-provisions HTTPS.
- **Docker Hub publish**: if you want a registry-hosted image so VPS deploy is `docker pull` only:
  ```bash
  docker tag pyprep:latest yourname/pyprep:v1.0
  docker push yourname/pyprep:v1.0
  ```

Each host's documentation is the authoritative reference for dashboard mechanics; the env var + volume requirements above are the only PyPrep-specific bits.

---

## Secrets management

- **`PYPREP_SECRET_KEY`**: 48+ char hex from `openssl rand -hex 48`. Never reuse across deploys (each environment gets its own). Never commit to the repo. Never log. Rotating the key invalidates every existing JWT — anyone logged in is signed out instantly, including you. Plan for that before rotating in production.
- **`PYPREP_SINGLE_USER_PASSWORD`**: the password for the single user. PyPrep does not hash this client-side; use the host's secret store (Fly secrets, Render env vars, Railway env vars) so the plaintext never lands in a config file checked into git.
- **`.env` files**: used by the dev workflow only. Never commit. Production hosts inject these through their own env var mechanism.
- **What not to put in env vars**: avoid embedding credentials in `PYPREP_DATABASE_URL` if your host has a separate secret store for DB credentials; use a connection-string composition pattern there. Not relevant for the SQLite default.

---

## Persistence

- **Default**: SQLite at `/data/pyprep.db`, volume-mounted from the host. The container's working directory is otherwise read-only, so anything not under `/data` is lost on restart by design.
- **Backup**: simplest path is a cron job copying the file to a backup location:
  ```bash
  0 3 * * * cp /var/lib/pyprep/data/pyprep.db /backups/pyprep-$(date +\%F).db
  ```
  Fly Volumes have built-in daily snapshots. DigitalOcean and Hetzner offer host-level snapshots.
- **When to switch to Postgres**: high write concurrency, multiple app instances, true multi-user mode. None of these apply at MVP-1, so SQLite is the right default. If you do need to swap:
  - Set `PYPREP_DATABASE_URL=postgresql+psycopg://user:pass@host:5432/pyprep`.
  - Alembic migrations run automatically on app startup (ADR-012 lifespan hook); no manual `alembic upgrade head` needed.
  - Migrating existing SQLite data to Postgres is out of scope for MVP-1. Use `pgloader` or similar community tooling.

---

## Health checks

- **Endpoint**: `GET /api/health`
- **Response**: 200 OK with JSON body `{"status": "ok", "version": "...", "db_ok": true}` when the app is up and the database is reachable. `db_ok: false` if the DB probe fails — the endpoint still returns 200 so it functions as a canary, not a hard gate. Orchestrator probes that want strict failure should also inspect the body.
- **Probe cadence**: most orchestrators probe every 30s with a 2–5s timeout. The example fly.toml above uses this.
- **Failure behavior**: the orchestrator restarts the container. Check container logs first if failures persist; the most common cause is a missing or wrong env var (see Troubleshooting).

---

## Troubleshooting

**1. App starts but `/` returns 404.**
The frontend build (stage 1 of the Dockerfile) may have failed silently. Check the image contents and the build logs:

```bash
docker run --rm pyprep:latest ls /app/frontend/dist
# Expected: index.html, assets/, favicon.svg, robots.txt
```

If `index.html` isn't there, rebuild with `docker build --no-cache .` and watch stage 1 output.

**2. Login fails with a 500.**
Almost always `PYPREP_SECRET_KEY` is missing or shorter than 32 characters. Verify:

```bash
docker exec pyprep env | grep PYPREP_SECRET_KEY
```

Regenerate (`openssl rand -hex 48`) and restart the container.

**3. "Database is locked" errors under load.**
SQLite serializes writes; concurrent writers will see this. Usually transient. If persistent, you've outgrown SQLite — see the Postgres swap path in Persistence above.

**4. Database resets on every restart.**
The `/data` volume mount is missing or wrong. Check:

```bash
docker inspect pyprep | grep -A 5 Mounts
# Expected: a Bind or Volume entry mapping a host path to /data
```

Without the mount, the SQLite file lives inside the container's writable layer and disappears on `docker rm` (which `docker run --rm` does on stop, and which most orchestrators effectively do between deploys).

**5. OOM kills on tiny instances.**
Python + uvicorn + the FSRS deps idle around 150–250 MB. Pyodide loads from CDN in the browser so it doesn't count against server RAM. Allocate at least 512 MB. Fly's free 256 MB shared-cpu-1x is tight; bump to a paid 512 MB tier.

**6. HTTPS / certificate problems.**
PyPrep does not terminate TLS. Fly and Render auto-provision certificates. On a VPS, put Caddy (easiest), nginx + Let's Encrypt, or Cloudflare in front. The container should always speak plaintext HTTP internally.

---

## See also

- Architecture details: `docs/PLAN.md` (ADR-012 single-image serving, ADR-022 bundle budget).
- Pre-push discipline and the 10 gates: `CONTRIBUTING.md`.
- License: project root `LICENSE` (MIT).

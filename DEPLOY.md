# HIS Production Deployment Guide

## Development — local infra only

Start PostgreSQL, Redis, and MinIO locally (then run Go server + worker natively):

```bash
cd hospital-server
docker compose -f deploy/docker-compose.yml up -d
# Then in separate terminals:
go run ./cmd/server/
go run ./cmd/worker/
```

Default dev credentials: `admin / admin123` | MinIO console: http://localhost:9001 (minioadmin / minioadmin123)

---

## Production — full stack via Docker Compose

### 1. Configure secrets

```bash
cp .env.prod.example .env.prod
# Edit .env.prod and fill in all values (POSTGRES_PASSWORD, JWT_SECRET, etc.)
```

### 2. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

This builds:
- `his-api:latest` — Go multi-stage image (runs both `/app/server` and `/app/worker`)
- The nginx image (React admin + portal bundled via pnpm, served by nginx)

### 3. Verify

```bash
# Admin SPA
curl -sf http://localhost/

# API via nginx proxy (expects 400 — bad request body proves the whole chain works)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost/api/auth/login \
  -H 'Content-Type: application/json' -d '{}'

# Swagger UI
open http://localhost/swagger/index.html
```

### 4. Stop / tear down

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down
# With volumes (data wipe):
docker compose -f docker-compose.prod.yml --env-file .env.prod down -v
```

---

## Enabling HTTPS

### Step 1 — Generate or obtain TLS certificates

**Self-signed (local/testing):**
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 \
  -keyout certs/privkey.pem -out certs/fullchain.pem \
  -days 365 -nodes -subj "/CN=localhost"
```

**Production:** Use Let's Encrypt (certbot) and place `fullchain.pem` + `privkey.pem` in `./certs/`.

### Step 2 — Mount certs in compose

In `docker-compose.prod.yml`, uncomment the nginx volumes section:
```yaml
  nginx:
    volumes:
      - ./certs:/etc/nginx/certs:ro
```

### Step 3 — Uncomment the HTTPS server block

In `hospital-web/nginx.prod.conf`, uncomment the `server { listen 443 ssl; ... }` block
and set `server_name your.domain.com`.

### Step 4 — Rebuild and restart nginx

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build nginx
```

---

## Architecture

```
internet → nginx (:80/:443)
              ├── /api/      → api:8080  (Go Gin)
              ├── /swagger/  → api:8080
              ├── /portal/   → static (React portal SPA, base=/portal/)
              └── /          → static (React admin SPA)

api → postgres:5432, redis:6379, minio:9000
worker → postgres:5432, redis:6379, minio:9000  (Asynq background jobs)
```

All infra services (postgres/redis/minio) are internal-only — no host ports exposed in prod.

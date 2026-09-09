<!-- generated-by: gsd-doc-writer -->
# Deployment Guide

This document outlines the deployment architecture, container topology, build pipelines, environment configuration, and operational procedures for **UIMS (Unified IT Management System)**.

---

## Deployment Architecture & Services

UIMS is containerized using Docker and orchestrated via Docker Compose. The production environment is defined in [`docker-compose.yml`](file:///home/user/projects/uims/docker-compose.yml) and separates services across data and application layers.

### Service Topology

```
                         ┌──────────────────────────────────────────────┐
                         │              Client (HTTPS :5679)            │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │       web (Nginx Reverse Proxy + SPA)        │
                         └───────┬──────────────────────────────┬───────┘
                     /api/*, /socket.io/*                   Static Assets
                                 │                            (HTML, JS)
                                 ▼
                         ┌──────────────────────────────────────────────┐
                         │           api (NestJS Application)           │
                         └───────┬──────────────┬──────────────┬────────┘
                                 │              │              │
                   ┌─────────────┴────┐   ┌─────┴──────┐ ┌─────┴──────────────┐
                   │     postgres     │   │   redis    │ │    meilisearch     │
                   │ (PostgreSQL 17)  │   │  (Redis 8) │ │  (Search Engine)   │
                   └──────────────────┘   └────────────┘ └────────────────────┘
                                                               │
                                                 ┌─────────────┴──────────────┐
                                                 │   seaweedfs-* (S3 Store)   │
                                                 │   master / volume / filer  │
                                                 └────────────────────────────┘
```

The stack consists of 8 interconnected services:

| Service | Image / Build Context | Container Name | Exposed Port(s) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`postgres`** | `postgres:17-alpine` | `uims-postgres` | `${DATABASE_PORT:-5433}:5432` | Relational database configured with performance flags (`max_connections=200`, `shared_buffers=256MB`, `wal_buffers=16MB`). Initialized with extensions via [`init.sql`](file:///home/user/projects/uims/docker/postgres/init.sql). |
| **`redis`** | `redis:8-alpine` | `uims-redis` | `${REDIS_PORT:-6381}:6379` | In-memory store for session caching and BullMQ background task queues. Configured with password protection, AOF persistence (`--appendonly yes`), and LRU eviction (`--maxmemory 512mb --maxmemory-policy allkeys-lru`). |
| **`meilisearch`** | `getmeili/meilisearch:latest` | `uims-meilisearch` | `7700:7700` | Search engine handling full-text search indexing across inventory items, tickets, and user directories. |
| **`seaweedfs-master`** | `chrislusf/seaweedfs:latest` | `uims-seaweedfs-master` | `9333:9333` | Master node managing volume assignments and metadata topology for SeaweedFS cluster. |
| **`seaweedfs-volume`** | `chrislusf/seaweedfs:latest` | `uims-seaweedfs-volume` | `8080:8080` | Volume storage node storing raw file blobs. Communicates directly with `seaweedfs-master`. |
| **`seaweedfs-filer`** | `chrislusf/seaweedfs:latest` | `uims-seaweedfs-filer` | `8888:8888`<br>`8333:8333` | S3-compatible object gateway and file system abstraction layer. Exposes S3 API on port 8333 for document and ticket attachments. |
| **`api`** | Multi-stage build from [`apps/api/Dockerfile`](file:///home/user/projects/uims/apps/api/Dockerfile) | `uims-api` | `${APP_PORT:-3002}:3000` | NestJS backend service. Runs under non-root Alpine `node` user. Connects to PostgreSQL, Redis, Meilisearch, and SeaweedFS S3 gateway. |
| **`web`** | Multi-stage build from [`apps/web/Dockerfile`](file:///home/user/projects/uims/apps/web/Dockerfile) | `uims-web` | `${WEB_PORT:-5679}:443` | Nginx Alpine web server hosting compiled React SPA bundle and acting as TLS-terminating reverse proxy for API and WebSocket traffic. |

---

## Deployment Modes

The repository provides pre-configured PNPM scripts in [`package.json`](file:///home/user/projects/uims/package.json) to manage Docker deployment modes:

### Production Mode
Production deploys immutable multi-stage production images with TLS enforcement and non-root execution:

```bash
# Start all production containers in detached mode
pnpm docker:up

# View streaming logs across all containers
pnpm docker:logs

# Stop and remove production containers
pnpm docker:down
```

### Development Overlay Mode
Development mode merges the base configuration with [`docker-compose.dev.yml`](file:///home/user/projects/uims/docker-compose.dev.yml). It mounts the host filesystem into containers, isolates `node_modules` inside named volumes, and enables file-polling watchers (`CHOKIDAR_USEPOLLING=true`, `WATCHPACK_POLLING=true`) with hot reloading:

```bash
# Start containers with development overlay and live code mounting
pnpm docker:dev

# View development container logs
pnpm docker:dev:logs

# Stop development containers
pnpm docker:dev:down
```

---

## Multi-Stage Container Builds

Both application containers employ multi-stage Docker builds based on `node:22-alpine` to maintain small image footprints and isolate development tooling from runtime environments.

### API Image (`apps/api/Dockerfile`)
The backend image defined in [`apps/api/Dockerfile`](file:///home/user/projects/uims/apps/api/Dockerfile) executes across two stages:

1. **Stage 1 (`builder`)**:
   - Uses `node:22-alpine` and installs `pnpm@11.21.0`.
   - Copies workspace configurations ([`package.json`](file:///home/user/projects/uims/package.json), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `biome.json`).
   - Copies internal shared packages ([`packages/`](file:///home/user/projects/uims/packages/)) and backend source code ([`apps/api/`](file:///home/user/projects/uims/apps/api/)).
   - Executes `pnpm install` across workspace dependencies.
   - Runs `pnpm run prisma:generate` to generate the Prisma ORM client.
   - Compiles TypeScript into JavaScript via `pnpm run build` (`tsc`).

2. **Stage 2 (`runner`)**:
   - Uses a clean `node:22-alpine` image with `NODE_ENV=production`.
   - Copies production `node_modules`, built packages, compiled `dist/`, Prisma schemas, and migrations from the `builder` stage.
   - Sets secure permissions and switches from `root` to non-root user `node` (`USER node`).
   - Exposes port `3000` and launches the application via `CMD ["node", "dist/main"]`.

### Web Image (`apps/web/Dockerfile`)
The frontend image defined in [`apps/web/Dockerfile`](file:///home/user/projects/uims/apps/web/Dockerfile) produces an optimized static build served by Nginx:

1. **Stage 1 (`builder`)**:
   - Uses `node:22-alpine` with `pnpm@11.21.0`.
   - Copies workspace configuration, shared libraries, and frontend code ([`apps/web/`](file:///home/user/projects/uims/apps/web/)).
   - Installs dependencies and runs `pnpm run build` (`tsc && vite build`) to bundle the single-page application into `dist/`.

2. **Stage 2 (`runner`)**:
   - Uses lightweight `nginx:alpine`.
   - Copies the compiled HTML/JS/CSS assets from `/app/apps/web/dist` to `/usr/share/nginx/html`.
   - Injects custom Nginx configuration from [`docker/nginx/nginx.conf`](file:///home/user/projects/uims/docker/nginx/nginx.conf).
   - Injects TLS certificates and private keys from `docker/nginx/ssl`.
   - Exposes ports `80` (HTTP redirect) and `443` (HTTPS), launching Nginx as a foreground daemon.

### Local Image Build Commands

```bash
# Build all container images specified in docker-compose.yml
pnpm docker:build

# Alternatively, compile monorepo packages directly on the host
pnpm build
pnpm build:api
pnpm build:web
```

<!-- VERIFY: CI/CD automation not configured in repository (.github/workflows/ does not exist). -->

---

## Nginx Reverse Proxy Configuration

The web container acts as the ingress controller and reverse proxy via [`docker/nginx/nginx.conf`](file:///home/user/projects/uims/docker/nginx/nginx.conf):

- **TLS Termination & HTTP Redirect**: Listens on port 80 and returns an immediate `301` redirect to HTTPS (`https://$host$request_uri`). Port 443 enforces TLSv1.2 and TLSv1.3 with HTTP/2 enabled.
- **API Proxy**: Upstream routes matching `/api/` are proxied to `http://api:3000` with original Host, `X-Real-IP`, and `X-Forwarded-For` headers preserved.
- **WebSocket & Socket.IO**: Both `/api/` and `/socket.io/` locations configure connection upgrades (`Upgrade: $http_upgrade`, `Connection: "upgrade"`) with streaming buffer optimizations (`proxy_buffering off`) to support real-time telemetry and dashboard updates.
- **Health Forwarding**: Proxies `/health` requests directly to `http://api:3000/api/v1/health`.
- **SPA Fallback**: Implements client-side history routing fallback via `try_files $uri $uri/ /index.html`.
- **Security Headers & Compression**: Applies `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, strict `Content-Security-Policy`, and Gzip compression for static assets.

---

## Environment Configuration

A production deployment requires environment variables configured either via a root `.env` file or injected through your container orchestration secret manager. For comprehensive descriptions and defaults, consult [CONFIGURATION.md](file:///home/user/projects/uims/docs/CONFIGURATION.md).

### Required Production Variables

| Variable | Requirement | Example / Production Expectation |
| :--- | :--- | :--- |
| `APP_PORT` | Optional (default: `3002`) | Host port mapped to API service container port `3000`. |
| `WEB_PORT` | Optional (default: `5679`) | Host port mapped to Nginx HTTPS port `443`. |
| `DATABASE_USER` | **Required** | PostgreSQL database owner username (e.g., `uims`). |
| `DATABASE_PASSWORD` | **Required** | High-entropy password for PostgreSQL database user. |
| `DATABASE_NAME` | **Required** | Production database name (e.g., `uims_db`). |
| `REDIS_PASSWORD` | **Required** | High-entropy password for Redis server authentication. |
| `JWT_SECRET` | **Required** | Minimum 32-character secret string used to sign user access tokens. |
| `JWT_REFRESH_SECRET` | **Required** | Minimum 32-character secret string used to sign session refresh tokens. |
| `AUDIT_SIGNING_KEY` | **Required** | **Cryptographic secret key (minimum 32 characters)** required in production for generating HMAC SHA-256 signatures on tamper-evident audit log entries. |
| `MEILISEARCH_API_KEY` | **Required** | Master API key securing Meilisearch operations and indices. |
| `S3_ACCESS_KEY` | **Required** | Access key for SeaweedFS S3 filer gateway. |
| `S3_SECRET_KEY` | **Required** | Secret key for SeaweedFS S3 filer gateway. |
| `S3_BUCKET` | Optional (default: `uims-files`) | Default bucket name for document and image attachments. |

---

## Database Initialization & Migrations

The database layer runs PostgreSQL 17 with automated extension initialization and Prisma schema migration tooling.

### Initial Database Bootstrap
On first startup of the `postgres` container, Docker executes [`docker/postgres/init.sql`](file:///home/user/projects/uims/docker/postgres/init.sql) to enable required database extensions:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";
```

### Production Migrations
In production environments, schema migrations must be applied using Prisma deploy mode rather than interactive development migrations. The root workspace provides a dedicated script:

```bash
# Applies all pending migrations in apps/api/prisma/migrations to the database
pnpm db:migrate:prod
```

> [!NOTE]
> The command `pnpm db:migrate:prod` maps to `pnpm --filter @uims/api prisma:deploy`, which executes `prisma migrate deploy` under the hood. It safely validates applied migration history against the database and executes new migrations in sequence without generating migration files or resetting schema state.

### Optional Seeding and Introspection
```bash
# Seed default administrative users, roles, and master taxonomy (optional)
pnpm db:seed

# Launch Prisma Studio web GUI for emergency data inspection
pnpm db:studio
```

---

## Health Checks & Orchestration Lifecycle

[`docker-compose.yml`](file:///home/user/projects/uims/docker-compose.yml) configures native container health checks to enforce sequential boot dependencies:

1. **PostgreSQL**:
   - Check: `pg_isready -U ${DATABASE_USER:-uims} -d ${DATABASE_NAME:-uims_db}`
   - Parameters: Interval `5s`, Timeout `3s`, Retries `5`.
2. **Redis**:
   - Check: `redis-cli -a ${REDIS_PASSWORD} ping`
   - Parameters: Interval `5s`, Timeout `3s`, Retries `5`.
3. **Meilisearch**:
   - Check: `curl -f http://localhost:7700/health`
   - Parameters: Interval `10s`, Timeout `5s`, Retries `3`.
4. **API (`api`)**:
   - Check: `wget -q --spider http://localhost:3000/api/v1/health || exit 1`
   - Parameters: Interval `10s`, Timeout `5s`, Retries `5`, Start Period `15s`.
   - Dependency Condition: Waits for `postgres`, `redis`, and `meilisearch` to reach `service_healthy`.
5. **Web (`web`)**:
   - Check: `wget -q --spider --no-check-certificate https://localhost/ || exit 1`
   - Parameters: Interval `10s`, Timeout `5s`, Retries `3`, Start Period `10s`.
   - Dependency Condition: Waits for `api` to reach `service_healthy`.

---

## Operational Procedures & Rollbacks

### Application Rollback
Because deployment is governed by Docker Compose, service updates are rolled back by pointing Compose to prior stable images:

1. Identify the prior stable Docker image tag or git revision.
2. Update the image reference or checkout the corresponding stable tag.
3. Recreate the containers with minimal downtime:
   ```bash
   docker compose up -d --no-deps --build api web
   ```
4. Verify system responsiveness via health check endpoints:
   ```bash
   curl -k https://localhost:5679/health
   ```

### Database Rollback
If a failure requires database restoration:
- Prisma migrations are non-destructive and generally forward-only; rolling back schema changes requires preparing and deploying a corrective forward migration.
- If restoring from a PostgreSQL dump:
  ```bash
  cat backup.sql | docker exec -i uims-postgres psql -U uims -d uims_db
  ```

<!-- VERIFY: Automated database backup and disaster recovery schedules are not configured in the repository. -->

---

## Monitoring, Observability & Logging

### Structured Logging
The backend application utilizes [`pino`](file:///home/user/projects/uims/apps/api/package.json#L49) and [`pino-http`](file:///home/user/projects/uims/apps/api/package.json#L50) to output high-throughput, structured JSON logs to `stdout`.
- Every incoming HTTP request logs duration, client IP, method, status code, and correlation identifiers.
- Unhandled exceptions format standard error stacks into JSON payload fields.

### Log Inspection
Container logs can be monitored and filtered directly using Docker Compose:

```bash
# Follow logs across all containers
pnpm docker:logs

# Follow backend API logs only
docker compose logs -f api

# Follow Nginx access and error logs
docker compose logs -f web
```

<!-- VERIFY: No external APM tools (e.g., Sentry, Datadog, New Relic) or Prometheus metrics endpoints configured in dependencies or codebase. -->

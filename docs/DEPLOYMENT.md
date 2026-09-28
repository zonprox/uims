<!-- generated-by: gsd-doc-writer -->
# Deployment Guide

This document outlines the deployment architecture, container topology, build pipelines, environment configuration, and operational procedures for **UIMS (Unified IT Management System)**.

---

## Deployment Targets

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
| **`postgres`** | `postgres:17-alpine` | `uims-postgres` | `${DATABASE_PORT:-5433}:5432` | Relational database. Initialized with extensions via [`init.sql`](file:///home/user/projects/uims/docker/postgres/init.sql). |
| **`redis`** | `redis:8-alpine` | `uims-redis` | `${REDIS_PORT:-6381}:6379` | In-memory store for session caching and BullMQ background task queues. |
| **`meilisearch`** | `getmeili/meilisearch:latest` | `uims-meilisearch` | `7700:7700` | Search engine handling full-text search indexing. |
| **`seaweedfs-master`** | `chrislusf/seaweedfs:latest` | `uims-seaweedfs-master` | `9333:9333` | Master node managing volume assignments for SeaweedFS cluster. |
| **`seaweedfs-volume`** | `chrislusf/seaweedfs:latest` | `uims-seaweedfs-volume` | `8080:8080` | Volume storage node storing raw file blobs. |
| **`seaweedfs-filer`** | `chrislusf/seaweedfs:latest` | `uims-seaweedfs-filer` | `8888:8888`<br>`8333:8333` | S3-compatible object gateway and file system abstraction layer. |
| **`api`** | Multi-stage build from [`apps/api/Dockerfile`](file:///home/user/projects/uims/apps/api/Dockerfile) | `uims-api` | `${APP_PORT:-3002}:3000` | NestJS backend service. Connects to PostgreSQL, Redis, Meilisearch, and SeaweedFS S3 gateway. |
| **`web`** | Multi-stage build from [`apps/web/Dockerfile`](file:///home/user/projects/uims/apps/web/Dockerfile) | `uims-web` | `${WEB_PORT:-5679}:443` | Nginx Alpine web server hosting compiled React SPA bundle and acting as TLS-terminating reverse proxy. |

<!-- VERIFY: Hosting environment or exact compute server specifications are not defined in the repository. -->

---

## Build Pipeline

The repository utilizes GitHub Actions and multi-stage Docker builds to automate the verification and containerization of the system.

### CI/CD Automation

A continuous integration workflow is defined in [`.github/workflows/ci.yml`](file:///home/user/projects/uims/.github/workflows/ci.yml). It triggers on pushes and pull requests to `main` and performs the following verifications:
- Checks out code and provisions Node.js 22 with PNPM 11.21.0.
- Generates Prisma client.
- Validates formatting using Biome (`pnpm run format:check`).
- Runs static analysis using ESLint and Biome (`pnpm run lint`).
- Enforces strict TypeScript checks (`pnpm run typecheck`).
- Executes the test suite with Vitest (`pnpm run test`).
- Builds monorepo workspace packages via Turborepo (`pnpm run build`).

### Multi-Stage Container Builds

Both application containers employ multi-stage Docker builds based on `node:22-alpine` to maintain small image footprints and isolate development tooling from runtime environments.

#### API Image (`apps/api/Dockerfile`)
1. **Stage 1 (`builder`)**: Uses `node:22-alpine` and `pnpm@11.21.0`. Copies monorepo, runs `pnpm install`, generates Prisma client, and builds TypeScript.
2. **Stage 2 (`runner`)**: Uses clean `node:22-alpine` with `NODE_ENV=production`. Copies built `dist/`, `node_modules`, and switches to non-root `node` user, exposing port `3000`.

#### Web Image (`apps/web/Dockerfile`)
1. **Stage 1 (`builder`)**: Uses `node:22-alpine` and `pnpm@11.21.0`. Runs `vite build` to bundle the SPA.
2. **Stage 2 (`runner`)**: Uses `nginx:alpine`. Copies built assets, injects custom TLS-terminating Nginx configuration, and exposes ports `80` (HTTP redirect) and `443` (HTTPS).

---

## Environment Setup

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

## Rollback Procedure

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

## Monitoring

### Structured Logging
The backend application utilizes [`pino`](file:///home/user/projects/uims/apps/api/package.json) and [`pino-http`](file:///home/user/projects/uims/apps/api/package.json) to output high-throughput, structured JSON logs to `stdout`.
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

### Health Checks
Docker Compose natively monitors health conditions via healthcheck tests defined per service:
- PostgreSQL (`pg_isready`)
- Redis (`redis-cli ping`)
- Meilisearch (`/health`)
- API backend (`/api/v1/health`)
- Web frontend (`https://localhost/`)

<!-- VERIFY: No external APM tools (e.g., Sentry, Datadog, New Relic) or Prometheus metrics endpoints configured in dependencies or codebase. -->

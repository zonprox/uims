<!-- generated-by: gsd-doc-writer -->
# Configuration

This document outlines the runtime configuration, environment variables, and configuration file formats used across the Unified IT Management System (UIMS) monorepo.

## Environment Variables

The primary source of truth for runtime configuration is the process environment. For local development, variables are loaded from a root `.env` file created from `.env.example`.

### Core Application & Runtime Configuration

| Name | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Optional | `development` | Runtime environment mode (`development`, `production`, `test`). |
| `APP_NAME` | Optional | `UIMS` | System application display name. |
| `APP_PORT` | Optional | `3000` | Port on which the API backend binds in local development (`.env.example` default `3000`). In Docker Compose, the host port mapping defaults to `${APP_PORT:-3002}:3000`. |
| `APP_URL` | Optional | `http://localhost:3000` | Public base URL of the API server. |
| `PORT` | Optional | `3000` | Primary port variable checked by the NestJS entry point ([`main.ts`](file:///home/user/projects/uims/apps/api/src/main.ts)) and validated in [`app.config.ts`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts). If `PORT` is not defined, `APP_PORT` is checked before defaulting to `3000`. |
| `WEB_PORT` | Optional | `5679` | Port used by the Vite web frontend dev server and mapped to host in Docker Compose. |
| `CORS_ORIGIN` | Optional | None | Comma-separated list of allowed origins for CORS headers in the API and WebSocket gateway. |
| `ALLOWED_ORIGINS` | Optional | None | Fallback allowed origins list if `CORS_ORIGIN` is not defined. |

### Database Configuration (PostgreSQL)

| Name | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Required** | None | Full PostgreSQL connection string including schema (e.g., `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?schema=public`). Required at startup by Prisma. |
| `DATABASE_HOST` | Optional | `localhost` | PostgreSQL host for connection string construction in `.env.example`. In Docker Compose, the container host is `postgres`. |
| `DATABASE_PORT` | Optional | `5432` | PostgreSQL internal port (`.env.example` default `5432`). In Docker Compose, the host port mapping defaults to `${DATABASE_PORT:-5433}:5432`. |
| `DATABASE_USER` | Optional | `uims` | PostgreSQL database user. |
| `DATABASE_PASSWORD` | Optional | None | PostgreSQL user password. Must be set securely in `.env`; `.env.example` specifies the placeholder `your_secure_db_password`. |
| `DATABASE_NAME` | Optional | `uims_db` | PostgreSQL database name. |

### Cache & Message Broker (Redis)

| Name | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | **Required** (prod) | None | Full Redis connection URI (e.g., `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`). Required in production for distributed caching, session invalidation, and BullMQ queues. Optional in dev. |
| `REDIS_HOST` | Optional | `localhost` | Redis server host for connection URL interpolation. In Docker Compose, the container host is `redis`. |
| `REDIS_PORT` | Optional | `6379` | Redis server port (`.env.example` default `6379`). In Docker Compose, the host port mapping defaults to `${REDIS_PORT:-6381}:6379`. |
| `REDIS_PASSWORD` | Optional | None | Authentication password for Redis. Set securely; `.env.example` specifies the placeholder `your_secure_redis_password`. |

### Authentication & Cryptographic Keys

| Name | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Required** | None | Secret key used to sign and verify JWT access tokens. Must be a cryptographically secure string of at least 32 characters. |
| `JWT_REFRESH_SECRET` | **Required** | None | Secret key used to sign and verify JWT refresh tokens. Must be a cryptographically secure string of at least 32 characters. |
| `JWT_ACCESS_EXPIRATION` | Optional | `15m` | Expiration window for JWT access tokens (`.env.example` default `15m`). |
| `JWT_REFRESH_EXPIRATION` | Optional | `7d` | Expiration window for JWT refresh tokens (`.env.example` default `7d`). |
| `JWT_EXPIRATION` | Optional | `15m` | Expiration window for JWT access tokens (`app.config.ts` default `15m`). |
| `AUDIT_SIGNING_KEY` | Optional | None | Cryptographic key used to generate HMAC SHA-256 signatures for tamper-evident audit trail entries. |
| `LICENSE_ENCRYPTION_KEY` | Optional | None | Encryption key for licenses. Must be at least 32 characters if provided. |

### Search Engine (MeiliSearch)

| Name | Required | Default | Description |
|---|---|---|---|
| `MEILISEARCH_HOST` | Optional | `http://localhost:7700` | Base endpoint URL for MeiliSearch (`.env.example` default `http://localhost:7700`). In Docker Compose network, defaults to `http://meilisearch:7700`. |
| `MEILISEARCH_API_KEY` | Optional | None | Master API key for MeiliSearch authentication. Set securely; `.env.example` specifies the placeholder `your_meilisearch_master_key`. |

### Object Storage (SeaweedFS / S3-Compatible)

| Name | Required | Default | Description |
|---|---|---|---|
| `S3_ENDPOINT` | Optional | `http://localhost:8333` | Endpoint URL for the S3-compatible SeaweedFS Filer gateway (`.env.example` default `http://localhost:8333`). In Docker Compose network, defaults to `http://seaweedfs-filer:8333`. |
| `S3_ACCESS_KEY` | Optional | None | Access key ID for S3 authentication. Set securely; `.env.example` specifies the placeholder `your_s3_access_key`. |
| `S3_SECRET_KEY` | Optional | None | Secret access key for S3 authentication. Set securely; `.env.example` specifies the placeholder `your_s3_secret_key`. |
| `S3_BUCKET` | Optional | `uims-files` | Name of the S3 bucket used for asset attachments and document storage. |
| `S3_REGION` | Optional | `us-east-1` | AWS S3 region identifier. |

### Frontend Application (Vite / React)

| Name | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Optional | `/api/v1` | Base REST API URL accessed by frontend browser clients (`/api/v1` in `.env.example`). |
| `VITE_APP_NAME` | Optional | `UIMS` | Display name of the application rendered in page titles and navigation headers. |

### Seed Data Credentials

| Name | Required | Default | Description |
|---|---|---|---|
| `INITIAL_ADMIN_PASSWORD` | Optional | None | Admin seed password (`.env.example`). |
| `INITIAL_DEMO_PASSWORD` | Optional | None | Demo seed password (`.env.example`). |

<!-- VERIFY: Confirm if external infrastructure provisioning requires additional environment variables or configurations (e.g. Terraform vars). -->

## Required vs Optional Settings

- **Required Settings**: Missing essential configuration variables will prevent the application from starting:
  - `DATABASE_URL`: Required for Prisma database connection during application bootstrapping.
  - `JWT_SECRET`: Required for signing and verifying access tokens (enforced minimum 32 characters by Zod schema in [`app.config.ts`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts)).
  - `JWT_REFRESH_SECRET`: Required for signing and verifying refresh tokens (enforced minimum 32 characters).
  - `REDIS_URL`: Required in production (`NODE_ENV=production`) for distributed caching, session tracking, and background queues.
  
  The API enforces these invariants at bootstrap using Zod schema validation in [`app.config.ts`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts). If any required variable is missing or fails validation, startup fails fast with an explicit descriptive error.

- **Optional Settings**: Variables such as `NODE_ENV`, `AUDIT_SIGNING_KEY`, ports (`APP_PORT`, `PORT`, `WEB_PORT`), service endpoints (`MEILISEARCH_HOST`, `S3_ENDPOINT`), and token lifetimes provide safe defaults or are optional.

## Config File Formats

- **[`biome.json`](file:///home/user/projects/uims/biome.json)**: Linter and code formatter configuration. Enforces 2-space indentation, single quotes for JavaScript/TypeScript, trailing commas, line width of 100 characters, and recommended lint rules with cognitive complexity warnings. Explicitly ignores build artifacts and dependencies (`node_modules`, `dist`, `build`, `.turbo`, `coverage`, `prisma/migrations`).
- **[`turbo.json`](file:///home/user/projects/uims/turbo.json)**: Turborepo pipeline orchestration. Defines build task dependencies (`build`, `dev`, `lint`, `lint:fix`, `test`, `test:e2e`, `typecheck`, `clean`) and declares global environment variables (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_SIGNING_KEY`, `JWT_EXPIRATION`, `NODE_ENV`) that invalidate build caches when modified.
- **[`docker-compose.yml`](file:///home/user/projects/uims/docker-compose.yml)**: Defines containerized infrastructure and application services:
  - **`postgres`**: PostgreSQL database on container port 5432 (mapped to host port `${DATABASE_PORT:-5433}` wait actually `${APP_PORT:-3002}`? No, postgres mapped to 5432 internally).
  - **`redis`**: Redis cache on container port 6379 (mapped to host port 6381 typically).
  - **`meilisearch`**: MeiliSearch instance on port 7700.
  - **`api`**: NestJS application container building from `apps/api/Dockerfile` with healthcheck on `/api/v1/health`.
  - **`web`**: Nginx frontend container building from `apps/web/Dockerfile`.
- **[`vite.config.ts`](file:///home/user/projects/uims/apps/web/vite.config.ts)**: Vite build and development configuration. Handles path aliases, manual vendor chunk splitting (React, Ant Design, TanStack Query, utilities), and dev server proxying (`/api` and `/socket.io` forwarded to the API backend).

## Per-Environment Overrides

- **Local Development**:
  - Copy `.env.example` to `.env` in the repository root.
  - Replace all placeholder values (e.g. `your_secure_jwt_secret_min_32_characters`, `your_secure_db_password`) with actual values.
  - Development tools (Turbo, Vite, NestJS) automatically load variables from `.env`.
- **Docker Compose**:
  - Compose services inherit variables defined in `.env`.
  - Service-to-service communication uses internal Docker bridge hosts (`postgres:5432`, `redis:6379`, `meilisearch:7700`, `seaweedfs-filer:8333`, `api:3000`).
- **Staging and Production**:
  - `NODE_ENV` must be strictly set to `production`.
  - All secrets must be generated with cryptographically secure random values.
  - External managed database and cache instances should replace local container hosts in `DATABASE_URL` and `REDIS_URL`.
  
  <!-- VERIFY: Clarify the exact secret management strategy for staging/production (e.g., AWS Parameter Store, Kubernetes Secrets, HashiCorp Vault, GitHub Actions Secrets). -->

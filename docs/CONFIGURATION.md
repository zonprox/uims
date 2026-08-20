<!-- generated-by: gsd-doc-writer -->
# Configuration

This document outlines the configuration mechanisms and environment variables used in the UIMS project.

## Environment Variables

The primary source of truth for runtime configuration is the environment. In local development, these are typically loaded via a `.env` file based on `.env.example`. 

| Name | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Optional | `development` | Application environment (`development`, `production`, `test`) |
| `PORT` | Optional | `3000` | Port on which the API server binds internally |
| `APP_PORT` | Optional | `3002` | Host port mapped to the API server in Docker |
| `DATABASE_URL` | **Required** | None | Full connection string for the PostgreSQL database |
| `DATABASE_USER` | Optional | `uims` | PostgreSQL user (used in Docker setup) |
| `DATABASE_PASSWORD` | Optional | `uims_secret_2026` | PostgreSQL password (used in Docker setup) |
| `DATABASE_NAME` | Optional | `uims_db` | PostgreSQL database name (used in Docker setup) |
| `DATABASE_PORT` | Optional | `5433` | PostgreSQL host port (used in Docker setup) |
| `REDIS_URL` | Optional | None | Full connection URL for Redis (used by API) |
| `REDIS_PASSWORD` | Optional | `uims_redis_2026` | Redis password (used in Docker setup) |
| `REDIS_PORT` | Optional | `6381` | Redis host port (used in Docker setup) |
| `JWT_SECRET` | **Required** | None | Secret key used to sign JWT access tokens |
| `JWT_REFRESH_SECRET` | Optional | `uims-refresh-secret-2026` | Secret key used to sign JWT refresh tokens |
| `JWT_EXPIRATION` | Optional | `1d` | Lifetime of access tokens in API configuration |
| `JWT_ACCESS_EXPIRATION` | Optional | `15m` | Lifetime of access tokens (Docker Compose) |
| `JWT_REFRESH_EXPIRATION` | Optional | `7d` | Lifetime of refresh tokens (Docker Compose) |
| `MEILISEARCH_HOST` | Optional | `http://meilisearch:7700` | Base URL of the MeiliSearch instance |
| `MEILISEARCH_API_KEY` | Optional | `uims_meili_master_key_2026` | MeiliSearch master API key |
| `S3_ENDPOINT` | Optional | `http://seaweedfs-filer:8333` | Endpoint for the S3/SeaweedFS storage service |
| `S3_ACCESS_KEY` | Optional | `uims_s3_access` | S3 access key ID |
| `S3_SECRET_KEY` | Optional | `uims_s3_secret` | S3 secret access key |
| `S3_BUCKET` | Optional | `uims-files` | Name of the S3 bucket to use |
| `WEB_PORT` | Optional | `5679` | Port for the web frontend application |
| `VITE_API_URL` | Optional | None | URL for the backend API used by the frontend |
| `VITE_WS_URL` | Optional | None | URL for WebSocket server used by the frontend |

<!-- VERIFY: Confirm if external infrastructure provisioning requires additional environment variables or configurations (e.g. Terraform vars). -->

## Required vs Optional Settings

- **Required Settings**: Missing essential configuration variables (e.g., `DATABASE_URL`, `JWT_SECRET`) will prevent the application from starting. In `apps/api/src/config/app.config.ts`, the API uses Zod schema validation to verify the presence of critical variables during bootstrap. If validation fails, the process logs an error and exits immediately.
- **Optional Settings**: Settings like `NODE_ENV`, network ports, and various service hosts will fall back to predefined local/development defaults if they are not explicitly provided.

## Config File Formats

- **`biome.json`**: Linter and code formatter configuration. Defines code conventions such as 2-space indentation, single quotes for JavaScript/TypeScript, trailing commas, and sets complexity limits. It explicitly ignores build artifacts like `dist`, `build`, `.turbo`, and `node_modules`.
- **`turbo.json`**: Turborepo pipeline configuration. Defines build task topologies (e.g., `build`, `dev`, `lint`, `test`) and declares global environment variables (e.g., `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`) that invalidate build caches if changed.
- **`docker-compose.yml`**: Defines the local infrastructure and service definitions (PostgreSQL, Redis, Meilisearch, SeaweedFS) along with the `api` and `web` application containers. It handles port forwarding, volume mounts for persistence, healthchecks, and environment variable passthrough.

## Per-Environment Overrides

- **Local Development**: Engineers should duplicate `.env.example` to `.env` at the project root and populate required secrets. The `docker-compose.yml` file is configured out-of-the-box to bind to these default local ports and credentials.
- **Staging and Production**:
  - `NODE_ENV` must be strictly set to `production`.
  - Service host bindings should be updated to point to managed database or cache instances rather than local containers.
  - Secret keys and passwords (`JWT_SECRET`, `POSTGRES_PASSWORD`, etc.) must be overridden with secure, generated values.
  - The API and Web containers in `docker-compose.yml` already apply some production defaults internally but rely on environment overrides on the host. 
  - <!-- VERIFY: Clarify the exact secret management strategy for staging/production (e.g., AWS Parameter Store, Kubernetes Secrets, GitHub Actions Secrets). -->

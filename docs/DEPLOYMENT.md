<!-- generated-by: gsd-doc-writer -->
# Deployment Guide

This document outlines the deployment strategy, build pipeline, and operations for the **UIMS (Unified IT Management System)**.

## Deployment Targets

UIMS is containerized and currently deployed using **Docker Compose**. The production setup is defined in `docker-compose.yml` and includes the following services:

- **api**: Node.js/NestJS backend (built via `apps/api/Dockerfile`)
- **web**: React SPA served by Nginx (built via `apps/web/Dockerfile`)
- **postgres**: PostgreSQL 17 for primary relational data
- **redis**: Redis 8 for caching and background queues (BullMQ)
- **meilisearch**: Search engine for fast data retrieval
- **seaweedfs-***: Object storage layer (Master, Volume, and S3-compatible Filer gateway)

### Environments
- **Production**: Run with `pnpm docker:up` (uses `docker-compose.yml`).
- **Development**: Run with `pnpm docker:dev` (combines `docker-compose.yml` and `docker-compose.dev.yml`).

## Build Pipeline

The project utilizes Turborepo and PNPM workspaces to orchestrate builds. Container builds use multi-stage Dockerfiles to optimize image size.

### Manual Build Steps
To build the application images locally:
```bash
# Build all Docker images
pnpm docker:build

# Alternatively, build specific workspace packages
pnpm build
```

> <!-- VERIFY: CI/CD automation relies on external tools or specific GitHub Actions workflows that are not currently checked into `.github/workflows/`. -->

## Environment Setup

The production deployment requires a set of environment variables to be configured. The API and external services rely on these values. Refer to [CONFIGURATION.md](./CONFIGURATION.md) for full details on all available parameters.

### Required Production Variables
For a secure production deployment, ensure the following are securely set in your `.env` or CI/CD secrets:

```env
# Core Application Ports
APP_PORT=3002
WEB_PORT=5679

# PostgreSQL Database
DATABASE_USER=uims
DATABASE_PASSWORD=your_secure_db_password
DATABASE_NAME=uims_db

# Redis
REDIS_PASSWORD=your_secure_redis_password

# Authentication
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret

# Meilisearch
MEILISEARCH_API_KEY=your_secure_meili_master_key

# SeaweedFS (S3 Gateway)
S3_ACCESS_KEY=your_secure_s3_access
S3_SECRET_KEY=your_secure_s3_secret
S3_BUCKET=uims-files
```

### Database Migrations
Before fully starting the application in production, you may need to apply database migrations. This can be done via the provided PNPM script:
```bash
pnpm db:migrate:prod
```

## Rollback Procedure

Because UIMS is deployed via Docker Compose, rollbacks are handled by reverting to the previously known good container images.

1. **Identify the stable image tag**: Check your container registry or local image history for the previous working build tag.
2. **Update the `docker-compose.yml`** (or relevant `.env` variable controlling the image tag) to point to the stable version.
3. **Re-deploy**:
   ```bash
   pnpm docker:up
   ```
4. **Database Rollbacks**: If a database migration caused the issue, you must manually run a reverse migration or restore from a database backup (Postgres `pg_dump`).
   <!-- VERIFY: Database backup automation is in place. -->

## Monitoring and Logging

- **Logging**: The Node.js API utilizes `pino` and `pino-http` for structured JSON logging. Container logs can be viewed via `pnpm docker:logs`.
- **Monitoring Tools**: 
  <!-- VERIFY: No external application performance monitoring (APM) tools like Sentry, Datadog, or Prometheus are explicitly configured in the codebase at this time. -->

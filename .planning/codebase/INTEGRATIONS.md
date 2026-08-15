# External Integrations

**Analysis Date:** 2026-08-15

## APIs & External Services
- **Meilisearch**: Used for full-text search capabilities across entities (e.g., assets, tickets). The API communicates with the Meilisearch instance directly via standard `fetch` HTTP requests using `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`.
- **S3 Compatible Object Storage**: The codebase is configured to connect to an S3-compatible service (SeaweedFS is provided in the Docker stack) for file and asset storage using `S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY`.

## Data Storage
- **PostgreSQL**: Primary relational database. Managed via Prisma ORM (`DATABASE_URL`). The Docker setup uses PostgreSQL 17.
- **Redis**: In-memory data store used for caching and managing background job queues via BullMQ (`REDIS_URL`). The Docker setup uses Redis 8.
- **SeaweedFS**: Included in the infrastructure as an S3 gateway (`seaweedfs-master`, `seaweedfs-volume`, `seaweedfs-filer`) to provide local object storage.

## Authentication & Identity
- **Local Authentication**: Handled internally using `@nestjs/jwt` and `passport-jwt` without relying on external identity providers (like Auth0 or Okta). 
- **Secrets Management**: JWT tokens are signed using local environment variables (`JWT_SECRET` and `JWT_REFRESH_SECRET`). Passwords are hashed locally using `bcrypt`.
- There are no active OAuth, SAML, or LDAP integrations present in the codebase.

## Monitoring & Observability
- **Internal Logging**: Handled via `pino` and `pino-http` for structured logging.
- No external observability platforms (e.g., Datadog, Sentry, New Relic) are currently integrated.

## CI/CD & Deployment
- **Docker**: Containerization is the primary deployment strategy, defined by `Dockerfile`s in both `apps/api` and `apps/web`.
- **Orchestration**: `docker-compose.yml` is used for orchestrating the multi-container setup (Postgres, Redis, Meilisearch, SeaweedFS, API, and Web UI).
- No standard CI/CD workflow files (e.g., GitHub Actions, GitLab CI) are present in the repository.

## Environment Configuration
- Environment settings and credentials for integrations are injected via `.env` files. Key configuration files include:
  - `.env` (root directory)
  - `.env.example`
  - `apps/api/.env`

## Webhooks & Callbacks
- No incoming or outgoing webhooks are currently configured or handled by the API.

---
*Integration audit: 2026-08-15*

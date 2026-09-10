# External Integrations & Services

## Infrastructure Services
- PostgreSQL: 17 — Relational Database. Configured via `docker-compose.yml` (uims-postgres on port 5433).
- Redis: 8 — Cache layer, session state, BullMQ queues. Configured via `docker-compose.yml` (uims-redis on port 6381).
- MeiliSearch: latest — Full-text search engine. Configured via `docker-compose.yml` (uims-meilisearch on port 7700).
- SeaweedFS: latest — S3-compatible Object Storage API for file storage (master on 9333, filer on 8888/8333, volume on 8080).

## Third-Party APIs
- Cloudflare: Used for local tunneling in the dev script (`.trycloudflare.com`).

## Authentication & Security
- JWT / Passport: Handled via `@nestjs/passport` and `@nestjs/jwt`. Uses `bcrypt` (6.0.0) for password hashing.
- Role-Based Access Control: Managed within the backend (`apps/api/src/modules/roles`).
- Reverse Proxy & TLS: Vite uses self-signed development certs on port 5679 locally. Nginx is configured for production.

## Background Jobs & Queues
- BullMQ: 6.3.4 — Handles background job processing, backed by Redis. Integrated via `@nestjs/bullmq`.

## Search & Indexing
- MeiliSearch: Full-text indexing for entities. Connected via `@nestjs/config` and environment variables (`MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`).

## Storage & File Management
- SeaweedFS: Provides S3-compatible storage endpoints (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`). Used for persistent file asset management.


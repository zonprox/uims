# UIMS External Service Integrations Map

## 1. Relational Database: PostgreSQL

### Infrastructure & Containerization
- **Engine**: PostgreSQL version `17-alpine` via Docker Compose.
- **Connection Configuration**: 
  - `max_connections=200`
  - `shared_buffers=256MB`
  - `effective_cache_size=768MB`
  - `maintenance_work_mem=64MB`
- **Application Integration**: The NestJS API connects using the Prisma ORM. The connection string is injected via the `DATABASE_URL` environment variable.
- **Pooling Setup**: Prisma URL appends `?schema=public&connection_limit=20&pool_timeout=30`, ensuring the Node.js event loop doesn't overwhelm the database.
- **Resilience**: Monitored via a `pg_isready` health check script polling every 5 seconds.

---

## 2. In-Memory Datastore: Redis

### Infrastructure & Containerization
- **Engine**: Redis version `8-alpine`.
- **Tuning**: Configured with `--maxmemory 512mb` and an eviction policy of `--maxmemory-policy allkeys-lru`. Persistence is guaranteed via `--appendonly yes`.
- **Application Integration**: Connected to the NestJS application via the `REDIS_URL` environment variable.
- **Usage Patterns**:
  - Session and Refresh Token invalidation layer.
  - Caching frequent, expensive API queries.
  - Pub/Sub bus for real-time Socket.IO scaling (when operating across multiple API replicas).
- **Resilience**: Monitored via `redis-cli ping` health check every 5 seconds.

---

## 3. Search Infrastructure: MeiliSearch

### Infrastructure & Containerization
- **Engine**: `getmeili/meilisearch:latest`
- **Environment**: Exposed on port `7700`.
- **Application Integration**: 
  - The API service interacts with MeiliSearch via HTTP requests.
  - Configured using `MEILISEARCH_HOST` (`http://meilisearch:7700`) and secured with `MEILISEARCH_API_KEY`.
- **Usage Patterns**:
  - Full-text search capabilities for large textual entities (e.g., user directories, complex audits) offloading fuzzy-search burdens from PostgreSQL.
- **Resilience**: A standard HTTP health check (`/health`) ensures the container is ready before the API boots.

---

## 4. Object Storage: SeaweedFS

### Infrastructure & Architecture
SeaweedFS is deployed as a highly scalable distributed file system using three components:
1. **Master Node** (`seaweedfs-master`): Port `9333`.
2. **Volume Node** (`seaweedfs-volume`): Port `8080`.
3. **Filer / S3 Gateway Node** (`seaweedfs-filer`): Exposes an S3-compatible HTTP API on port `8333`.

### Application Integration
- **Configuration**:
  - `S3_ENDPOINT`: Set to `http://seaweedfs-filer:8333` targeting the local Filer gateway.
  - `S3_ACCESS_KEY` & `S3_SECRET_KEY`: Used by the API's AWS S3 SDK (or similar S3-compatible client) to authenticate requests.
  - `S3_BUCKET`: Default bucket name initialized as `uims-files`.
- **Usage Patterns**:
  - Storing user uploads, attachments, and generated reports.
  - Using pre-signed URLs for secure, direct-to-storage client uploads, bypassing API memory bottlenecks.

---

## 5. Security & Cryptographic Integrations

### JWT (JSON Web Tokens)
- **Configuration**: 
  - `JWT_SECRET` (symmetric key for access tokens, 15m expiration)
  - `JWT_REFRESH_SECRET` (symmetric key for refresh tokens, 7d expiration).
- **Integration**: Integrated deeply into the NestJS `@nestjs/jwt` module and custom Passport.js strategies.

### Audit Trail Encryption
- **Configuration**: `AUDIT_SIGNING_KEY`
- **Usage Pattern**: Used to cryptographically sign audit logs to guarantee non-repudiation and prevent tampering by privileged actors or database administrators.

---

## 6. Networking & Web Serving

### NGINX (Production Build)
- **Role**: Serves the compiled Vite static assets (React frontend).
- **Configuration Path**: `docker/nginx/nginx.conf`
- **Integration**: Acts as an HTTPS terminator (binding to port `5679` mapping to `443` internally) and routes `/api` requests to the upstream NestJS container.

### Dev Proxy (Vite)
- **Role**: In development environments (`docker-compose.dev.yml`), the Vite dev server manages routing.
- **Integration**: `vite.config.ts` proxies `/api` and `/socket.io` to the internal API Docker container (`http://uims-api-dev:3000`), resolving CORS issues naturally.

---

## 7. Comprehensive Environment Variable Index

| Variable | Target Component | Purpose & Integration Path |
|----------|------------------|----------------------------|
| `DATABASE_URL` | Prisma ORM | Full connection string linking Node to Postgres with pooling. |
| `REDIS_URL` | ioredis / API | Linking the Node API to the Redis instance for caching. |
| `MEILISEARCH_HOST` | API | HTTP target for the search engine indexing service. |
| `MEILISEARCH_API_KEY` | API | Auth token for search indexing and querying. |
| `S3_ENDPOINT` | API | URL pointing to the SeaweedFS S3 API. |
| `S3_ACCESS_KEY` | API | S3 equivalent access ID. |
| `S3_SECRET_KEY` | API | S3 equivalent secret key. |
| `S3_BUCKET` | API | Default target bucket for application file uploads. |
| `JWT_SECRET` | API | Cryptographic seed for signing JWT access tokens. |
| `JWT_REFRESH_SECRET`| API | Cryptographic seed for signing JWT refresh tokens. |
| `AUDIT_SIGNING_KEY` | API | HMAC/RSA key used to secure append-only audit trails. |
| `APP_PORT` | Docker / API | Maps internal NestJS port (3000) to the host. |
| `WEB_PORT` | Docker / NGINX | Maps internal UI port to the host machine. |

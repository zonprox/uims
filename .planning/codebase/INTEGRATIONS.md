# External Integrations
> Generated: 2026-09-13 | Focus: Service dependencies and integration patterns

## Service Topology

| Service | Container Name | Port | Protocol | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `uims-postgres` | `5432` | TCP / PG | `pg_isready` |
| **Redis** | `uims-redis` | `6379` | TCP / RESP | `redis-cli ping` |
| **MeiliSearch** | `uims-meilisearch` | `7700` | HTTP | `/health` curl check |
| **Seaweed Master** | `uims-seaweedfs-master` | `9333` | HTTP/gRPC | None |
| **Seaweed Volume** | `uims-seaweedfs-volume` | `8080` | HTTP/gRPC | None |
| **Seaweed Filer** | `uims-seaweedfs-filer` | `8333` / `8888`| HTTP (S3) | None |
| **NestJS API** | `uims-api` | `3000` | HTTP / WS | `wget /api/v1/health` |
| **Vite Web** | `uims-web` | `443` | HTTPS | `wget https://localhost/` |

## Database Integration
- **Engine**: PostgreSQL 17
- **Connection Details**: Native client (`pg` ^8.23.0) via Prisma Adapter.
- **Resource Configuration**: 
  - Connection Pool limit: `20` (Prisma schema), timeout `30s`
  - Hard Limits: `max_connections=200` set via command line entrypoint
  - Memory tuning: `shared_buffers=256MB`, `effective_cache_size=768MB`
- **Migration Strategy**: Driven by Prisma CLI (`prisma:generate`, `prisma:migrate dev`, `prisma:deploy`)

## Cache & Queue Integration
- **Engine**: Redis 8 (Alpine)
- **Cluster Mode**: Single node
- **Configuration Details**: Constrained to `maxmemory 512mb` operating with an `allkeys-lru` eviction policy. Uses `ioredis` ^6.0.0 internally.
- **Queue System**: BullMQ utilizes Redis for robust background worker distribution (e.g., scheduled alerting and notifications).

## Search Engine
- **Engine**: MeiliSearch (Latest)
- **Integration Profile**: Operated over HTTP on Port `7700`. Authenticated strictly via `MEILI_MASTER_KEY`.
- **Purpose**: High-speed, typo-tolerant full-text search index capability across the UIMS asset/platform layers. Database is auto-upgraded on boot (`MEILI_UPGRADE_DB`).

## Object Storage
- **Engine**: SeaweedFS
- **Interface Protocol**: S3-compatible API exposed via the `seaweedfs-filer` module.
- **Implementation**: The backend accesses storage over `http://seaweedfs-filer:8333` using access and secret keys (`S3_ACCESS_KEY`, `S3_SECRET_KEY`) writing to `uims-files` bucket.

## Authentication & Security
- **Providers**: Bespoke local authentication flow leveraging `@nestjs/passport` (Passport.js).
- **Token Strategy**: Stateless JWT access and refresh protocol. Expirations tuned to `15m` (Access) and `7d` (Refresh).
- **Cryptography**: Standard `bcrypt` (^6.0.0) library employed for password hashing.
- **CORS Configuration**: Enterprise explicit mapping. Restricts access to predefined frontend domains, localhost dev ports, and Cloudflare trycloudflare.com tunnels.
- **Defenses**: Global integration of `helmet` for strict header policies (HSTS preload max-age mapped to 1 year).

## Real-time Communication
- **Engine**: Socket.IO (^4.8.3)
- **Integration**: Plumbed into NestJS via `@nestjs/websockets`. Provides a dedicated `notifications.gateway.ts` to push real-time alerts.
- **Client**: Frontends maintain a persistent socket context utilizing `socket.io-client`.

## API Documentation
- **Specification Engine**: Swagger / OpenAPI 3.x
- **Configuration**: Served directly on `/api/v1/docs` utilizing the `@nestjs/swagger` (^11.4.7) Document Builder. Exposes API specification Version `2.4.0` requiring Bearer Auth definitions.

## External Services & DevOps
- **Cloudflare Quick Tunnels**: Ad-hoc exposure script (`scripts/dev.sh`) incorporates `cloudflared` to broadcast the internal local Vite HMR server securely via a public `.trycloudflare.com` URL (circumventing firewall limitations during development).
- **SSL Proxy**: A Dockerized Nginx instance is explicitly leveraged to handle SSL termination directly for local front-end requests.

## Integration Health & Resilience Patterns
- **Health Checks**: Every foundational Docker service possesses a built-in automated health ping. The overarching deployment orchestrator script wait-for-it pattern enforces a strict readiness queue for port listeners and API HTTP statuses.
- **Graceful Degradation**: 
  - Redis utilizes `allkeys-lru` to ensure memory limits don't trigger service collapse. 
  - Background work is detached successfully via BullMQ avoiding main thread lockups on the NestJS API.
- **Connection Pooling Strictness**: Prisma client connections are intentionally capped (`connection_limit=20`) mitigating PostgreSQL socket starvation.

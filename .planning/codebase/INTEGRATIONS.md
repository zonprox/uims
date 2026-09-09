# External Integrations

**Analysis Date:** 2026-09-09

## Data Storage & Infrastructure

- **PostgreSQL Database**: 
  - Deployed as PostgreSQL 17 (Alpine) via Docker container `uims-postgres`. 
  - Exposed locally on port 5433 mapped to 5432 internally.
  - Integrated via Prisma ORM 7. The comprehensive schema is defined in `apps/api/prisma/schema.prisma`. 
  - Configuration relies on the `DATABASE_URL` via environment variables. The connection string includes parameters for schema definitions and connection pooling.
- **Redis & Caching**: 
  - Deployed as Redis 8 (Alpine) via Docker container `uims-redis`. 
  - Exposed locally on port 6381.
  - Integrated into the API via the `ioredis` (v6) library. 
  - Redis serves multiple purposes: it acts as a high-speed application-level cache, manages state for rate limiters, and serves as the crucial backing store for BullMQ background job queues.
- **Full-Text Search Engine**: 
  - Meilisearch (`getmeili/meilisearch:latest`) is provisioned within the local infrastructure.
  - Accessible via internal port `7700`. 
  - Integrated using the `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` environment variables.
- **Object Storage (File Uploads)**: 
  - The system utilizes SeaweedFS, which provides an S3-Compatible API for highly scalable object storage.
  - The stack deploys three distinct components via Docker: `seaweedfs-master` (port 9333), `seaweedfs-volume` (port 8080), and `seaweedfs-filer`.
  - The application interfaces with the `seaweedfs-filer` gateway on port `8333`.
  - Configured via environment variables: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_BUCKET`.
  - Note: While explicit storage controller modules (e.g., `apps/api/src/modules/storage`) are currently missing or WIP, the infrastructure is completely provisioned for standard S3 client interaction using the AWS SDK or similar clients.

## Authentication & Identity

- **JWT Authentication Flow**: 
  - The core authentication implementation resides in `apps/api/src/modules/auth/`.
  - It utilizes Passport.js (`@nestjs/passport` and `passport-jwt`) to manage identity safely.
  - **Access & Refresh Tokens**: Managed by `AuthModule` (`apps/api/src/modules/auth/auth.module.ts`). The module configures the `JwtModule` asynchronously using the `ConfigService` to read `JWT_SECRET` and `JWT_ACCESS_EXPIRATION`.
  - **Guard Chain**: Access control is enforced by custom guards (`apps/api/src/modules/auth/auth.guard.ts`) mapped globally, and specific public endpoints can bypass this using the `@Public()` decorator.
  - **Token Rotation & Hashing**: Handled securely via `bcrypt` (v6) for password encryption before storage in PostgreSQL.
- **Enterprise Directories**: 
  - The Prisma schema (`apps/api/prisma/schema.prisma`) defines a `DirectoryUser` model mapping to an Active Directory or similar structure.
  - This model includes a `DirectorySource` enum covering `LOCAL`, `LDAP`, and `AZURE_AD`. 
  - Currently, no specific LDAP libraries (like `ldapjs`) are present in `package.json`, indicating that directory synchronization logic is either pending implementation or abstracted elsewhere in another microservice.

## Monitoring & Observability

- **Structured Logging**: 
  - Traditional `console.log` is strictly prohibited throughout the codebase. 
  - Logging is handled via `pino` (v10) and `pino-http` (v11). 
  - This enforces machine-readable JSON logging suitable for production log aggregators (e.g., ELK stack, Datadog, Splunk).
- **NestJS Logger Integration**: 
  - The API intercepts the default NestJS logger and replaces it with Pino, ensuring that even framework-level startup messages and error traces are structured.
- **Health Checks & Diagnostics**: 
  - Implemented in `apps/api/src/modules/health/health.controller.ts`.
  - Exposed publicly at the `/health` endpoint via the `@Public()` decorator.
  - **Validations**: 
    - Verifies PostgreSQL connectivity using a lightweight query: `this.prisma.$queryRaw\`SELECT 1\``.
    - Verifies Redis connectivity using the standard ping command: `this.redisService.ping()`.
  - **Metrics Returned**: Returns highly structured diagnostics including memory usage (`process.memoryUsage()`), system uptime (`process.uptime()`), Node version, and dynamic `status` strings (`ok`, `degraded`, `error`) calculated based on latency thresholds (e.g., degraded if latency > 500ms).

## WebSockets & Real-Time

- **Socket.io Gateway**: 
  - The API leverages `@nestjs/platform-socket.io` and `@nestjs/websockets` to spin up a WebSocket server alongside the HTTP server.
- **Implementation Location**: 
  - WebSockets are heavily utilized in `apps/api/src/modules/notifications/notifications.gateway.ts` to broadcast events.
- **Client Usage**: 
  - The React frontend (`@uims/web`) uses the `socket.io-client` v4.8.3 library to maintain a persistent connection, listening for real-time state changes and user notifications without the need for manual polling.

## Email / Notifications

- **Notifications Module**: 
  - Located at `apps/api/src/modules/notifications/`. 
  - Handles the creation, reading, and broadcasting of internal system alerts (stored in the `Notification` PostgreSQL table).
  - Background scheduling is managed by BullMQ workers (e.g., `scheduled-alerts.worker.ts`).
- **External Email Delivery**: 
  - An audit of the dependencies shows no explicit external email provider SDKs (like SendGrid or Mailgun) and no `nodemailer` package installed in `apps/api/package.json`. 
  - Email delivery capabilities are either pending implementation or intentionally decoupled into an external microservice.

## Webhooks & Callbacks

- **Incoming/Outgoing Webhooks**: 
  - A thorough search across the API source code (`apps/api/src`) did not reveal explicit webhook endpoint controllers or specialized webhook signature validation utilities (such as Stripe or GitHub webhook handlers). 
  - However, standard HTTP controllers are fully capable of accepting generic POST callbacks if integrated in the future.
- **Audit Logging**: 
  - Changes triggered by internal actions (and potentially future webhooks) are captured in the `AuditLog` model in Prisma.
  - These logs incorporate an `AUDIT_SIGNING_KEY` environment variable for cryptographic verification of log integrity.

## Secrets Location

- **Docker Environment**: 
  - During local orchestration, secrets are injected dynamically into containers via `docker-compose.yml`.
- **Environment Files**: 
  - Configured locally via `.env` files located at the repository root and inside `apps/api/.env`.
- **Security Constraint**: 
  - The contents of these secret files (e.g., `DATABASE_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `S3_SECRET_KEY`, `MEILISEARCH_API_KEY`) are highly sensitive and are NEVER to be committed, logged, or read by analysis tools. They are parsed safely at runtime by the `@nestjs/config` `ConfigModule`.

*Integration audit: 2026-09-09*

### SeaweedFS Configuration Details
```yaml
seaweedfs-master:
  image: chrislusf/seaweedfs:latest
  ports:
    - "9333:9333"

seaweedfs-volume:
  image: chrislusf/seaweedfs:latest
  ports:
    - "8080:8080"
  depends_on:
    - seaweedfs-master

seaweedfs-filer:
  image: chrislusf/seaweedfs:latest
  command: filer -master="seaweedfs-master:9333" -ip.bind=0.0.0.0 -s3 -s3.port=8333
  ports:
    - "8888:8888"
    - "8333:8333"
  depends_on:
    - seaweedfs-master
    - seaweedfs-volume
```

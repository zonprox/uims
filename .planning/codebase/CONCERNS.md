# Technical Concerns & Opportunities
> Generated: 2026-09-13 | Focus: Risk assessment, compliance gaps, and improvement opportunities

## Critical Issues (must fix)
- **Hardcoded Default Dev CORS Origins**: `main.ts` and `notifications.gateway.ts` contain hardcoded local origins (`http://localhost:5679`, etc.) and a wildcard allow for `.trycloudflare.com` in non-production. This poses a potential lateral movement risk if a non-prod environment is publicly accessible.
- **Missing Pagination in Dashboard/Service Queries**: Usage of `.findMany()` without explicit `take` or `cursor` limits in several services (e.g., `audit.service.ts`, `directory.service.ts`, `dashboard.service.ts`). Could lead to memory exhaustion and slow response times as the dataset grows.

## Security Concerns
- **Secret Management**: JWT secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`) and Audit signing keys (`AUDIT_SIGNING_KEY`) are loaded directly from `process.env`. There is no integration with a KMS (e.g., AWS KMS, HashiCorp Vault, or Doppler) which is a standard requirement for enterprise security in 2026.
- **WebSocket Authentication Limitations**: The `NotificationsGateway` performs inline JWT verification but does not appear to handle token revocation checks (e.g., checking if the user is suspended or the token was blacklisted) like the standard HTTP guards might. 
- **Audit Tamper Evident Signatures**: While HMAC is used in `audit.interceptor.ts`, storing the audit logs and their signatures in the same Postgres database reduces the integrity guarantee. A compromised database could recalculate the HMAC if the secret is in memory.
- **Input Validation Surface**: While `ValidationPipe` is enabled with `whitelist: true`, there's no mention of a WAF or dedicated rate-limiting middleware (like `@nestjs/throttler`) in `main.ts`.

## Performance Concerns  
- **Database Query Patterns (N+1)**: The `directory.service.ts` has manual chunking and batching logic (e.g., fetching 100-500 users at a time in loops) rather than leveraging Prisma's native optimizations or a dedicated DataLoader pattern. This custom chunking increases code complexity and memory overhead.
- **Caching Strategy**: No distributed caching mechanism (like Redis) is explicitly configured at the API gateway level for heavily read data (like directory users or asset categories).
- **In-memory Aggregations**: The dashboard service fetches raw rows (`findMany`) to aggregate metrics instead of using Prisma's `groupBy` or `aggregate` functions, which can cause severe memory spikes on the Node.js process.

## Reliability Concerns
- **Error Handling**: `try/catch` blocks appropriately use `unknown` for errors, but fallback error logging uses standard `console` or basic NestJS logger without structured formatting (JSON).
- **Graceful Shutdown**: `app.enableShutdownHooks()` is called, but there is no explicit handling of draining active WebSocket connections in the `NotificationsGateway` or BullMQ background workers before the Node process exits.
- **Health Checks**: Missing a robust Kubernetes-ready health check endpoint (e.g., `@nestjs/terminus`) that verifies database connectivity, Redis ping, and SeaweedFS availability.

## Maintainability Concerns
- **Duplicated CORS Logic**: The CORS configuration logic is duplicated between `main.ts` and `notifications.gateway.ts` (`resolveAllowedOrigins`). This violates DRY and could lead to inconsistent security policies if one is updated without the other.
- **Type Safety**: The codebase strictly enforces no `@ts-ignore` and uses modern TypeScript, but heavy rely on `unknown` casting and manual type guards in WebSockets could be replaced with Zod schemas for runtime safety.

## 2026 Best Practice Gaps
- **Observability**: Missing OpenTelemetry (OTel) instrumentation for distributed tracing. Standard NestJS logger is used instead of a modern structured logger (like Pino) outputting JSON for log aggregators.
- **Feature Flags**: No evidence of a feature flag system (e.g., LaunchDarkly, Unleash) for safe, progressive rollouts.
- **Database Resilience**: Prisma Client lacks explicit connection pooling configuration (e.g., PgBouncer integration or Prisma Accelerate) and circuit breakers for database outages.

## Technical Debt Inventory
- **Manual Batching in Services**: `directory.service.ts` lines 600+ contain complex manual caching (`adGroupCache`, `deptCache`) and chunking logic.
- **Prisma Schema Monolith**: The `schema.prisma` is over 600 lines long, encompassing auth, directory, inventory, network, and auditing. It should ideally be split using Prisma's `multiSchema` or modularized.

## Opportunities

### Quick Wins
- Extract the CORS configuration into a shared configuration utility.
- Add `@nestjs/terminus` for liveness and readiness probes.
- Replace manual caching Maps in `directory.service.ts` with a dedicated `DataLoader` or `CacheManager`.
- Implement `@nestjs/throttler` in `main.ts` to prevent brute-force attacks.

### Strategic Improvements
- **Migrate to OpenTelemetry**: Instrument the NestJS app with `@opentelemetry/api` to get auto-instrumentation for HTTP, Prisma, and Socket.io.
- **Implement Secret Manager**: Migrate from `.env` files to fetching credentials at runtime via AWS Secrets Manager or HashiCorp Vault.
- **CQRS Architecture**: As the app grows, split complex read-heavy dashboard aggregations into a CQRS pattern using materialized views or Elasticsearch/MeiliSearch for analytics, rather than hitting the primary Postgres DB.
- **Prisma Edge/Accelerate**: Upgrade database access patterns to utilize connection pooling and edge caching for faster response times across distributed deployments.

## Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| In-memory Dashboard Aggregations | High | High | Refactor to use Prisma `.aggregate()` or SQL Views |
| Lack of Rate Limiting | High | Medium | Implement `@nestjs/throttler` or Cloudflare WAF rules |
| Hardcoded Non-Prod CORS | Medium | Low | Restrict `.trycloudflare.com` to specific preview environments |
| Duplicated Security Logic | Low | High | Refactor CORS resolution to a shared module |
| Missing Structured Logging | Medium | High | Integrate `nestjs-pino` and OpenTelemetry |

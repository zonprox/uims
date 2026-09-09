# GEMINI.md — Authoritative Engineering & Defect Prevention Directives

> **Unified IT Management System (UIMS)**  
> This document defines authoritative agent contracts, architectural invariants, strict type safety standards, and defect prevention rules. All LLM agents, automated tools, and human contributors MUST strictly comply with every rule in this specification.

---

## 1. System Architecture & Boundaries

- **Pattern**: Modular Monolith, REST API, Single-Page Application (SPA), Containerized via Docker Compose.
- **Language Policy**: 100% Concise, Professional Enterprise English across all code identifiers, comments, documentation, UI copy, API payloads, and git commits.
- **Monorepo Structure**:
  - `apps/api`: NestJS 11 + Prisma 7 ORM + PostgreSQL 17 + Redis 8 + BullMQ.
  - `apps/web`: React 19 + Ant Design v6+ + Vite 8 + Zustand 5 + TanStack Query 5.
  - `packages/shared-types`: Common TypeScript entities, DTOs, Enums, and API Response envelopes.
  - `packages/shared-validators`: Shared runtime Zod schemas.
  - `packages/shared-utils`: Common string, date, and validation utilities.
  - `packages/eslint-config`: Shared linting configurations.

---

## 2. Agent Behavioral Contracts

1. **Think Before Coding**: Explicitly state assumptions. Never guess or choose arbitrary semantics silently. If multiple implementations exist, select the simplest, least-invasive pattern.
2. **Simplicity First**: Write the minimum code that completely satisfies requirements. No speculative abstractions, unused generic parameters, or unrequested configuration flags.
3. **Surgical Changes**: Touch only lines strictly required to satisfy the goal. Never reformat or "clean up" adjacent code unless explicitly tasked.
4. **Goal-Driven Execution**: Formulate verifiable criteria and execute verification loops (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`) until green.

---

## 3. Strict Type Safety Standards & Error Handling

- **Zero `any` Policy**:
  - Usage of `any`, `as any`, or loose dynamic types is strictly forbidden across production code and test suites.
  - Use `unknown`, generics, exact interface contracts, or Prisma generated types.
  - Test mocks must use `vi.mocked()`, `Partial<T>`, or dedicated mock factories rather than casting to `any`.
- **Typed Catch Blocks**:
  - Catch clauses must always type errors as `unknown`: `catch (error: unknown)`.
  - Safely narrow errors before inspection: `if (error instanceof Error) { ... }` or use shared error extraction utilities (`error instanceof HttpException`).
- **Zero Silent Catch Policy**:
  - Empty catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly prohibited across both backend and frontend codebases.
  - Every error caught must be either:
    1. Logged via structured logger (`this.logger.error('Context message', error instanceof Error ? error.stack : undefined)`);
    2. Re-thrown as an appropriate domain exception (`HttpException`); or
    3. Gracefully handled with user-facing feedback (e.g. `notification.error(...)` or `message.error(...)` on frontend).
  - Security-sensitive writes (refresh token creation/revocation, audit log emission) must NEVER be fire-and-forget with empty catches. Database operations during authentication must be logged and handled to maintain session consistency.
- **Zero Diagnostics Suppressions**:
  - `@ts-ignore`, `@ts-expect-error` (without tracking ID), `@ts-nocheck`, and eslint suppressions (`/* eslint-disable */`) for type safety violations are strictly prohibited.
- **Union Narrowing**:
  - When handling discriminated unions or `Promise.allSettled` results, explicitly narrow using type guards (e.g., `'scanned' in item` or `result.status === 'fulfilled'`).

---

## 4. Security & Credential Management

- **Zero Hardcoded Secrets**:
  - Passwords, connection strings, JWT keys, HMAC secrets, and API tokens must NEVER appear in source code, default string fallbacks, seed scripts, or test fixtures.
- **Docker Compose & Container Credential Parameterization**:
  - Connection strings in `docker-compose.yml` (`DATABASE_URL`, `REDIS_URL`) and `.env.example` MUST be parameterized via `${DATABASE_PASSWORD}` and `${REDIS_PASSWORD}` without insecure plaintext fallbacks.
  - Insecure defaults (e.g. `postgresql://uims:uims_secret_2026@...` or `:-uims-jwt-secret...`) are strictly prohibited in Compose files.
  - Container secrets: `AUDIT_SIGNING_KEY: ${AUDIT_SIGNING_KEY}` MUST be present in `docker-compose.yml` for the API service to satisfy startup validation.
  - Container healthchecks: The API service must define a Docker container healthcheck (`/api/v1/health`) so dependent services (e.g., `web`) start only when the API is genuinely healthy (`condition: service_healthy`).
- **Fail-Fast Environment Validation**:
  - Application startup MUST fail immediately with an explicit error message if required environment variables are absent (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `AUDIT_SIGNING_KEY`).
  - Prohibited pattern: `process.env.JWT_SECRET || 'secret'`.
  - Required pattern: `const secret = configService.getOrThrow<string>('JWT_SECRET');`.
- **Principle of Least Privilege & Fail-Closed**:
  - If a user role or permission cannot be authoritatively resolved, access MUST be denied (`throw new ForbiddenException('Access denied')`).
  - Never default unverified users to `'Employee'` or any fallback role.
- **Data Protection & Schema Sanitation**:
  - Sensitive plaintext credentials (e.g. `adInitialPassword`) must NEVER be stored in relational models. Passwords must be hashed using salted bcrypt.
  - Predictable default passwords (such as `Ad#${username}2026!`) are banned. All new accounts must be provisioned with cryptographically secure random passwords and required to change passwords upon first authentication.
  - Plaintext license keys in `schema.prisma` must be masked or encrypted at rest; initial temporary passwords must be purged from all API responses.

---

## 5. Network, CORS & Controller Architecture

- **Strict CORS Validation**:
  - Validate origins against an explicit, configured allowlist (`CORS_ORIGIN` or `ALLOWED_ORIGINS`).
  - Wildcards (`*`) and indiscriminate non-production bypasses with `credentials: true` are prohibited.
- **WebSocket Gateway Security & Invariants**:
  - `@WebSocketGateway` must never configure wildcard origins with credentials (`origin: '*', credentials: true`).
  - Allowed origins must dynamically match the configured REST CORS allowlist (`CORS_ORIGIN` / `ALLOWED_ORIGINS`).
  - Handshake token transport: WebSocket authentication tokens MUST NEVER be transmitted or accepted via URL query parameters (`socket.handshake.query.token`). Passing tokens in URLs exposes credentials in HTTP access logs, proxy caches, and browser history.
  - Handshake tokens must be supplied exclusively via `socket.handshake.auth.token` or `Authorization: Bearer <token>` headers.
  - Fail-closed connection policy: If a connection handshake does not supply a valid, verifiable JWT, the socket MUST be rejected immediately (`client.disconnect(true)`).
  - Zero default role fallback: Falling back to `'Employee'` or any default role (`payload.role || 'Employee'`) when a role claim is missing or invalid is strictly forbidden.
- **Controller Separation of Concerns**:
  - Controllers must only orchestrate routing, DTO validation, and service invocation.
  - Low-level network header parsing (e.g. client IP resolution from `x-forwarded-for`) MUST be extracted into reusable custom parameter decorators (`@ClientIP()`) or middleware.
- **Health Check Resilience**:
  - The health endpoint (`/api/v1/health`) must verify both PostgreSQL and Redis connectivity.
  - If the database is unreachable, the endpoint MUST return HTTP 503 (`ServiceUnavailableException`) rather than HTTP 200 with degraded payload, ensuring orchestrators (Kubernetes/Docker) route traffic accurately.

---

## 6. Database Access & Performance Directives

- **Mandatory Bounded Queries & Pagination**:
  - Every Prisma `findMany()` query in service code and background workers MUST enforce an explicit upper ceiling or pagination parameters (`skip`/`take`).
  - Default maximum page size must be capped (e.g., `take: Math.min(limit, 100)`).
  - Unbounded `findMany()` queries without `take` are strictly forbidden.
  - Queries must specify a deterministic `orderBy` to guarantee consistent pagination ordering.
- **Background Worker Query Ceilings**:
  - Recurring scheduled jobs (e.g., `ScheduledAlertsWorker`) querying expiring records (licenses, warranties, overdue maintenance) MUST enforce an explicit ceiling (`take: 100` or chunked cursor pagination).
- **Zero In-Memory Table Scans**:
  - Loading entire database tables into Node.js memory to evaluate row comparison logic in JavaScript (e.g. `inventoryItem.findMany()` followed by `item.quantity <= item.minThreshold`) is strictly prohibited.
  - Predicates must be evaluated directly in PostgreSQL using Prisma filter operators or `$queryRaw` SQL queries.
- **Zero In-Memory Aggregations**:
  - Loading relational rows into memory to compute arithmetic totals (e.g. `items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)`) is strictly prohibited.
  - Aggregations must be executed in the database engine using Prisma `_sum` or SQL aggregates (`SELECT COALESCE(SUM(quantity * "unitCost"), 0)`).
- **Directory CSV Batch Import Optimization**:
  - Batch import operations must eliminate sequential N+1 queries by using batched lookups, Map-based cache structures, and transactional batch inserts/updates (`$transaction`).
- **Database Index Coverage (`schema.prisma`)**:
  - In PostgreSQL, foreign keys (`@relation`) are not automatically indexed. Every relational foreign key column (`DirectoryUser(organizationId, departmentId, positionId, locationId)`, `AppUser(roleId)`, `Subnet(vlanId)`) MUST define an explicit `@@index([foreignKey])`.
  - Filter and sort columns filtered by recurring queries or workers (`Asset(warrantyExpiry)`, composite `Asset(status, updatedAt)`, `License(expiryDate)`) MUST define explicit indexes.
  - Join tables with composite primary keys (e.g., `RolePermission` on `[roleId, permissionId]`) MUST define a reverse index `@@index([permissionId])` to prevent full table scans on reverse lookups and deletions.

---

## 7. Structured Logging Standards

- **NestJS Structured Logger Mandate**:
  - Use `private readonly logger = new Logger(ContextName.name)` for all application tracing, worker execution, and background tasks.
  - Raw `console.log`, `console.warn`, and `console.error` are strictly forbidden in production code, seeder scripts, and workers.
- **Frontend Production Logging & Telemetry**:
  - Raw `console.error(...)` and `console.log(...)` calls across React components, hooks, and pages are prohibited in production code.
  - Unhandled asynchronous errors must surface actionable feedback via `App.useApp().message.error(...)` / `notification.error(...)` or report to a centralized React error boundary.

---

## 8. Frontend Architecture & State Management

- **Zero Circular Dependencies**:
  - Cyclic imports between state stores and service clients (e.g. `auth.store.ts` -> `auth.service.ts` -> `api.ts` -> `auth.store.ts`) are strictly prohibited.
  - State stores manage client state; network clients read tokens without circular store invocations. Empty stub methods (such as `authService.logout()`) that induce import cycles must be eliminated.
- **Dynamic Feedback & Theme Context**:
  - Always consume dynamic theme context via `App.useApp()` (`const { message, modal, notification } = App.useApp();`). Static `message.error()` is strictly prohibited.
- **Clean Component Test Teardown**:
  - Component tests rendering React 19 / Ant Design trees must track root instances and unmount cleanly in `afterEach` (`await act(async () => { currentRoot?.unmount(); })`) while clearing stray portal DOM elements (`.ant-modal-root`, `.ant-drawer`, `.ant-popover`) to prevent async scheduler microtask leaks and test environment teardown crashes (`window is not defined`).

---

## 9. Monorepo Dependency Maintenance & Strict Zero-Downgrade Invariant

- **Strict Zero-Downgrade Policy**:
  - Under no circumstances may any dependency be downgraded, even if lower versions or downgrades are suggested in historical notes, bug reports, or concerns (specifically refuting TD-020).
  - TypeScript 7.x (`^7.0.2` / latest) is the authoritative project standard and MUST be preserved across all manifests.
- **Lockfile Hygiene & Deduplication**:
  - Any dependency upgrade or manifest modification must immediately update `pnpm-lock.yaml` via `pnpm install --no-frozen-lockfile && pnpm dedupe`.
  - Modifying manifests without staging updated `pnpm-lock.yaml` is strictly prohibited to prevent remote CI `--frozen-lockfile` failures.
- **Release Stability Gate**:
  - Do not adopt unstable release candidates (RC) for mission-critical packages in production (e.g., Prisma remains on latest stable 7.x, not 8.0.0-rc).

---

## 10. Enterprise English & UI/UX Standards

- **UI Copy & Communication**:
  - All labels, modals, toasts, tables, placeholders, API errors, comments, and commit messages MUST be in standardized Enterprise English.
  - **No Fluff or Buzzword Prefixes**: Eliminate redundant prefixes such as "Enterprise ...", "Unified ...", "Master ...", or "System ..." unless strictly required for domain differentiation.
  - **Action-Oriented Controls**: Keep buttons short and verb-first (`Create Asset`, `Export CSV`, `Save`, `Filter`).
  - **Casing Standards**: Title Case for navigation, headers, and modal titles; sentence case for helper text, toasts, and descriptions.
- **Ant Design v6+ Best Practices**:
  - Always consume dynamic theme feedback via `App.useApp()` (`const { message, modal, notification } = App.useApp();`). Never invoke static `message.error()`.
  - Use semantic token styling: `styles={{ body: ... }}` rather than deprecated `bodyStyle` or `valueStyle`.
  - Wrap all full-page views in `<PageContainer>` to guarantee layout consistency.

---

## 11. Verification Invariants

Every change must satisfy the full verification cycle prior to merging or pushing:
1. `pnpm run typecheck --force` — 0 errors across all 6 packages.
2. `pnpm run lint --force` — 0 errors across all 6 packages.
3. `pnpm run format:check` — 100% compliant with Biome rules.
4. `pnpm run test` — 100% test pass rate across monorepo.
5. `pnpm run build` — Clean production builds across all workspaces.

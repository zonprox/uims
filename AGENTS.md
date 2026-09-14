# AGENTS.md — Authoritative Engineering, Architecture & Defect Prevention Directives

> **Unified IT Management System (UIMS)**  
> This document is the single authoritative source of truth for all AI agents, automated tools, and human contributors. It defines architectural invariants, strict type safety standards, UI/UX specifications, security rules, and defect prevention directives. Merge with project-specific instructions as needed.

---

## 1. System Architecture & Monorepo Boundaries

- **Architecture Style**: Modular Monolith API with a React Single-Page Application (SPA) frontend, containerized via Docker Compose.
- **Language Policy**: 100% Concise, Professional Enterprise English across all code identifiers, comments, documentation, UI copy, API payloads, and git commits.
- **Monorepo Engine**: `pnpm` workspaces (v11.21+) with `Turborepo` (v2.10+) build pipeline orchestration.
- **Monorepo Structure**:
  - `apps/api`: NestJS 11 + Prisma 7 ORM + PostgreSQL 17 + Redis 8. REST API at `/api/v1/*`, OpenAPI docs at `/api/v1/docs`, WebSocket gateway at `/notifications`.
  - `apps/web`: React 19 + Ant Design v6+ + Vite 8 + Zustand 5 + TanStack Query 5. Local TLS/HTTPS development server on port 5679.
  - `packages/shared-types`: Common TypeScript entities, DTOs, Enums, and API Response envelopes (`{ success: true, data: T, timestamp: string }`).
  - `packages/shared-validators`: Shared runtime Zod schemas.
  - `packages/shared-utils`: Common string, date, currency, byte, and validation utilities.
  - `packages/eslint-config`: Shared linting configurations.
  - `docker/`: PostgreSQL init scripts, Nginx TLS proxy configuration, Dockerfiles.
  - `scripts/`: Dev stack daemon (`dev.sh`), test runners, automation scripts.
  - `docs/`: In-depth architecture, configuration, deployment, testing, and UI specification guides.

---

## 2. Agent Behavioral Contracts

1. **Think Before Coding**:
   - Explicitly state assumptions. Never guess or choose arbitrary semantics silently.
   - If multiple interpretations exist, present tradeoffs clearly.
   - If a simpler approach exists, say so. Push back when warranted.
2. **Simplicity First**:
   - Write the minimum code that completely satisfies requirements.
   - No speculative abstractions, unused generic parameters, or unrequested configuration flags.
   - If 200 lines could be 50, rewrite it.
3. **Surgical Changes**:
   - Touch only lines strictly required to satisfy the goal.
   - Never reformat or "clean up" adjacent code unless explicitly tasked.
   - Clean up your own mess: remove imports/variables/functions made unused by your changes.
4. **Goal-Driven Execution**:
   - Formulate verifiable criteria and execute verification loops (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`) until green.

---

## 3. Strict Type Safety Standards & Error Handling

- **Zero `any` Policy**:
  - Usage of `any`, `as any`, or loose dynamic types is strictly forbidden across production code and test suites (see **Section 16.1**).
  - Use `unknown`, generics, exact interface contracts, or Prisma generated types.
  - Test mocks must use `vi.mocked()`, `Partial<T>`, or dedicated mock factories rather than casting to `any`.
- **Typed Catch Blocks & Error Handling**:
  - Catch clauses must always type errors as `unknown`: `catch (error: unknown)` (see **Section 16.8**).
  - Safely narrow errors before inspection: `if (error instanceof Error) { ... }` or use shared error extraction utilities (`error instanceof HttpException`).
- **Zero Silent Catch Policy**:
  - Empty catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly prohibited across both backend and frontend codebases.
  - Every error caught must be either:
    1. Logged via structured logger (`this.logger.error('Context message', error instanceof Error ? error.stack : undefined)`);
    2. Re-thrown as an appropriate domain exception (`HttpException`); or
    3. Gracefully handled with user-facing feedback (e.g. `notification.error(...)` or `message.error(...)` on frontend).
  - Security-sensitive writes (refresh token creation/revocation, audit log emission) must NEVER be fire-and-forget with empty catches.
  - Asynchronous callbacks, Axios interceptors, and background queue workers must forward caught errors to rejection handlers (e.g. `processQueue(error, null)`) or structured logs rather than swallowing failures.
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
  - Container secrets: `AUDIT_SIGNING_KEY: ${AUDIT_SIGNING_KEY}` MUST be present in `docker-compose.yml` for the API service to satisfy startup validation.
  - Container healthchecks: The API service must define a Docker container healthcheck (`/api/v1/health`) so dependent services start only when the API is genuinely healthy (`condition: service_healthy`).
- **Fail-Fast Environment Validation**:
  - Application startup MUST fail immediately with an explicit error message if required environment variables are absent (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `AUDIT_SIGNING_KEY`) (see **Section 16.10**).
  - Prohibited pattern: `process.env.JWT_SECRET || 'secret'`.
  - Required pattern: `const secret = configService.getOrThrow<string>('JWT_SECRET');`.
- **Principle of Least Privilege & Fail-Closed**:
  - If a user role or permission cannot be authoritatively resolved, access MUST be denied (`throw new ForbiddenException('Access denied')`).
  - Never default unverified users to `'Employee'` or any fallback role.
- **Data Protection & Schema Sanitation**:
  - Sensitive plaintext credentials (e.g. `adInitialPassword`) must NEVER be stored in relational models. Passwords must be hashed using salted bcrypt (12 rounds).
  - Predictable default passwords (such as `Ad#${username}2026!`) are banned. All new accounts must be provisioned with cryptographically secure random passwords and required to change passwords upon first authentication.
  - Plaintext license keys in `schema.prisma` must be masked or encrypted at rest; initial temporary passwords must be purged from all API responses.

---

## 5. Network, CORS & Controller Architecture

- **Strict Centralized CORS Architecture**:
  - All CORS origin resolution, allowlisting, and validation MUST be centralized in `apps/api/src/config/cors.config.ts`, exporting typed helpers `resolveAllowedOrigins()`, `isOriginAllowed()`, `getApiCorsOptions()`, and `getWebSocketCorsOptions()` (see **Section 16.6**).
  - Duplicating origin regexes or allowlists across `main.ts` and `notifications.gateway.ts` is strictly prohibited.
  - Origins must match configured explicit allowlists (`CORS_ORIGIN` / `ALLOWED_ORIGINS`).
  - Wildcards (`*`) and indiscriminate non-production bypasses with `credentials: true` are prohibited.
  - Dynamic Cloudflare tunnel matching MUST use strictly anchored regex `^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$` evaluated exclusively when `NODE_ENV !== 'production'`.
  - Production fail-closed default: When `CORS_ORIGIN` is unset or empty in production mode (`NODE_ENV === 'production'`), `resolveAllowedOrigins()` returns an empty array `[]` to prevent localhost leakage.
- **WebSocket Gateway Security & Invariants**:
  - `@WebSocketGateway` must never configure wildcard origins with credentials (`origin: '*', credentials: true`).
  - Allowed origins must dynamically match the centralized CORS configuration (`getWebSocketCorsOptions()`).
  - Handshake token transport: WebSocket authentication tokens MUST NEVER be transmitted or accepted via URL query parameters (`socket.handshake.query.token`). Passing tokens in URLs exposes credentials in HTTP access logs, proxy caches, and browser history. The gateway MUST explicitly reject handshakes if query tokens are detected.
  - Handshake tokens must be supplied exclusively via `socket.handshake.auth.token` or `Authorization: Bearer <token>` headers.
  - Fail-closed connection policy: If a connection handshake does not supply a valid, verifiable JWT, the socket MUST be rejected immediately (`client.disconnect(true)`).
  - Zero default role fallback: Falling back to `'Employee'` or any default role (`payload.role || 'Employee'`) when a role claim is missing or invalid is strictly forbidden.
  - Lifecycle Connection Draining: All WebSocket gateways MUST implement `OnModuleDestroy` to broadcast `server_shutdown`, disconnect all active sockets with `socket.disconnect(true)`, and cleanly close the Socket.IO server.
- **Controller Separation of Concerns**:
  - Controllers must only orchestrate routing, DTO validation, and service invocation.
  - Low-level network header parsing (e.g. client IP resolution from `x-forwarded-for`) MUST be extracted into reusable custom parameter decorators (`@ClientIP()`) or middleware.
- **Health Check Resilience**:
  - The health endpoint (`/api/v1/health`) must verify both PostgreSQL (`SELECT 1`) and Redis (`ping()`) connectivity and latency (see **Section 16.11**).
  - If the database is unreachable, the endpoint MUST return HTTP 503 (`ServiceUnavailableException`) rather than HTTP 200 with degraded payload, ensuring orchestrators (Kubernetes/Docker) route traffic accurately.

---

## 6. Database Access & Performance Directives

- **Mandatory Bounded Queries & Pagination**:
  - Every Prisma `findMany()` query in service code and background workers MUST enforce an explicit upper ceiling or pagination parameters (`skip`/`take`) (see **Section 16.2**).
  - Default maximum page size must be capped: `take: Math.min(limit, 100)` or bounded constants (`take: 10`, `take: 20`).
  - Unbounded `findMany()` queries without `take` are strictly forbidden.
- **Mandatory Deterministic Ordering & Tie-Breakers**:
  - Every database query specifying `take` or `skip` MUST specify a deterministic `orderBy` with a secondary unique tie-breaker (e.g. `orderBy: [{ [sortField]: sortOrder }, { id: 'asc' }]` or `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`) to prevent phantom duplicates or skipped records across pagination windows.
- **Background Worker Query Ceilings & Cursor Pagination**:
  - Recurring scheduled jobs (e.g., `ScheduledAlertsWorker`), bulk search synchronizers, and mass export pipelines MUST implement cursor-based pagination processing records in deterministic batches of `take: 100` (see **Section 16.3**). High take ceilings (`take: 500`, `1000`, `2000`, `5000`) are strictly prohibited.
- **Zero In-Memory Table Scans**:
  - Loading entire database tables into Node.js memory to evaluate row comparison logic in JavaScript (e.g. `inventoryItem.findMany()` followed by `item.quantity <= item.minThreshold`) is strictly prohibited (see **Section 16.4**).
  - Predicates must be evaluated directly in PostgreSQL using Prisma filter operators or `$queryRaw` SQL queries.
- **Zero In-Memory Aggregations**:
  - Loading relational rows into memory to compute arithmetic totals (e.g. `items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)`) is strictly prohibited (see **Section 16.4**).
  - Aggregations must be executed in the database engine using Prisma `_sum`, `_count`, `_avg`, `groupBy`, or SQL aggregates (`SELECT COALESCE(SUM(quantity * "unitCost"), 0)`).
  - Truncated sample approximations (e.g. taking the first 100 rows to calculate global percentages) are banned.
- **Directory CSV Batch Import Optimization**:
  - Large-scale directory, network, asset, and inventory CSV batch imports MUST eliminate sequential N+1 queries by using pre-fetched Map-based lookup tables (see **Section 16.5**).
  - Writes must be executed in chunked transactions of 50 to 100 rows via `prisma.$transaction(async (tx) => { ... })`.
  - In-memory deduplication maps must be synchronized immediately when records are created in a chunk.
  - Relational aggregates (such as group `memberCount`) must be deferred and calculated once per unique modified parent group after chunk writes complete.
- **Database Index Coverage (`schema.prisma`)**:
  - In PostgreSQL, foreign keys (`@relation`) are not automatically indexed. Every relational foreign key column (`DirectoryUser(organizationId, departmentId, positionId, locationId)`, `AppUser(roleId)`, `Subnet(vlanId)`) MUST define an explicit `@@index([foreignKey])`.
  - Filter and sort columns filtered by recurring queries or workers (`Asset(warrantyExpiry)`, composite `Asset(status, updatedAt)`, `License(expiryDate)`) MUST define explicit indexes.
  - Join tables with composite primary keys (e.g., `RolePermission` on `[roleId, permissionId]`) MUST define a reverse index `@@index([permissionId])` to prevent full table scans on reverse lookups and deletions.

---

## 7. Structured Logging Standards

- **NestJS Structured Logger Mandate**:
  - Use `private readonly logger = new Logger(ContextName.name)` for all application tracing, worker execution, and background tasks (see **Section 16.7**).
  - Raw `console.log`, `console.warn`, `console.error`, `console.info`, and `console.debug` are strictly forbidden in production code, seeder scripts, and workers.
  - Structured error logging must always supply both the contextual message and the error stack: `this.logger.error('Context message', error instanceof Error ? error.stack : String(error))`.
- **Frontend Production Logging & Telemetry**:
  - Raw `console.error(...)` and `console.log(...)` calls across React components, hooks, and pages are prohibited in production code.
  - Unhandled asynchronous errors must surface actionable feedback via `App.useApp().message.error(...)` / `notification.error(...)` or report to a centralized React error boundary.

---

## 8. Frontend Architecture & State Management

- **Zero Circular Dependencies**:
  - Cyclic imports between state stores and service clients (e.g. `auth.store.ts` -> `auth.service.ts` -> `api.ts` -> `auth.store.ts`) are strictly prohibited.
  - State stores manage client state; network clients read tokens without circular store invocations. Empty stub methods that induce import cycles must be eliminated.
- **Dynamic Feedback & Theme Context**:
  - Always consume dynamic theme context via `App.useApp()` (`const { message, modal, notification } = App.useApp();`). Static `message.error()` is strictly prohibited.
- **Clean Component Test Teardown**:
  - Component tests rendering React 19 / Ant Design trees must track root instances and unmount cleanly in `afterEach` (`await act(async () => { currentRoot?.unmount(); })`) while clearing stray portal DOM elements (`.ant-modal-root`, `.ant-drawer`, `.ant-popover`) to prevent async scheduler microtask leaks and test environment teardown crashes (`window is not defined`).

---

## 9. Ant Design v6+ UI/UX Directives & Zero Anti-Pattern Mandate

> **Official Ant Design Reference Specification**:  
> All UI modifications, component authoring, form layouts, tables, drawers, modals, and styling MUST strictly comply with the authoritative Ant Design LLM specification located at [`docs/ant-design-llms-full.txt`](file:///home/user/projects/uims/docs/ant-design-llms-full.txt). Zero anti-patterns permitted.

### Core Rules & Anti-Pattern Eliminations:
1. **Dynamic Feedback Context (`App.useApp()`)**:
   - **MANDATORY**: Consume feedback instances exclusively via `const { message, modal, notification } = App.useApp();` within components rendered under `<App>`.
   - **BANNED (Anti-pattern)**: Calling static methods `message.error()`, `message.success()`, `Modal.confirm()`, or `notification.open()` directly from `antd` imports. Static methods lack theme context, dark mode synchronization, and React 19 concurrent safety.
2. **Semantic Token Styles (Ant Design v6 Standard)**:
   - **MANDATORY**: Use semantic token styling:
     - `Statistic`: Use `styles={{ content: { ... } }}`.
     - `Card`: Use `styles={{ body: { ... } }}` or `styles={{ header: { ... } }}`.
     - `Drawer`: Use `styles={{ body: { ... } }}`.
     - `Modal`: Use `styles={{ body: { ... } }}`.
   - **BANNED (Anti-pattern)**: Using deprecated v4/v5 style props: `bodyStyle`, `headStyle`, `valueStyle`, or raw global CSS overrides.
3. **Layout, Navigation & Sider Dimensions**:
   - Desktop Sider width is `280px` (expanded) and `80px` (collapsed).
   - Mobile Drawer navigation width is `290px` with left edge placement.
   - **Menu Item Truncation Defense**: Menu items must specify `style={{ width: '100%', minWidth: 0, gap: 8 }}` with `overflow: hidden` on text labels and `flexShrink: 0` on badges/tags to prevent layout trimming.
   - Wrap collapsed items, user profile, and organization switchers with `Tooltip` for complete readability.
4. **Table Density, Sorting & Pagination**:
   - Keep table density high and information readable with dedicated quick actions (1-click credential/email copying, status tags, responsive drawers).
   - Standard table pagination: `pageSize: 10`, `showSizeChanger: true`, `pageSizeOptions: ['10', '25', '50', '100']`.
   - Table columns must define typed sorters and deterministic render functions.
5. **Page Structure & Breadcrumbs**:
   - All domain pages wrap their content in `<PageContainer title="..." subtitle="..." breadcrumbs={...} extra={...} stats={...}>` to preserve consistent visual hierarchy.

---

## 10. Enterprise English & UI/UX Copy Standards

**100% Professional, Concise Enterprise English Mandatory.**

- All user-facing UI labels, descriptions, alert messages, toasts/notifications, table columns, modal titles, placeholder text, code identifiers, comments, documentation, test descriptions, API payloads, error messages, and git commits MUST be in clear, standardized Enterprise English.
- No non-English or mixed language text in source code, UI strings, comments, DTOs, seeds, or logs.
- **Concise & High-Signal UI Copy (No Fluff)**:
  - **Eliminate Redundant Buzzwords & Prefixes**: Do not prepend verbose prefixes like "Enterprise ...", "Unified ...", "Global ...", "Master ...", or "System ..." unless strictly differentiating namespaces (e.g., use `Notifications` instead of `Enterprise Notifications`, `Assets` instead of `Unified Asset Inventory`, `Settings` instead of `Global System Settings`).
  - **Action-Oriented Buttons & Controls**: Keep actions short, direct, and verb-first (e.g., `Create Asset` instead of `Create New Asset Record`, `Export CSV` instead of `Export Data to CSV File`, `Save` instead of `Save Current Changes`).
  - **Casing Consistency**: Use Title Case for page titles, modal headers, navigation menus, and tab labels. Use sentence case for subtitles, helper text, toasts, and descriptions.
  - **Clean & Informative Empty/Error States**: Clearly state the state and the next action without filler words (e.g., "No assets found. Click 'Add Asset' to get started.").

---

## 11. Monorepo Dependency Maintenance & Strict Zero-Downgrade Invariant

- **Strict Zero-Downgrade Policy**:
  - Under no circumstances may any dependency be downgraded to an older major or minor version, even if lower versions or downgrades are suggested in historical notes, bug reports, or concerns (specifically refuting TD-020) (see **Section 16.9**).
  - The authoritative foundational monorepo stack MUST be preserved across all workspace package manifests:
    - **TypeScript 7.x** (`^7.0.2` / latest)
    - **NestJS 11.x** (`^11.0.0`)
    - **React 19.x** (`^19.0.0`)
    - **Vite 8.x** (`^8.0.0`)
    - **Ant Design v6+** (`^6.0.0`)
    - **Prisma 7.x** (`^7.0.0`)
- **Lockfile Hygiene, Synchronization & Deduplication**:
  - Any dependency upgrade or manifest modification must immediately update `pnpm-lock.yaml` via `pnpm install --no-frozen-lockfile && pnpm dedupe`.
  - Modifying manifests without staging updated `pnpm-lock.yaml` is strictly prohibited to prevent remote CI `--frozen-lockfile` failures.
- **Dead & Orphaned Package Pruning**:
  - Unused dependencies declared in package manifests that have zero imports across the monorepo (such as legacy BullMQ adapters or orphaned wrappers) must be cleanly uninstalled rather than preserved as dead weight.
- **Release Stability Gate**:
  - Do not adopt unstable release candidates (RC) for mission-critical packages in production (e.g., Prisma remains on latest stable 7.x, not 8.0.0-rc).

---

## 12. System Startup, Background Daemon & Stack Management Directives

Whenever starting, stopping, checking, or restarting the system (e.g., "khởi động hệ thống", "start system", "chạy app", "restart", "status"):
- **Universal Dev Stack CLI (`./scripts/dev.sh` / `./dev.sh` / `pnpm run stack:*`)**:
  - `start`: Starts backing containers (Postgres 17, Redis 8), builds API if needed, launches NestJS API on port 3002 in background, launches Vite dev server (HTTPS/HMR) on port 5679 in background, launches Cloudflare quick tunnel in background, and extracts the public `.trycloudflare.com` URL.
  - `stop`: Gracefully terminates tunnel, Web, and API processes, verifies port release. Use `--all` / `-a` to also stop Docker containers.
  - `restart`: Gracefully stops and starts all application layers.
  - `status`: Displays live PID, port listening status, API `/api/v1/health` response, and active Cloudflare tunnel URL.
  - `logs [api|web|tunnel|all]`: Streams service logs (`logs/api.log`, `logs/web.log`, `logs/cloudflared.log`).
  - `url`: Displays the current public Cloudflare tunnel URL and local endpoints.
- **Daemon Detachment (`setsid -f`)**:
  - API, Web, and Tunnel processes are detached via `setsid -f` into independent process groups, running as persistent daemons that survive terminal disconnections.
- **Immediate Public URL Display**:
  - Whenever the stack is launched, immediately output the extracted public `.trycloudflare.com` URL in chat so the user can inspect live changes.

---

## 13. Docker & Infrastructure Port Topology Matrix

| Service | Container / Process | Host / Exposed Port | Internal Port | Purpose & Health Check |
|:---|:---|:---|:---|:---|
| **Web UI (Vite / Nginx)** | Vite Dev (`apps/web`) | **`5679`** | `5679` | React SPA + HTTPS + HMR + API Proxy |
| **API Backend (NestJS)** | Node.js (`apps/api`) | **`3002`** | `3000` | REST API, Swagger (`/api/v1/docs`), Health (`/api/v1/health`) |
| **PostgreSQL 17** | `uims-postgres` | **`5433`** | `5432` | Relational DB (User: `uims`, DB: `uims_db`) |
| **Redis 8** | `uims-redis` | **`6381`** | `6379` | Cache layer, session state, BullMQ queues |
| **MeiliSearch** | `uims-meilisearch` | **`7700`** | `7700` | Full-text search engine |
| **SeaweedFS Filer** | `uims-seaweedfs-filer` | **`8333`** / **`8888`** | `8333` / `8888` | S3-compatible Object Storage API |
| **SeaweedFS Master** | `uims-seaweedfs-master` | **`9333`** | `9333` | Storage cluster consensus & volume coordination |
| **SeaweedFS Volume** | `uims-seaweedfs-volume` | **`8080`** | `8080` | File volume storage server |

---

## 14. Single Public HTTPS Port Architecture (Port 5679)

- **Native TLS 1.2 / 1.3**:
  - Dev environment: Vite uses self-signed development certificates in `apps/web/certs/` (`cert.pem`, `key.pem`) to terminate HTTPS locally on port `5679`.
  - Production / Container: Nginx terminates SSL using certificates in `docker/nginx/ssl`.
- **Integrated Reverse Proxy**:
  - Port `5679` serves the React frontend and reverse proxies all `/api/*` calls and `/socket.io/*` WebSocket connections to the NestJS backend (`http://localhost:3002`).
  - Access URL: `https://localhost:5679` (local) or `https://<hash>.trycloudflare.com` (tunnel).

---

## 15. Verification Invariants

Every change must satisfy the full verification cycle prior to merging or pushing:
1. `pnpm run typecheck` — 0 errors across all workspaces.
2. `pnpm run lint` — 0 errors across all workspaces.
3. `pnpm run format:check` — 100% compliant with Biome rules.
4. `pnpm run test` — 100% test pass rate across monorepo.
5. `pnpm run build` — Clean production builds across all workspaces.

---

## 16. Authoritative Defect Prevention Directives & Architectural Invariants

> **Zero-Regression & Defect Prevention Directives**:  
> To permanently eliminate recurrent architectural debt and performance/security bottlenecks (addressing TD-001 through TD-020, SEC-001, SEC-002, PERF-001, and PERF-002), all contributors and automated agents MUST adhere to these non-negotiable directives across the entire monorepo.

### 16.1 TypeScript Strict Mode Invariant (Monorepo-Wide)
- **Zero Implicit Any**: `"strict": true` and `"noImplicitAny": true` MUST remain enabled monorepo-wide in all `tsconfig.json` manifests (`apps/api`, `apps/web`, `packages/*`).
- **Complete Type Narrowing**: Every function parameter, return type, variable, and asynchronous callback MUST specify an explicit or completely narrowed type. Dynamic fallback to `any` or `as any` is strictly banned across production and test suites.
- **Zero Diagnostic Suppressions**: `@ts-ignore`, `@ts-expect-error` (without an active tracking issue ID), `@ts-nocheck`, and eslint rule suppressions (`/* eslint-disable */`) for type safety violations are strictly banned across all production and test files.
- **Strict Compiler Directives**: `strictNullChecks: true`, `strictBindCallApply: true`, `forceConsistentCasingInFileNames: true`, and `noFallthroughCasesInSwitch: true` MUST remain strictly active.
- **Safe Discriminated Unions & Type Guards**: When processing polymorphic data or `Promise.allSettled` results, code must explicitly narrow using runtime type guards (e.g. `status === 'fulfilled'`, `'scanned' in item`, `error instanceof Error`) rather than unchecked property indexing.

### 16.2 Mandatory Bounded Queries & Deterministic Ordering
- **Hard Ceiling on findMany()**: Every Prisma `findMany()` query in service code, controllers, workers, and background utilities MUST enforce an explicit upper ceiling: `take: Math.min(limit, 100)` or bounded constants (`take: 10`, `take: 20`).
- **Zero Unbounded Queries**: Unbounded `findMany()` calls without `take` are strictly forbidden across the codebase (specifically targeting notifications, inventory, assets, directory, settings, search, reports, organization, and audit).
- **Mandatory Deterministic Ordering & Secondary Tie-Breaker**: Every database query that specifies `take` or `skip` MUST supply a deterministic `orderBy` clause containing a unique secondary tie-breaker (e.g. `orderBy: [{ [sortField]: sortOrder }, { id: 'asc' }]` or `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`). This guarantees stable pagination windows and eliminates phantom duplicate records or skipped rows across pagination slices when multiple records share identical timestamps or status fields.

### 16.3 Mandatory Cursor Pagination for Background Workers & Bulk Search Sync
- **No High Take Ceilings**: Background workers (e.g. `ScheduledAlertsWorker`), bulk data indexers (`SearchService.syncIndexes()`), mass export pipelines, and data migrations MUST NEVER execute queries with high take ceilings (e.g., `take: 500`, `take: 1000`, or `take: 5000` are strictly prohibited).
- **Chunked Batch Processing via Cursors**: Bulk operations MUST implement cursor-based pagination processing records in deterministic batches of `take: 100` (e.g., `{ take: 100, skip: cursor ? 1 : 0, cursor: cursor ? { id: cursor } : undefined, orderBy: { id: 'asc' } }`).
- **Bounded Heap Allocation & Loop Termination Guards**: While loops must break when the result batch is empty (`if (records.length === 0) break;`), update the cursor to the final element's ID (`cursor = records[records.length - 1].id`), and release in-memory objects between batch iterations to prevent Node.js heap exhaustion during bulk processing.

### 16.4 Zero In-Memory Table Scans & Zero In-Memory Aggregations
- **Prohibited In-Memory Table Scans & Filtering**: Loading relational rows or tables into Node.js heap memory to evaluate row comparison logic in JavaScript (e.g. `inventoryItem.findMany()` followed by `items.filter(item => item.quantity <= item.minThreshold)`) is strictly prohibited. Predicates must be evaluated directly in PostgreSQL using Prisma filter operators (`where: { quantity: { lte: 5 } }`) or database `$queryRaw` SQL queries.
- **Prohibited In-Memory Aggregations (.reduce())**: Loading relational rows into Node.js memory to compute arithmetic sums, valuations, counts, or totals via JavaScript `.reduce()` (e.g. `allLicenses.reduce(...)`, `roles.reduce(...)`, `reports.reduce(...)`) is strictly prohibited.
- **Database Engine Aggregations Only**: All arithmetic aggregations and valuations MUST be executed directly within the PostgreSQL database engine using Prisma `_sum`, `_count`, `_avg`, `_min`, `_max`, `groupBy` aggregates (e.g. `prisma.license.aggregate({ _sum: { usedSeats: true } })`), or database-level `$queryRaw` SQL queries (e.g. `SELECT COALESCE(SUM("usedSeats" * "costPerSeat"), 0) FROM "License"`).
- **No Truncated Sample Approximations**: Dashboard and department/OU metrics must never truncate datasets (e.g., taking the first 100 rows and computing percentages in JavaScript) to approximate aggregate statistics. Aggregations must be executed across the complete dataset in the database engine.

### 16.5 Directory Batch Import & Relational Cache Protocol
- **Elimination of N+1 Queries**: Large-scale directory, network, asset, and inventory CSV batch imports MUST eliminate sequential N+1 database queries by utilizing pre-fetched Map-based lookup tables (`emailMap`, `codeMap`, `deptCache`, `orgCache`, `locCache`, `posCache`).
- **Chunked Database Transactions**: Bulk write operations MUST be executed in chunked database transactions via `prisma.$transaction(async (tx) => { ... })` in chunks of 50 to 100 records per transaction chunk, rather than executing thousands of records in a single monolithic transaction or issuing uncommitted individual queries. This preserves ACID atomicity, avoids long database lock contention, and bounds heap usage.
- **In-Memory Deduplication & Cache Synchronization**: When new records are created within a chunk, the in-memory lookup maps must be updated immediately (`emailMap.set(...)`, `codeMap.set(...)`) so subsequent rows within the same CSV batch referencing the same identifiers resolve correctly without duplicate key violations.
- **Deferred Relational Aggregates**: Modifications that impact aggregate statistics on parent entities (such as updating `memberCount` on `DirectoryGroup` when users are added or removed) MUST NOT run synchronously on every individual row insert. Instead, modified group IDs must be collected in a `Set<string>` during chunk execution (`chunkTouchedGroupIds`), and parent counts updated once per unique group after the chunk writes complete.

### 16.6 CORS & WebSocket Gateway Architecture & Zero Default Role Invariant
- **Centralized DRY CORS Configuration**: All CORS origin resolution, allowlisting, and validation MUST be centralized in `apps/api/src/config/cors.config.ts`, exporting typed helpers `resolveAllowedOrigins()`, `isOriginAllowed()`, `getApiCorsOptions()`, and `getWebSocketCorsOptions()`. Duplicating CORS parsing or regex logic across HTTP and WebSocket gateways is strictly forbidden.
- **Strict Regex Anchoring for Cloudflare Tunnels**: The Cloudflare quick tunnel pattern MUST be strictly anchored: `^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$`. Unanchored regexes (e.g., `.*\.trycloudflare\.com`) or loose substring checks are prohibited to prevent malicious domain spoofing (e.g. `evil-trycloudflare.com`). Furthermore, this regex validator MUST ONLY execute in non-production environments (`NODE_ENV !== 'production'`).
- **Fail-Closed Production Default**: In production mode (`NODE_ENV === 'production'`), if `CORS_ORIGIN` or `ALLOWED_ORIGINS` is unset or empty, `resolveAllowedOrigins()` MUST return an empty array `[]` (fail-safe defense-in-depth; zero localhost leak) and emit a structured warning. Wildcard origins (`*`) and indiscriminate bypasses with `credentials: true` are strictly prohibited.
- **WebSocket Token Transport Security**: WebSocket authentication tokens MUST NEVER be transmitted or accepted via URL query parameters (`socket.handshake.query?.token`). Passing tokens in URLs exposes credentials in HTTP access logs, proxy caches, and browser history. Handshake tokens MUST be supplied exclusively via `socket.handshake.auth.token` or `Authorization: Bearer <token>` headers. The gateway MUST explicitly reject handshakes if a query token is detected.
- **Zero Default Role Fallback**: If a user role claim cannot be authoritatively verified from the JWT payload (`payload.role`), falling back to `'Employee'`, `'User'`, or any default role (`payload.role || 'Employee'`) is strictly forbidden. The connection MUST fail closed and be rejected immediately (`client.disconnect(true)` or returning an error in middleware).
- **Graceful Connection Draining on Shutdown**: Gateways MUST implement the NestJS `OnModuleDestroy` lifecycle hook to broadcast `server_shutdown` to connected clients, fetch and disconnect all active socket instances (`socket.disconnect(true)`), and close the underlying Socket.IO server with a timeout guard to prevent hung processes during deploys.

### 16.7 NestJS Structured Logging Standard
- **NestJS Structured Logger Mandate**: Use `private readonly logger = new Logger(ContextName.name)` for all application tracing, worker execution, background tasks, and error reporting across backend services, controllers, workers, and gateways.
- **Zero Raw Console in Production**: Raw `console.log`, `console.warn`, `console.error`, `console.info`, and `console.debug` are strictly forbidden in production code, seeder scripts, and workers. All log output must route through NestJS structured loggers with clear contextual tags.
- **Structured Error Context**: When logging errors, always pass both the context message and the error stack trace: `this.logger.error('Failed to process batch item', error instanceof Error ? error.stack : String(error))`.
- **Frontend Telemetry & UI Error Feedback**: Raw `console.error(...)` and `console.log(...)` across React components, hooks, and services are prohibited in production code. Unhandled errors must surface actionable feedback via `App.useApp().message.error(...)` or `notification.error(...)` or report to a centralized React error boundary.

### 16.8 Typed Catch Blocks & Zero Silent Catch Directives
- **Typed Catch Clauses**: Catch clauses across both backend (`apps/api`) and frontend (`apps/web`) MUST always type errors as `unknown`: `catch (error: unknown)`. Untyped `catch (err)` or typed `catch (err: any)` are strictly prohibited.
- **Safe Error Narrowing**: Errors must be safely narrowed before property inspection: `if (error instanceof Error) { ... }` or `const message = error instanceof Error ? error.message : String(error)`. For HTTP exceptions, check `error instanceof HttpException`.
- **Zero Silent Catch Policy**: Empty catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly prohibited across the entire monorepo. Every error caught must be either:
  1. Logged via structured logger (`this.logger.error(...)`);
  2. Re-thrown as an appropriate domain exception (`throw new HttpException(...)` or `throw error`); or
  3. Gracefully handled with actionable user feedback (`message.error(...)` or `notification.error(...)` on frontend).
- **Security-Sensitive Write Invariant**: Operations involving security state, authentication, refresh token revocation, session destruction, or audit trail logging must NEVER be fire-and-forget with empty catches.
- **Asynchronous Queue & Callback Error Propagation**: Queue workers, Axios interceptors, and background callbacks must forward caught errors to rejection handlers (e.g. `processQueue(error, null)`) or structured logs rather than silently dropping failures.

### 16.9 Monorepo Dependency Modernization & Strict Zero-Downgrade Invariant
- **Strict Zero-Downgrade Invariant**: Under no circumstances may any dependency be downgraded to an older major or minor version, even if lower versions or downgrades are suggested in historical notes, older bug reports, or technical debt logs (specifically refuting TD-020).
- **Authoritative Foundational Stack**:
  - TypeScript 7.x (`^7.0.2` / latest)
  - NestJS 11.x (`^11.0.0`)
  - React 19.x (`^19.0.0`)
  - Vite 8.x (`^8.0.0`)
  - Ant Design v6+ (`^6.0.0`)
  - Prisma 7.x (`^7.0.0`)
  All workspace manifests (`package.json`, `apps/*/package.json`, `packages/*/package.json`) MUST maintain these versions.
- **Lockfile Hygiene & Synchronization**: Any dependency upgrade, addition, or manifest modification MUST immediately synchronize `pnpm-lock.yaml` via `pnpm install --no-frozen-lockfile && pnpm dedupe`. Modifying manifests without committing the updated lockfile is strictly prohibited to prevent remote CI `--frozen-lockfile` failures.
- **Dead & Orphaned Package Pruning**: Unused dependencies declared in manifests that have zero imports across the monorepo (such as legacy BullMQ adapters when superseded, or deprecated polyfills) must be cleanly uninstalled rather than maintained as dead weight.
- **Release Stability Gate**: Mission-critical infrastructure libraries must track latest stable releases, avoiding unproven release candidates (e.g., Prisma remains on stable 7.x, not 8.0.0-rc).

### 16.10 Fail-Fast Environment Variable Resolution & Zero Fallback Secrets
- **No Hardcoded Fallback API Keys or Secrets**: External service API keys, secrets, master tokens, and connection strings (including `MEILI_API_KEY`, SeaweedFS S3 credentials, JWT secrets, and audit signing keys) MUST NEVER have hardcoded fallback default strings in source code or default parameters (e.g. `'uims_meili_master_key_2026'`, `'uims-jwt-secret-change-in-production'` are strictly banned).
- **Mandatory Fail-Fast Startup**: All required secrets and API tokens MUST fail fast immediately at application startup if absent or malformed:
  - Required pattern: `const apiKey = configService.getOrThrow<string>('MEILI_API_KEY');` or startup validation via Zod schemas that call `process.exit(1)` on configuration failure.
- **Zero Insecure process.env Fallbacks**: Modules must never chain `configService.get(...) || process.env.SECRET` with loose defaults. Secrets must be queried strictly via `configService.getOrThrow<string>(...)` so configuration failures surface immediately upon startup rather than unpredictably at runtime.

### 16.11 Resilient Redis Service & Degraded Health Telemetry
- **Structured Degradation Logging**: When the Redis connection fails or disconnects, `RedisService` may fall back to an in-memory `Map` solely for non-critical transient caching in single-instance environments, but MUST log an explicit warning via structured logger (`this.logger.warn('Redis unavailable; falling back to in-memory non-persistent cache')`).
- **Degraded Health Reporting**: The health check endpoint (`/api/v1/health`) MUST probe both PostgreSQL and Redis connectivity and latency. It MUST NOT report a fully healthy status when Redis is down; it MUST report HTTP 200 with degraded telemetry payload `{ status: 'degraded', redis: { status: 'disconnected' }, database: { status: 'connected' } }` (or return HTTP 503 if caching is designated mission-critical), ensuring monitoring orchestrators and multi-instance deployments immediately detect Redis outages. If PostgreSQL is unreachable, it MUST throw `ServiceUnavailableException` (HTTP 503).

### 16.12 Zero Fixed URL & Dynamic Host/Port Invariant
- **Host, Protocol & Port Agnosticism**: All application layers (web frontend, backend API, WebSocket gateway, reverse proxy) MUST remain fully dynamic and agnostic to hostnames, domains, protocols, and ports. Hardcoded references to fixed ports (e.g. `localhost:3002`, `localhost:5679`) or static URLs in runtime source code are strictly prohibited.
- **Frontend Relative URLs**: The web application MUST default to relative paths for REST API requests (`baseURL: import.meta.env.VITE_API_URL || '/api/v1'`) and WebSocket connections (`/notifications` via `window.location.origin` or current window context). This guarantees the application functions seamlessly on any custom URL, domain, subdomain, IP address, or port without rebuilding.
- **Dynamic Development CORS**: In non-production environments, CORS validation must dynamically accommodate arbitrary custom ports on loopback/localhost interfaces (`/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/`) and respect user-configured environment variables (`WEB_PORT`, `PORT`, `APP_PORT`, `CORS_ORIGIN`).
- **Dynamic Port Binding**: Vite and NestJS servers must respect standard port environment variables (`PORT`, `VITE_PORT`, `WEB_PORT`, `APP_PORT`) and bind to `0.0.0.0` with `allowedHosts: true` to support containerized, remote, or proxied access out of the box.

### 16.13 Route-Level Error Boundary Isolation & Shell Resilience
- **Mandatory Leaf Route Error Boundaries**: Every leaf route declared in `apps/web/src/app/router.tsx` rendered inside `<MainLayout />` MUST define its own `ErrorBoundary: RouteErrorBoundary`.
- **Navigation Shell Preservation**: Unhandled component crashes or corrupt data payloads within specific pages (e.g. `AssetsPage`, `LicensesPage`, `InventoryPage`) must be contained strictly to the page viewport. The primary navigation shell (`Sider`, `Header`, breadcrumb container, and user profile switcher) MUST remain active and functional, allowing users to navigate away from the errored screen without requiring a hard browser reload.
- **Zero Unguarded Production Console Errors**: All React error boundaries (`ErrorBoundary.tsx`, `RouteErrorBoundary.tsx`) must guard debug logging (`if (import.meta.env.DEV) { console.error(...); }`) and avoid noisy unformatted console traces in production bundles.

### 16.14 Docker Compose Parameterization & Zero Hardcoded Secret Fallbacks
- **Strict Parameterization in Container Manifests**: Connection strings, secrets, and API master keys in `docker-compose.yml` and `docker-compose.dev.yml` (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `MEILISEARCH_API_KEY`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`) MUST NEVER define hardcoded default string fallbacks (e.g., `${JWT_SECRET:-uims-jwt-secret-change-in-production}` is strictly banned).
- **Fail-Fast Container Initialization**: If required secret environment variables are absent from the local `.env` file, Docker containers MUST fail to start immediately rather than falling back to publicly known credentials. All sensitive secrets must be explicitly populated from `.env` or `.env.example`.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, zero anti-patterns in UI components, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

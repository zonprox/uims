# Codebase Concerns

**Analysis Date:** 2026-08-14

## Tech Debt

**Missing Global Authentication and Authorization Guards:**
- Issue: Almost all API controllers lack authentication (`JwtAuthGuard`) and role-based authorization (`RolesGuard`). Only `auth.controller.ts` and `users.controller.ts` specify route guards.
- Files: `apps/api/src/modules/assets/assets.controller.ts`, `apps/api/src/modules/licenses/licenses.controller.ts`, `apps/api/src/modules/inventory/inventory.controller.ts`, `apps/api/src/modules/directory/directory.controller.ts`, `apps/api/src/modules/email/email.controller.ts`, `apps/api/src/modules/network/network.controller.ts`, `apps/api/src/modules/tickets/tickets.controller.ts`, `apps/api/src/modules/audit/audit.controller.ts`, `apps/api/src/modules/reports/reports.controller.ts`, `apps/api/src/modules/settings/settings.controller.ts`, `apps/api/src/modules/search/search.controller.ts`, `apps/api/src/modules/dashboard/dashboard.controller.ts`
- Impact: Any unauthenticated HTTP client can create, read, mutate, or delete assets, licenses, tickets, subnets, IP addresses, email accounts, directory records, audit logs, and trigger fake backup routines.
- Fix approach: Apply `JwtAuthGuard` globally in `apps/api/src/app.module.ts` using `APP_GUARD` with a `@Public()` decorator for public endpoints (`/auth/login`, `/health`), and apply `@Roles()` with `RolesGuard` on administrative endpoints.

**Dual Disconnected User Identity Models:**
- Issue: The system maintains two distinct user models: `User` (for authentication, role relations, ticket creation, asset assignment) and `DirectoryUser` (for directory/organization listings). In addition, `DirectoryMembership` contains `userId` and `groupId` fields without Prisma `@relation` constraints to `DirectoryUser` or `DirectoryGroup`.
- Files: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/directory/directory.service.ts`
- Impact: User accounts created in Directory Services do not synchronize with login accounts. Membership queries cannot utilize Prisma relational joins.
- Fix approach: Consolidate `User` and `DirectoryUser` into a unified schema model or establish an explicit 1:1 foreign key relationship (`User.directoryUserId`), and add explicit `@relation` foreign key bindings to `DirectoryMembership`.

**Hardcoded Mock Data and Simulation Logic in Production Services:**
- Issue: Several backend service methods return static mock strings or hardcoded objects rather than real computed metrics or external service calls.
  - `DirectoryService.findAllUsers`: Uses email substring matching (`alex` -> 2 assets, 4 licenses; `sarah` -> 3 assets, 3 licenses; `marcus` -> 2 assets, 2 licenses) to assign dummy asset and license counts.
  - `TicketsService.create`: Hardcodes default requester name (`Marcus Vance`) and email (`marcus.vance@company.com`).
  - `ReportsService.getReportSuites` & `getStats`: Returns hardcoded static strings (`$482,000`, `$42,500/yr`, `98.2%`, `100%`).
  - `NetworkService.getDnsRecords` & `pingIp`: Returns a hardcoded array of 4 DNS records and static ping response (`1.4ms`, `reachable: true`).
  - `DashboardService.getOverview`: Hardcodes system telemetry (Mail throughput `2.4k Msgs/Hour`, VPN tunnels `342`, Uptime `99.98%`).
  - `SettingsService.runBackup` & `getHealthTelemetry`: Emulates backup creation with random string generation and static health strings without invoking `pg_dump`, S3 upload, or redis pings.
- Files: `apps/api/src/modules/directory/directory.service.ts`, `apps/api/src/modules/tickets/tickets.service.ts`, `apps/api/src/modules/reports/reports.service.ts`, `apps/api/src/modules/network/network.service.ts`, `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/modules/settings/settings.service.ts`
- Impact: UI displays fabricated data; operational features (backups, ping tests, DNS querying, SLA calculations) fail to perform actual tasks.
- Fix approach: Replace mock arrays with real database aggregations, integrate genuine ICMP/DNS utilities in `NetworkService`, implement actual pg_dump / S3 streaming in `SettingsService`, and extract requester identity from JWT session in `TicketsService`.

**Empty No-Op Audit Interceptor:**
- Issue: `AuditInterceptor` contains placeholder comment `// Audit log implementation could go here` and passes through requests without capturing telemetry.
- Files: `apps/api/src/common/interceptors/audit.interceptor.ts`
- Impact: Mutation actions across controllers are not automatically recorded in `AuditLog`, relying instead on manual, inconsistent service-level logging.
- Fix approach: Implement automated request metadata capture (user ID from request context, HTTP method, route params, request body, IP address, user agent) and persist `AuditLog` records on successful mutations via BullMQ queue.

**DTO and Type Redefinitions across Frontend and Backend:**
- Issue: Web service layer files (`apps/web/src/services/*.service.ts`) redefine data models (such as `Asset`, `AssetStats`, `Ticket`, `TicketStats`, `License`) locally with slight variations rather than importing standardized schemas from `packages/shared-types`.
- Files: `apps/web/src/services/assets.service.ts`, `apps/web/src/services/tickets.service.ts`, `apps/web/src/services/licenses.service.ts`, `apps/web/src/services/network.service.ts`, `apps/web/src/services/inventory.service.ts`, `apps/web/src/services/directory.service.ts`, `packages/shared-types/src/index.ts`
- Impact: Changes in backend Prisma models or shared DTOs do not trigger TypeScript compilation errors on mismatched frontend services, leading to runtime UI bugs.
- Fix approach: Remove local type definitions in `apps/web/src/services/` and import canonical types directly from `@uims/shared-types`.

**Unused Installed Infrastructure Dependencies:**
- Issue: Dependencies `@nestjs/bullmq`, `bullmq`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `pino`, `pino-http`, and `ioredis` are declared in `apps/api/package.json` but are not integrated into `app.module.ts` or application services.
- Files: `apps/api/package.json`, `apps/api/src/app.module.ts`, `apps/api/src/main.ts`
- Impact: Bloated `node_modules`, unused dependencies in bundle, and unfulfilled architectural expectations (e.g., structured logging, asynchronous queues, real-time websockets).
- Fix approach: Wire up `LoggerModule.forRoot()` with Pino in `main.ts`, configure BullMQ with Redis for background jobs, or remove unused packages.

---

## Known Bugs

**Random 4-Digit Collision Crashes on Unique Identifier Generation:**
- Symptoms: Creating assets, inventory items, or IP addresses intermittently fails with HTTP 500 / Prisma unique constraint violation `P2002`.
- Files: `apps/api/src/modules/assets/assets.service.ts` (line 66), `apps/api/src/modules/inventory/inventory.service.ts` (line 18), `apps/api/src/modules/network/network.service.ts` (line 62)
- Trigger: Multiple entity creations when generated numbers collide within the narrow 1000–9999 range (`Math.floor(1000 + Math.random() * 9000)`).
- Workaround: Manually passing explicit unique `assetTag`, `sku`, or `address` strings in the request body.
- Fix approach: Implement database sequences (`SERIAL` / `autoincrement()`), nanoids, or prefixed UUIDs (e.g., `AST-${nanoid(8).toUpperCase()}`).

**Duplicate Ticket Code Generation and Ambiguous Lookup:**
- Symptoms: Different tickets receive identical ticket codes (e.g., `TKT-4821`). Looking up a ticket by ticket code via `GET /tickets/:id` returns the first matching ticket in the database, masking subsequent tickets.
- Files: `apps/api/src/modules/tickets/tickets.service.ts` (lines 92–104, 107), `apps/api/prisma/schema.prisma` (line 334)
- Trigger: Random generation of 4-digit ticket codes without `@unique` constraint in Prisma schema.
- Workaround: Lookup ticket via UUID `realId` instead of `ticketCode`.
- Fix approach: Add `@unique` to `ticketCode` in `schema.prisma` and implement sequential code generation (e.g., PostgreSQL sequence `ticket_seq`).

**User Password Hash Leak in User Lookup:**
- Symptoms: `GET /users/:id` returns the full user database record including `passwordHash`.
- Files: `apps/api/src/modules/users/users.service.ts` (lines 49–55)
- Trigger: Calling `UsersService.findOne(id)` which executes `this.prisma.user.findUnique({ where: { id } })` without field projection or sanitization.
- Workaround: None on backend; frontend must avoid displaying the field.
- Fix approach: Add `select` clause in `prisma.user.findUnique` excluding `passwordHash` or use a class-transformer `@Exclude()` / mapping utility.

**In-Memory Stock Status Filtering Breaks Inventory Pagination:**
- Symptoms: `GET /inventory?stockStatus=low_stock&page=1&limit=50` returns fewer than 50 items (or 0 items) even when hundreds of low stock items exist across the database. Subsequent pages skip items.
- Files: `apps/api/src/modules/inventory/inventory.service.ts` (lines 52–70)
- Trigger: `InventoryService.findAll` executes database-level `take` and `skip` before filtering by `stockStatus` in Node.js memory.
- Workaround: Query without `stockStatus` filter and filter client-side.
- Fix approach: Move stock threshold comparisons into the Prisma `where` clause (or use Prisma raw query / computed column filtering).

**Hardcoded Redirection Port in Production Nginx Configuration:**
- Symptoms: Accessing the system over HTTP (`http://domain/`) redirects the browser to `https://domain:5679/`, breaking access in standard deployments (port 443 / 80).
- Files: `docker/nginx/nginx.conf` (line 5)
- Trigger: Sending an unencrypted HTTP request to port 80.
- Workaround: Manually type `https://` with the correct port in browser URL bar.
- Fix approach: Change `return 301 https://$host:5679$request_uri;` to `return 301 https://$host$request_uri;` or parameterize via environment variables.

**Ignored Pagination Query in Users Controller:**
- Symptoms: Passing `page` and `limit` to `GET /users` is ignored, always returning default page 1 with 50 items.
- Files: `apps/api/src/modules/users/users.controller.ts` (lines 36–38)
- Trigger: Method defines `findAll(@Query() _pagination: PaginationDto)` but invokes `this.usersService.findAll()` without arguments.
- Workaround: None.
- Fix approach: Pass `_pagination` to `this.usersService.findAll(_pagination)`.

**Client-Side CSV Export Truncation:**
- Symptoms: Clicking "Export CSV" on Assets page exports at most 50 items regardless of the total asset inventory.
- Files: `apps/web/src/services/assets.service.ts` (lines 65–90)
- Trigger: `assetsService.exportCsv` invokes `assetsService.getAssets()` without pagination parameters, which defaults to the backend limit of 50 records.
- Workaround: Manually paginate through tables.
- Fix approach: Create a dedicated backend export endpoint (`GET /assets/export`) that streams records directly from the database or fetches all matching records in chunks.

---

## Security Considerations

**Unprotected REST Endpoints & Missing RBAC:**
- Risk: Malicious actors or unauthorized users can perform administrative mutations (deleting assets, modifying audit logs, changing system settings, accessing employee directory) without authentication.
- Files: `apps/api/src/modules/**/*.controller.ts`
- Current mitigation: Rate limiting (`ThrottlerModule`) is enabled globally at 200 requests/minute, but endpoints are open.
- Recommendations: Enforce `JwtAuthGuard` globally in `app.module.ts`, bind `RolesGuard` to check user roles against `@Roles(...)`, and verify tenant/ownership scopes on user records.

**Insecure JWT Secret Defaults & Flawed Token Refresh:**
- Risk: If `JWT_SECRET` is omitted from environment configuration, `JwtStrategy` falls back to `'secret'`, allowing attackers to forge valid JWT tokens. Furthermore, `/auth/refresh` accepts existing access tokens under `JwtAuthGuard` without validating refresh token rotation or checking a revocation store. If an access token expires, refresh fails; if an access token is compromised, it cannot be revoked.
- Files: `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (line 12), `apps/api/src/modules/auth/auth.controller.ts` (lines 37–44), `apps/api/src/modules/auth/auth.service.ts` (lines 46–59)
- Current mitigation: Rate limiting on `/auth/refresh` (10 requests/minute).
- Recommendations: Require strict startup validation on `JWT_SECRET` (throw error on startup if missing or insecure default), implement dedicated refresh tokens stored in HTTP-only cookies, and maintain token revocation lists in Redis.

**Plaintext Storage of Software License Keys:**
- Risk: Software licenses containing sensitive proprietary keys, enterprise serials, and API credentials are stored unencrypted in PostgreSQL. Database compromise or unauthorized read access exposes all corporate license keys.
- Files: `apps/api/prisma/schema.prisma` (line 196), `apps/api/src/modules/licenses/licenses.service.ts`
- Current mitigation: None.
- Recommendations: Encrypt `licenseKey` at rest using AES-256-GCM before storing in PostgreSQL, and mask keys in standard API responses (`****-****-1234`) with explicit reveal permissions.

**Client-Side Token Storage in LocalStorage:**
- Risk: Web application persists authentication token in browser `localStorage` under `uims-auth-storage`. Any Cross-Site Scripting (XSS) vulnerability allows immediate token theft.
- Files: `apps/web/src/stores/auth.store.ts` (lines 20–36)
- Current mitigation: React escaping and standard DOM rendering.
- Recommendations: Migrate JWT tokens to `httpOnly`, `Secure`, `SameSite=Strict` cookies managed by backend endpoints.

**Permissive Content Security Policy (CSP):**
- Risk: Nginx configuration sets `script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'`, which substantially undermines CSP protections against XSS injection.
- Files: `docker/nginx/nginx.conf` (line 39)
- Current mitigation: Helmet middleware in NestJS, but Nginx headers override or duplicate.
- Recommendations: Remove `'unsafe-eval'` and inline scripts in production build, and use cryptographic nonces or hashes for required inline styles.

---

## Performance Bottlenecks

**Full Table In-Memory Reductions for Stats and KPIs:**
- Problem: Endpoints fetching statistics load all records into Node.js heap to perform calculations via JavaScript `reduce` and `filter`.
- Files:
  - `apps/api/src/modules/licenses/licenses.service.ts` (`getStats` loads all `License` records)
  - `apps/api/src/modules/network/network.service.ts` (`getStats` loads all `Subnet` and `IPAddress` records)
  - `apps/api/src/modules/inventory/inventory.service.ts` (`getStats` loads all `InventoryItem` records)
  - `apps/api/src/modules/dashboard/dashboard.service.ts` (`getOverview` runs 11 queries including full `License`, `Subnet`, `IPAddress` reads)
- Cause: Lack of SQL aggregation queries (`COUNT`, `SUM`, `AVG`, `GROUP BY`).
- Improvement path: Replace `findMany()` with `prisma.license.aggregate({ _sum: { totalSeats: true, usedSeats: true } })` and SQL `COUNT(*)` queries.

**N+1 Full Table Loading in Directory Listing:**
- Problem: Requesting a single page of directory users (`GET /directory/users?page=1&limit=50`) loads the ENTIRE `Asset` table and ENTIRE `LicenseAssignment` table into memory.
- Files: `apps/api/src/modules/directory/directory.service.ts` (lines 48–62)
- Cause: Code executes `this.prisma.asset.findMany(...)` and `this.prisma.licenseAssignment.findMany(...)` without `where` constraints to count assignments per user.
- Improvement path: Query asset and license counts for only the retrieved user IDs using `groupBy` or Prisma relation count `_count: { assignedAssets: true, licenseAssignments: true }`.

**Unindexed Multi-Table Leading-Wildcard Search Fallback:**
- Problem: Global search queries execute 4 concurrent queries with `%ILIKE%` leading wildcards across `Asset`, `Ticket`, `License`, and `DirectoryUser` tables.
- Files: `apps/api/src/modules/search/search.service.ts` (lines 152–198)
- Cause: Full table scans triggered by `mode: 'insensitive'` and unindexed substring matching when Meilisearch is offline.
- Improvement path: Leverage PostgreSQL `pg_trgm` GIN indexes (`CREATE INDEX idx_assets_trgm ON "Asset" USING gin (name gin_trgm_ops, "assetTag" gin_trgm_ops)`) or ensure Meilisearch high availability.

**Missing Database Indexes on Foreign Keys and Query Filters:**
- Problem: Common queries filtering by foreign keys or statuses result in sequential scans as tables scale.
- Files: `apps/api/prisma/schema.prisma`
- Cause: Prisma schema lacks `@@index` annotations for relational and filtered fields:
  - `Asset`: `assignedToId`, `categoryId`, `locationId`, `status`
  - `Ticket`: `createdById`, `assignedToId`, `categoryId`, `status`, `priority`, `ticketCode`
  - `AuditLog`: `userId`, `timestamp`, `entity`, `action`, `severity`
  - `IPAddress`: `subnetId`, `status`
  - `LicenseAssignment`: `licenseId`, `userId`, `assignedEmail`
- Improvement path: Add `@@index([status])`, `@@index([assignedToId])`, `@@index([timestamp(sort: Desc)])` to relevant models in `schema.prisma` and run a migration.

---

## Fragile Areas

**Meilisearch Index Synchronization:**
- Files: `apps/api/src/modules/search/search.service.ts`
- Why fragile: No change-data-capture (CDC), database hooks, or event emitter triggers sync on entity create/update/delete. The search index instantly becomes out-of-date whenever any record is modified through the API unless someone manually triggers `/search/sync`.
- Safe modification: Create a NestJS `SearchIndexerService` that subscribes to domain events (e.g., `asset.created`, `ticket.updated`) or use BullMQ jobs to sync mutated documents incrementally.
- Test coverage: Unit tests mock search responses; zero integration tests exist for document synchronization or fallback behavior.

**Zod vs Class-Validator Validation Pipeline Mismatch:**
- Files: `apps/api/src/main.ts` (line 21), `apps/api/src/common/pipes/zod-validation.pipe.ts`, `apps/api/src/modules/*/dto/*.ts`
- Why fragile: `main.ts` registers global `ValidationPipe({ whitelist: true })` from `class-validator`. However, many controllers use TypeScript types from `@uims/shared-types` instead of decorated classes, while `packages/shared-validators` uses Zod schemas. This causes validation to either be bypassed or silently strip payload properties.
- Safe modification: Standardize across the entire monorepo on Zod schemas using `nestjs-zod` or `ZodValidationPipe` bound at controller level.
- Test coverage: `zod-validation.pipe.ts` has no unit tests.

**Asset & Ticket State Transitions and History Tracking:**
- Files: `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/tickets/tickets.service.ts`
- Why fragile: `AssetHistory` model exists in `schema.prisma` but `AssetsService` never creates `AssetHistory` records during status changes or assignments. Ticket status transitions (`updateStatus`) do not validate valid state machines (e.g., transitions from `CLOSED` back to `OPEN`).
- Safe modification: Wrap status transitions in Prisma transactions that write audit history records and enforce state machine transition guards.
- Test coverage: Tests only check happy path CRUD; state transitions and history logging are untested.

---

## Scaling Limits

**Dashboard Aggregation Memory Footprint:**
- Current capacity: Efficient under ~500 total assets/tickets/licenses.
- Limit: At > 10,000 entities, loading all rows into Node.js memory for JavaScript calculation will cause CPU spikes and memory exhaustion.
- Scaling path: Replace in-memory aggregations with Prisma database aggregates (`_sum`, `_count`) and cache dashboard KPI responses in Redis with a 60-second TTL.

**Audit Log Table Growth:**
- Current capacity: Single unpartitioned PostgreSQL table without timestamp indexing.
- Limit: Degradation after ~1,000,000 audit log rows. Search queries with `timestamp: 'desc'` and string filters will time out.
- Scaling path: Implement PostgreSQL table partitioning by month/quarter (`PARTITION BY RANGE (timestamp)`), add GIN indexes for JSON payloads (`diffPayload`), and offload cold logs to S3 via SeaweedFS.

**Synchronous Request-Response File Operations:**
- Current capacity: Single-thread CSV exports limited to ~1,000 rows.
- Limit: Request timeouts on large dataset exports or backup generation.
- Scaling path: Move long-running exports, report generation, and database backup routines to background BullMQ workers with download links stored in S3.

---

## Dependencies at Risk

**Unwired BullMQ & Redis Worker Ecosystem:**
- Risk: `@nestjs/bullmq` and `bullmq` are installed in `apps/api/package.json` but no Queues, Processors, or Module imports are configured in NestJS.
- Impact: Code that requires asynchronous processing (emails, report generation, audit log writing, Meilisearch sync) must run synchronously in the HTTP request loop.
- Migration plan: Configure `BullModule.forRootAsync(...)` in `app.module.ts` connected to Redis container (`REDIS_URL`) and create worker queues.

**Dual Linter & Formatter Tooling Conflict:**
- Risk: Repository contains both `@biomejs/biome` (`biome.json` at root) and `eslint` (`packages/eslint-config`, `apps/api/eslint.config.mjs`, `apps/web/eslint.config.mjs`).
- Impact: Formatting via Biome may clash with ESLint rules (e.g., import formatting, type assertions), causing CI failures depending on whether `pnpm lint` or `pnpm format:check` runs.
- Migration plan: Standardize on Biome for both linting and formatting across all workspaces, or designate ESLint strictly for AST rules and Biome solely for formatting.

---

## Missing Critical Features

**Asynchronous Background Job Queue:**
- Problem: No worker process exists to execute scheduled report generation, background email dispatch, bulk CSV generation, or search reindexing.
- Blocks: Scheduled automated reports (`ReportSchedule`), background notifications, and heavy data exports.

**Real-Time WebSocket Gateway:**
- Problem: No WebSocket gateway exists despite `@nestjs/websockets` being installed.
- Blocks: Live ticket discussion updates, real-time alert toast notifications, and instant IP status monitoring.

**Real Directory Synchronization (LDAP / Active Directory / Azure AD):**
- Problem: Directory service only handles local mock data; no connector exists for LDAP or Azure AD Graph API.
- Blocks: Enterprise SSO directory sync and automated user deprovisioning.

**Real Mailbox Provisioning & Exchange/SMTP Connectivity:**
- Problem: Email accounts module is a static database CRUD interface without integration to mail servers (Postfix, Exchange, Google Workspace).
- Blocks: Actual email provisioning, forwarding rule enforcement, and quota management.

**Real Network Scanner & SNMP/ICMP Integration:**
- Problem: Network module returns static ping results (`1.4ms`) and mock DNS tables without invoking system ping, ICMP sockets, or DNS resolvers.
- Blocks: Live IP availability monitoring and automated subnet discovery.

**Production Database Backup & Restore Engine:**
- Problem: Backup action generates a mock filename and audit log without executing `pg_dump` or uploading to SeaweedFS/S3.
- Blocks: Disaster recovery and database snapshot restoration.

---

## Test Coverage Gaps

**Backend API Controllers (13/14 Untested):**
- What's not tested: Request routing, status codes, query parsing, DTO validation, and response structures for all controllers except `HealthController`.
- Files: `apps/api/src/modules/**/*.controller.ts` (13 controllers)
- Risk: Route misconfigurations, parameter binding errors, and broken response transforms go undetected.
- Priority: High

**Backend Core Services (6/14 Untested):**
- What's not tested: Business logic in `UsersService`, `AuditService`, `DashboardService`, `EmailService`, `ReportsService`, and `SettingsService`.
- Files: `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/audit/audit.service.ts`, `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/modules/email/email.service.ts`, `apps/api/src/modules/reports/reports.service.ts`, `apps/api/src/modules/settings/settings.service.ts`
- Risk: Unhandled null values, database transaction rollbacks, or calculation bugs.
- Priority: High

**Backend Guards, Interceptors, Filters, and Utilities:**
- What's not tested: `RolesGuard`, `JwtAuthGuard`, `PrismaExceptionFilter`, `TransformInterceptor`, `AuditInterceptor`, `ZodValidationPipe`, `PasswordUtil`.
- Files: `apps/api/src/common/**/*.ts`
- Risk: Security bypasses in role evaluation, uncaught database exceptions crashing requests, broken response formatting.
- Priority: High

**Frontend UI Pages and Components (0/12 Pages Tested):**
- What's not tested: Rendering, user interactions, form submissions, filter changes, and error boundary handling on all 12 frontend pages.
- Files: `apps/web/src/pages/**/*.tsx`, `apps/web/src/components/**/*.tsx`
- Risk: Broken UI components, unhandled API error states, white-screen crashes on missing data properties.
- Priority: Medium

**Frontend Service Clients (11/12 Untested):**
- What's not tested: API calling methods, query parameter formatting, payload serialization in `assets.service.ts`, `tickets.service.ts`, `licenses.service.ts`, `network.service.ts`, `inventory.service.ts`, `directory.service.ts`, `email.service.ts`, `audit.service.ts`, `reports.service.ts`, `settings.service.ts`, `dashboard.service.ts`.
- Files: `apps/web/src/services/*.ts`
- Risk: URL typo bugs, mismatched payload types, incorrect error propagation.
- Priority: Medium

**Shared Validators & Utility Functions:**
- What's not tested: `asset.validator.ts`, `auth.validator.ts`, `license.validator.ts`, `user.validator.ts`, `pagination.validator.ts`, `validation.ts`, `string.ts`.
- Files: `packages/shared-validators/src/*.ts`, `packages/shared-utils/src/string.ts`, `packages/shared-utils/src/validation.ts`
- Risk: Invalid data passing schema validation, subtle string formatting edge cases.
- Priority: Medium

---
*Concerns audit: 2026-08-14*

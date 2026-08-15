# Codebase Concerns

**Analysis Date:** 2026-08-15

## Tech Debt

**Hardcoded Demo & Admin Password Bypass:**
- Issue: `AuthService.validateUser` contains hardcoded plain-text passwords (`Admin@2026`, `password123`, `admin`, `admin123`) for specific email accounts (`admin@uims.local`, `admin@uims.internal`, `sarah.chen@company.com`). This bypasses bcrypt comparison entirely and overrides database password hashes.
- Files: `apps/api/src/modules/auth/auth.service.ts`
- Impact: Security vulnerability; changing an administrator password in PostgreSQL does not revoke access if an attacker uses the fallback password.
- Fix approach: Remove the hardcoded email and password conditions from `validateUser`. Ensure all authentication flows strictly evaluate `bcrypt.compare` against the stored `passwordHash`.

**In-Memory Valuation & Metrics Calculation (Full Table Scans):**
- Issue: `InventoryService.getStats()`, `LicensesService.getStats()`, and `ReportsService.getReportSuites()` fetch all table records via `findMany({ select: ... })` into Node.js heap memory to compute sums, spend, and utilization via JavaScript `.reduce()`.
- Files: `apps/api/src/modules/inventory/inventory.service.ts`, `apps/api/src/modules/licenses/licenses.service.ts`, `apps/api/src/modules/reports/reports.service.ts`
- Impact: Causes severe CPU and memory pressure as database row counts grow, resulting in latency spikes and potential Node.js process Out-Of-Memory (OOM) crashes.
- Fix approach: Use PostgreSQL database aggregations via Prisma `aggregate` or raw queries (`SELECT SUM(quantity * "unitCost") FROM "InventoryItem"`).

**Disjointed Identity Models (`User` vs `DirectoryUser`):**
- Issue: The system maintains two separate, unlinked identity tables: `User` (system authentication) and `DirectoryUser` (AD/LDAP directory records). Asset assignments (`Asset.assignedToId`) link to `User.id`, but `DirectoryService.findAllUsers()` matches assets and licenses by querying loose email strings (`where: { assignedTo: { email: { in: userEmails } } }`).
- Files: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/directory/directory.service.ts`, `apps/api/src/modules/assets/assets.service.ts`
- Impact: Referential integrity breaks when user emails are updated or differ in casing; directory users cannot be reliably queried as asset custodians.
- Fix approach: Unify `User` and `DirectoryUser` into a single identity schema or establish a foreign-key relation `User.directoryUserId` / `DirectoryUser.userId`.

**Unused & Phantom Infrastructure Dependencies:**
- Issue: Redis (`ioredis`, `@nestjs/bullmq`, `bullmq`), WebSockets (`@nestjs/websockets`, `@nestjs/platform-socket.io`), and SeaweedFS S3 are configured in `docker-compose.yml` and declared in `apps/api/package.json`, but zero application service code in `apps/api/src/` imports or utilizes them.
- Files: `apps/api/package.json`, `apps/api/src/app.module.ts`, `docker-compose.yml`, `docker-compose.dev.yml`
- Impact: Unnecessary resource consumption by idle Docker containers, package bloat in `node_modules`, and false assumptions regarding caching, async job queues, and object storage.
- Fix approach: Either implement the Redis cache manager, BullMQ workers for background reports, and SeaweedFS S3 storage driver, or remove the unused packages and container services.

**Client-Side CSV Export with Page Truncation:**
- Issue: `assetsService.exportCsv()` in the frontend calls `getAssets()` without pagination parameters, which hits `GET /assets` and defaults to returning only 50 records. The CSV string is generated in browser memory.
- Files: `apps/web/src/services/assets.service.ts`, `apps/web/src/pages/assets/hooks/useAssetManagement.ts`
- Impact: Exporting CSV from the UI silently omits all assets beyond the first 50 records in the database.
- Fix approach: Implement a dedicated backend streaming endpoint (`GET /assets/export/csv`) matching the pattern in `apps/api/src/modules/audit/audit.service.ts`.

**Unvalidated Environment Configuration on Boot:**
- Issue: `apps/api/src/config/app.config.ts` defines a strict Zod `envSchema` and `getAppConfig()` function, but `ConfigModule.forRoot({ isGlobal: true })` in `apps/api/src/app.module.ts` does not pass `validate: getAppConfig`.
- Files: `apps/api/src/app.module.ts`, `apps/api/src/config/app.config.ts`
- Impact: Missing or invalid environment variables are not caught at application bootstrap and fail unpredictably during runtime requests.
- Fix approach: Wire `validate: getAppConfig` or `validationSchema` directly into `ConfigModule.forRoot()` in `apps/api/src/app.module.ts`.

**Inconsistent DTO Validation Strategy:**
- Issue: NestJS `ValidationPipe` is registered globally in `apps/api/src/main.ts`, butหลาย DTOs (e.g. `apps/api/src/modules/assets/dto/create-asset.dto.ts`) define optional fields like `purchaseCost` or `purchasePrice` without `@IsNumber()` or `@Type(() => Number)` decorators. Meanwhile, `ZodValidationPipe` in `apps/api/src/common/pipes/zod-validation.pipe.ts` is unused.
- Files: `apps/api/src/main.ts`, `apps/api/src/common/pipes/zod-validation.pipe.ts`, `apps/api/src/modules/assets/dto/create-asset.dto.ts`
- Impact: Invalid string or type payloads can bypass validation and cause runtime Prisma query exceptions.
- Fix approach: Standardize on class-validator with comprehensive constraints or bind shared Zod schemas through `ZodValidationPipe`.

---

## Known Bugs

**Broken Token Refresh Flow (Instant Logout on Expiry):**
- Symptoms: When an access token expires, the web application fails to refresh and immediately logs the user out.
- Files: `apps/web/src/services/api.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.service.ts`
- Trigger: A user session remains idle until the 15-minute access token expires; any subsequent API call receives a 401.
- Cause: In `apps/web/src/services/api.ts`, the 401 interceptor calls `api.post('/auth/refresh')`. However, `AuthController.refresh` in `apps/api/src/modules/auth/auth.controller.ts` is protected with `@UseGuards(JwtAuthGuard)`. Because the request header contains the already-expired JWT, Passport rejects it with 401 Unauthorized. The error handler then triggers `handleAuthRedirect()`, clearing credentials and forcing a redirect to `/login`.
- Workaround: Users must log in again with their password every 15 minutes.
- Fix approach: Implement HTTP-only refresh token cookies with a dedicated refresh secret and validation strategy that does not require an active, unexpired access token.

**TCP Socket Ping SSRF & False Positive Status:**
- Symptoms: Ping tool in Network IPAM marks unreachable or nonexistent IP addresses as "online", and allows scanning internal ports.
- Files: `apps/api/src/modules/network/network.service.ts`, `apps/web/src/pages/network/hooks/useNetworkManagement.ts`
- Trigger: Submit any IP address (e.g. `192.168.99.99` or `127.0.0.1`) to `GET /network/ping/:ip`.
- Cause: `NetworkService.pingIp` attempts a TCP socket connection on port 80. When `socket.on('error')` fires (such as `ECONNREFUSED` or `EHOSTUNREACH`), the catch handler resolves `reachable: true, message: '... (online)'`.
- Workaround: None.
- Fix approach: Use native ICMP ping via system ping utility or validated UDP echo probe with strict IP subnet validation, and correctly distinguish connection refusal from network timeout/unreachable errors.

**Automatic Reassignment of Open Tickets on User Comment:**
- Symptoms: When a requester or regular employee adds a reply to an open support ticket, the ticket status changes to `IN_PROGRESS` and the assigned technician is set to the employee's name.
- Files: `apps/api/src/modules/tickets/tickets.service.ts`
- Trigger: Calling `POST /tickets/:id/comments` on any ticket where `status === 'OPEN'`.
- Cause: Lines 201–208 of `apps/api/src/modules/tickets/tickets.service.ts` unconditionally update `assigneeName: payload.authorName || payload.sender` whenever `ticket.status === 'OPEN'`.
- Workaround: Technicians must manually reassign the ticket back to themselves after every customer reply.
- Fix approach: Check `payload.isStaff === true` before updating `assigneeName` and transitioning status to `IN_PROGRESS`.

**Simulated Reports Download (No File Generated):**
- Symptoms: Clicking "PDF", "Excel", or "CSV" download on the Reports page displays a success toast notification, but no file is downloaded.
- Files: `apps/web/src/pages/reports/ReportsPage.tsx`
- Trigger: Click any export button on `apps/web/src/pages/reports/ReportsPage.tsx`.
- Cause: `handleDownload` sets a timeout with `message.loading` and resolves `message.success`, but contains no file blob creation or API call.
- Workaround: None in the UI.
- Fix approach: Implement report generation endpoints on the backend (`GET /reports/:id/export?format=pdf|xlsx|csv`) and wire `handleDownload` to trigger browser blob download.

**Simulated Database Snapshot & Fake Audit Record:**
- Symptoms: Clicking "Run Instant Backup" in Settings claims a backup was saved to `s3://uims-files/backups/`, but no backup is created.
- Files: `apps/api/src/modules/settings/settings.service.ts`, `apps/web/src/pages/settings/SettingsPage.tsx`
- Trigger: Click "Run Instant Backup" under Settings > Backups & Diagnostics.
- Cause: `SettingsService.runBackup` generates a random snapshot filename string and writes an audit log claiming "Encrypted AES-256 backup archive saved to S3 bucket", but executes no database dump (`pg_dump`) or S3 storage call.
- Workaround: Database backups must be taken manually via Docker CLI (`docker exec uims-postgres pg_dump ...`).
- Fix approach: Connect a real backup job using `pg_dump` streamed to SeaweedFS S3 storage.

---

## Security Considerations

**Missing Role-Based Access Control (RBAC) on Sensitive Endpoints:**
- Risk: Privilege escalation and unauthorized modification of enterprise data.
- Files: `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/settings/settings.controller.ts`, `apps/api/src/modules/assets/assets.controller.ts`, `apps/api/src/modules/licenses/licenses.controller.ts`, `apps/api/src/modules/inventory/inventory.controller.ts`, `apps/api/src/modules/network/network.controller.ts`
- Current mitigation: `JwtAuthGuard` ensures requests are authenticated.
- Recommendations: `@Roles('Admin', 'Super Admin')` is only applied to `POST /users` and `DELETE /users/:id`. Any user with role `Employee` can execute `PATCH /users/:id` to elevate their role or change passwords, modify settings via `PUT /settings/:group`, delete network subnets, or delete hardware assets. Add `@Roles()` decorators and enforce permission checks across all mutation routes.

**Insecure Default JWT Fallback Secret:**
- Risk: JWT token forgery and authentication bypass.
- Files: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`, `apps/api/src/modules/auth/auth.module.ts`
- Current mitigation: Relies on `JWT_SECRET` environment variable.
- Recommendations: Both `JwtStrategy` and `AuthModule` fallback to `'secret'` when `JWT_SECRET` is unset. Throw a hard configuration error during bootstrap if `JWT_SECRET` is empty or using the default fallback string.

**Insecure Token Storage in LocalStorage (XSS Exposure):**
- Risk: Access tokens can be exfiltrated if any third-party dependency introduces Cross-Site Scripting (XSS).
- Files: `apps/web/src/stores/auth.store.ts`
- Current mitigation: Standard Zustand `persist` with key `uims-auth-storage`.
- Recommendations: Store authentication tokens in secure, `HttpOnly`, `SameSite=Strict` cookies.

**Insecure Direct Object Reference (IDOR) on Notifications:**
- Risk: Users can view, mark as read, or delete other users' notification records.
- Files: `apps/api/src/modules/notifications/notifications.controller.ts`, `apps/api/src/modules/notifications/notifications.service.ts`
- Current mitigation: None for single-record actions (`PATCH /notifications/:id/read`, `DELETE /notifications/:id`).
- Recommendations: Update `markAsRead` and `remove` queries in `NotificationsService` to enforce `where: { id, userId }`.

**Audit Log Tampering & Fire-and-Forget Failure Swallowing:**
- Risk: Audit logs can fail silently without alerting compliance officers.
- Files: `apps/api/src/common/interceptors/audit.interceptor.ts`
- Current mitigation: Wrapped in a `try/catch` block to prevent interceptor failure from aborting client responses.
- Recommendations: Replace fire-and-forget in-process writing with a durable message queue (BullMQ/Redis) and log errors to a centralized logging sink (Pino).

---

## Performance Bottlenecks

**Aggressive Sidebar Telemetry Polling (Database Storm):**
- Problem: The frontend polls `GET /dashboard/overview` and `GET /notifications` every 15 seconds from every connected browser tab.
- Files: `apps/web/src/layouts/hooks/useLayoutTelemetry.ts`, `apps/api/src/modules/dashboard/dashboard.service.ts`
- Cause: `DashboardService.getOverview()` executes 12 database count/aggregate queries across 6 tables on every single request. 100 active browser tabs generate 4,800 database queries per minute for layout badges alone.
- Improvement path: Cache `getOverview` in Redis with a 30-to-60 second TTL, or create a lightweight `/telemetry/badges` endpoint that only returns the 3 badge numbers, or push live updates over WebSockets.

**Unindexed Case-Insensitive Full-Text Search Fallback:**
- Problem: Global search queries cause full table scans across multiple PostgreSQL tables.
- Files: `apps/api/src/modules/search/search.service.ts`
- Cause: `searchDatabaseFallback()` executes 4 parallel unindexed queries using `mode: 'insensitive'` (`ILIKE '%...%'`) across 16 columns in `Asset`, `Ticket`, `License`, and `DirectoryUser`.
- Improvement path: Configure PostgreSQL `pg_trgm` GIN indexes on searchable columns, or automate synchronization to Meilisearch so the fallback is rarely reached.

**Missing Search Index Lifecycle Hooks:**
- Problem: Meilisearch search indices are stale or empty.
- Files: `apps/api/src/modules/search/search.service.ts`, `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/tickets/tickets.service.ts`, `apps/api/src/modules/licenses/licenses.service.ts`
- Cause: `SearchService.syncAllToMeilisearch()` is only invoked manually via API; entity mutations (create/update/delete) in `AssetsService`, `TicketsService`, and `LicensesService` do not publish index updates.
- Improvement path: Add NestJS event emitters (`@nestjs/event-emitter`) or Prisma middleware to automatically index/update documents in Meilisearch on entity changes.

---

## Fragile Areas

**Dynamic On-The-Fly Taxonomy Creation:**
- Files: `apps/api/src/modules/assets/assets.service.ts`
- Why fragile: In `AssetsService.create()`, helper functions `resolveCategoryId` and `resolveLocationId` automatically create new `AssetCategory` and `Location` rows in PostgreSQL if the passed category or location name does not exist. Minor typos (e.g. "Lapotp", "NY Office ") create orphaned categories and fragment reporting.
- Safe modification: Enforce category and location selection from predefined taxonomies using foreign keys, and require explicit administrative taxonomy management endpoints.
- Test coverage: `apps/api/src/modules/assets/assets.service.spec.ts` only tests mock paths.

**Ticket Identifier Ambiguity (`ticketCode` vs `id`):**
- Files: `apps/api/src/modules/tickets/tickets.service.ts`, `apps/web/src/pages/tickets/TicketsPage.tsx`, `apps/web/src/services/tickets.service.ts`
- Why fragile: `TicketsService.formatTicket()` maps the human-readable code `ticketCode` (e.g. `TKT-4K2P`) to `ticket.id`, while the database UUID is assigned to `ticket.realId`. Endpoints `PATCH /tickets/:id`, `POST /tickets/:id/comments`, and `PATCH /tickets/:id/status` query Prisma by `where: { id }` (requiring UUID). If a client passes `ticket.id` (`TKT-...`), Prisma throws a record not found error.
- Safe modification: Support both UUID and `ticketCode` across all ticket mutation methods (`where: isUuid(id) ? { id } : { ticketCode: id }`).
- Test coverage: Missing negative test cases for ticket lookups using `ticketCode` in mutation routes.

**Hardcoded Subnet IP Allocation Math:**
- Files: `apps/api/src/modules/network/network.service.ts`, `apps/api/src/modules/network/dto/create-subnet.dto.ts`
- Why fragile: Subnet creation sets `totalIps: 254` and `usedIps: 1` as static defaults regardless of the actual CIDR mask (e.g. `/16`, `/28`).
- Safe modification: Integrate a CIDR parsing library (such as `ip-address` or `cidr-tools`) to calculate usable host capacities and broadcast addresses dynamically.
- Test coverage: `apps/api/src/modules/network/network.service.spec.ts` only tests mocked controller returns.

---

## Scaling Limits

**Database Connection Pool Exhaustion:**
- Current capacity: `connection_limit=20` configured in `DATABASE_URL` query string; PostgreSQL container configured for `max_connections=200`.
- Limit: With multiple API replicas and non-cached telemetry polling, connection pools will exhaust during traffic spikes.
- Scaling path: Introduce PgBouncer connection pooling in front of PostgreSQL and activate Redis query response caching.

**Non-Enveloped API Pagination:**
- Current capacity: Endpoints like `GET /assets`, `GET /inventory`, `GET /licenses`, `GET /users`, `GET /audit` return raw JSON arrays with `take` and `skip`.
- Limit: Frontend tables cannot determine the total number of pages or total records available without fetching all rows.
- Scaling path: Refactor all list endpoints to return the standard envelope `{ items: T[], total: number, page: number, pageSize: number, totalPages: number }` utilizing Prisma `$transaction([model.findMany(), model.count()])`.

**Audit Log Table Storage Growth:**
- Current capacity: Single unpartitioned PostgreSQL table `AuditLog` with synchronous writes on every mutating HTTP request.
- Limit: In high-activity enterprise environments, the `AuditLog` table will quickly exceed millions of rows, degrading index performance and backup speed.
- Scaling path: Implement PostgreSQL time-based table partitioning (e.g. monthly partitions on `timestamp`) and offload writes to an asynchronous queue worker.

---

## Dependencies at Risk

**Unused Heavy Dependencies in `@uims/api`:**
- Package: `@nestjs/bullmq` (^11.0.5), `bullmq` (^6.1.1), `ioredis` (^6.0.0), `@nestjs/websockets` (^11.1.29), `@nestjs/platform-socket.io` (^11.1.29)
- Risk: Bloats dependency graph, increases container build times, and introduces unused attack surface.
- Impact: Potential unpatched vulnerabilities in unused transitive dependencies.
- Migration plan: Implement queue/cache modules where required or prune from `apps/api/package.json`.

**Experimental TypeScript 7 Tooling in Packages:**
- Package: `tsdown` with `typescript@7.0.2` in `packages/shared-*`
- Risk: Emits build warnings (`WARN TypeScript 7.0 does not yet have a stable API and is experimental`).
- Impact: Potential breaking changes in type emit behavior between toolchain updates.
- Migration plan: Pin `typescript` to `^5.8` or `^5.9` across all monorepo packages until TypeScript 7 reaches formal GA.

---

## Missing Critical Features

**Asynchronous Background Job Worker & Report Scheduler:**
- Problem: Report schedules and automated delivery records saved in `ReportSchedule` are never executed.
- Blocks: Automated emailing of quarterly asset depreciation models, SOC2 audit reports, and SLA compliance digests.

**Object Storage Driver for Attachments & Avatars:**
- Problem: No S3 client (e.g. `@aws-sdk/client-s3`) or file upload controller exists in `apps/api`.
- Blocks: Uploading hardware purchase receipts, equipment inspection photos, user profile avatars, and ticket attachment screenshots.

**Real DNS Server / Provider Integration:**
- Problem: Internal DNS zone records returned in `NetworkService.getDnsRecords()` are hardcoded mock objects.
- Blocks: Real-time synchronization with enterprise DNS systems (BIND9, PowerDNS, CoreDNS, AWS Route53).

**True Multi-Tenant Isolation:**
- Problem: The organization switcher in `menuConfig.tsx` is purely a local UI state string.
- Blocks: Enterprise multi-organization tenant separation, role scoping, and VPC environment partitioning.

---

## Test Coverage Gaps

**Frontend Page Components (0% Coverage):**
- What's not tested: Rendering, user interactions, form submissions, and drawer/modal states in `LoginPage`, `DashboardPage`, `AssetsPage`, `TicketsPage`, `SettingsPage`, `ReportsPage`, `AuditPage`, `DirectoryPage`, `NetworkPage`, and `InventoryPage`.
- Files: `apps/web/src/pages/**/*.tsx`, `apps/web/src/components/**/*.tsx`
- Risk: Regressions in Ant Design token configurations, form bindings, or broken API integration handlers go completely undetected.
- Priority: High

**End-to-End API Integration & Guard Tests:**
- What's not tested: Real HTTP requests against live PostgreSQL and Passport JWT auth guards; existing tests are mock unit tests that bypass NestJS guards and Prisma queries.
- Files: `apps/api/src/modules/**/*.spec.ts`
- Risk: Broken Prisma queries, faulty SQL joins, or missing guard decorator combinations pass unit tests but fail in staging/production.
- Priority: High

**DTO Runtime Validation Tests:**
- What's not tested: Invalid payload rejection for ticket comments, inventory restock, subnet creation, and directory user updates.
- Files: `packages/shared-validators/src/`, `apps/api/src/modules/**/dto/*.ts`
- Risk: Invalid or malicious payloads cause 500 Unhandled Exception crashes instead of clean 400 Bad Request validation responses.
- Priority: Medium

---

*Concerns audit: 2026-08-15*

# Technical Concerns
**Analysis Date:** 2026-09-09

## Critical Issues

### 1. Hardcoded Plaintext Database & Redis Credentials in Production Compose
- **Severity:** Critical
- **Location:** `docker-compose.yml:112-113`
- **Evidence:**
  ```yaml
  DATABASE_URL: postgresql://uims:uims_secret_2026@postgres:5432/uims_db?schema=public&connection_limit=20&pool_timeout=30
  REDIS_URL: redis://:uims_redis_2026@redis:6379
  ```
- **Impact:** Production compose hardcodes `uims_secret_2026` and `uims_redis_2026` instead of interpolating environment variables `${DATABASE_PASSWORD}` and `${REDIS_PASSWORD}`. Any deployment referencing this file defaults to publicly exposed credentials.
- **Remediation:** Parameterize connection strings using `${DATABASE_USER}:${DATABASE_PASSWORD}@...` and require strict deployment `.env` variables without insecure fallbacks.

### 2. Missing Environment Variable in Production Docker Compose Leading to Startup Crash
- **Severity:** Critical
- **Location:** `docker-compose.yml:109-124`, `apps/api/src/config/app.config.ts:9`
- **Evidence:**
  `apps/api/src/config/app.config.ts` strictly validates environment variables via Zod at startup:
  ```ts
  AUDIT_SIGNING_KEY: z.string().min(32, 'AUDIT_SIGNING_KEY must be at least 32 characters')
  ```
  However, `docker-compose.yml` omits `AUDIT_SIGNING_KEY` completely from `api.environment`. Running `docker compose up` in production without a custom host environment variable crashes the API container immediately on boot.
- **Impact:** Complete application outage on clean deployment.
- **Remediation:** Add `AUDIT_SIGNING_KEY: ${AUDIT_SIGNING_KEY}` to `docker-compose.yml` and `.env.example`.

### 3. Silent Catch Blocks Dropping Authentication Audit Logs & Refresh Tokens
- **Severity:** High
- **Location:** `apps/api/src/modules/auth/auth.service.ts:229, 247, 353`
- **Evidence:**
  ```ts
  await this.prisma.refreshToken
    .create({
      data: { userId: user.id, tokenHash, device: userAgent, ipAddress, expiresAt },
    })
    .catch(() => {});

  // Record successful login audit
  await this.prisma.auditLog
    .create({
      data: { userId: user.id, action: 'LOGIN_SUCCESS', ... },
    })
    .catch(() => {});
  ```
- **Impact:** Database write failures during login or logout are swallowed silently without logging. If `refreshToken.create` fails, the client receives a refresh token that can never be refreshed (resulting in sudden session drops). If `auditLog.create` fails, tamper-evident security compliance records are silently lost without alerting.
- **Remediation:** Replace `.catch(() => {})` with proper try/catch blocks that log errors via NestJS `Logger.error()` and raise transactional alerts or retry operations.

### 4. Predictable Default Passwords and Plaintext Password Leakage
- **Severity:** High
- **Location:** `apps/api/src/modules/users/users.service.ts:80-82, 116`
- **Evidence:**
  ```ts
  const adInitialPassword =
    (userData as { adInitialPassword?: string }).adInitialPassword || `Ad#${username}2026!`;
  const plainPassword = userData.password || adInitialPassword;
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  ...
  return {
    ...safeUser,
    adInitialPassword: (userData as { adInitialPassword?: string }).adInitialPassword,
  };
  ```
- **Impact:** Newly provisioned or imported users without explicit passwords receive a predictable default password (`Ad#${username}2026!`), creating an immediate credential stuffing and brute-force vulnerability. Furthermore, line 116 reflects `adInitialPassword` in plaintext in the API response JSON.
- **Remediation:** Require cryptographically secure random password generation (e.g. `crypto.randomBytes`) for unprovisioned accounts, enforce password reset on first login (`mustChangePassword: true`), and purge `adInitialPassword` from all API response contracts.

---

## Security Concerns

### Hardcoded Secrets or Weak Defaults
- **Insecure JWT Default Fallbacks:** `docker-compose.yml:114-115` provides weak defaults:
  - `JWT_SECRET: ${JWT_SECRET:-uims-jwt-secret-change-in-production}`
  - `JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-uims-jwt-refresh-secret-change-in-production}`
- **SeaweedFS / S3 Credentials:** `docker-compose.yml:121-122` provides defaults `uims_s3_access` and `uims_s3_secret`.

### CORS Misconfiguration
- **WebSocket Gateway Wildcard with Credentials:** `apps/api/src/modules/notifications/notifications.gateway.ts:20-24` defines:
  ```ts
  @WebSocketGateway({
    cors: {
      origin: '*',
      credentials: true,
    },
    namespace: '/notifications',
  })
  ```
  Allowing wildcard `origin: '*'` in conjunction with `credentials: true` violates CORS security constraints and permits arbitrary cross-origin sites to initiate authenticated socket connections to the notification stream.
- **REST API CORS Cloudflare Tunnel Fallback:** `apps/api/src/main.ts:57` permits any origin ending with `.trycloudflare.com` when `NODE_ENV !== 'production'`. While acceptable for dev, ensure this rule is never enabled in staging or production.

### Auth Bypass & Token Leakage Risks
- **JWT Passed in URL Query Parameter:** `apps/api/src/modules/notifications/notifications.gateway.ts:46-48, 95-97` accepts JWT tokens from query strings:
  ```ts
  typeof socket.handshake.query?.token === 'string'
  ```
  Tokens passed via query parameters leak in HTTP access logs, reverse proxy logs (Nginx access logs), and browser history. Authentication must be restricted to the `auth: { token }` payload or `Authorization: Bearer` header.
- **WebSocket Default Role Assignment:** `apps/api/src/modules/notifications/notifications.gateway.ts:72, 128` falls back to `role = payload.role || 'Employee'`. If an invalid token lacks a role claim, the socket is automatically joined to the `role:Employee` broadcast room.

### Missing Rate Limiting on Sensitive Endpoints
- **Global vs Endpoint Throttling:** While `app.module.ts:38` sets a global rate limit of 1,000 req/min, and `auth.controller.ts` throttles login (5 req/min) and refresh (10 req/min), other high-risk endpoints lack dedicated throttle limits:
  - User creation & password updates: `apps/api/src/modules/users/users.controller.ts`
  - Bulk CSV/LDAP directory import: `apps/api/src/modules/directory/directory.controller.ts` (`/api/v1/directory/import`)
  - Report and CSV exports: `apps/api/src/modules/reports/reports.controller.ts`
  - Database search fallback: `apps/api/src/modules/search/search.controller.ts`
- **In-Memory Rate Limiter in Multi-Instance Deployments:** `ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])` uses NestJS's default in-memory storage rather than Redis. Rate limits are not synchronized across clustered API containers, allowing attackers to bypass limits by load-balancing across instances.

### Plaintext License Keys in Relational Storage
- **Location:** `apps/api/prisma/schema.prisma:259` (`licenseKey String?`)
- Commercial software license keys, activation codes, and vendor secrets are stored in plaintext without application-level encryption at rest (e.g. AES-256-GCM).

---

## Performance Concerns

### Unbounded Queries (`findMany` without `take`/`limit`)
Several critical services and background workers query database tables without pagination or limit constraints:
1. **Scheduled Alerts Background Worker:**
   - `apps/api/src/modules/notifications/scheduled-alerts.worker.ts:71`: `prisma.license.findMany({ where: { expiryDate: { lte: thirtyDaysFromNow } } })` queries all expiring licenses with no limit.
   - `apps/api/src/modules/notifications/scheduled-alerts.worker.ts:188`: `prisma.asset.findMany({ where: { warrantyExpiry: { lte: thirtyDaysFromNow } } })` queries all expiring assets.
   - `apps/api/src/modules/notifications/scheduled-alerts.worker.ts:273`: `prisma.asset.findMany({ where: { status: 'MAINTENANCE', updatedAt: { lte: fourteenDaysAgo } } })`.
   - `apps/api/src/modules/notifications/scheduled-alerts.worker.ts:309`: `prisma.inventoryItem.findMany()` loads the **entire inventory table** into Node.js memory to evaluate `item.quantity <= item.minThreshold` in JavaScript rather than filtering in PostgreSQL.
2. **Inventory Aggregations:**
   - `apps/api/src/modules/inventory/inventory.service.ts:173`: `prisma.inventoryItem.findMany({ select: { quantity: true, unitCost: true } })` pulls all inventory rows into memory to compute total inventory valuation instead of using `prisma.inventoryItem.aggregate({ _sum: ... })`.
3. **Subnet Management:**
   - `apps/api/src/modules/network/network.service.ts:171`: `prisma.subnet.findMany({ orderBy: { createdAt: 'asc' } })` returns all subnets without pagination.
4. **Reports Service:**
   - `apps/api/src/modules/reports/reports.service.ts:11, 109, 117`: Queries licenses and report schedules with no `take` bounds.

### N+1 Query Patterns
1. **Directory CSV Batch Import (Sequential N+1):**
   - `apps/api/src/modules/directory/directory.service.ts:590-624`: In `importDirectoryUsers`, a `for` loop iterates over every row in the uploaded CSV:
     - Step 1: `await this.prisma.directoryUser.findFirst(...)`
     - Step 2: `await this.prisma.directoryUser.update(...)` or `create(...)`
     - Step 3: `await this.ensureAndLinkAdGroup(...)` (which issues another `findUnique` and `create`)
   - For an enterprise directory import of 5,000 employees, this executes 10,000 to 15,000 individual sequential database queries.
2. **Notification Admin Dispatch (Fanout N+1):**
   - `apps/api/src/modules/notifications/notifications.service.ts:322-332`: In `notifyAdmins()`, `Promise.all(adminUsers.map(admin => this.create(...)))` calls `this.create()` for each admin.
   - Each `this.create()` executes:
     - `await this.prisma.notification.create(...)`
     - `await this.getUnreadCount(admin.id)` (`SELECT COUNT(*) FROM notification WHERE userId = ... AND isRead = false`)
   - Dispatching an alert to 50 administrators issues 100 concurrent queries to PostgreSQL.

### Missing Database Indexes
Analysis of `apps/api/prisma/schema.prisma` identified several unindexed foreign keys and query predicates:
1. **`Asset` Model:**
   - Missing index on `warrantyExpiry` (frequently queried by `scheduled-alerts.worker.ts:188`).
   - Missing composite index on `[status, updatedAt]` (queried by `scheduled-alerts.worker.ts:273`).
2. **`License` Model:**
   - Missing index on `expiryDate` (queried by `scheduled-alerts.worker.ts:71` and `licenses.service.ts:81`).
3. **`DirectoryUser` Model Foreign Keys:**
   - Foreign keys `organizationId`, `departmentId`, `positionId`, and `locationId` do NOT have `@@index` annotations. In PostgreSQL, foreign keys are not automatically indexed, resulting in sequential scans when joining or filtering users by organization/department.
4. **`AppUser` Model Foreign Key:**
   - Foreign key `roleId` lacks `@@index([roleId])`.
5. **`Subnet` Model Foreign Key:**
   - Foreign key `vlanId` lacks `@@index([vlanId])`.
6. **`RolePermission` Model Reverse Index:**
   - Compound primary key is `@@id([roleId, permissionId])`. Reverse lookups by `permissionId` (e.g. deleting or updating permission links) require a full scan because `permissionId` is the second column of the composite key.
7. **Trigram/Full-Text Search Indexes:**
   - `apps/api/src/modules/search/search.service.ts:151-188` uses `contains` (`ILIKE '%query%'`) across `Asset`, `License`, and `DirectoryUser`. Standard B-Tree indexes cannot accelerate substring wildcard queries, forcing full sequential scans for every database fallback search query. Trigram (`pg_trgm`) GIN indexes are required.

### Missing Caching Opportunities
- **Master Organization Hierarchy:** `OrganizationService` queries `Organization`, `Department`, `Position`, and `Location` on every navigation. These structures are read-heavy and rarely updated, making them prime candidates for Redis caching with key invalidation on mutation.
- **Dashboard Telemetry Polling:** `apps/web/src/layouts/hooks/useLayoutTelemetry.ts:34` polls `/dashboard/overview` every 30 seconds across active browser sessions. While `DashboardService` implements partial Redis caching, KPI metrics recalculate frequently without Redis caching of the unified summary response.

---

## Code Quality Issues

### TypeScript Strict Mode Violations
- **Strict Mode Disabled in Core Apps:**
  - `apps/api/tsconfig.json:16, 18`:
    ```json
    "strict": false,
    "noImplicitAny": false
    ```
  - `apps/web/tsconfig.json:14-17`:
    ```json
    "strict": false,
    "noImplicitAny": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
    ```
  - While `packages/shared-types` enforces `"strict": true`, both primary applications explicitly turn off strict type checking. This permits untyped expressions to silently resolve to `any`, masking potential `null`/`undefined` exceptions.

### Experimental TypeScript Pre-Release Dependency
- `package.json:43`, `apps/api/package.json:74`, `apps/web/package.json:43` depend on `"typescript": "^7.0.2"`.
- Build tooling (tsdown/rolldown) emits build warnings during compilation:
  ```
  WARN TypeScript 7.0 does not yet have a stable API and is experimental. Some options will be unavailable.
  ```
- Relying on a non-final major version risks unexpected compilation breakage and upstream incompatibilities.

### Console.log Usage in Production Code
- While backend code cleanly avoids `console.log` (only 1 occurrence in `apps/api/src/config/app.config.ts:17` for startup env validation failure), frontend code contains **30+ raw `console.error(err)` calls** across production pages and hooks:
  - `apps/web/src/pages/assets/hooks/useAssetManagement.ts:111, 278, 293, 324`
  - `apps/web/src/pages/network/hooks/useNetworkManagement.ts:64, 112, 127, 152, 168`
  - `apps/web/src/pages/organization/OrganizationPage.tsx:121, 257, 271, 307, 321, 357, 371`
  - `apps/web/src/pages/settings/SettingsPage.tsx:203, 226, 257, 301, 326, 361, 403`
  - `apps/web/src/pages/audit/AuditPage.tsx:79, 104`
  - `apps/web/src/pages/inventory/InventoryPage.tsx:140, 221, 235, 255`
  - `apps/web/src/pages/licenses/LicensesPage.tsx:102, 180, 194, 230, 247`
  - `apps/web/src/pages/reports/ReportsPage.tsx:62, 97`
  - `apps/web/src/hooks/useRealtimeNotifications.ts:52, 203, 217, 230, 240`
  - `apps/web/src/pages/auth/LoginPage.tsx:56`
- These unhandled errors bypass UI toast notifications and centralized error reporting.

### Dead Code & Unused Handlers
- `apps/web/src/services/auth.service.ts:23-25`:
  ```ts
  logout: async () => {
    // Local logout cleanup
  },
  ```
  Empty stub method that does nothing yet is imported by `auth.store.ts`.

---

## Architecture Concerns

### Circular Dependencies
- **Frontend Circular Import Chain:**
  ```
  apps/web/src/stores/auth.store.ts
    └── imports authService from ../services/auth.service
          └── imports api from ./api
                └── imports useAuthStore from ../stores/auth.store
  ```
- **Evidence:** Verified by static dependency cycle analysis.
- **Impact:** During ESM module evaluation, if `api.ts` or `auth.store.ts` evaluates before its counterpart has initialized, module exports can be undefined at runtime.
- **Remediation:** Remove the `authService.logout()` call from `auth.store.ts` (since it is an empty stub) or extract token access into an independent token storage module (`token-storage.ts`).

### Health Check Gaps
- `apps/api/src/modules/health/health.controller.ts:19-55`:
  - **Incomplete Dependency Checks:** Only tests PostgreSQL (`$queryRaw SELECT 1`). Does not ping Redis, MeiliSearch, or SeaweedFS. If Redis fails (halting BullMQ background jobs and cache lookups), `/health` still reports `status: 'ok'`.
  - **Always Returns HTTP 200:** When the database fails (`dbStatus === 'disconnected'`), the controller returns HTTP 200 with `{ status: 'degraded' }` instead of HTTP 503 (`ServiceUnavailableException`). Kubernetes liveness and container healthchecks checking HTTP status codes will continue routing traffic to an unhealthy container.
  - **Synthetic Metrics:** `uptimePercent: uptimeSecs > 3600 ? '99.99%' : '100.0%'` hardcodes synthetic uptime strings rather than measuring real availability.

---

## Testing Gaps

### Backend Controllers Missing Unit Tests
While service classes have comprehensive unit and adversarial tests, the following controllers have no unit tests (`.spec.ts`):
- `apps/api/src/modules/audit/audit.controller.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/dashboard/dashboard.controller.ts`
- `apps/api/src/modules/reports/reports.controller.ts`
- `apps/api/src/modules/search/search.controller.ts`
- `apps/api/src/modules/settings/settings.controller.ts`

### Frontend Pages Without Any Unit or Integration Tests
Out of 12 major UI page domains in `apps/web/src/pages`, 7 modules have **zero test files**:
- `apps/web/src/pages/audit/AuditPage.tsx` (0 tests)
- `apps/web/src/pages/auth/LoginPage.tsx` (0 tests)
- `apps/web/src/pages/inventory/InventoryPage.tsx` (0 tests)
- `apps/web/src/pages/licenses/LicensesPage.tsx` (0 tests)
- `apps/web/src/pages/network/*` (7 files: IPAM, SubnetList, VLANModal, etc. — 0 tests)
- `apps/web/src/pages/reports/ReportsPage.tsx` (0 tests)
- `apps/web/src/pages/settings/SettingsPage.tsx` (0 tests)

### Missing End-to-End (E2E) Test Suite
- Root `package.json:24` defines `"test:e2e": "turbo run test:e2e"`, and `@playwright/test` is installed in root `devDependencies`.
- However, neither `apps/api` nor `apps/web` defines a `test:e2e` script in their respective `package.json`, and there are no Playwright configuration files (`playwright.config.ts`) or E2E scenario specs in the repository.

### Vitest Test Environment Teardown Exceptions
- **Location:** `apps/web/src/pages/directory/EmployeesTab.test.tsx`
- **Evidence:** Vitest caught 3 unhandled exceptions during the test run:
  ```
  ReferenceError: window is not defined
    at react-dom-client.development.js:17920:15
    at Immediate.performWorkUntilDeadline (scheduler.development.js:45:48)
  ```
- **Impact:** While all 34 test files and 284 assertions passed, pending React 19 scheduler microtasks execute after Happy-DOM environment teardown, causing Vitest to exit with code 1. This intermittently breaks automated CI build pipelines.

---

## Infrastructure Concerns

### Missing Container Health Checks in Docker Compose
- `docker-compose.yml` configures healthchecks for `postgres`, `redis`, and `meilisearch`, but lacks healthchecks for:
  - `api` (even though `/api/v1/health` exists)
  - `web`
  - `seaweedfs-master`, `seaweedfs-volume`, `seaweedfs-filer`
- `web` depends on `api` without a health condition (`condition: service_healthy`), leading to race conditions during initial stack startup.
- `apps/api/Dockerfile` lacks a `HEALTHCHECK` instruction.

### Missing Data Backup and Recovery Strategy
- No automated database dump (`pg_dump`) containers, scripts, or volume backup policies are defined for:
  - PostgreSQL volume (`postgres_data`)
  - Redis persistence (`redis_data`)
  - MeiliSearch indexes (`meilisearch_data`)
  - SeaweedFS blobs (`seaweedfs_data`)

### Missing Monitoring, Metrics, and Alerting Stack
- The application lacks Prometheus metrics export (e.g. `@willsoto/nestjs-prometheus`), Grafana dashboards, OpenTelemetry distributed tracing, or centralized log shipping (Fluentd/Loki).

### Missing Continuous Deployment (CD) Pipeline
- `.github/workflows/ci.yml` successfully runs Biome format, ESLint, TypeScript typecheck, Vitest, and Turborepo build.
- However, there is no CD workflow to build production Docker images, push to a container registry (GHCR/DockerHub), or trigger deployments.

---

## Technical Debt Inventory

| ID | Description | Severity | Location | Effort |
|----|-------------|----------|----------|--------|
| TD-001 | Hardcoded database and Redis passwords in Docker Compose | Critical | `docker-compose.yml:112-113` | S |
| TD-002 | Missing `AUDIT_SIGNING_KEY` causing Docker container startup crash | Critical | `docker-compose.yml:109-124`, `app.config.ts:9` | S |
| TD-003 | Silent `.catch(() => {})` dropping refresh tokens and audit logs | High | `apps/api/src/modules/auth/auth.service.ts:229,247,353` | S |
| TD-004 | Predictable default user password `Ad#${username}2026!` and plaintext response | High | `apps/api/src/modules/users/users.service.ts:80-82,116` | S |
| TD-005 | Insecure WebSocket CORS (`origin: '*', credentials: true`) | High | `apps/api/src/modules/notifications/notifications.gateway.ts:20-24` | S |
| TD-006 | Circular dependency: `auth.store.ts` -> `auth.service.ts` -> `api.ts` | High | `apps/web/src/stores/auth.store.ts` | S |
| TD-007 | Unbounded table scan for low-stock inventory in cron worker | High | `apps/api/src/modules/notifications/scheduled-alerts.worker.ts:309` | M |
| TD-008 | Sequential N+1 queries in directory CSV batch import | High | `apps/api/src/modules/directory/directory.service.ts:590-624` | M |
| TD-009 | Missing database indexes on foreign keys and expiration dates | High | `apps/api/prisma/schema.prisma` | M |
| TD-010 | TypeScript strict mode disabled across API and Web | Medium | `apps/api/tsconfig.json`, `apps/web/tsconfig.json` | L |
| TD-011 | JWT token extracted from URL query parameter in WebSocket | Medium | `apps/api/src/modules/notifications/notifications.gateway.ts:46,95` | S |
| TD-012 | In-memory Throttler storage not shared across clustered API nodes | Medium | `apps/api/src/app.module.ts:38` | M |
| TD-013 | Health endpoint returns 200 on DB failure and ignores Redis/Meili | Medium | `apps/api/src/modules/health/health.controller.ts` | S |
| TD-014 | Plaintext storage of software license keys in database | Medium | `apps/api/prisma/schema.prisma:259` | M |
| TD-015 | 7 frontend page modules have zero unit or integration tests | Medium | `apps/web/src/pages/(audit, auth, inventory, licenses, network, reports, settings)` | L |
| TD-016 | Missing E2E Playwright test implementation despite root dependency | Medium | Root `package.json`, `turbo.json` | M |
| TD-017 | React 19 Happy-DOM teardown unhandled exception (`window is not defined`) | Medium | `apps/web/src/pages/directory/EmployeesTab.test.tsx` | S |
| TD-018 | 30+ raw `console.error` calls in frontend production code | Low | `apps/web/src/pages/**` | M |
| TD-019 | Missing Docker healthchecks for API and SeaweedFS services | Low | `docker-compose.yml`, `apps/api/Dockerfile` | S |
| TD-020 | Experimental TypeScript 7.0 pre-release causing build warnings | Low | `package.json`, `apps/*/package.json` | S |
| TD-021 | Missing automated database backup / volume snapshot strategy | Low | `docker/` | M |

---

## Improvement Opportunities

### Quick Wins (Low Effort, High Impact)
1. **Fix Docker Compose Env Configuration:**
   - Parameterize `DATABASE_URL` and `REDIS_URL` with `${DATABASE_PASSWORD}` and `${REDIS_PASSWORD}` in `docker-compose.yml`.
   - Add `AUDIT_SIGNING_KEY: ${AUDIT_SIGNING_KEY}` to prevent startup crashes.
2. **Close Silent Catch Blocks:**
   - Replace empty `.catch(() => {})` in `auth.service.ts` with explicit logging and transaction rollbacks.
3. **Break Frontend Circular Dependency:**
   - Eliminate the unused `authService.logout()` call from `auth.store.ts` to sever the `auth.store -> auth.service -> api -> auth.store` import loop.
4. **Secure WebSocket Gateway CORS & Handshake:**
   - Restrict WebSocket CORS origin to configured frontend origins (`allowedOrigins`).
   - Deprecate passing JWT tokens in query parameters (`socket.handshake.query.token`), requiring `auth: { token }` or headers.
5. **Fix Health Check Status Code:**
   - Update `HealthController` to return HTTP 503 (`ServiceUnavailableException`) when PostgreSQL is unreachable, and add a Redis ping test.

### Strategic Improvements (High Effort, High Impact)
1. **Bulk Optimization for Directory Import:**
   - Refactor `importDirectoryUsers` from sequential row-by-row queries to batched upserts or Prisma `$transaction` blocks with in-memory group mapping to reduce 15,000 queries to < 10 queries.
2. **Database Indexing & Trigram Search Migration:**
   - Add missing indexes in `schema.prisma` for `Asset.warrantyExpiry`, `License.expiryDate`, and foreign keys `DirectoryUser(organizationId, departmentId, positionId, locationId)`.
   - Enable PostgreSQL `pg_trgm` extension and create GIN indexes on `name`, `assetTag`, `email`, and `serialNumber` to eliminate sequential scans during database search fallbacks.
3. **Distributed Rate Limiting via Redis:**
   - Configure `ThrottlerStorageRedisService` in `AppModule` to synchronize rate-limiting state across all API containers.
4. **Comprehensive Frontend Testing & E2E Suite:**
   - Implement Vitest component tests for untested page modules (`LoginPage`, `InventoryPage`, `LicensesPage`, `NetworkManagement`, `ReportsPage`, `SettingsPage`).
   - Configure Playwright in `apps/web` or root to test critical user journeys (login, asset check-in/check-out, license allocation).
5. **Enable TypeScript Strict Mode Incrementally:**
   - Enable `"strict": true` and `"noImplicitAny": true` in `apps/api/tsconfig.json` and `apps/web/tsconfig.json`.

### Nice-to-Haves (Low Priority)
1. **Downgrade TypeScript to Stable Release:**
   - Align TypeScript with latest stable release (e.g. `~5.8.x`) to remove build warnings and experimental API instability.
2. **Centralized Frontend Error Reporting:**
   - Replace `console.error` calls across React pages with an error reporting client (e.g. Sentry or internal telemetry logger) and unified Ant Design `notification.error` banners.
3. **Automated Database Backup Automation:**
   - Create a lightweight `postgres-backup` container in `docker-compose.yml` running daily `pg_dump` jobs rotated to SeaweedFS/S3 storage.

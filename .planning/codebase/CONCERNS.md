# Technical Debt, Security Risks & Architectural Concerns

This document details verified technical debt, security vulnerabilities, performance bottlenecks, and architectural gaps in the Unified IT Management System (UIMS) codebase as of September 2026. Every concern is backed by concrete source code evidence.

---

## 1. Executive Summary & Findings Breakdown

| Severity | Security | Performance | Architecture | Data Integrity | Operational | Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Critical** | 2 | 0 | 0 | 0 | 0 | **2** |
| **High** | 3 | 3 | 1 | 0 | 0 | **7** |
| **Medium** | 2 | 3 | 2 | 1 | 1 | **9** |
| **Low** | 0 | 0 | 0 | 1 | 1 | **2** |
| **Total** | **7** | **6** | **3** | **2** | **2** | **20** |

---

## 2. Critical Concerns

### SEC-01: Broken Refresh Token Flow & Revocation Bypass
- **What**: Token refreshing is architecturally broken: `/api/v1/auth/refresh` requires a valid access token rather than verifying the refresh token. Revocation tracking in the database is bypassed.
- **Where**:
  - [`apps/api/src/modules/auth/auth.controller.ts:47-53`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.controller.ts#L47-L53)
  - [`apps/api/src/modules/auth/auth.service.ts:274-359`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.service.ts#L274-L359)
  - [`apps/web/src/services/api.ts:57-74`](file:///home/user/projects/uims/apps/web/src/services/api.ts#L57-L74)
  - [`apps/web/src/stores/auth.store.ts:26-44`](file:///home/user/projects/uims/apps/web/src/stores/auth.store.ts#L26-L44)
- **Why it matters**: `AuthController.refresh` is guarded by `JwtAuthGuard` (which validates the access token signed with `JWT_SECRET`). When the access token expires, the client's interceptor attempts to refresh using the expired token, resulting in an immediate 401 failure (`TokenExpiredError`) and forced logout. Furthermore, the frontend never stores `refreshToken`, and backend refresh logic does not verify `tokenHash`, `isRevoked`, or `expiresAt` against the `RefreshToken` database table. Revoked sessions remain active until access token expiry.
- **Suggested fix**: Create a dedicated `JwtRefreshGuard` validating tokens against `JWT_REFRESH_SECRET`. Accept `refreshToken` in request body or secure HttpOnly cookie. Verify against the `RefreshToken` table, invalidate the used token, and issue a rotated pair.

### SEC-02: Cryptographic Key Multi-Use & Vault Encryption Fallbacks
- **What**: `CredentialVaultService` falls back to `AUDIT_SIGNING_KEY` or `JWT_SECRET` when `VAULT_MASTER_KEY` is not provided, reusing HMAC-SHA256 signing keys for AES-256-GCM symmetric encryption.
- **Where**:
  - [`apps/api/src/modules/network/credential-vault.service.ts:19-35`](file:///home/user/projects/uims/apps/api/src/modules/network/credential-vault.service.ts#L19-L35)
  - [`apps/api/src/config/app.config.ts:3-12`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts#L3-L12)
- **Why it matters**: Cross-algorithm key reuse weakens cryptographic boundaries. Rotating `JWT_SECRET` or `AUDIT_SIGNING_KEY` renders existing encrypted network device credentials irreversibly corrupted and unrecoverable. `VAULT_MASTER_KEY` is also absent from Zod schema validation in `app.config.ts`.
- **Suggested fix**: Add `VAULT_MASTER_KEY` (minimum 32 characters) to `envSchema` in `app.config.ts`. Fail fast at startup if absent, and remove fallback derivations from `JWT_SECRET` and `AUDIT_SIGNING_KEY`.

---

## 3. High Severity Concerns

### SEC-03: Hardcoded Administrative Credentials in Client Bundle
- **What**: Production login view contains hardcoded credentials in form initial values and interactive demo autofill buttons.
- **Where**: [`apps/web/src/pages/auth/LoginPage.tsx:153-157, 213-272`](file:///home/user/projects/uims/apps/web/src/pages/auth/LoginPage.tsx#L153-L157)
- **Why it matters**: Production build bundles expose default credentials (`admin@uims.local` / `Admin@2026`, `sarah.chen` / `password123`, `david.kim` / `password123`). Anyone inspecting client JS assets or accessing `/login` can extract working accounts.
- **Suggested fix**: Remove `initialValues` and the "QUICK ACCESS / DEMO ACCOUNTS" block, or gate them strictly behind `import.meta.env.DEV` conditions.

### SEC-04: Plaintext Insecure Secret Fallbacks in Docker Compose
- **What**: `docker-compose.yml` provides default string fallbacks for JWT, search, and object storage secrets.
- **Where**: [`docker-compose.yml:48, 114-115, 120, 122-123`](file:///home/user/projects/uims/docker-compose.yml#L48)
- **Why it matters**: Violates AGENTS.md Section 4 ("Zero Hardcoded Secrets"). Container deployments run with predictable keys (`uims-jwt-secret-change-in-production`, `uims_meili_master_key_2026`, `uims_s3_secret`) if `.env` variables are omitted.
- **Suggested fix**: Parameterize secrets strictly as `${JWT_SECRET}`, `${JWT_REFRESH_SECRET}`, `${MEILISEARCH_API_KEY}`, `${S3_SECRET_KEY}` without plaintext default values.

### SEC-05: Plaintext License Key Storage & Unauthenticated Leakage
- **What**: Software license keys are stored unencrypted in the relational schema, returned in cleartext via API endpoints, and indexed in search.
- **Where**:
  - [`apps/api/prisma/schema.prisma:272`](file:///home/user/projects/uims/apps/api/prisma/schema.prisma#L272)
  - [`apps/api/src/modules/licenses/licenses.service.ts:51, 428`](file:///home/user/projects/uims/apps/api/src/modules/licenses/licenses.service.ts#L51)
  - [`apps/api/src/modules/search/search.service.ts:169`](file:///home/user/projects/uims/apps/api/src/modules/search/search.service.ts#L169)
- **Why it matters**: Anyone with read access to licenses or the search endpoint can view sensitive enterprise software keys (`licenseKey: license.licenseKey || 'N/A'`).
- **Suggested fix**: Encrypt `licenseKey` at rest using `CredentialVaultService`. Mask keys (`••••-••••-${key.slice(-4)}`) in standard responses and expose full keys only via an audited `@Roles('Admin')` endpoint.

### PERF-01: Connection Pool Exhaustion in Dashboard Aggregations
- **What**: `DashboardService.getOverview()` executes 23 parallel database queries simultaneously via `Promise.all()`.
- **Where**:
  - [`apps/api/src/modules/dashboard/dashboard.service.ts:240-300`](file:///home/user/projects/uims/apps/api/src/modules/dashboard/dashboard.service.ts#L240-L300)
  - [`docker-compose.yml:112`](file:///home/user/projects/uims/docker-compose.yml#L112)
- **Why it matters**: `DATABASE_URL` configures `connection_limit=20`. A single uncached request initiates 23 queries at once, exceeding the Prisma connection pool and causing query queuing, latency spikes, and timeouts.
- **Suggested fix**: Consolidate status counts into single SQL group-by queries (`SELECT status, COUNT(*) FROM "Asset" GROUP BY status`) and batch sub-queries sequentially or via `$queryRaw`.

### PERF-02: In-Memory Aggregations Violating Architecture Invariants
- **What**: Multi-thousand row datasets are fetched into Node.js memory to compute arithmetic sums with `.reduce()`, with arbitrary query caps.
- **Where**:
  - [`apps/api/src/modules/licenses/licenses.service.ts:382-391`](file:///home/user/projects/uims/apps/api/src/modules/licenses/licenses.service.ts#L382-L391)
  - [`apps/api/src/modules/reports/reports.service.ts:18-20, 127`](file:///home/user/projects/uims/apps/api/src/modules/reports/reports.service.ts#L18-L20)
  - [`apps/api/src/modules/roles/roles.service.ts:168`](file:///home/user/projects/uims/apps/api/src/modules/roles/roles.service.ts#L168)
- **Why it matters**: Violates AGENTS.md Section 6 ("Zero In-Memory Aggregations"). Loading 1,000 records into Node.js heap to compute `reduce((sum, l) => sum + l.usedSeats * l.costPerSeat)` wastes memory and silently truncates financial spend calculations when license counts exceed 1,000.
- **Suggested fix**: Execute calculations directly in PostgreSQL via Prisma aggregate (`_sum`) or `$queryRaw` (`SELECT COALESCE(SUM("usedSeats" * "costPerSeat"), 0) FROM "License"`).

### PERF-03: Sequential N+1 Transactions in Directory CSV Batch Import
- **What**: `DirectoryService.importBatch()` executes an individual `$transaction` for every row in a batch.
- **Where**: [`apps/api/src/modules/directory/directory.service.ts:805-811, 834-870`](file:///home/user/projects/uims/apps/api/src/modules/directory/directory.service.ts#L805-L811)
- **Why it matters**: Importing 5,000 users triggers 5,000 isolated database transactions plus individual group lookups and count updates, causing severe transaction overhead, connection locking, and timeouts on large imports.
- **Suggested fix**: Group writes into chunks of 100 within a single `$transaction` per chunk, using Prisma `createMany` / bulk upsert operations.

### ARCH-01: Missing BullMQ Integration for Scheduled Background Workers
- **What**: `@nestjs/bullmq` (v11.0.5) and `bullmq` (v6.3.4) are installed in `package.json`, but never registered in `AppModule`. Background alert workers run via `@Cron` in the primary API process.
- **Where**:
  - [`apps/api/src/modules/notifications/scheduled-alerts.worker.ts:20-50`](file:///home/user/projects/uims/apps/api/src/modules/notifications/scheduled-alerts.worker.ts#L20-L50)
  - [`apps/api/package.json:23, 40`](file:///home/user/projects/uims/apps/api/package.json#L23)
- **Why it matters**: In multi-replica container deployments, each API instance executes the `@Cron` simultaneously at midnight UTC, causing redundant database scans, duplicate alert dispatches, and race conditions.
- **Suggested fix**: Wire `BullModule.forRootAsync()` using the existing Redis infrastructure and dispatch scheduled jobs to a distributed BullMQ worker with leader election and queue deduplication.

---

## 4. Medium Severity Concerns

### SEC-06: Password Hashing Below Mandated Cost Standard
- **What**: Passwords are hashed with `bcrypt.hash(..., 10)` rather than 12 rounds.
- **Where**:
  - [`apps/api/src/modules/users/users.service.ts:104, 271`](file:///home/user/projects/uims/apps/api/src/modules/users/users.service.ts#L104)
  - [`apps/api/prisma/seeders/roles-users.seeder.ts:28-29`](file:///home/user/projects/uims/apps/api/prisma/seeders/roles-users.seeder.ts#L28-L29)
- **Why it matters**: AGENTS.md Section 4 mandates: "Passwords must be hashed using salted bcrypt (12 rounds)." Cost factor 10 reduces resistance to offline GPU brute-force attacks.
- **Suggested fix**: Update `bcrypt.hash(password, 12)` in `users.service.ts` and seeder routines.

### SEC-07: Permissive CSP Directives & Disabled Security Headers
- **What**: Nginx reverse proxy enables `'unsafe-inline'` script/style directives and deprecated `X-XSS-Protection`, while NestJS Helmet disables CSP.
- **Where**:
  - [`docker/nginx/nginx.conf:37, 39`](file:///home/user/projects/uims/docker/nginx/nginx.conf#L37)
  - [`apps/api/src/main.ts:21-23`](file:///home/user/projects/uims/apps/api/src/main.ts#L21-L23)
- **Why it matters**: `'unsafe-inline'` undermines Cross-Site Scripting (XSS) protections. `connect-src http: https: ws: wss:;` is overly broad and allows data exfiltration to arbitrary external origins.
- **Suggested fix**: Remove `'unsafe-inline'` in favor of nonces/hashes, restrict `connect-src` to application domains, and drop the deprecated `X-XSS-Protection` header.

### PERF-04: In-Memory Subnet CIDR Evaluation Capped at 100 Records
- **What**: `NetworkService.autoDetect()` and IP assignment query `subnet.findMany({ take: 100 })` and iterate in JavaScript using `findMatchingSubnet()`.
- **Where**: [`apps/api/src/modules/network/network.service.ts:425-435, 673-680`](file:///home/user/projects/uims/apps/api/src/modules/network/network.service.ts#L425-L435)
- **Why it matters**: Enterprises with >100 subnets will fail to match any subnet past the 100th in alphabetical CIDR order. Storing CIDRs as plain `String` prevents PostgreSQL from using indexed `inet` / `cidr` operators (`ip << cidr`).
- **Suggested fix**: Migrate PostgreSQL column type to `cidr` via raw SQL migration or write a `$queryRaw` function using `WHERE $1::inet << cidr::cidr`.

### PERF-05: Unbounded Heap Allocation in Directory Master Export
- **What**: `DirectoryService.exportMaster()` loads up to 10,000 user entities with 4 relational joins (`organization`, `department`, `position`, `location`) in a single query.
- **Where**: [`apps/api/src/modules/directory/directory.service.ts:531-540`](file:///home/user/projects/uims/apps/api/src/modules/directory/directory.service.ts#L531-L540)
- **Why it matters**: Allocates hundreds of megabytes on the Node.js event loop during serialization, risking heap exhaustion and event loop lag.
- **Suggested fix**: Implement cursor-based pagination and pipe CSV output through Node.js transform streams directly to the response.

### PERF-06: MeiliSearch Reindexing Hard Truncation
- **What**: `SearchService.reindexAll()` fetches `take: 1000` for assets, licenses, and directory users during full search re-indexing.
- **Where**: [`apps/api/src/modules/search/search.service.ts:238-244`](file:///home/user/projects/uims/apps/api/src/modules/search/search.service.ts#L238-L244)
- **Why it matters**: In environments with more than 1,000 records per model, records past the first 1,000 are silently omitted from the search index.
- **Suggested fix**: Use batched cursor pagination (`take: 500`, cursor loop) to index all records into MeiliSearch.

### ARCH-02: Hardcoded Static Telemetry in Reports Service
- **What**: `ReportsService.getReportSuites()` and `getStats()` return static mock numbers and strings ("100% Pass", "0 Critical Findings", "83.6%", "8.4 Units/wk").
- **Where**: [`apps/api/src/modules/reports/reports.service.ts:17, 45, 58-60, 71-74, 84-87, 131-135`](file:///home/user/projects/uims/apps/api/src/modules/reports/reports.service.ts#L17)
- **Why it matters**: Management and audit dashboards present fabricated values as real system compliance and asset depreciation data.
- **Suggested fix**: Query real aggregated data from `AuditLog`, `IPAddress`, and `InventoryItem` tables.

### ARCH-03: Environment Variable Schema Desynchronization
- **What**: Schema mismatch between `app.config.ts`, `auth.module.ts`, and `docker-compose.yml`.
- **Where**:
  - [`apps/api/src/config/app.config.ts:3-12`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts#L3-L12)
  - [`apps/api/src/modules/auth/auth.module.ts:24-27`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.module.ts#L24-L27)
  - [`docker-compose.yml:110-125`](file:///home/user/projects/uims/docker-compose.yml#L110-L125)
- **Why it matters**: `JWT_EXPIRATION` in `app.config.ts` is unused; `AuthModule` reads `JWT_ACCESS_EXPIRATION`, which is unvalidated. `REDIS_URL` is marked `.optional()`, but omitting it causes cache and queue degradation.
- **Suggested fix**: Align `envSchema` with all runtime variables (`JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `VAULT_MASTER_KEY`, `MEILISEARCH_API_KEY`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`) and mark `REDIS_URL` required in production.

### DATA-01: Missing Database Index on `Setting(group)`
- **What**: The `Setting` model defines `key String @unique`, but lacks an index on `group`.
- **Where**: [`apps/api/prisma/schema.prisma:530-537`](file:///home/user/projects/uims/apps/api/prisma/schema.prisma#L530-L537)
- **Why it matters**: Looking up or filtering settings by category group triggers full table scans.
- **Suggested fix**: Add `@@index([group])` to `Setting` in `schema.prisma`.

### OPS-01: Raw Console Calls in Production Components
- **What**: `console.warn` and `console.error` are present in frontend components and server bootstrapper.
- **Where**:
  - [`apps/web/src/pages/network/components/SubnetFormModal.tsx:112`](file:///home/user/projects/uims/apps/web/src/pages/network/components/SubnetFormModal.tsx#L112)
  - [`apps/api/src/config/app.config.ts:17`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts#L17)
- **Why it matters**: Violates AGENTS.md Section 7 ("Structured Logging Standards"). Logs bypass log aggregation pipelines.
- **Suggested fix**: Replace frontend call with notification feedback or silent telemetry; use NestJS `Logger` in `app.config.ts`.

---

## 5. Low Severity Concerns

### DATA-02: Missing HMAC Signatures on Programmatic Audit Logs
- **What**: `AuditInterceptor` generates HMAC-SHA256 signatures for HTTP operations, but direct calls to `AuditService.logEvent()` omit the `hash` field.
- **Where**:
  - [`apps/api/src/modules/audit/audit.service.ts:57-76`](file:///home/user/projects/uims/apps/api/src/modules/audit/audit.service.ts#L57-L76)
  - [`apps/api/src/common/interceptors/audit.interceptor.ts:72-89, 123-132`](file:///home/user/projects/uims/apps/api/src/common/interceptors/audit.interceptor.ts#L72-L89)
- **Why it matters**: Internal service events (logins, directory rejections) have `hash = null`, undermining tamper-evident integrity guarantees across the audit trail.
- **Suggested fix**: Move HMAC computation inside `AuditService.logEvent()` so all records receive a cryptographic hash.

### OPS-02: Direct `process.env` Bypassing ConfigService
- **What**: Direct reads from `process.env.AUDIT_SIGNING_KEY` and `process.env.CORS_ORIGIN` bypass NestJS `ConfigService`.
- **Where**:
  - [`apps/api/src/common/interceptors/audit.interceptor.ts:81`](file:///home/user/projects/uims/apps/api/src/common/interceptors/audit.interceptor.ts#L81)
  - [`apps/api/src/modules/notifications/notifications.gateway.ts:21`](file:///home/user/projects/uims/apps/api/src/modules/notifications/notifications.gateway.ts#L21)
- **Why it matters**: Bypasses centralized configuration caching, validation, and mocking in unit test suites.
- **Suggested fix**: Inject `ConfigService` into `AuditInterceptor` and helper methods.

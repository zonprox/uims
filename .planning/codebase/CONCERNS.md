# Codebase Concerns & Technical Debt

**Analysis Date:** 2026-09-09

This document outlines technical debt, potential scaling bottlenecks, security concerns, missing enterprise features, and code quality issues within the UIMS monorepo. It serves as a guide to address fragile areas before they impact production.

## Known Bugs & Edge Cases
- **Silent Failures:** Multiple empty catch blocks (`.catch(() => {})`) throughout the codebase mask underlying runtime errors.
- **Data Edge Cases:** The frontend tests (`apps/web/src/pages/directory/EmployeesTab.test.tsx` L418) indicate "employee record with missing/null optional fields does not throw" which is correctly handled, but similar edge cases around partial schema updates in directory sync are fragile.
- **Race Conditions:** Lack of explicit row-level locking during inventory reservations and license assignments could cause race conditions under high concurrency.
- **General Assessment:** The core business logic largely lacks `TODO` or `FIXME` comments in `apps/api/src` and `apps/web/src`, suggesting either a highly mature codebase or developers skipping documentation of known technical debt. 

## Fragile Areas
- **Scheduled Background Workers:** `apps/api/src/modules/notifications/scheduled-alerts.worker.ts` handles complex background tasks querying `license`, `asset`, and `inventoryItem` entire tables into memory. It is highly fragile to database timeouts as datasets grow.
- **Directory Service Sync:** `apps/api/src/modules/directory/directory.service.ts` is large and manages heavy operations. L599 pulls entire matched user groups into memory. If external AD systems return 100,000 users, this will crash the Node process.
- **Frontend Video Decoding:** `apps/web/src/pages/assets/components/AssetScannerModal.tsx` and `apps/web/src/pages/assets/utils/qrDecoder.ts` use unhandled `.catch(() => {})` logic during camera initialization and shutdown, potentially leaking media streams or failing silently on mobile browsers.

## Scaling Limits
- **Node.js Memory Exhaustion:** Extensive use of unbounded `.findMany()` and subsequent in-memory `.reduce()` will break Node's memory limit (typically ~1.5GB) at enterprise scale (e.g. >500k inventory items).
- **Database Connection Limits:** Widespread use of parallel queries (e.g., `Promise.all` in `dashboard.service.ts` L240, `search.service.ts` L151, `roles.service.ts` L134) might starve the Prisma connection pool if multiple users hit these endpoints simultaneously.
- **WebSocket Scaling:** `apps/api/src/modules/notifications/notifications.gateway.ts` handles connections locally. Without a Redis IoAdapter configured, scaling to multiple API pods in Kubernetes will cause WebSocket broadcast failures.

## Dependencies at Risk
- Continuous audits are required for the Prisma ORM and Zod packages, given their deep integration. 
- The project leverages modern tooling (`@biomejs/biome`, `playwright`, Vite 8), but third-party UI components (Ant Design v6+) may undergo breaking changes requiring significant effort given the dense UI implementations.

## Missing Critical Features
- **Rate Limiting:** Missing entirely from `apps/api/src/main.ts` and `app.module.ts`. The API is vulnerable to brute force and denial of service attacks.
- **CSRF Protection:** No CSRF middleware is configured in the NestJS bootstrap.
- **Comprehensive Audit Trails:** While an `audit.service.ts` exists, many `deleteMany` seed and CLI tasks run without leaving trails. 
- **Request Logging:** No systemic HTTP request logging middleware (e.g., Morgan or Pino) is bound in `main.ts` for monitoring slow queries.
- **Automated Backup Strategy:** Codebase lacks cron definitions for PostgreSQL logical backups.

## Security
- **Improper Logging:** 
  - `apps/api/src/config/app.config.ts`:17 uses `console.error` instead of the NestJS Logger.
  - `apps/web/src/components/ErrorBoundary.tsx`:91 uses `console.error`, bypassing remote observability tools.
  - `packages/shared-validators/README.md` details `console.error` and `console.log` usages.
- **CORS Misconfiguration Risk:** `apps/api/src/main.ts` dynamically parses `process.env.CORS_ORIGIN`. If misconfigured (e.g., empty string or typo), it falls back to vulnerable defaults.
- **Missing CSP Headers:** `helmet` is configured with `contentSecurityPolicy: false` in `main.ts`, relying on a reverse proxy that may not be correctly implemented.
- **No API Rate Limiting:** As mentioned, zero mitigation for volumetric attacks.

## Unbounded Queries (Memory Bottlenecks)
Severe risk of full-table scans. The following perform `findMany()` without `take` or `skip`:
- `apps/api/src/modules/notifications/notifications.service.ts`:215
- `apps/api/src/modules/notifications/scheduled-alerts.worker.ts`:71, 190, 277, 315
- `apps/api/src/modules/inventory/inventory.service.ts`:106, 173
- `apps/api/src/modules/assets/assets.service.ts`:142
- `apps/api/src/modules/directory/directory.service.ts`:194, 396, 401, 486, 531, 599, 628
- `apps/api/src/modules/settings/settings.service.ts`:19
- `apps/api/src/modules/search/search.service.ts`:152, 164, 174
- `apps/api/src/modules/licenses/licenses.service.ts`:81, 249
- `apps/api/src/modules/audit/audit.service.ts`:39, 96
- `apps/api/src/modules/organization/organization.service.ts`:37, 133, 223, 298, 310
- `apps/api/src/modules/roles/roles.service.ts`:101, 135, 171
- `apps/api/src/modules/dashboard/dashboard.service.ts`:255, 260, 265, 276, 292
- `apps/api/src/modules/reports/reports.service.ts`:11, 110, 119
- `apps/api/src/modules/users/users.service.ts`:189, 417
- `apps/api/src/modules/network/network.service.ts`:48, 172
*Action:* Refactor to cursor-based pagination or inject hard limit (`take: 500`).

## In-Memory Aggregations
The codebase downloads entire tables via `findMany()` only to run `.reduce()` in memory instead of utilizing Prisma's `aggregate` push-down to PostgreSQL:
- `apps/api/src/modules/inventory/inventory.service.ts`:179 — `items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)`
- `apps/api/src/modules/licenses/licenses.service.ts`:257 — `allLicenses.reduce((sum, l) => sum + l.usedSeats * (l.costPerSeat || 0), 0)`
- `apps/api/src/modules/reports/reports.service.ts`:18, 19, 20, 127 — Multiple `licenses.reduce(...)` calls calculating total seats, SaaS costs, and used seats.
*Action:* Replace with `prisma.license.aggregate({ _sum: { usedSeats: true } })`.

## Empty Catch Blocks (Silent Errors)
Errors are being swallowed across the stack:
- `apps/api/prisma/seed.ts`:39 — `await client.rolePermission.deleteMany().catch(() => {});`
- `apps/api/prisma/seed.ts`:40 — `await client.permission.deleteMany().catch(() => {});`
- `apps/api/prisma/seeders/roles-users.seeder.ts`:423 — `.catch(() => {});`
- `apps/api/src/modules/roles/roles.service.ts`:96 — `await this.redis.del(this.CACHE_KEY).catch(() => {});`
- `apps/web/src/pages/assets/components/AssetScannerModal.tsx`:183, 293 — `videoRef.current.play?.()?.catch?.(() => {});`
- `apps/web/src/pages/assets/utils/qrDecoder.ts`:502, 508 — `ctx.close().catch(() => {});`
- `apps/web/src/pages/organization/OrganizationCanvas.tsx`:727, 732 — `.catch(() => {});`
- `apps/web/src/pages/settings/SettingsPage.tsx`:147 — `.catch(() => ({}) as Record<string, unknown>)`

## Type Safety
- **Strict Compliance:** The project rigorously adheres to the zero `any` policy. Comprehensive scanning (`grep -rnE '@ts-ignore|@ts-expect-error|as any'`) in `apps/api/src` and `apps/web/src` returned **0 occurrences**. The only bypass found was the heavily typed `as Record<string, unknown>` in `SettingsPage.tsx`.

## Database Schema & N+1 Patterns
- **Indexes:** Foreign key indexing in `apps/api/prisma/schema.prisma` is generally well-maintained. Indexes like `@@index([organizationId])`, `@@index([departmentId])`, and `@@index([userId])` are explicitly defined.
- **N+1 Avoidance:** Widespread use of `Promise.all` mitigates some serial querying, and `include` is used extensively. However, the combination of unbounded queries (`findMany`) inside scheduled workers effectively creates N+M memory pressure, even if not strictly serial DB roundtrips.

*Concerns audit: 2026-09-09*

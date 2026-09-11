# Codebase Concerns

**Analysis Date:** 2026-09-11

## Tech Debt

### TD-001: TypeScript Strict Mode Disabled

- Issue: Both `apps/api/tsconfig.json` and `apps/web/tsconfig.json` have `"strict": false` and `"noImplicitAny": false`
- Files: `apps/api/tsconfig.json`, `apps/web/tsconfig.json`
- Impact: Allows implicit `any` types, reduces type safety guarantees, conflicts with AGENTS.md zero-`any` policy
- Fix approach: Incrementally enable `"strict": true` — start with `noImplicitAny: true`, fix type errors workspace by workspace. API has `strictNullChecks: true` and `strictBindCallApply: true` already enabled.

### TD-002: Unbounded `findMany()` Queries

- Issue: Multiple `findMany()` calls lack `take` parameter ceiling — at least 20 instances across services
- Files:
  - `apps/api/src/modules/notifications/notifications.service.ts:215,308`
  - `apps/api/src/modules/notifications/scheduled-alerts.worker.ts:71,190,277,340`
  - `apps/api/src/modules/inventory/inventory.service.ts:155,274,286`
  - `apps/api/src/modules/assets/assets.service.ts:266,531`
  - `apps/api/src/modules/directory/directory.service.ts:183,386,398,486,531,610,643`
  - `apps/api/src/modules/settings/settings.service.ts:21`
  - `apps/api/src/modules/search/search.service.ts:152`
- Impact: Risk of loading entire tables into memory — OOM on production with large datasets. Violates AGENTS.md mandatory bounded queries directive.
- Fix approach: Add explicit `take: Math.min(limit, 100)` with `orderBy` to all `findMany()` calls. For workers, use cursor pagination with `take: 100` batches.

### TD-003: In-Memory Aggregations

- Issue: Multiple services load rows into Node.js and compute sums via `.reduce()` instead of database aggregations
- Files:
  - `apps/api/src/modules/licenses/licenses.service.ts:391` — `allLicenses.reduce((sum, l) => sum + l.usedSeats * (l.costPerSeat || 0), 0)`
  - `apps/api/src/modules/reports/reports.service.ts:18-20,127` — Multiple `.reduce()` aggregations on licenses
  - `apps/api/src/modules/roles/roles.service.ts:170` — `roles.reduce((acc, curr) => acc + curr._count.users, 0)`
- Impact: Inefficient on large datasets; wastes memory and CPU. Violates AGENTS.md zero in-memory aggregations directive.
- Fix approach: Replace with Prisma `_sum` aggregations or `$queryRaw` SQL: `SELECT COALESCE(SUM("usedSeats" * "costPerSeat"), 0) FROM "License"`

### TD-004: Search Service High Take Ceiling

- Issue: `search.service.ts` uses `take: 1000` for MeiliSearch index sync queries
- Files: `apps/api/src/modules/search/search.service.ts:238-242`
- Impact: Loads up to 1000 records per entity into memory for search indexing
- Fix approach: Implement cursor-based pagination for index sync, processing records in batches of 100

### TD-005: Large Page Components

- Issue: Several page components exceed 800+ lines with complex inline logic
- Files:
  - `apps/web/src/pages/organization/OrganizationCanvas.tsx` — 1886 lines
  - `apps/web/src/pages/organization/OrganizationPage.tsx` — 1828 lines
  - `apps/web/src/pages/settings/SettingsPage.tsx` — 1433 lines
  - `apps/web/src/pages/dashboard/DashboardPage.tsx` — 1256 lines
  - `apps/web/src/pages/directory/EmployeesTab.tsx` — 955 lines
  - `apps/web/src/pages/network/NetworkPage.tsx` (service: 891 lines)
  - `apps/web/src/pages/inventory/InventoryPage.tsx` — 879 lines
  - `apps/web/src/components/ErrorResultView.tsx` — 853 lines
- Impact: Hard to maintain, test, and reason about. Increases cognitive load.
- Fix approach: Extract sub-components (form modals, table configurations, stat panels) into separate files within `components/` subdirectories per page.

## Known Bugs

No known bugs detected via static analysis. Zero TODO/FIXME/HACK/XXX comments found in production source code.

## Security Considerations

### SEC-001: Redis Connection Fallback to In-Memory

- Risk: When Redis is unavailable, `RedisService` silently falls back to an in-memory `Map`
- Files: `apps/api/src/common/redis/redis.service.ts`
- Current mitigation: Logs warning on fallback
- Recommendations: The in-memory fallback does not persist across restarts and is not shared across instances. For production multi-instance deployments, Redis unavailability should be treated as a degraded state requiring alerting.

### SEC-002: MeiliSearch API Key in Default Fallback

- Risk: `search.service.ts` contains a fallback API key string: `'uims_meili_master_key_2026'`
- Files: `apps/api/src/modules/search/search.service.ts:58`
- Current mitigation: Only used as fallback when `MEILI_API_KEY` env var is missing
- Recommendations: Remove hardcoded fallback key. Use `configService.getOrThrow<string>('MEILI_API_KEY')` to fail-fast if not configured.

### SEC-003: Environment Validation Hardened

- Risk: Low — startup validation via Zod (`apps/api/src/config/app.config.ts`) exits on missing required vars
- Current mitigation: `process.exit(1)` on invalid env vars
- Status: ✅ Properly implemented

### SEC-004: CORS Configuration Validated

- Risk: Low — CORS uses explicit allowlist with dynamic `.trycloudflare.com` only in non-production
- Files: `apps/api/src/main.ts`, `apps/api/src/modules/notifications/notifications.gateway.ts`
- Current mitigation: Origin callback validation, no wildcards with credentials
- Status: ✅ Properly implemented

## Performance Bottlenecks

### PERF-001: Search Index Sync Loads Full Tables

- Problem: `SearchService.syncIndexes()` loads up to 1000 records per entity into memory
- Files: `apps/api/src/modules/search/search.service.ts:238-242`
- Cause: Bulk load approach for MeiliSearch index population
- Improvement path: Use cursor pagination, stream documents in batches of 100

### PERF-002: Directory Service Complex Queries

- Problem: `directory.service.ts` is 889 lines with multiple large `findMany()` operations
- Files: `apps/api/src/modules/directory/directory.service.ts`
- Cause: CSV import, group management, and bulk operations load full result sets
- Improvement path: Add pagination to all list operations, use `$transaction` with batched inserts for imports

## Fragile Areas

### Organization Hierarchy Components

- Files: `apps/web/src/pages/organization/OrganizationCanvas.tsx` (1886 lines), `OrganizationPage.tsx` (1828 lines)
- Why fragile: Extremely large components handling multi-tier hierarchy visualization with drag-and-drop, tree operations, and complex state management in a single file
- Safe modification: Extract tree node components, hierarchy operations, and canvas rendering into separate modules. Add integration tests for tree CRUD operations.
- Test coverage: `OrganizationCanvas.test.tsx`, `OrganizationHierarchy.test.tsx` exist but may not cover all edge cases for such large components

### Network Service

- Files: `apps/api/src/modules/network/network.service.ts` (891 lines)
- Why fragile: Large service handling VLANs, subnets, IP addresses, and credentials with complex CIDR calculations
- Safe modification: Consider splitting into `VlanService`, `SubnetService`, `IpAddressService`
- Test coverage: `network.service.spec.ts`, `network-adversarial.spec.ts`, `credential-vault.service.spec.ts` — adequate

## Scaling Limits

### PostgreSQL Single Instance

- Current capacity: Single PostgreSQL 17 instance handling all 28 models
- Limit: Connection pool exhaustion under high concurrent load; no read replicas
- Scaling path: Configure PgBouncer connection pooling, add read replicas for report queries

### Redis Single Instance Fallback

- Current capacity: Single Redis 8 instance; in-memory fallback when unavailable
- Limit: Memory fallback is per-process, not shared across instances
- Scaling path: Redis Sentinel or Redis Cluster for HA; remove in-memory fallback in production

### MeiliSearch Index Size

- Current capacity: Full-text search across assets, licenses, directory, network
- Limit: Index sync loads up to 1000 records per entity
- Scaling path: Implement incremental indexing via change detection, cursor pagination

## Dependencies at Risk

No dependencies at critical risk. All major dependencies are on latest stable channels:
- NestJS 11.x — Active LTS
- React 19.x — Latest stable
- Prisma 7.x — Latest stable
- Ant Design 6.x — Latest stable
- TypeScript 7.x — Latest stable (per AGENTS.md zero-downgrade policy)
- Vitest 5.x — Latest stable

## Missing Critical Features

### SeaweedFS Integration Incomplete

- Problem: SeaweedFS containers are defined in Docker Compose but API integration is minimal — only a backup path reference
- Files: `apps/api/src/modules/settings/settings.service.ts:158`
- Blocks: File upload/download for assets, documents, profile pictures

### BullMQ Queue Not Active

- Problem: `bullmq` and `@nestjs/bullmq` are declared as dependencies but no active queue processors or producers found
- Files: `apps/api/package.json` (dependency listed)
- Blocks: Background job processing for heavy operations (report generation, bulk imports)

## Test Coverage Gaps

### Frontend Page Tests

- What's not tested: Several page components with complex interactions lack comprehensive tests
- Files: `apps/web/src/pages/organization/OrganizationPage.tsx`, `apps/web/src/pages/settings/SettingsPage.tsx`
- Risk: Large refactors could break UI without catching regressions
- Priority: Medium

### API Reports Service

- What's not tested: Report generation logic uses in-memory aggregations
- Files: `apps/api/src/modules/reports/reports.service.ts`
- Risk: Aggregation bugs could produce incorrect financial/operational reports
- Priority: High — reports service has `reports.service.spec.ts` but should verify aggregation accuracy

### Shared Package Validators

- What's not tested: Not all validators have test coverage — only 4 of 12 validators have tests
- Files: Missing tests for `asset.validator.ts`, `auth.validator.ts`, `license.validator.ts`, `pagination.validator.ts`, `user.validator.ts`, `organization.validator.ts`, `directory.validator.ts`, `inventory.validator.ts`
- Risk: Schema validation bugs could allow invalid data through
- Priority: Medium

---

*Concerns audit: 2026-09-11*

---
last_mapped_commit: d6702648267dbb1627c0df43c5a7322fec3983db
last_mapped_at: 2026-09-17
---
# Codebase Concerns

**Analysis Date:** 2026-09-17

## Tech Debt

**Test Suite Typing (`any` Usage):**

- Issue: Numerous instances of `any` used for mocking `PrismaClient` and other services in E2E tests, violating the monorepo's strict typing invariants.
- Files: `apps/api/test/e2e/m1-db-perf-adversarial.spec.ts`, `apps/api/test/e2e/m2-challenger2-adversarial.spec.ts`
- Impact: Weakens type safety during test refactoring; Prisma API schema changes won't be caught by TypeScript in the test suites.
- Fix approach: Replace `any` with `mockDeep<PrismaClient>()` from `vitest-mock-extended` or define proper minimal interface types.

## Known Bugs

**Silent Truncation in Analytics/Aggregations:**

- Symptoms: `getStats` calculates incorrect total spend when >100 licenses exist, if the raw SQL query fails (it silently falls back to a bounded `take: 100` query).
- Files: `apps/api/src/modules/licenses/licenses.service.ts`
- Trigger: Database raw query fails and more than 100 licenses exist.
- Workaround: Ensure DB user has permissions for `$queryRaw`.

**Silent Truncation in Spatial Resolution:**

- Symptoms: `resolveDescendantLocationIds` fails to resolve descendant locations deeper/beyond 100 nodes if the raw SQL recursive CTE fails, silently returning an incomplete list.
- Files: `apps/api/src/modules/organization/location-tree.util.ts`
- Trigger: Exceed 100 locations in the DB while `$queryRaw` CTE is unavailable or fails.
- Workaround: Remove the arbitrary `take: 100` in the fallback or rely solely on the CTE.

## Security Considerations

**Cryptographic Key Reuse:**

- Risk: `getLicenseEncryptionKey` falls back to using `AUDIT_SIGNING_KEY` or `JWT_SECRET` if `LICENSE_ENCRYPTION_KEY` is not set. This violates cryptographic hygiene by reusing token-signing keys for AES-256-GCM data encryption.
- Files: `apps/api/src/common/crypto/license-crypto.ts`
- Current mitigation: A fallback exists to prevent crashes, but it weakens overall security.
- Recommendations: Enforce `LICENSE_ENCRYPTION_KEY` as a strictly required environment variable in `apps/api/src/config/app.config.ts` (especially in production) and remove the fallback.

**Decrypted License Keys Exposed in Standard API Responses:**

- Risk: `findAll` and `findOne` return `licenseKey: decryptedKey` in plaintext in the JSON response payload. Anyone with read access to the dashboard can exfiltrate all plaintext software license keys.
- Files: `apps/api/src/modules/licenses/licenses.service.ts`
- Current mitigation: A `maskedKey` is provided, but the plaintext key is still sent alongside it.
- Recommendations: Omit `licenseKey` from standard API responses and only provide `maskedKey`. Create a privileged endpoint for revealing the plaintext key that logs an audit event.

## Performance Bottlenecks

**In-Memory Tree BFS Fallback:**

- Problem: The fallback mechanism in `resolveDescendantLocationIds` loads records into Node.js memory and performs a Breadth-First Search.
- Files: `apps/api/src/modules/organization/location-tree.util.ts`
- Cause: If the Postgres `$queryRaw` CTE fails, it reverts to application-side logic.
- Improvement path: Ensure the recursive CTE is robust and remove the fallback from production code, or use a proper closure table/materialized path in Prisma.

## Fragile Areas

**Raw SQL queries with silent catch blocks:**

- Files: `apps/api/src/modules/organization/location-tree.util.ts`, `apps/api/src/modules/licenses/licenses.service.ts`
- Why fragile: Catching `_error: unknown` and silently proceeding to a bounded fallback masks critical database errors (such as schema changes, syntax errors in SQL, or permission issues).
- Safe modification: Log the error robustly and fail the request, or utilize Prisma's native `aggregate` where possible to avoid raw SQL.
- Test coverage: Missing integration tests verifying the failure states of `$queryRaw`.

## Scaling Limits

**Hard-Coded `take: 100` Limits on Reference Data APIs:**

- Current capacity: 100 items per API.
- Limit: API lists for vendors and categories are hard-capped at 100 in `getCategories()` and `findAllVendors()`. If a company has 101 vendors, the 101st will never appear in UI dropdowns.
- Scaling path: Implement proper cursor-based or offset pagination, or use an async search/autocomplete endpoint in the UI rather than fetching all categories/vendors.

## Dependencies at Risk

**Missing Frontend Module Resolution Sync:**

- Risk: `PROJECT.md` notes the backend was updated to `NodeNext` module resolution, but there's no mention of matching updates for shared packages.
- Impact: Potential inconsistencies in how imports are resolved between Vite/React and NestJS.
- Migration plan: Audit and align `tsconfig.json` across all workspaces.

## Missing Critical Features

**Hard-Coded Default Status in License Assignment:**

- Problem: When an asset is assigned, the state machine defaults to specific statuses, but there's no UI/API way to override it safely without a separate update call.
- Blocks: Prevents atomic assignment + status setting (e.g. assigning a broken machine for maintenance).

## Test Coverage Gaps

**Raw SQL Fallback Logic:**

- What's not tested: The fallback logic when `$queryRaw` throws in production environments.
- Files: `apps/api/src/modules/organization/location-tree.util.ts`
- Risk: Since the fallback truncates to 100 items, unexpected failure of the CTE in a large environment will lead to silent data corruption in spatial queries.
- Priority: High

---

*Concerns audit: 2026-09-17*

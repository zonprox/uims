# Codebase Concerns

**Analysis Date:** 2026-09-10

## Tech Debt
**Large UI Components:**
- Issue: Several React pages are massive (>1,000 lines), making them difficult to maintain, test, and prone to complex state management issues.
- Files: 
  - `apps/web/src/pages/organization/OrganizationCanvas.tsx` (1793 lines)
  - `apps/web/src/pages/organization/OrganizationPage.tsx` (1527 lines)
  - `apps/web/src/pages/settings/SettingsPage.tsx` (1423 lines)
  - `apps/web/src/pages/dashboard/DashboardPage.tsx` (1256 lines)
- Impact: Increased cognitive load, higher risk of merge conflicts, and harder to debug React concurrent rendering issues.
- Fix approach: Refactor these monolithic pages into smaller, single-responsibility components and extract business logic into custom hooks.

**Silent Catch Blocks (Backend):**
- Issue: Empty catch blocks masking caching failures.
- Files: 
  - `apps/api/src/modules/roles/roles.service.ts`
- Impact: Redis deletion failures are silently swallowed, potentially leaving stale permissions cache which is a security risk.
- Fix approach: Log the error with `this.logger.error()` instead of swallowing it.

## Known Bugs
**Camera Permission Denials Silently Failing:**
- Symptoms: Asset scanner video feed fails to initialize with no UI feedback when the camera is blocked or unavailable.
- Files: 
  - `apps/web/src/pages/assets/components/AssetScannerModal.tsx`
  - `apps/web/src/pages/assets/utils/qrDecoder.ts`
- Trigger: Launch the scanner modal on a device where camera permissions are denied or hardware is in use.
- Workaround: Manually verify browser permissions.
- Fix: Replace `.catch(() => {})` with a proper `notification.error()` or `message.error()` using `App.useApp()` to alert the user.

## Security Considerations
**Hardcoded Initialization Passwords:**
- Risk: Potential hardcoded passwords or predictable passwords in test scripts and import scripts could leak or be reused.
- Files: 
  - `apps/api/prisma/scripts/import-network-excel.ts`
- Current mitigation: Noticed during batch imports, potentially storing plaintext or weakly generated passwords during network setup.
- Recommendations: Ensure all imported users and devices receive cryptographically secure passwords and enforce a mandatory password change on first login per `AGENTS.md`.

## Performance Bottlenecks
**Unbounded Database Queries (N+1 Risk):**
- Problem: Multiple `findMany()` queries execute without a `take` ceiling or pagination.
- Files: 
  - `apps/api/src/modules/notifications/scheduled-alerts.worker.ts`
  - `apps/api/src/modules/inventory/inventory.service.ts`
  - `apps/api/src/modules/assets/assets.service.ts`
  - `apps/api/src/modules/directory/directory.service.ts`
- Cause: Background workers fetching all expiring licenses and assets into Node.js memory instead of batching.
- Improvement path: Enforce chunked cursor pagination or a strict `take: 100` ceiling inside these workers as mandated by `AGENTS.md`.

## Fragile Areas
**Frontend Error Handling:**
- Files: 
  - `apps/web/src/components/ErrorBoundary.tsx`
  - `apps/web/src/pages/settings/SettingsPage.tsx`
  - `apps/web/src/pages/organization/OrganizationCanvas.tsx`
- Why fragile: Catching API initialization or UI errors and either swallowing them (`.catch(() => {})`) or using forbidden raw `console.error` (violates `AGENTS.md` structured logging rules).
- Safe modification: Refactor to exclusively use `App.useApp()` from Ant Design to bubble up user-facing feedback and remove `console.error`.
- Test coverage: Settings initialization and Organization canvas setup lack negative path coverage.

## Scaling Limits
**In-Memory Cron Workers:**
- Current capacity: Works fine for hundreds of assets/licenses.
- Limit: Will cause OOM (Out of Memory) crashes when scaling to 10,000+ assets because `scheduled-alerts.worker.ts` uses unbounded `findMany()`.
- Scaling path: Transition worker logic to Prisma chunked iterations or move expiration checks to bulk PostgreSQL `UPDATE` / `$executeRaw` queries.

## Dependencies at Risk
**Any Type Usage (Type Safety Degradation):**
- Risk: `any` type is leaking into the codebase despite strict project rules.
- Files:
  - `apps/web/src/pages/assets/utils/printAssetLabel.ts`
- Impact: Defeats TypeScript compiler checks, increasing runtime crash risks during refactoring.
- Migration plan: Refactor generic types or use `unknown` with runtime Zod validation.

## Missing Critical Features
**Comprehensive API Input Validation Coverage:**
- Problem: Not all settings and configuration endpoints guarantee runtime data safety, especially those backed by empty catch fallbacks (e.g. `SettingsPage.tsx`).
- Blocks: Prevents robust zero-trust validation between the React SPA and NestJS API.

## Test Coverage Gaps
**Background Workers:**
- What's not tested: The `scheduled-alerts.worker.ts` which handles critical notification logic.
- Files: `apps/api/src/modules/notifications/scheduled-alerts.worker.ts`
- Risk: Changes to alert schemas or database structures might break notification dispatch without CI failing.
- Priority: High

---
*Concerns audit: 2026-09-10*

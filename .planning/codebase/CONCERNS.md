# Codebase Concerns

**Analysis Date:** 2026-08-15

## Tech Debt

**Error Handling Gaps:**
- Issue: Empty catch blocks silently swallowing errors without fallback or logging
- Files: `apps/web/src/pages/settings/SettingsPage.tsx`, `apps/web/src/pages/organization/OrganizationCanvas.tsx`
- Impact: Unhandled promises fail silently without feedback to the user or logging, making debugging difficult.
- Fix approach: Replace empty catches with appropriate error logging, metric capturing, or UI notification toasts.

**Hardcoded KPI Metrics and Fallbacks:**
- Issue: Static fallback strings and mocked percentages for KPIs (e.g. `+8.4% MoM` growth, `98.4%` SOC2 score, `83.6%` IP percent)
- Files: `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/modules/audit/audit.service.ts`
- Impact: Users will see static, misleading statistics when the calculation should rely on actual historical data or return 0.
- Fix approach: Implement real aggregate queries for month-over-month growth or remove the mocked percentages entirely.

## Known Bugs

**Audit Log CSV Export Truncation:**
- Symptoms: Exporting audit logs via CSV silently drops all logs older than the latest 1000 entries.
- Files: `apps/api/src/modules/audit/audit.service.ts`
- Trigger: A system with more than 1000 logs attempts to export a full historical CSV via `exportCsv()`.
- Workaround: None via the UI.

## Security Considerations

**Hardcoded Fallback Credentials:**
- Risk: Critical security backdoor. The authentication service logic manually allows access using `admin123` and `Admin@2026` passwords for specific pre-defined usernames/emails (e.g., `admin@uims.local`, `alex.johnson`), completely bypassing actual database password verification.
- Files: `apps/api/src/modules/auth/auth.service.ts`, `apps/web/src/pages/auth/LoginPage.tsx`
- Current mitigation: None. The backend logic hardcodes these strings in production.
- Recommendations: Completely remove the static fallback password check in the authentication flow. Use database seeding for demo accounts and authenticate strictly against actual database hashes.

## Performance Bottlenecks

**Meilisearch Sync Unbounded Memory Query:**
- Problem: The search sync function fetches the entirety of multiple tables (`Asset`, `License`, `User`) into memory concurrently.
- Files: `apps/api/src/modules/search/search.service.ts`
- Cause: Uses `findMany()` with no filters, limits, or cursor-based chunking.
- Improvement path: Implement chunking/pagination (e.g., pulling in batches of 1000) or streaming cursors to prevent V8 out-of-memory errors on large datasets.

## Fragile Areas

**Organization Canvas Component:**
- Files: `apps/web/src/pages/organization/OrganizationCanvas.tsx`
- Why fragile: Extremely large component (1724 lines) managing over 13 `useState` hooks natively handling zooming, dragging, nodes, and complex tree operations in a single file.
- Safe modification: Heavy refactoring required to extract sub-components (NodeItem, ZoomControls) and move state to a dedicated React context or Zustand store.
- Test coverage: High complexity paired with limited tests makes it extremely prone to regressions.

## Scaling Limits

**Export/Query Batch Sizes:**
- Current capacity: System assumes total counts under a few thousand for synchronous exports and Meilisearch sync operations.
- Limit: Memory limits will be hit at around 50k-100k rows, slowing down the Node Event Loop or crashing it.
- Scaling path: Introduce asynchronous background jobs (e.g., using BullMQ, which is already a dependency in `package.json`) for massive CSV exports and search indexing, and return progress polling tokens to the client.

## Dependencies at Risk

**Audit Dependencies:**
- Risk: While no overtly critical vulnerabilities are immediately exploitable without a deeper audit, several dependencies are set to bleeding-edge versions.
- Impact: Unexpected library behaviors with undocumented breaking changes.
- Migration plan: Run routine `pnpm audit` and ensure exact version pinning for production stability.

## Missing Critical Features

**Audit Logging Historical Queries:**
- Problem: The audit log export is hard-capped at 1000 records. There is no date range filtering mechanism in the export controller.
- Blocks: Prevents SOC2 compliance workflows which require unrestricted querying and extraction of historical audit data for arbitrary time periods.

## Test Coverage Gaps

**Untested UI Components:**
- What's not tested: Core operational pages (e.g., Users, Inventory, Dashboard, Settings). The web app contains over 250 code files but only a handful of test files (~34 for the whole monorepo).
- Files: `apps/web/src/pages/users/UsersPage.tsx`, `apps/web/src/pages/inventory/InventoryPage.tsx`
- Risk: High risk of regressions in critical administrative interfaces since manual testing is required for every PR.
- Priority: High

---

*Concerns audit: 2026-08-15*

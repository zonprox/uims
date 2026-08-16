# Codebase Concerns

**Analysis Date:** 2026-08-16

## Tech Debt

**Dashboard Mock Data:**
- Issue: Hardcoded fallback data is used in the dashboard API response when no real alerts exist, masking the actual empty state.
- Files: `apps/api/src/modules/dashboard/dashboard.service.ts`
- Impact: Users will see fake warnings (e.g., "Adobe Creative Cloud... expires soon" or "Wireless Mouse... at 2 units") that look real, leading to confusion.
- Fix approach: Remove the ternary fallback data in `actionItems`. Send an empty array if there are no real low stock items or expiring licenses.

**Fake Health Telemetry:**
- Issue: System health metrics like latency and available storage are hardcoded.
- Files: `apps/api/src/modules/settings/settings.service.ts`
- Impact: System operators cannot rely on the dashboard telemetry (e.g. `latency: '0.8ms'`) to diagnose actual infrastructure problems.
- Fix approach: Implement real metrics collection (e.g., executing `SELECT 1` with a timer for Postgres latency).

## Known Bugs

**AD Password Plaintext Storage:**
- Symptoms: When an admin resets a user's password, the new password is saved in plaintext to the `adInitialPassword` field.
- Files: `apps/api/src/modules/users/users.service.ts`
- Trigger: Calling the `resetPassword` function.
- Workaround: None. This exposes user passwords if the database is compromised.

## Security Considerations

**Hardcoded Backdoor Credentials:**
- Risk: Critical security vulnerability. The authentication service contains static fallback passwords (`Admin@2026`, `password123`, `admin`, `admin123`) for specific user accounts (e.g. `admin@uims.local`, `sarah.chen@company.com`, `david.kim@company.com`).
- Files: `apps/api/src/modules/auth/auth.service.ts`
- Current mitigation: None. Anyone who discovers these credentials can log in as an administrator.
- Recommendations: Remove the static backdoor checks from the `validateUser` method immediately. Rely purely on bcrypt password hashing.

**Plaintext Initial Passwords:**
- Risk: `adInitialPassword` allows login using plaintext password comparisons in the authentication service.
- Files: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/users/users.service.ts`
- Current mitigation: None.
- Recommendations: Ensure all passwords, including initial ones, are salted and hashed.

## Performance Bottlenecks

**Dashboard Overview Aggregations:**
- Problem: The dashboard overview endpoint executes 13 heavy database queries and aggregations concurrently for every request.
- Files: `apps/api/src/modules/dashboard/dashboard.service.ts`
- Cause: Uses `Promise.all` with multiple `count()`, `aggregate()`, and `findMany()` calls on large tables (Assets, Inventory, AuditLogs) without caching.
- Improvement path: Implement Redis caching for the dashboard overview results, updating them asynchronously or expiring them every few minutes.

## Fragile Areas

**Authentication Logic:**
- Files: `apps/api/src/modules/auth/auth.service.ts`
- Why fragile: Contains multiple different flows for authentication (hashed, AD initial plaintext, static backdoor list) combined in a single linear function, making it error-prone during refactoring.
- Safe modification: Write unit tests covering standard login failures before removing the static passwords.
- Test coverage: Gaps in testing negative paths without the mock data.

## Scaling Limits

**Dashboard API Rate:**
- Current capacity: Fast on small datasets, but `count()` queries on large Postgres tables scan many rows.
- Limit: As audit logs and assets grow to hundreds of thousands of records, the unindexed dashboard aggregations will slow down page loads.
- Scaling path: Introduce materialized views or background cron jobs to compute KPI statistics.

## Dependencies at Risk

**Duplicated Validation Libraries:**
- Risk: Both `zod` and `class-validator` are used across the backend and frontend.
- Impact: Increased bundle size and scattered validation logic standards.
- Migration plan: Standardize on `zod` and use `nestjs-zod` for the API, phasing out `class-validator`.

## Missing Critical Features

**Database Backup Execution:**
- Problem: The "Run Backup" action generates a fake snapshot name and writes a success log without actually exporting any data.
- Blocks: System recovery in case of catastrophic data loss.
- Files: `apps/api/src/modules/settings/settings.service.ts` (see `runBackup()`)

## Test Coverage Gaps

**Frontend Components:**
- What's not tested: Complex UI state in the Dashboard and Inventory pages.
- Files: `apps/web/src/pages/dashboard/DashboardPage.tsx`
- Risk: Hardcoded alerts (like "Scheduled Hardware Fleet Audit") or layout issues may go unnoticed.
- Priority: Medium

---

*Concerns audit: 2026-08-16*
<!-- refreshed: 2026-08-16 -->

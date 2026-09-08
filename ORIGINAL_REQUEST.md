# Original User Request

## Initial Request — 2026-08-20T09:26:00Z

Implement an enterprise-grade, comprehensive Error Boundary and resilience system for the UIMS web application following React Router best practices, Ant Design v6 guidelines, and full error recovery workflows.

Requirements:
1. R1. Comprehensive Route Error Boundary Architecture: Provide a robust RouteErrorBoundary component integrated into the React Router configuration at root and layout levels. Handle different HTTP/Route error status codes (401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Server/Application Error) and unhandled runtime JS exceptions with clean, accessible Ant Design v6 <Result> layouts.
2. R2. Global Application Error Boundary & Error Telemetry Fallbacks: Implement a top-level React Error Boundary wrapping the root app container to catch rendering errors outside router contexts, provide graceful error recovery (page reload, state reset, session refresh), and include collapsible sanitized diagnostic information with 1-click error copying.
3. R3. Enterprise UI/UX & Resilient User Recovery Actions: Ensure all error views provide clear, verb-first recovery actions (e.g. "Reload Page", "Return to Dashboard", "Sign In Again"), seamless dark/light theme integration via App.useApp(), zero redundant prefixes, and 100% compliant Enterprise English copy.

Acceptance Criteria:
- React Router default developer error screen ('Hey developer...') is replaced with custom RouteErrorBoundary on all routes.
- 404 Not Found errors display a dedicated, styled 404 Result page with navigation back to the dashboard.
- 401/403 Authentication/Authorization errors guide the user to sign in or request access.
- 500 / Runtime exceptions render a graceful error UI with action buttons to reload the page or return home, preventing white-screen crashes.
- Collapsible diagnostic details panel allows copying error stack/message for support without cluttering the main UI.
- Dedicated unit and integration tests (pnpm --filter @uims/web test) verify error boundary rendering, status code handling, and recovery action handlers.
- Monorepo typecheck and build (pnpm typecheck and pnpm build) pass with 0 errors.
- All UI strings adhere strictly to AGENTS.md Enterprise English standards.

## 2026-09-08T02:23:15Z

Refactor the UIMS monorepo to resolve all critical security vulnerabilities, architectural concerns, and technical debt identified in `.planning/codebase/CONCERNS.md`, pump all dependencies to their latest compatible versions without downgrades, establish authoritative behavioral guidelines in `GEMINI.md`, and verify green CI build status on `origin/main`.

Working directory: /home/user/projects/uims
Integrity mode: development

## Requirements

### R1. Code Refactoring & Issue Resolution
Resolve all issues identified in `.planning/codebase/CONCERNS.md`:
- Eliminate hardcoded database credentials in `apps/api/src/database/prisma.service.ts`, enforcing strict environment variable configuration.
- Remove fallback default secrets for JWT and audit HMAC in `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.module.ts`, and `apps/api/src/common/interceptors/audit.interceptor.ts`. Fail fast at startup if secrets are unset.
- Tighten CORS policy in `apps/api/src/main.ts` to strictly validate against an allowed origin list rather than wildcard or non-production bypasses.
- Prevent unverified privilege escalation fallback to 'Employee' in `apps/api/src/modules/auth/auth.service.ts`.
- Remove or securely handle the sensitive `adInitialPassword` field in `apps/api/prisma/schema.prisma`.
- Implement bounded limits or pagination (`skip`/`take`) on unbounded database queries in `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/licenses/licenses.service.ts`, and `apps/api/src/modules/organization/organization.service.ts`.
- Add missing performance indexes to `apps/api/prisma/schema.prisma` (`DirectoryGroup.name`, `ReportSchedule`).
- Replace raw `console.log` statements in Prisma seeders (`apps/api/prisma/seed.ts`, `apps/api/prisma/seeders/organization.seeder.ts`) with structured NestJS `Logger`.
- Eliminate `any` and `as any` type assertions in `apps/api/src/modules/notifications/e2e-adversarial.spec.ts`, replacing them with strict types and `vi.mocked()`.
- Extract client IP extraction logic from `AuthController` into a reusable `@ClientIP()` custom parameter decorator.

### R2. Monorepo Dependency Management
Upgrade all monorepo dependencies across the root, `apps/api`, `apps/web`, and shared packages (`packages/*`) to their absolute latest compatible versions.
- Strict constraint: Under no circumstances may any dependency be downgraded, even if lower versions are referenced in historical notes or `CONCERNS.md`.
- Ensure all breaking changes or API shifts introduced by updated dependencies are cleanly resolved.

### R3. Architectural Documentation & Defect Prevention
Create and establish `@GEMINI.md` in the project root:
- Define comprehensive agent behavioral contracts, coding standards, strict type safety standards (zero `any`, typed catch blocks, no compiler diagnostics suppressions).
- Specify explicit rules on credential management, query pagination, database indexing, and logger usage to prevent recurring defects.

### R4. Remote Push & CI Pipeline Verification
- Commit all changes adhering to conventional commit format.
- Push the commits to `origin/main`.
- Monitor remote CI pipeline executions via `gh` CLI and iteratively resolve any failures until all checks pass green.

## Acceptance Criteria

### Security & Architecture
- [ ] No hardcoded database credentials, JWT secrets, or HMAC keys exist in source files.
- [ ] Unbounded database queries in identified service files now enforce bounded limits or pagination.
- [ ] Prisma schema includes missing indexes and sanitized sensitive fields; Prisma client builds cleanly.
- [ ] Reusable `@ClientIP()` parameter decorator replaces manual IP extraction in `AuthController`.

### Code Quality & Dependencies
- [ ] Zero occurrences of `as any` or loose `any` in `e2e-adversarial.spec.ts`.
- [ ] Seeders use NestJS `Logger` rather than raw `console.log`.
- [ ] Zero dependencies downgraded; lockfile (`pnpm-lock.yaml`) cleanly updated to latest compatible package versions.
- [ ] Root `GEMINI.md` created with clear rules preventing recurrence of identified debt.

### Verification & CI
- [ ] `pnpm run typecheck` completes with 0 errors across all 6 packages.
- [ ] `pnpm run lint` and `pnpm run format:check` pass cleanly.
- [ ] `pnpm run test` passes 100% of test suites monorepo-wide.
- [ ] `pnpm run build` succeeds across all workspaces.
- [ ] Commits pushed to `origin/main` and remote CI pipeline reports green status.


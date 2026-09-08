# Codebase Concerns & Technical Debt
**Analysis Date:** 2026-09-08

## Critical Issues
- **Hardcoded Database Credentials**: `apps/api/src/database/prisma.service.ts` (L15) contains a hardcoded connection string with a password: `'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public'`.
- **Hardcoded JWT Refresh Secret**: `apps/api/src/modules/auth/auth.service.ts` (L149) falls back to a hardcoded secret `'uims-refresh-secret-2026'`.
- **Hardcoded Audit Tamper-Evident Key**: `apps/api/src/common/interceptors/audit.interceptor.ts` (L75) falls back to `'uims-audit-tamper-evident-hmac-2026'`.
- **JWT Default Secret**: `apps/api/src/modules/auth/auth.module.ts` (L17) falls back to `'secret'` for `JWT_SECRET`.

## Security Concerns
### Authentication & Authorization
- **CORS Misconfiguration**: `apps/api/src/main.ts` (L48-49) allows `allowedOrigins.includes('*')` and blindly accepts any origin when `process.env.NODE_ENV !== 'production'`.
- **Excessive Privilege Fallback**: `apps/api/src/modules/auth/auth.service.ts` (L130) assigns the 'Employee' role automatically if `user.roleName` is not set, which could grant access to unverified AD users or incomplete profiles.

### Data Protection
- **Sensitive Fields in Prisma Schema**: The `User` model in `apps/api/prisma/schema.prisma` contains `passwordHash` (L68) and `adInitialPassword` (L91). While `passwordHash` is expected, `adInitialPassword` represents a security risk as it may be stored in plain text.

### Input Validation
- **Global Pipes**: Proper input validation is configured in `apps/api/src/main.ts` (L65-71) via `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`, which is secure.
- **Raw Queries**: `apps/api/src/modules/health/health.controller.ts` (L25) and `apps/api/src/modules/settings/settings.service.ts` (L168) use `$queryRaw\`SELECT 1\`` which are safe since they do not take external input, but usage of `$queryRaw` elsewhere should be monitored.

## Technical Debt
### Code Quality
- **Heavy reliance on Console Logs**: Seeders heavily use `console.log` for execution tracing, such as `apps/api/prisma/seed.ts` (L22-93) and `apps/api/prisma/seeders/organization.seeder.ts` (L4). Consider using the NestJS `Logger`.

### TODO/FIXME Items
- The source files do not contain explicitly marked `TODO` or `FIXME` comments in the codebase, apart from documentation and lockfiles.

### Type Safety
- **Extensive use of `any` in Test Files**: The adversarial testing suite in `apps/api/src/modules/notifications/e2e-adversarial.spec.ts` heavily abuses the `any` type for mocking (L9-11) and type assertions `as any` (L333-353).

## Performance Concerns
### Database
- **Unbounded Queries**: Several modules use `findMany` without pagination or `take` limits, which can cause significant memory and performance issues as the database grows:
  - `apps/api/src/modules/users/users.service.ts` (L836)
  - `apps/api/src/modules/assets/assets.service.ts` (L142)
  - `apps/api/src/modules/licenses/licenses.service.ts` (L81)
  - `apps/api/src/modules/organization/organization.service.ts` (L37, 132, 221)
- **Missing Indexes**: `apps/api/prisma/schema.prisma` lacks performance-critical indexes on frequently accessed models, such as `DirectoryGroup` (missing index on `name`), and `ReportSchedule`.

### Frontend
- No significant frontend performance defects (e.g. missing memoization) were identified in this sweep.

## Architecture Concerns
- **Controller Logic**: `apps/api/src/modules/auth/auth.controller.ts` contains IP parsing logic (L30-35) that would be better suited for a custom decorator or middleware to keep controllers strictly focused on request routing.

## Dependency Concerns
- **Outdated / Modern Tooling**: Both backend and frontend are using modern, up-to-date dependencies (e.g., `nestjs 11.2.1`, `react 19.2.8`, `zod 4.4.3`). No legacy or deprecated core framework versions were found.

## Recommendations
### Critical (Fix Immediately)
- Remove hardcoded credentials (`uims_secret_2026`) from `apps/api/src/database/prisma.service.ts` and require it to strictly read from environment variables.
- Remove fallback default secrets for JWT and Audit signing in `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/common/interceptors/audit.interceptor.ts`, and `apps/api/src/modules/auth/auth.module.ts`. Let the app fail to start if secrets are missing.

### High (Fix Soon)
- Apply pagination (skip/take) or cursor-based fetching for unbounded `findMany()` queries across `assets.service.ts`, `users.service.ts`, and `organization.service.ts`.
- Investigate and remove the `adInitialPassword` field from the Prisma schema. If required for Active Directory provisioning, it should be strictly encrypted or transient, not stored.

### Medium (Plan for Next Sprint)
- Tighten CORS policy in `apps/api/src/main.ts` to strictly validate against an allowed origin list rather than a wildcard or non-production bypass.
- Replace `console.log` statements in Prisma seeders with a proper logger instance.

### Low (Nice to Have)
- Extract the IP resolution logic from `AuthController` into a reusable `@ClientIP()` custom decorator.
- Refactor the `e2e-adversarial.spec.ts` test to use proper typing and `vi.mocked()` instead of relying on `any`.

# Analysis Date: 2026-08-20

## Critical Issues
- **CORS Misconfiguration**: In `apps/api/src/main.ts` (L43-L53), the CORS configuration checks if `process.env.NODE_ENV !== 'production'` and allows ALL origins, bypassing the `allowedOrigins` list. In insecure deployments, this allows arbitrary origins.
- **Hardcoded Database Credentials**: Hardcoded database URL with credentials (`postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public`) is present in `apps/api/prisma.config.ts` (L13), `apps/api/prisma/seed.ts` (L17), and `apps/api/src/database/prisma.service.ts` (L15).
- **Default/Hardcoded Passwords**: 
  - `Admin@2026` and `password123` are hardcoded in `apps/api/prisma/seeders/roles-users.seeder.ts` (L6-L7).
  - In `apps/api/src/modules/users/users.service.ts` (L74), an initial default password is set predictably as `Ad#${username}2026!`.

## Technical Debt
- **Outdated Dependencies**: 
  - `@biomejs/biome (dev)` is at 2.5.8 but 2.5.9 is available.
  - `turbo (dev)` is at 2.10.10 but 2.10.11 is available.

## Security Concerns
- **Hardcoded Signing Keys**: In `apps/api/src/common/interceptors/audit.interceptor.ts` (L75), there is a fallback signing key: `uims-audit-tamper-evident-hmac-2026`.
- **JWT Secrets**: In test files such as `apps/api/src/modules/auth/auth.service.spec.ts` (L32, L56, L80, L109), secrets are hardcoded (`secret123`). This is a security risk if similar practices exist in production code (needs verification for production).

## Performance Concerns
- **Missing Pagination Limits**: In `apps/api/src/modules/assets/assets.service.ts` (L138), the query parses `pageSize` to cap at 100, which is good, but without indexing on multiple search fields (`contains` queries on name, assetTag, serialNumber, model, manufacturer), this could lead to full table scans.
- **Database Query Patterns**: The `findMany` methods in services like `apps/api/src/modules/assets/assets.service.ts` and `apps/api/src/modules/audit/audit.service.ts` use insensitive searches which may be slow on large datasets without appropriate GIN/GiST indexes.

## Type Safety
- **Type Casting in Queries**: Several test files use `ReturnType<typeof vi.fn>` and `mockPrisma.auditLog.findMany.mockResolvedValue` which cast results broadly, potentially missing true schema types. More investigation needed into actual `.ts` code `as any` casting.

## Missing Features
- **Incomplete Role Fallbacks**: In `apps/api/src/common/guards/permissions.guard.ts` (L73), the comment `// 2. Fallback: Query Prisma for user's role permissions if available` suggests a potentially unimplemented or unoptimized fallback path.

## Dependency Concerns
- See Technical Debt regarding minor version updates.

## Recommendations
1. **Critical**: Remove all hardcoded credentials from codebase. Use environment variables strictly.
2. **Critical**: Fix CORS in `apps/api/src/main.ts` to strictly evaluate origin patterns rather than a broad `!== 'production'` fallback.
3. **High**: Ensure all HMAC and signing keys fallback to an error rather than a hardcoded default.
4. **Medium**: Refactor database searches to use optimized indexing or full-text search capabilities rather than multiple `contains` conditions.

---
*Analysis Date: 2026-08-20*

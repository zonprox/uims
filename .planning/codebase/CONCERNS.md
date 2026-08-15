# Codebase Concerns

**Analysis Date:** 2026-08-15

## Tech Debt
- **Massive Components**: Several React components are extremely large and violate separation of concerns. Examples include:
  - `apps/web/src/layouts/MainLayout.tsx` (1423 lines)
  - `apps/web/src/pages/assets/AssetsPage.tsx` (852 lines)
  - `apps/web/src/pages/network/NetworkPage.tsx` (711 lines)
- **Type Safety**: High usage of `any` types (over 112 instances found in `apps/api/src` and `apps/web/src`), undermining TypeScript's benefits.
- **Complex Prisma Seed**: `apps/api/prisma/seed.ts` is 2872 lines long, indicating it might be unmaintainable or testing data is tightly coupled to the DB script instead of being factory-based.

## Known Bugs
- Several minor TODOs and FIXMEs scattered across the API controllers (e.g. `jwt-auth.guard.ts`, `assets.module.ts`), suggesting incomplete implementations or authentication bypasses for development.
- `console.log` statements left in production code (found in API and web sources).

## Security Considerations
- **Error Handling**: Missing comprehensive error handling in services. For example, `apps/api/src/modules/assets/assets.service.ts` (281 lines) has only 2 `try/catch/throw` keywords, indicating that exceptions from DB queries or external calls are likely unhandled, potentially leaking stack traces or crashing processes.
- **Authentication Bypass**: Guard logic in `jwt-auth.guard.ts` contains TODOs which might imply hardcoded bypasses or incomplete role verifications.

## Performance Bottlenecks
- `MainLayout.tsx` and complex pages like `AssetsPage.tsx` likely suffer from unnecessary re-renders due to massive hook usage (16+ hooks in a single component) and inline functions.

## Fragile Areas
- **Search Module**: `apps/api/src/modules/search/search.service.ts` is fairly large (347 lines) and handles complex aggregations. Without proper testing, this area is highly fragile.

## Scaling Limits
- Heavy reliance on single massive services (`assets.service.ts`, `tickets.service.ts`) without domain-driven separation. This will become a bottleneck as the team and features grow.

## Dependencies at Risk
- Potential typescript version divergence between `apps/web` (v7.x) and `apps/api` (v5.x), complicating monorepo tooling and shared types.

## Missing Critical Features
- Robust validation on DTOs is incomplete (TODOs found in `update-asset.dto.ts`, `update-license.dto.ts`).

## Test Coverage Gaps
- **Severe Lack of Tests**: Only 24 test files found across the entire monorepo (`apps/` and `packages/`). This indicates critically low test coverage for an enterprise application (`UIMS Enterprise v2.4`). 

---
*Concerns audit: 2026-08-15*

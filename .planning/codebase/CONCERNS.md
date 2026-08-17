# Codebase Concerns
**Analysis Date:** 2026-08-17

## Tech Debt
- **Type Safety Bypass**: There are approximately 24 instances of explicit `any` casting in the `apps/web` application and API test files (e.g., `apps/api/src/modules/notifications/notifications.service.spec.ts`).
- **Excessive Logging**: Seed files (e.g., `apps/api/prisma/seed.ts`) and test scripts (`scripts/test-login.mjs`) rely heavily on `console.log`. While acceptable in scripts, this pattern must be avoided in production application logic.

## Known Bugs
- Not detected. The codebase currently reports 100% passing Playwright E2E tests.

## Security Considerations
- **Sensitive Data Storage**: The `User` model in `apps/api/prisma/schema.prisma` includes an `adInitialPassword` field. If this stores plaintext passwords, it represents a significant security vulnerability and should be hashed or handled via a secure credential distribution mechanism.
- **Hardcoded E2E Credentials**: The test script `scripts/test-login.mjs` uses hardcoded credentials (`admin@uims.internal`). These should be extracted to secure environment variables.

## Performance Bottlenecks
- **Large React Components**: `apps/web/src/pages/organization/OrganizationCanvas.tsx` is 1785 lines long, and `apps/web/src/pages/organization/OrganizationPage.tsx` is 1526 lines. These massive components are likely to suffer from render performance issues.
- **Hierarchical Data Queries**: `AssetCategory` and `Department` models in `schema.prisma` use self-referencing hierarchical relationships (`parentId`). Retrieving deep trees using standard Prisma queries can result in severe N+1 query bottlenecks.

## Fragile Areas
- **God Components**: The massive size of `OrganizationCanvas.tsx` and `OrganizationPage.tsx` indicates tight coupling and a lack of modularity, making them highly fragile and difficult to maintain.
- **Service Complexity**: `apps/api/src/modules/users/users.service.ts` is growing large (461 lines) and risks becoming a God Object if domain responsibilities are not adequately separated.

## Scaling Limits
- **Database Indexing**: As the `Asset` and `AuditLog` tables grow, the current indexing strategy in `schema.prisma` may prove insufficient for complex, multi-field filtering and aggregation.
- **Tree Structures**: Deeply nested organizational or category hierarchies will struggle to scale without implementing materialised paths or closure tables, as Prisma lacks native recursive CTE support.

## Dependencies at Risk
- Not detected. The project utilizes a modern monorepo setup with `pnpm` and standard, up-to-date dependencies (e.g., Turbo, Biome, Prisma).

## Missing Critical Features
- Not detected. No significant stubbed implementations or missing critical paths were identified.

## Test Coverage Gaps
- **Unit Testing for Complex UI**: Given the enormous size of the Organization components (`OrganizationCanvas.tsx`), there is a high probability of significant unit test coverage gaps for edge cases and state management within those specific views. E2E tests alone are insufficient for components of this complexity.

---
*Concerns audit: 2026-08-17*

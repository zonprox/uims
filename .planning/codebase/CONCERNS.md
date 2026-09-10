# Known Concerns & Technical Debt

## Security Concerns
- **Empty Catch Blocks**: Found silent catch blocks violating the Zero Silent Catch Policy in `apps/api/src/modules/licenses/licenses.service.ts` ([L141-L143](file:///home/user/projects/uims/apps/api/src/modules/licenses/licenses.service.ts#L141-L143) and [L216-L218](file:///home/user/projects/uims/apps/api/src/modules/licenses/licenses.service.ts#L216-L218)). These blocks fail to log errors or properly handle exceptions for notification events.

## Performance Concerns
- **In-Memory Aggregations**: 
  - In `apps/api/src/modules/licenses/licenses.service.ts` ([L257](file:///home/user/projects/uims/apps/api/src/modules/licenses/licenses.service.ts#L257)), `reduce()` is used to calculate `totalSpend` in-memory.
  - In `apps/api/src/modules/reports/reports.service.ts` ([L18-L20](file:///home/user/projects/uims/apps/api/src/modules/reports/reports.service.ts#L18-L20) and [L127](file:///home/user/projects/uims/apps/api/src/modules/reports/reports.service.ts#L127)), multiple `reduce()` calls compute `totalSaaS`, `totalSeats`, and `usedSeats` after loading records into memory, violating the "Zero In-Memory Aggregations" rule.
- **Unbounded/Arbitrary Pagination**: 
  - `apps/api/src/modules/licenses/licenses.service.ts` ([L250](file:///home/user/projects/uims/apps/api/src/modules/licenses/licenses.service.ts#L250)) uses an arbitrary `take: 1000` limit for fetching licenses to compute stats.
  - `apps/api/src/modules/reports/reports.service.ts` uses `take: 1000` on `findMany()` in multiple places ([L13](file:///home/user/projects/uims/apps/api/src/modules/reports/reports.service.ts#L13) and [L121](file:///home/user/projects/uims/apps/api/src/modules/reports/reports.service.ts#L121)), bypassing proper aggregation queries.
- **Missing Database Indexes**:
  - In `apps/api/prisma/schema.prisma` ([L227-L228](file:///home/user/projects/uims/apps/api/prisma/schema.prisma#L227-L228)), the `AssetCategory` model defines a `parentId` foreign key but is missing the required `@@index([parentId])` definition.

## Architectural Concerns
- **Console Output**: Found `console.error` usage in `apps/api/src/config/app.config.ts` ([L17](file:///home/user/projects/uims/apps/api/src/config/app.config.ts#L17)) during configuration parsing, bypassing the structured logger mandate.

## Technical Debt
- **Type Safety Violations**: Found an unsafe cast bypass `(tx as unknown as { user?: typeof tx.directoryUser })` in `apps/api/src/modules/licenses/licenses.service.ts` ([L161](file:///home/user/projects/uims/apps/api/src/modules/licenses/licenses.service.ts#L161)), violating the "Zero any Policy" and strict type safety invariants.

## Missing or Incomplete
- **Logging for Notifications**: Missing proper structured logging for background notifications during license updates/assignments, leading to silent failures if notifications fail.
- **Dependency Risks**: The monorepo uses `pnpm@11.21.0` but there is a strict invariant to never downgrade. Must ensure that future updates do not attempt to downgrade TypeScript 7.x or Prisma 7.x.

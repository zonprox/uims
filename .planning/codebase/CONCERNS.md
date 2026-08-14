# Codebase Concerns

**Analysis Date:** 2026-08-15

## Tech Debt

### Prisma Schema Denormalization
- **Files:** `apps/api/prisma/schema.prisma`
- **Impact:** The database schema mixes explicit string fields with relational fields, leading to data inconsistencies. For example, the `Ticket` model has both `category String?` and `categoryId String?`. The `DirectoryUser` model stores `role` as a string rather than linking to the `Role` model. The `Ticket` model also stores `requesterName` and `requesterEmail` instead of relating back to a `User` record.
- **Fix approach:** Normalize the schema. Migrate hardcoded string references to actual foreign key relationships, remove duplicated enum-like string fields, and refactor the corresponding Prisma queries to `include` relations instead.

## Security Considerations

### Missing RBAC on Mutation Endpoints
- **Files:** `apps/api/src/modules/**/*.controller.ts`
- **Impact:** Major controllers such as `AssetsController`, `InventoryController`, and others lack `@Roles` guards. This means any user with a valid authentication token can execute `POST`, `PATCH`, and `DELETE` requests on critical company assets. Even the `UsersController` only restricts `POST` and `DELETE`, leaving `PATCH` unguarded, which could allow privilege escalation.
- **Fix approach:** Conduct a full audit of all controllers. Apply granular `@Roles` or equivalent RBAC decorators to all mutation endpoints to ensure only authorized administrators can modify data.

### Insecure Token Storage
- **Files:** `apps/web/src/stores/auth.store.ts`
- **Impact:** The authentication token is persisted using Zustand's default `persist` middleware, which saves the JWT directly to `localStorage`. This makes the application highly vulnerable to Cross-Site Scripting (XSS) attacks.
- **Fix approach:** Migrate authentication mechanisms to use secure, HTTP-only, `SameSite` cookies instead of storing sensitive tokens in the browser's local storage.

## Performance Bottlenecks & Scaling Limits

### Unbounded Queries in Search Reindexing
- **Files:** `apps/api/src/modules/search/search.service.ts`
- **Impact:** The search service reindexes data into Meilisearch by calling unbounded Prisma queries such as `this.prisma.asset.findMany()` with no `take` or `skip` limits. On a moderately sized database, this will pull the entire table into Node.js memory at once, resulting in Out-Of-Memory (OOM) crashes and service downtime.
- **Fix approach:** Implement batched, cursor-based pagination (using Prisma's `cursor`) to process records in manageable chunks when syncing to the search engine.

## Fragile Areas

### Axios Interceptor Token Refresh Logic
- **Files:** `apps/web/src/services/api.ts`
- **Impact:** The custom request queueing mechanism used during token refreshes (`isRefreshing` lock, `failedQueue` array) is fragile. If the refresh request hangs or fails silently, the queued promises may never resolve or reject, leading to a stalled application state or infinite login redirect loops.
- **Fix approach:** Refactor the interceptor to use a more robust, standardized library for handling token refreshes (like `axios-auth-refresh`), or add strict timeouts and error boundary resets to the manual queue logic.

## Test Coverage Gaps

### Complete Lack of UI Component Tests
- **Files:** `apps/web/src/components/`, `apps/web/src/pages/`
- **Impact:** While the backend has some unit tests and there are Playwright E2E tests, the frontend lacks isolated unit tests. There are zero `.spec.tsx` or `.test.tsx` files for React UI components. Large, monolithic pages (like `AssetsPage.tsx`) are untested at the unit level, making refactoring highly risky.
- **Fix approach:** Introduce React Testing Library (`@testing-library/react`) alongside Vitest. Start by writing component tests for reusable components in `apps/web/src/components/`, then incrementally cover complex page layouts and user interactions.

<!-- refreshed: 2026-08-15 -->
*Analysis completed on 2026-08-15 based on repository state.*

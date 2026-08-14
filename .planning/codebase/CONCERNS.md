# Codebase Concerns

**Analysis Date:** 2026-08-14

## Tech Debt

**Frontend Mock Data / Missing Backend Integration:**
- Issue: Multiple frontend pages feature elaborate mock data instead of real API calls.
- Files: `apps/web/src/pages/tickets/TicketsPage.tsx`, `apps/web/src/pages/directory/DirectoryPage.tsx`
- Impact: Users interact with hardcoded UIs that do not save data, leading to a disconnected user experience and a false sense of completeness.
- Fix approach: Implement functional `axios` service calls matching the intended API contract, and map them to real backend controllers.

**Type Safety Bypassed in API:**
- Issue: DTOs are forcefully cast to `any` before being passed to Prisma `create` and `update` calls.
- Files: `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/licenses/licenses.service.ts`
- Impact: Bypasses Prisma's type checking, potentially inserting invalid fields or causing runtime database errors.
- Fix approach: Remove `as any` and properly map DTOs to the types expected by the Prisma client.

## Known Bugs

**Unpaginated Collection Responses:**
- Symptoms: `GET /users`, `GET /assets`, and `GET /licenses` endpoints ignore the `PaginationDto` queries and fetch all records.
- Files: `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/assets/assets.service.ts`
- Trigger: Send a request with `?limit=10&page=1` query parameters.
- Workaround: Client has to handle pagination in-memory.
- Fix approach: Destructure `take` and `skip` from `PaginationDto` and apply them to the Prisma `findMany` queries.

## Security Considerations

**Insecure Refresh Token Logic:**
- Risk: The `refresh` method in `AuthService` accepts a `user` payload and mints a new `accessToken` without actually checking an existing, valid `refreshToken` from the database or secure cookie.
- Files: `apps/api/src/modules/auth/auth.service.ts`
- Current mitigation: None.
- Recommendations: Implement proper refresh token rotation. Store refresh token hashes in the database and issue them via `HttpOnly` cookies. Validate the token before issuing a new `accessToken`.

**Hardcoded Fallback JWT Secret:**
- Risk: If `JWT_SECRET` is missing in the environment, the application falls back to `'secret'`, exposing the system to trivial token forgery in production.
- Files: `apps/api/src/modules/auth/auth.module.ts`
- Current mitigation: Relying on the deployment environment to set `JWT_SECRET`.
- Recommendations: Remove the fallback and throw a fatal configuration error if `JWT_SECRET` is missing at boot.

## Performance Bottlenecks

**Unbounded Database Queries:**
- Problem: The API does not implement pagination or limits for collection endpoints.
- Files: `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/assets/assets.service.ts`
- Cause: `this.prisma.[model].findMany()` is called without `take` or `skip`.
- Improvement path: Wire up the `PaginationDto` variables to Prisma query configurations, and return standard paginated wrappers.

## Fragile Areas

**Core Business Logic Uncovered by Tests:**
- Files: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/users/users.service.ts`
- Why fragile: Critical authentication, hashing, and user creation logic is not tested. Refactoring these services might introduce silent regressions.
- Safe modification: Write unit tests covering JWT signing, password hashing, and conflict exceptions before refactoring.
- Test coverage: Almost 0% for API services. Only a filter and a health controller have tests.

## Scaling Limits
- The database schema is fully relational on PostgreSQL. Due to unbounded queries (lack of pagination), memory exhaustion could occur at scale for endpoints returning all users or assets.
- Lack of Redis or caching for frequent reads (e.g., configurations, session validation).

## Dependencies at Risk
- Basic generic dependencies configured, but keeping track of Prisma client performance and potential connection pool exhaustion will be important as features grow.

## Missing Critical Features
- **Unimplemented Schema Entities:** The Prisma schema defines models for `Ticket`, `IPAddress`, `DirectoryUser`, `Location`, and `EmailAccount`. However, there are **no corresponding API modules** implemented for them, leaving the database completely disconnected from the functional requirements represented in the UI.

## Test Coverage Gaps
- **Backend:** Only 2 test files exist (`http-exception.filter.spec.ts` and `health.controller.spec.ts`). All critical services (Auth, Users, Assets, Licenses) lack unit and integration tests.
- **Frontend:** Only 2 test files exist (`auth.store.test.ts`, `theme.store.test.ts`). Components, Pages, and custom hooks have no test coverage.

---

*Concerns audit: 2026-08-14*

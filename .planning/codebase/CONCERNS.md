# Codebase Concerns

**Analysis Date:** 2026-08-14

## Tech Debt

**Loose Typing and `any` Usage in Backend Services:**
- Issue: Several NestJS services (e.g. `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/tickets/tickets.service.ts`, `apps/api/src/modules/email/email.service.ts`) accept `data: any` and return `any` instead of enforcing strict types from `@uims/shared-types` or DTO classes.
- Files: `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/tickets/tickets.service.ts`, `apps/api/src/modules/licenses/licenses.service.ts`.
- Why: Rapid scaffolding and initial prototyping phase.
- Impact: Compiler cannot catch property mismatches between frontend payloads and database columns at compile time.
- Fix approach: Refactor service signatures to use strictly typed DTOs and Zod validation pipes (`packages/shared-validators`).

**Implicit In-Line Status String Mapping:**
- Issue: Manual string mapping for status enums (e.g. mapping `"Active"` -> `"IN_USE"`, `"In Repair"` -> `"MAINTENANCE"`, `"In Storage"` -> `"AVAILABLE"`) is duplicated inside individual service methods.
- Files: `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/tickets/tickets.service.ts`, `apps/api/src/modules/licenses/licenses.service.ts`.
- Why: Accommodating legacy UI string labels alongside PostgreSQL Prisma enum values.
- Impact: Inconsistencies across modules and risk of runtime mapping misses when new status states are introduced.
- Fix approach: Centralize enum transformation utilities in `packages/shared-utils/src/validation.ts` or enforce direct enum usage from `@uims/shared-types`.

**Ad-Hoc Entity Creation Without Database Transactions:**
- Issue: `AssetsService.create` looks up `AssetCategory` and `Location` by name, creating them on-the-fly if missing, without wrapping the sequence in a Prisma `$transaction`.
- Files: `apps/api/src/modules/assets/assets.service.ts` (lines 8-35).
- Why: Permissive bulk import and UI ease of use.
- Impact: Concurrent asset creation with identical new category/location names can cause race conditions or duplicate record creation.
- Fix approach: Wrap category resolution, location resolution, and asset creation in `this.prisma.$transaction(...)`.

## Known Bugs

**Client-Side 401 Infinite Loop Risk on Expired Refresh Token:**
- Symptoms: If an expired refresh token request itself returns a 401 error, the Axios response interceptor might trigger multiple recursive login redirects.
- Files: `apps/web/src/services/api.ts` (lines 24-36).
- Trigger: Network failure or expired refresh token during token refresh attempt.
- Workaround: `originalRequest._retry = true` flag exists, but explicit cancellation is recommended.
- Root cause: Missing unified refresh token mutex lock to queue simultaneous 401 requests.
- Fix: Implement request queuing with a refresh token promise lock in `apps/web/src/services/api.ts`.

## Security Considerations

**JWT Token Storage in `localStorage`:**
- Risk: JWT bearer tokens stored in browser `localStorage` (`apps/web/src/stores/auth.store.ts`) are accessible via JavaScript and vulnerable to Cross-Site Scripting (XSS).
- Files: `apps/web/src/stores/auth.store.ts`, `apps/web/src/services/api.ts`.
- Current mitigation: Basic input sanitization and Ant Design XSS protection.
- Recommendations: Migrate access and refresh tokens to secure, `httpOnly`, `SameSite=Strict` cookies handled via `cookie-parser` on backend routes.

**Rate Limiting on Authentication Endpoints:**
- Risk: `POST /api/v1/auth/login` currently has basic throttler configuration that should be tightly restricted to prevent brute-force attacks.
- Files: `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/app.module.ts`.
- Current mitigation: Standard `@nestjs/throttler` defaults.
- Recommendations: Apply `@Throttle({ default: { limit: 5, ttl: 60000 } })` specifically to login and token refresh routes.

## Performance Bottlenecks

**Unbounded `findMany()` Queries in Listing Endpoints:**
- Problem: Several listing methods in backend services query tables without mandatory pagination limits (`take` / `skip`).
- Files: `apps/api/src/modules/assets/assets.service.ts` (lines 67-104), `apps/api/src/modules/licenses/licenses.service.ts`.
- Measurement: Fast with seed data (<20ms), but response payload sizes and latency will degrade with >10,000 entities.
- Cause: Missing default pagination bounds in queries when no pagination query parameters are supplied.
- Improvement path: Enforce default pagination limits (e.g. `take: query?.pageSize || 50`) and utilize `ApiPaginatedResponse` across all service find queries.

## Fragile Areas

**Custom UI Design Token & Responsive Breakpoint Synchronization:**
- Files: `apps/web/src/layouts/MainLayout.tsx`, `apps/web/src/app/theme.ts`.
- Why fragile: The application supports mobile drawer navigation, responsive table containers, dark/light themes, and custom compact spacing. Hardcoded inline breakpoint checks mixed with Ant Design `Grid.useBreakpoint()` can lead to layout shifts if theme tokens are changed.
- Safe modification: Test across mobile (375px), tablet (768px), and desktop (1440px) viewports whenever modifying layout shells or navigation bars.

## Scaling Limits

**PostgreSQL Connection Pool & Redis Memory Limit:**
- Current capacity: Single PostgreSQL instance with default connection pool and Redis configured with 256MB memory cap in `docker-compose.yml`.
- Limit: ~500 concurrent active enterprise administrators before connection pool exhaustion.
- Scaling path: Configure PgBouncer connection pooling, increase Redis LRU cache allocation, and enable Meilisearch indexing for search workloads.

## Dependencies at Risk

**TypeScript 7.0 Alpha / Experimental Options:**
- Risk: Shared packages (`packages/shared-types`, `packages/shared-validators`) build with TypeScript `^7.0.2` which triggers experimental compiler warnings during `tsdown` builds.
- Impact: Potential compiler behavior variance across minor updates.
- Migration plan: Pin TypeScript version to stable 5.9.x across all workspace packages until 7.0 reaches stable LTS.

## Missing Critical Features

**Full-Text Search Engine Integration with Meilisearch:**
- Problem: Meilisearch container is configured in Docker Compose (`docker-compose.yml`), but automatic database change event indexing to Meilisearch is not yet integrated into backend domain services.
- Blocks: Instant fuzzy global search across assets, tickets, and directory users in `CommandPalette.tsx`.
- Implementation complexity: Medium (implement Prisma middleware or BullMQ queue job to sync entity mutations to Meilisearch indices).

## Test Coverage Gaps

**Backend Domain Services Unit Tests:**
- What's not tested: Core business logic in `AssetsService`, `TicketsService`, `LicensesService`, `DirectoryService`, `NetworkService`.
- Risk: Regression bugs during refactoring or schema migrations.
- Priority: High.
- Difficulty to test: Low/Medium (write Vitest unit tests with mocked `PrismaService`).

**End-to-End Authentication and Form Validation Workflows:**
- What's not tested: Comprehensive automated Playwright UI tests for asset checkout, ticket assignment, and license allocation.
- Priority: Medium.
- Difficulty to test: Medium (requires test database seed fixture in CI environment).

---

*Concerns audit: 2026-08-14*
*Update as issues are fixed or new ones discovered*

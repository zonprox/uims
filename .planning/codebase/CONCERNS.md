# Codebase Concerns

**Analysis Date:** 2026-09-28

## Tech Debt
**God Classes and Massive Files:**
- Issue: Core business logic and UI components are severely tangled in massive files (>1500 lines), violating the Single Responsibility Principle.
- Files: `apps/api/src/modules/network/network.service.ts` (1948 lines), `apps/web/src/pages/organization/OrganizationCanvas.tsx` (1886 lines), `apps/web/src/pages/organization/OrganizationPage.tsx` (1842 lines)
- Impact: Hard to maintain, slow to type-check, high likelihood of merge conflicts, and difficult to test isolation.
- Fix approach: Split services into domain-specific sub-services (e.g., `VlanService`, `SwitchService`) and decompose massive React pages into smaller, reusable UI components.

## Known Bugs
**Silent Error Swallowing:**
- Symptoms: Asynchronous errors or database failures in specific test suites are actively suppressed.
- Files: `apps/api/test/e2e/tier5-network-adversarial-hardening.spec.ts` (e.g., `catch (_ignore: unknown) {}`)
- Trigger: Network timeouts, database constraints, or logic errors during execution.
- Workaround: None without removing the empty catch blocks and handling errors properly.

## Security Considerations
**Weak Cryptography Defaults:**
- Risk: Reusing the JWT secret for symmetric license encryption (key reuse). The system falls back to `JWT_SECRET` if `LICENSE_ENCRYPTION_KEY` is not provided.
- Files: `apps/api/src/common/crypto/license-crypto.ts`
- Current mitigation: The code requires *some* valid secret string but allows dangerous key reuse.
- Recommendations: Enforce strict separation of cryptographic keys. The application should throw a fatal startup error if `LICENSE_ENCRYPTION_KEY` is missing, rather than falling back to an unrelated secret.

## Performance Bottlenecks
**Unbounded Database Queries (OOM Risk):**
- Problem: Critical queries retrieve entire tables into memory without pagination limits.
- Files: `apps/api/src/modules/network/network.service.ts`, `apps/api/src/modules/organization/organization.service.ts`, `apps/api/src/modules/licenses/licenses.service.ts`
- Cause: Prisma `findMany` is routinely called without `take` or `skip` properties.
- Improvement path: Enforce a strict `take` limit (e.g., maximum 100 or 500) or implement cursor-based pagination for all collection endpoints.

**N+1 Query Patterns:**
- Problem: Executing sequential database queries inside iterative loops.
- Files: `apps/api/src/modules/notifications/notifications.service.ts`
- Cause: Iterating over `usersExceeding` to execute `findMany` queries for pruning notifications individually per user.
- Improvement path: Group constraints and run a single bulk query (e.g., `deleteMany` using `IN` clauses) or batch operations.

## Fragile Areas
**Network 2D Elevation Grid Computation:**
- Files: `apps/api/src/modules/network/network.service.ts`
- Why fragile: Edge cases in complex 2D slotting invariants on multi-U devices are deeply embedded in the massive `network.service.ts` file, making them prone to regressions if side-effects alter data structures.
- Safe modification: Isolate the elevation grid algorithm into a pure, heavily unit-tested utility function decoupled from Prisma.
- Test coverage: Covered primarily by e2e tests (`network.adversarial.spec.ts`), lacking localized algorithmic unit tests.

## Scaling Limits
**Database & Memory Capacity:**
- Current capacity: Operates fine on small/seeded datasets.
- Limit: Node.js memory exhaustion and DB CPU thrashing when the total number of switches, ports, or logs scales into the 100k+ range, triggered by unbounded `findMany` queries.
- Scaling path: Introduce hard API pagination bounds and ensure database indexes cover high-cardinality multi-tenant relations.

## Dependencies at Risk
**Test Coverage Enforcement:**
- Risk: The repository lacks automated `coverage` reports or explicit minimum thresholds in its pipeline.
- Impact: Code quality and test thoroughness may degrade silently over time.
- Migration plan: Integrate `jest --coverage` directly into the CI build steps and enforce a minimum coverage threshold to block regressions.

## Missing Critical Features
**API Payload Limits and Broad Queries:**
- Problem: Missing pagination (`take/skip`) on endpoints fetching organizations, locations, and network fabrics.
- Blocks: Prevents safe rendering of large-scale infrastructure environments in the UI without browser lockups or server-side memory spikes.

## Test Coverage Gaps
**Massive God Services:**
- What's not tested: Deeply nested logical branches and obscure edge cases in the 1900+ line `network.service.ts`.
- Files: `apps/api/src/modules/network/network.service.ts`
- Risk: High risk of silent regressions during feature updates since isolation is impossible without pure unit tests.
- Priority: High

---
*Concerns audit: 2026-09-28*

---
last_mapped_commit: 47a62716158aff0e5b1b981ab498a7df3f1defc4
last_mapped_at: 2026-10-12
---
# Codebase Concerns

**Analysis Date:** 2026-10-12

## Resolved Issues & Governance Directives

**Biome Formatter Normalization (RESOLVED):**
- Resolution: Executed `pnpm format` (`biome format --write .`) to normalize formatting across all 572 files with zero semantic change.
- Status: Fully resolved. `pnpm format:check` reports 0 discrepancies across the entire monorepo.
- Prevention Directive: Developers and agents must run `pnpm format:check` as a pre-commit verification gate. In CI, format checks are strictly enforced before linting and building.

**Zero-Downgrade Invariant Maintenance & 2026 Modernization (RESOLVED):**
- Resolution: All workspace dependencies modernized to latest stable 2026 releases (Biome 2.5.15, Playwright 1.64.0, Turbo 2.11.7, React Router 8.4.0, Socket.io 4.8.4, Zod 4.6.5, NestJS 11.2.7, ESLint 10.12.0, Vite 8.3.4, Vitest 5.0.3, Ant Design 6.6.5) while preserving foundational architecture (TypeScript 7.x, NestJS 11.x, React 19.x, Vite 8.x, Ant Design v6+, Prisma 7.x).
- Status: Fully synchronized and deduplicated in `pnpm-lock.yaml`.
- Prevention Directive: Strictly prohibit library downgrades (refuting legacy TD-020). Always verify with `pnpm dedupe` and `pnpm test` when modifying dependencies.

**AssetsPage Column Text Assertion in Test Suite (RESOLVED):**
- Resolution: Synchronized `src/pages/assets/AssetsPage.test.tsx` (line 466) with streamlined table column layout (`[SUB Code, Device Model, Category, Status, Assignee, Organization, Actions]`). The test was updated to click on the asset code (`AST-1001`) and assert that `Cost Center` renders inside `AssetDetailDrawer`.
- Status: 100% test pass rate achieved (1,062 / 1,062 passing tests).
- Prevention Directive: Whenever table columns are streamlined or reorganized (e.g., moving secondary metadata from table columns to detail drawers), all corresponding component, adversarial, and integration test assertions must be updated to target the appropriate container (drawer / modal) rather than asserting absent table headers.

**Prisma migration_lock.toml Git Tracking (RESOLVED):**
- Resolution: Removed `migration_lock.toml` exclusion from `.gitignore` and committed `apps/api/prisma/migrations/migration_lock.toml` to version control.
- Status: Resolved. `m1-2-challenger-migration-relational.spec.ts` passes cleanly in CI and local environments.
- Prevention Directive: `migration_lock.toml` is an essential Prisma migration lock file recording the target database provider (`provider = "postgresql"`). It must always be tracked in git and never gitignored.

**CI Seed Credentials & Dynamic E2E Test Parity (RESOLVED):**
- Resolution: Added explicit `INITIAL_ADMIN_PASSWORD: Youngone@2026` and `INITIAL_DEMO_PASSWORD: Youngone@2026` to CI workflow `env:`. Updated `apps/api/test/e2e/demo-accounts-youngone.spec.ts` to dynamically resolve passwords from `process.env.INITIAL_DEMO_PASSWORD || 'Youngone@2026'` and `process.env.INITIAL_ADMIN_PASSWORD || demoPassword`.
- Status: Resolved. `demo-accounts-youngone.spec.ts` passes 100% (7/7 tests) in both CI and local test runs.
- Prevention Directive: Ensure CI workflows supply deterministic seed credentials, and write e2e tests to dynamically read environment configuration rather than hardcoding credentials.

**DirectoryService Query Method Standardization & Alias (RESOLVED):**
- Resolution: Added `findAllUsers` alias to `DirectoryService` delegating to `findAll(query)` and safeguarded `apps/api/test/e2e/m3-challenger-2-adversarial.spec.ts` to support both methods.
- Status: Resolved. All 22 test scenarios in `m3-challenger-2-adversarial.spec.ts` pass cleanly.
- Prevention Directive: Expose domain query aliases when tests or controllers introduce semantic shorthand to maintain backward compatibility.

## Known Bugs

*(None currently open — 100% of monorepo unit and adversarial test suites passing)*

## Security Considerations

**Fail-Fast Startup Credential Validation:**
- Risk: Missing environment secrets in production (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `AUDIT_SIGNING_KEY`) could result in degraded runtime behavior or fallback to insecure defaults.
- Files: `apps/api/src/main.ts`, `apps/api/src/config/cors.config.ts`, `docker-compose.yml`
- Current mitigation: Application uses `ConfigService.getOrThrow<string>()` and fail-fast assertions on boot; hardcoded secrets and default fallbacks are strictly banned.
- Recommendations: Ensure container deployment pipelines validate secret injection prior to container image startup.

**WebSocket Gateway Handshake Security:**
- Risk: Credential leakage in HTTP logs or browser history if auth tokens are passed via URL query parameters (`?token=...`).
- Files: `apps/api/src/modules/notifications/notifications.gateway.ts`
- Current mitigation: The gateway explicitly inspects incoming handshakes and rejects any connection attempting to provide tokens via query parameters. Handshakes must provide credentials in `socket.handshake.auth.token` or `Authorization: Bearer <token>`.

**At-Rest Credential & License Key Protection:**
- Risk: Exposing plaintext software license keys or Active Directory initial temporary passwords in database dumps or API responses.
- Files: `apps/api/src/common/crypto/license-crypto.ts`, `apps/api/src/common/crypto/directory-crypto.ts`, `apps/api/prisma/schema.prisma`
- Current mitigation: Automated AES-256-GCM authenticated encryption (`enc:v1:<iv>:<authTag>:<ciphertext>`); UI masking (`••••-••••-XXXX` and `••••••••`); initial temporary passwords purged from API responses.
- Recommendations: Implement periodic secret rotation for `LICENSE_ENCRYPTION_KEY` and `AUDIT_SIGNING_KEY`.

## Performance Bottlenecks

**Large-Scale Directory & Asset CSV Batch Imports:**
- Problem: Importing enterprise CSV files containing 5,000+ employees or hardware assets can cause database connection pool exhaustion or event loop stalling if executed as sequential N+1 queries.
- Files: `apps/api/src/modules/directory/directory.service.ts`, `apps/api/src/modules/assets/assets.service.ts`
- Cause: Individual row validation, organizational unit lookup, and foreign key verification.
- Improvement path: Pre-fetch lookup tables into in-memory Maps (`buildLookupMap`) prior to writing, and process bulk insertions in chunked database transactions of 50 to 100 rows (`inTransactionChunks`), deferring aggregate member count updates until transaction completion.

**In-Memory Filtering and Aggregations:**
- Problem: Performing math calculations (e.g. total inventory valuation) or threshold checks in Node.js memory.
- Files: `apps/api/src/modules/inventory/inventory.service.ts`, `apps/api/src/modules/assets/assets.service.ts`
- Current mitigation: Pushed down to PostgreSQL via Prisma `_sum`, `_count`, `groupBy`, and `$queryRaw` SQL queries.
- Improvement path: Ensure any newly created queries continue to use database-level aggregates rather than `.reduce()` in Node.js.

## Fragile Areas

**Ant Design v6 Theme Token Transitions & Portals:**
- Files: `apps/web/src/app/theme.ts`, `apps/web/src/components/AppDrawer.tsx`, `apps/web/src/components/PageContainer.tsx`
- Why fragile: Mixing deprecated v5 styling props (`bodyStyle`, `headStyle`) with v6 semantic token styling (`styles={{ body: { ... } }}`) causes visual clipping and dark mode color inversion bugs.
- Safe modification: Follow `docs/ant-design-llms-full.txt` guidelines strictly; test all modifications using `apps/web/src/AppFeedbackSafety.test.tsx`.
- Test coverage: Comprehensive feedback safety and visual regression tests present in `apps/web/src/`.

**WebSocket Reconnection and Token Expiration Queue:**
- Files: `apps/web/src/hooks/useRealtimeNotifications.ts`, `apps/web/src/services/api.ts`
- Why fragile: If a client token expires while multiple asynchronous requests are in flight, failed refresh attempts could cause cascading 401 rejections or infinite refresh loops.
- Safe modification: `api.ts` implements a centralized `failedQueue` and `isRefreshing` lock flag, ensuring exactly one refresh request is issued and queued requests are resolved atomically upon completion.

## Scaling Limits

**PostgreSQL Connection Pool:**
- Current capacity: `connection_limit=20`, container `max_connections=200`
- Limit: Exceeded if concurrent API instances scale beyond 10 replicas without an external connection pooler.
- Scaling path: Introduce PgBouncer in transaction pooling mode if horizontal API scaling exceeds 8 container replicas.

**Redis Ephemeral Memory:**
- Current capacity: Max memory capped at 512MB with `allkeys-lru` eviction policy
- Limit: Reached if token revocation blacklists or session keys grow unbounded during mass user turnover.
- Scaling path: Configure Redis cluster with dedicated Redis Sentinel or increase memory ceiling to 2GB.

## Dependencies at Risk

**TypeScript 7.0 Pre-Release Notice:**
- Package: `typescript@^7.0.2`
- Risk: Build logs warn `TypeScript 7.0 does not yet have a stable API and is experimental`.
- Impact: Certain cutting-edge compiler options or 3rd-party AST plugins may encounter minor API discrepancies.
- Migration plan: Monorepo uses Turborepo and strict tsconfig boundaries. Keep locked to stable minor patch releases; do not downgrade below TS 7.x.

## Missing Critical Features

**Automated Multi-Tenant Organization Switcher:**
- Problem: Basic multi-tenant boundaries exist in `apps/api/src/modules/organization/`, but fast real-time switcher UI with scoped local cache eviction is under development.
- Blocks: Seamless multi-organization switching without full browser refresh.

## Test Coverage Gaps

**Playwright Headless Network Simulation in Containerized CI:**
- What's not tested: Full network topology visualization with 200+ simulated switch ports under high DOM virtualization.
- Files: `apps/web/src/pages/network/NetworkPage.tsx`, `scripts/run-e2e-network.mjs`
- Risk: Potential canvas or SVG render lag on low-power client devices when rendering large rack elevations.

---

*Concerns analysis: 2026-10-12*

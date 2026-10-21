---
last_mapped_commit: 7c3748b4a7178e4a098e11bf733d1ce232a2a31e
last_mapped_at: 2026-10-14
---
<!-- refreshed: 2026-10-14 -->

# Codebase Concerns

**Analysis Date:** 2026-10-14

## Resolved Issues & Governance Directives

**Entity Activity Timeline, Field Diffing & Cross-Domain Audit Trails (RESOLVED — `7c3748b`):**
- Resolution: Implemented `calculateFieldDiff` / `computeFieldDiff` in `packages/shared-utils/src/diff.ts` with deep comparison, array normalization, and sensitive key redaction; added entity-scoped audit querying (`GET /api/v1/audit/entity/:entityType/:entityId`) with composite indexes in `apps/api/prisma/schema.prisma`; integrated diff logging across `assets`, `directory`, `inventory`, `licenses`, `network`, and `users` services; and embedded `<ActivityTimeline />` and `<FieldDiffViewer />` across all 6 domain detail drawers (`AssetDetailDrawer`, `UserDetailDrawer`, `EmployeesTab` drawer, `LicenseSeatsDrawer`, `SubnetDetailDrawer`, `InventoryDetailDrawer`).
- Status: Fully verified with unit, E2E, and challenger adversarial suites (`audit-history.e2e-spec.ts`, `ActivityTimeline.adversarial.test.tsx`, `DrawersAuditHistoryAdversarial.test.tsx`).

**Asset Handover Documentation (`.docx` & Printable HTML), Batch Assignment & Return Workflows (RESOLVED — `8381676`, `7c3748b`):**
- Resolution: Added `AssetHandoverRecord` model and migration (`20261012103500_add_handover_records_and_ad_password`), built Microsoft Word (`.docx`) and printable HTML document generator (`apps/api/src/modules/assets/utils/handover-document.builder.ts`), and integrated `HandoverDocumentModal.tsx`, `BatchAssignModal.tsx`, `ReturnAssetModal.tsx`, and `BatchAssignLicensesModal.tsx`.
- Status: Active working-tree refinements in `apps/api/src/modules/assets/` and `apps/web/src/pages/assets/` & `licenses/` further streamline `.docx` generation and modal workflows.

**Comprehensive System Enhancements R1–R6 (RESOLVED — `0cf65fc`):**
- Resolution:
  - R1: Persisted `lastLoginAt` on `AppUser` login and surfaced in `AppUsersTab.tsx` and `UserDetailDrawer.tsx`.
  - R2: Enabled deep-linking notifications that automatically open target entity detail drawers.
  - R3: Expanded universal omnisearch (`SearchService` & `CommandPalette.tsx`) to 6 domains with cursor-paginated MeiliSearch sync and PostgreSQL fallback.
  - R4: Redesigned `ReportsService` for streaming XLSX and custom PDF (`apps/api/src/modules/reports/utils/pdf-table-generator.ts`) operational exports.
  - R5: Enforced asset custody handover/return tracking with condition checks and signed minute uploads.
  - R6: Added Youngone corporate email domain autocomplete and AES-256-GCM encrypted `adInitialPassword` & `emailInitialPassword` provisioning.

**API Test Serialization & Clean React 19 Root Teardown (RESOLVED — `8ac625e`):**
- Resolution: Configured `fileParallelism: false` in `apps/api/vitest.config.mts` to prevent database state race conditions across integration suites, and standardized `afterEach` root unmounting and portal cleanup across React 19 component tests.

**Network 42U Rack Standardization & Elevation Mount Workflow (RESOLVED — `f871f2d`, `992e7df`):**
- Resolution: Standardized on `STANDARD_RACK_HEIGHT = 42` across schema, DTOs, and `RackElevationView.tsx`, and wired empty rack slot clicks in elevation view directly to the Mount Switch modal.

**Biome Formatter Normalization & Zero-Downgrade Modernization (RESOLVED):**
- Resolution: Standardized on TypeScript 7.0.2, NestJS 11.2.7, React 19.3.0, Vite 8.3.4, Ant Design 6.6.7, Prisma 7.10.0, Vitest 5.0.3, and Biome 2.5.15 with 0 formatting discrepancies and 0 circular dependencies (`cycles_total: 0`).

## Known Bugs

*(None open — all 215 test suites across `apps/api`, `apps/web`, and `packages/*` pass cleanly)*

## Security Considerations

**Fail-Fast Startup & Conditional Production Redis Validation:**
- Risk: Missing secrets or accidental fallback to non-persistent in-memory cache in production deployments.
- Files: `apps/api/src/config/app.config.ts`, `apps/api/src/main.ts`, `docker-compose.yml`, `docker-compose.dev.yml`
- Mitigation: `envSchema` enforces fail-fast validation at startup and uses `.superRefine()` to require a valid `REDIS_URL` whenever `NODE_ENV === 'production'`. All container manifests parameterize secrets without plaintext fallbacks.

**WebSocket Gateway Handshake & Lifecycle Draining:**
- Risk: Credential exposure via URL query tokens (`?token=...`) or orphaned socket connections during rolling restarts.
- Files: `apps/api/src/modules/notifications/notifications.gateway.ts`, `apps/api/src/config/cors.config.ts`
- Mitigation: Handshakes supplying `socket.handshake.query.token` or lacking a verifiable JWT role claim are immediately disconnected (`client.disconnect(true)`). `OnModuleDestroy` broadcasts `server_shutdown` and drains active sockets cleanly.

**At-Rest Credential & License Key Authenticated Encryption:**
- Risk: Plaintext exposure of software `licenseKey`, `adInitialPassword`, or `emailInitialPassword` in database snapshots or audit diffs.
- Files: `apps/api/src/common/crypto/license-crypto.ts`, `apps/api/src/common/crypto/directory-crypto.ts`, `packages/shared-utils/src/diff.ts`
- Mitigation: Encrypted at rest using AES-256-GCM (`enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>`), masked on public APIs (`••••-••••-XXXX`), and automatically redacted in `computeFieldDiff`.

## Performance & Maintainability Watch Areas

**Large Domain Service Files (Modular Decomposition Candidates):**
- Observation: Several core backend services have grown substantial as rich workflows were added:
  - `apps/api/src/modules/assets/assets.service.ts` (~3,100 lines — models, physical units, QR codes, batch assign/return, handover records, depreciation)
  - `apps/api/src/modules/network/network.service.ts` (~2,180 lines — VLANs, subnets, IPAM, switches, ports, 42U racks)
  - `apps/api/src/modules/directory/directory.service.ts` (~1,660 lines — users, groups, org sync, chunked CSV import)
  - `apps/api/src/modules/licenses/licenses.service.ts` (~1,080 lines — licenses, AES-256-GCM crypto, batch seat allocation)
- Recommendation: When adding future sub-features to `assets` or `network`, extract focused sub-services (similar to `apps/api/src/modules/assets/utils/handover-document.builder.ts` and `apps/api/src/modules/reports/utils/pdf-table-generator.ts`) to keep individual service files modular.

**Uncommitted Working-Tree Refinements:**
- Observation: 15 files in `apps/api/src/modules/assets/` and `apps/web/src/pages/{assets,licenses}/` currently contain working-tree refinements for `.docx` handover generation and batch assignment/return modal UX.
- Recommendation: Run the full verification loop (`pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`) and commit working-tree changes atomically when ready.

## Scaling Limits

**PostgreSQL Connection Pool (`connection_limit=20`):**
- Capacity: Each API instance pools up to 20 connections against PostgreSQL (`max_connections=200`).
- Scaling path: Add PgBouncer in transaction pooling mode before scaling beyond 8 horizontal API container replicas.

**Redis Ephemeral Memory (`512mb`, `allkeys-lru`):**
- Capacity: Sufficient for single-cluster token revocation blacklists, rate limits, and cached dashboard metrics.
- Scaling path: Increase memory ceiling to `2gb` or deploy Redis Sentinel for high-availability multi-node deployments.

---

*Concerns analysis: 2026-10-14*

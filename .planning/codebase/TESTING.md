---
last_mapped_commit: 7c3748b4a7178e4a098e11bf733d1ce232a2a31e
last_mapped_at: 2026-10-14
---
<!-- refreshed: 2026-10-14 -->

# Testing Patterns

**Analysis Date:** 2026-10-14

## Test Framework

**Runner:**
- Vitest 5.0.3 - Unified test runner for unit, integration, component, and adversarial test suites across all workspace packages
  - Backend Config: `apps/api/vitest.config.mts` (Environment: `node`, `testTimeout: 20000`, `fileParallelism: false` to prevent database state contention during integration/seeder runs)
  - Frontend Config: `apps/web/vitest.config.ts` (Environment: `happy-dom`, `testTimeout: 30000`, with `@vitejs/plugin-react` 6.1.2)
  - Shared Packages: Vitest 5.0.3 in `packages/shared-utils` and `packages/shared-validators`
- Playwright 1.64.0 - End-to-end browser and network automation (`playwright.config.ts`, `scripts/run-e2e-network.mjs`)

**Run Commands:**

```bash

# Monorepo Orchestration via Turborepo

pnpm test                         # Run all Vitest suites across all workspaces
pnpm test:e2e                     # Execute end-to-end integration tests
pnpm test:e2e:network             # Run dedicated network module e2e verification

# Workspace-Specific Execution

pnpm --filter @uims/api test      # Run API unit, integration, and challenger suites
pnpm --filter @uims/web test      # Run Web SPA component and adversarial suites
pnpm --filter @uims/shared-utils test # Run shared utility unit tests (e.g. diff.spec.ts)
```

## Test File Organization

**Inventory (215 Test Files Across Monorepo):**
- **API Unit & Service Tests (`apps/api/src/**/*.spec.ts`)**: Co-located with controllers, services, guards, filters, and builders (e.g., `assets.service.spec.ts`, `assets.controller.spec.ts`, `handover-document.builder.spec.ts`, `audit.service.spec.ts`, `directory.service.spec.ts`, `reports.service.spec.ts`, `search.service.spec.ts`, `sanitize.util.spec.ts`).
- **API E2E, Challenger & Governance Suites (`apps/api/test/`)**:
  - Domain & Audit E2E: `audit-history.e2e-spec.ts`, `asset-hierarchy.e2e-spec.ts`, `directory-refactor-e2e.spec.ts`, `e2e/network-modernization.e2e-spec.ts`, `e2e/demo-accounts-youngone.spec.ts`
  - Challenger Adversarial Suites: `challenger-m1-audit-history.spec.ts`, `challenger-m1-preview-db-verification.spec.ts`, `challenger-m2-domain-audit.spec.ts`, `challenger-m2-network-users-directory.spec.ts`, `challenger-m5-backend-adversarial.spec.ts`, `e2e/m1-2-challenger-migration-relational.spec.ts`, `e2e/m1-websocket-gateway-adversarial.spec.ts`, `e2e/m3-challenger-2-adversarial.spec.ts`
- **Web Component, Drawer & Adversarial Tests (`apps/web/src/**/*.test.tsx`)**:
  - Core Components: `ActivityTimeline.test.tsx`, `ActivityTimeline.adversarial.test.tsx`, `FieldDiffViewer.test.tsx`, `FieldDiffViewer.adversarial.test.tsx`, `DrawersAuditHistoryAdversarial.test.tsx`, `Milestone5FrontendChallenger.adversarial.test.tsx`, `AppFeedbackSafety.test.tsx`, `PageContainer.test.tsx`
  - Domain Modals & Drawers: `BatchAssignModal.test.tsx`, `ReturnAssetModal.test.tsx`, `HandoverDocumentModal.test.tsx`, `AssetDetailDrawerHandover.test.tsx`, `BatchAssignLicensesModal.test.tsx`, `AuditPage.test.tsx`, `AuditPage.adversarial.test.tsx`, `ReportsPage.test.tsx`
- **Shared Package Tests (`packages/*/src/*.spec.ts`)**: `packages/shared-utils/src/diff.spec.ts`, `packages/shared-validators/src/*.test.ts`.

## Test Structure & Teardown

**Clean React 19 / Ant Design v6 Root Teardown:**
All frontend component tests rendering React 19 roots and Ant Design v6 portals (`Modal`, `Drawer`, `Popover`, `Select`) track `currentRoot` and unmount cleanly inside `afterEach` while purging stray portal nodes to prevent Happy-DOM microtask leaks:

```typescript
let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
    root = null;
  }
  container?.remove();
  container = null;
  document
    .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover, .ant-select-dropdown')
    .forEach((el) => el.remove());
});
```

**Container-Specific UI Assertions (Section 16.19):**
When secondary attributes (such as `Cost Center`, `Handover History`, or `<ActivityTimeline />`) reside inside detail drawers (`AssetDetailDrawer`, `UserDetailDrawer`, `LicenseSeatsDrawer`, `SubnetDetailDrawer`, `InventoryDetailDrawer`) rather than primary table columns, tests click the record row/code to open the drawer and assert within the drawer container.

## Mocking & In-Memory Test Engines

**Typed Mocks (Zero `any`):**
- Use `vi.fn()`, `vi.spyOn()`, `vi.mocked()`, and `Partial<T>` rather than `as any`.
- In-memory stateful engines (`InMemoryAuditEngine` in `apps/api/test/audit-history.e2e-spec.ts`, `InMemoryAssetHierarchyEngine`, `InMemoryDirectoryEngine`, `InMemoryNetworkEngine`) simulate relational constraints, cursor pagination, and HMAC-SHA256 hash chains deterministically without external flakiness.

**Dynamic Seed Credential Parity (Section 16.21):**
- E2E tests validating seeded accounts resolve credentials dynamically via `process.env.INITIAL_DEMO_PASSWORD || 'Youngone@2026'` and `process.env.INITIAL_ADMIN_PASSWORD || demoPassword`.

## Verification Gates

Every change across the monorepo is validated against the 5-step verification loop:
1. `pnpm run typecheck` — 0 TypeScript errors across all workspaces
2. `pnpm run lint` — 0 ESLint violations across all workspaces
3. `pnpm run format:check` — 100% Biome formatting compliance
4. `pnpm run test` — 100% pass rate across all 215 test files
5. `pnpm run build` — Clean production builds across `packages/*`, `apps/api`, and `apps/web`

---

*Testing analysis: 2026-10-14*

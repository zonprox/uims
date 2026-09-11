# Testing Strategy & Test Suite Architecture

Authoritative testing strategy, workspace configurations, testing patterns, and coverage distribution for the Unified IT Management System (UIMS) monorepo.

---

## 1. Testing Frameworks & Tooling Stack (2026)

| Tool / Layer | Version | Configuration & Environment | Purpose |
|:---|:---|:---|:---|
| **Vitest** | `^5.0.0` | Global runner across all monorepo workspaces | Multi-threaded unit, integration, stress, and adversarial testing. |
| **happy-dom** | `^20.14.0` | `environment: 'happy-dom'` in `apps/web` | Lightweight DOM & browser API simulation for React 19 testing. |
| **NestJS Testing** | `^11.2.3` | `@nestjs/testing` in `apps/api` | Dependency injection container mocking and service isolation. |
| **Vite React Plugin**| `^6.1.1` | `@vitejs/plugin-react` in `apps/web` | Fast JSX/TSX transformation within Vitest runner. |
| **Playwright** | `^1.63.0` | `@playwright/test` in root `package.json` | End-to-end browser automation harness (`pnpm test:e2e`). |
| **Turborepo** | `^2.10.12` | Pipeline task `test` in `turbo.json` | Workspace test orchestration, caching, and dependency ordering. |

---

## 2. Test File Naming & Location Conventions

Tests are strictly co-located adjacent to the implementation files they verify:

- **Backend API Tests (`apps/api/src/`)**:
  - Unit & Integration: `*.spec.ts`
    - Evidence: [`apps/api/src/modules/assets/assets.service.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.service.spec.ts), [`apps/api/src/modules/assets/assets.controller.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.controller.spec.ts).
  - Adversarial & Boundary Suites: `*.adversarial.spec.ts`, `*.boundary.spec.ts`, `*.governance.spec.ts`
    - Evidence: [`apps/api/src/modules/auth/auth-isolation.adversarial.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth-isolation.adversarial.spec.ts), [`apps/api/src/modules/notifications/notifications.boundary.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/notifications/notifications.boundary.spec.ts), [`apps/api/src/modules/audit/audit.governance.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/audit/audit.governance.spec.ts).
- **Frontend Web Tests (`apps/web/src/`)**:
  - Component & Page Tests: `*.test.tsx`
    - Evidence: [`apps/web/src/pages/assets/AssetsPage.test.tsx`](file:///home/user/projects/uims/apps/web/src/pages/assets/AssetsPage.test.tsx), [`apps/web/src/components/ErrorBoundary.test.tsx`](file:///home/user/projects/uims/apps/web/src/components/ErrorBoundary.test.tsx).
  - Hooks, Stores & Services: `*.test.ts`
    - Evidence: [`apps/web/src/stores/auth.store.test.ts`](file:///home/user/projects/uims/apps/web/src/stores/auth.store.test.ts), [`apps/web/src/pages/assets/hooks/useAssetManagement.test.ts`](file:///home/user/projects/uims/apps/web/src/pages/assets/hooks/useAssetManagement.test.ts), [`apps/web/src/services/api.test.ts`](file:///home/user/projects/uims/apps/web/src/services/api.test.ts).
  - Adversarial & Stress Suites: `*.adversarial.test.tsx`, `*.stress.test.tsx`
    - Evidence: [`apps/web/src/empirical-adversarial-challenger.test.tsx`](file:///home/user/projects/uims/apps/web/src/empirical-adversarial-challenger.test.tsx), [`apps/web/src/layouts/milestone1-adversarial.stress.test.tsx`](file:///home/user/projects/uims/apps/web/src/layouts/milestone1-adversarial.stress.test.tsx).
- **Shared Packages (`packages/`)**:
  - Validators & Utilities: `*.test.ts`, `*.stress.test.ts`
    - Evidence: [`packages/shared-validators/src/common.validator.test.ts`](file:///home/user/projects/uims/packages/shared-validators/src/common.validator.test.ts), [`packages/shared-utils/src/network.stress.test.ts`](file:///home/user/projects/uims/packages/shared-utils/src/network.stress.test.ts).

---

## 3. Test Suite Distribution & Inventory

The monorepo contains **96 test files** organized across workspaces:

| Workspace | Files | Runtime | Primary Test Categories | Key Test Targets |
|:---|:---|:---|:---|:---|
| **API** (`@uims/api`) | **43** | Node | Unit, RBAC, Filters, Adversarial, Workers | Auth isolation, Assets, Directory, Notifications, Network, Guards. |
| **Web** (`@uims/web`) | **44** | Happy-DOM | UI Components, Stores, Navigation, Adversarial | AssetsPage, Auth store, ErrorBoundary, Theme, QR scanning, Access. |
| **Validators** (`@uims/shared-validators`) | **4** | Node | Schema verification | Common, Network, Notification, and Role Zod schemas. |
| **Utils** (`@uims/shared-utils`) | **5** | Node | Bitwise arithmetic, Date formatting, Stress | Subnet calculation (/0 to /32), LPM, MAC OUI, Timezones, Enums. |
| **Total Monorepo** | **96** | — | — | Full stack automated coverage. |

---

## 4. Backend API Testing Patterns (NestJS & Prisma)

- **Isolated Dependency Injection & Mocking**:
  - Services are tested either via direct instantiation with mock doubles or using `@nestjs/testing` `Test.createTestingModule()`.
  - Prisma Client is mocked using strongly typed record structures without `any` (avoiding `@ts-ignore` and loose types).
  - Transaction handling is mocked via atomic callbacks: `$transaction: vi.fn(async (cb) => cb(mockPrisma))`.
  - Evidence: [`apps/api/src/modules/assets/assets.service.spec.ts:L9-42`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.service.spec.ts#L9-L42).
- **Controller Unit Tests**:
  - Controllers verify parameter routing, DTO forwarding, and HTTP status handling by mocking service methods.
  - Evidence: [`apps/api/src/modules/assets/assets.controller.spec.ts:L12-25`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.controller.spec.ts#L12-L25).
- **Adversarial & Boundary Suites**:
  - Dedicated suites evaluate authorization boundary bypasses, token forgery, missing payload fields, and privilege escalation.
  - Evidence: [`apps/api/src/modules/auth/auth-isolation.adversarial.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth-isolation.adversarial.spec.ts), [`apps/api/src/modules/m2-automation.adversarial.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/m2-automation.adversarial.spec.ts).

---

## 5. Frontend Web Testing Patterns (React 19 + Ant Design v6 + Happy-DOM)

- **Root Rendering with React 19 `act()`**:
  - Components mount into isolated DOM containers using `createRoot(container)` wrapped in `await act(async () => { ... })`.
  - Global `IS_REACT_ACT_ENVIRONMENT = true` is declared to ensure strict React 19 concurrency warning elimination.
  - Evidence: [`apps/web/src/pages/assets/AssetsPage.test.tsx:L124-170`](file:///home/user/projects/uims/apps/web/src/pages/assets/AssetsPage.test.tsx#L124-L170).
- **Clean Component Test Teardown Invariant**:
  - In compliance with monorepo directives (`AGENTS.md`), every test tracks the mounted root and safely unmounts in `afterEach` while purging stray Ant Design portal elements (`.ant-modal-root`, `.ant-drawer`, `.ant-popover`) to eliminate microtask leaks and `window is not defined` teardown crashes.
  - Evidence: [`apps/web/src/empirical-adversarial-challenger.test.tsx:L53-60`](file:///home/user/projects/uims/apps/web/src/empirical-adversarial-challenger.test.tsx#L53-L60), [`apps/web/src/pages/assets/AssetsPage.test.tsx:L160-163`](file:///home/user/projects/uims/apps/web/src/pages/assets/AssetsPage.test.tsx#L160-L163).
- **Ant Design `App.useApp()` Context Mocking**:
  - Global mocks intercept `antd`'s `App.useApp()` to provide spies for `message.success()`, `message.error()`, and `notification.warning()`.
  - Evidence: [`apps/web/src/pages/assets/AssetsPage.test.tsx:L95-122`](file:///home/user/projects/uims/apps/web/src/pages/assets/AssetsPage.test.tsx#L95-L122).
- **Zustand Store State Testing**:
  - Stores are tested directly by invoking state actions (`login()`, `logout()`, `setPermissions()`) and verifying deterministic transitions.
  - Evidence: [`apps/web/src/stores/auth.store.test.ts`](file:///home/user/projects/uims/apps/web/src/stores/auth.store.test.ts), [`apps/web/src/stores/theme.store.test.ts`](file:///home/user/projects/uims/apps/web/src/stores/theme.store.test.ts).

---

## 6. Shared Package Testing Patterns

- **Runtime Zod Validator Testing (`packages/shared-validators`)**:
  - Validates positive and negative branches of schemas (`emailSchema`, `uuidSchema`, pagination, notification payloads).
  - Evidence: [`packages/shared-validators/src/common.validator.test.ts:L5-13`](file:///home/user/projects/uims/packages/shared-validators/src/common.validator.test.ts#L5-L13).
- **Bitwise Network Arithmetic & Stress Testing (`packages/shared-utils`)**:
  - Exhaustively tests subnet calculation across all CIDR prefixes (/0 to /32), bitwise boundary containment (`isIpInSubnet`), Longest Prefix Match (LPM), and sequential/fragmented IP allocations.
  - Contains high-volume stress loops executing 1,000 randomized bitwise assertions without drift.
  - Evidence: [`packages/shared-utils/src/network.stress.test.ts:L172-186`](file:///home/user/projects/uims/packages/shared-utils/src/network.stress.test.ts#L172-L186), [`packages/shared-utils/src/network.stress.test.ts:L475-490`](file:///home/user/projects/uims/packages/shared-utils/src/network.stress.test.ts#L475-L490).

---

## 7. Execution Pipelines & Verification Invariants

- **Turborepo Orchestration (`turbo.json`)**:
  - Tests depend on dependent package builds (`"dependsOn": ["^build"]`) and cache coverage outputs (`"outputs": ["coverage/**"]`).
- **Core Verification Commands**:
  - Run entire monorepo test suite: `pnpm run test` (executes `turbo run test`)
  - Run API tests exclusively: `pnpm --filter @uims/api test`
  - Run Web tests exclusively: `pnpm --filter @uims/web test`
  - Run E2E automation tests: `pnpm run test:e2e` (executes `turbo run test:e2e`)
  - Watch mode (interactive): `pnpm --filter @uims/api test:watch`
- **Verification Invariants Gate**:
  - All CI/CD pipelines and local contributions must satisfy 5 strict verification checks:
    1. `pnpm run typecheck` — 0 errors across all 5 tsconfigs.
    2. `pnpm run lint` — 0 errors across ESLint.
    3. `pnpm run format:check` — 100% compliance with Biome formatting.
    4. `pnpm run test` — 100% test pass rate across all 96 test suites.
    5. `pnpm run build` — Clean production builds with zero warnings.

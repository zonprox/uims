# Testing Infrastructure
**Analysis Date:** 2026-09-09

## Test Framework

### Vitest Configuration & Version
- **Runner**: Vitest v5.0.0 (`vitest: "^5.0.0"` across all workspaces).
- **Backend Setup (`apps/api/vitest.config.mts`)**:
  - Environment: `node`
  - Globals: `globals: true` (enables `describe`, `it`, `expect`, `beforeEach`, `vi` without imports, though explicit imports from `vitest` are commonly practiced).
  - File inclusion: `src/**/*.{test,spec}.ts`
  - Exclusions: `dist/**`, `node_modules/**`
  - Safety flag: `passWithNoTests: true`
- **Frontend Setup (`apps/web/vitest.config.ts`)**:
  - Environment: `happy-dom` (`happy-dom: "^20.14.0"`)
  - Plugins: `@vitejs/plugin-react` (`^6.1.1`)
  - Module aliases:
    - `@/` -> `./src`
    - `@uims/shared-types` -> `../../packages/shared-types/src`
    - `@uims/shared-validators` -> `../../packages/shared-validators/src`
    - `@uims/shared-utils` -> `../../packages/shared-utils/src`
  - Execution timeouts: `testTimeout: 20000`, `hookTimeout: 20000`
- **Shared Packages**:
  - `packages/shared-validators`: Vitest v5.0.0 (`pnpm test` -> `vitest run`).
  - `packages/shared-utils`: Vitest v5.0.0 (`pnpm test` -> `vitest run`).

### Playwright Configuration for E2E
- **Dependencies**: `@playwright/test: "^1.63.0"`, `playwright: "^1.63.0"` in root `package.json`.
- **Setup & Runner**: Headless Chromium engine orchestrated via standalone automation scripts in `scripts/`:
  - `scripts/test-login.mjs`: Validates authentication flow and live page rendering across 12 primary application routes.
  - `scripts/test-responsive.mjs`: Tests responsive UI behavior across Mobile (390x844), Tablet (768x1024), and Desktop (1440x900) viewports.
- **Browser configuration**:
  - Headless: `headless: true`
  - Chromium launch flags: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`
  - SSL validation: `ignoreHTTPSErrors: true` to support local HTTPS development certificates (`certs/cert.pem`).

---

## Test Structure

The monorepo contains a comprehensive suite of **655 unit and integration tests** distributed across **80 test files**:
- Backend (`@uims/api`): 40 test files, 344 tests
- Frontend (`@uims/web`): 34 test files, 284 tests
- Shared Validators (`@uims/shared-validators`): 3 test files, 12 tests
- Shared Utils (`@uims/shared-utils`): 3 test files, 15 tests

```
uims/
├── apps/
│   ├── api/src/
│   │   ├── common/**/*.spec.ts               # Filter, Guard, Interceptor & Redis tests
│   │   └── modules/**/*.spec.ts              # Domain service, controller & boundary tests
│   └── web/src/
│       ├── app/*.test.tsx                    # Router & routing tests
│       ├── components/*.test.tsx             # ErrorBoundary & Result view tests
│       ├── hooks/*.test.ts                   # Custom hook tests
│       ├── layouts/**/*.test.tsx             # Theme, Navbar & Menu navigation tests
│       ├── pages/**/*.test.tsx               # Page and Modal component tests
│       ├── services/*.test.ts                # API client & domain service tests
│       └── stores/*.test.ts                  # Zustand store lifecycle tests
├── packages/
│   ├── shared-utils/src/*.test.ts            # Formatting, timezone & enum utility tests
│   └── shared-validators/src/*.test.ts       # Zod schema validation tests
└── scripts/
    ├── test-login.mjs                        # 12-page Playwright E2E suite
    └── test-responsive.mjs                   # Responsive breakpoint Playwright suite
```

### Unit Tests
- **Location Patterns**:
  - Tests are strictly co-located within the same directory as their implementation code. No separate `__tests__/` directory is used.
- **Naming Conventions**:
  - Backend: `*.spec.ts` (e.g., `assets.service.spec.ts`, `users.controller.spec.ts`, `roles.guard.spec.ts`).
  - Frontend: `*.test.tsx` for React components (e.g., `AssetsPage.test.tsx`, `ErrorBoundary.test.tsx`), `*.test.ts` for hooks, stores, and services (e.g., `useAccess.test.ts`, `auth.store.test.ts`).
  - Shared packages: `*.test.ts` (e.g., `common.validator.test.ts`, `format.test.ts`).
- **Mock Patterns**:
  - **Backend Prisma Mocking**:
    - Services instantiate directly via constructor injection with a mock Prisma object created in `beforeEach()`.
    - Transactions are mocked by immediately executing the transaction callback:
      ```ts
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        asset: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
      };
      service = new AssetsService(mockPrisma as unknown as PrismaService);
      ```
  - **Frontend UI & API Mocking**:
    - `vi.hoisted()` declares immutable test fixtures prior to module evaluation.
    - Service calls are stubbed with `vi.mock('../../services/assets.service', () => ({ assetsService: { ... } }))`.
    - Ant Design context is mocked via `vi.mock('antd', async () => ({ ...actual, App: { useApp: () => mockAppInstance } }))`.
    - Zustand store states are cleanly reset in `beforeEach(() => useAuthStore.setState({ ... }))`.
    - Direct DOM mounting using React 19 `createRoot` inside `act()`, asserting on `container.textContent` and DOM nodes.

### Integration Tests
- **Database Test Setup**:
  - Unit and service-level integration tests run against mocked Prisma clients without requiring an active PostgreSQL instance, guaranteeing fast local and CI test execution.
- **Multi-Service Integration & Stress Tests**:
  - `apps/api/src/modules/notifications/e2e-adversarial.spec.ts`: Tests end-to-end integration between `ScheduledAlertsWorker`, `NotificationsService`, `InventoryService`, `LicensesService`, and `AssetsService` using orchestrated mock transactions, simulated Redis cache operations, and Socket.IO gateway event broadcasting.
  - `apps/api/src/modules/auth/auth-isolation.adversarial.spec.ts`: Tests authentication isolation, bcrypt password hashing, refresh token lifecycle, and audit log generation under adversarial conditions.
- **API Controller Endpoint Testing**:
  - Controllers (e.g., `assets.controller.spec.ts`, `users.controller.spec.ts`, `network.controller.spec.ts`) are tested with mock services to verify request mapping, query parsing, DTO transformation, and HTTP status code correctness.

### E2E Tests
- **Playwright Setup & Configuration**:
  - Executed against the running Vite web server (`https://localhost:5679`) and NestJS API (`http://localhost:3002`).
  - Viewports:
    - Mobile: 390 x 844 (iPhone profile with mobile user agent)
    - Tablet: 768 x 1024 (iPad profile)
    - Desktop: 1440 x 900 (Enterprise workstation profile)
- **Verified User Flows (`scripts/test-login.mjs`)**:
  1. Submits login form with enterprise Super Admin credentials (`admin@uims.internal` / `password123`).
  2. Asserts redirect away from `/login` and verifies Dashboard metrics.
  3. Navigates sequentially across 10 functional modules:
     - Hardware Assets (`/assets`)
     - Software Licenses (`/licenses`)
     - IT Inventory (`/inventory`)
     - User Directory (`/directory`)
     - Organization Structure (`/organization`)
     - Network & IPAM (`/network`)
     - Security Audit Trail (`/audit`)
     - Executive Reports (`/reports`)
     - System Settings (`/settings`)
  4. Asserts live table rendering and absence of unhandled browser console errors.
- **Responsive Navigation Flows (`scripts/test-responsive.mjs`)**:
  - Mobile: Clicks header hamburger button, asserts Ant Design `<Drawer>` visibility, navigates to Hardware Assets via drawer menu, verifies horizontal scroll on `.ant-table-content`.
  - Tablet: Verifies adaptive grid layout and card positioning.
  - Desktop: Tests sidebar collapse toggle to icon mode (76px width) and expansion back to standard width (260px).
- **Test Data Management**:
  - Relies on seed data populated by `prisma/seed.ts` via `pnpm run db:seed`.

---

## Coverage

### Current Coverage Configuration
- Coverage reporting is not enabled by default in Vitest configurations (`apps/api/vitest.config.mts`, `apps/web/vitest.config.ts`).
- Turborepo test cache declaration in `turbo.json`:
  ```json
  "test": {
    "dependsOn": ["^build"],
    "outputs": ["coverage/**"]
  }
  ```
  This ensures coverage outputs are properly tracked and cached by Turborepo when coverage flags (`--coverage`) are passed.

### Coverage Thresholds
- No mandatory percentage thresholds (e.g., 80% line/branch coverage) are configured or enforced in CI. Test runs pass based on 100% test assertion success (`passWithNoTests: true`).

### Excluded Paths
- Vitest configurations explicitly exclude:
  - `dist/**`
  - `node_modules/**`
- Biome formatting/linter ignores:
  - `coverage/**`
  - `**/*.generated.*`
  - `**/prisma/migrations`
- Git ignores:
  - `coverage/`
  - `playwright-report/`
  - `playwright/.cache/`

---

## Test Utilities

### Shared Test Helpers
- **React 19 Act Environment**: Configured globally in React component test files to synchronize asynchronous rendering:
  ```ts
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  ```
- **Context Wrapper (`renderWithApp`)**:
  ```tsx
  const renderWithApp = async (element: React.ReactElement) => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(ConfigProvider, null, createElement(AntApp, null, element))
      );
    });
    return root;
  };
  ```
  Ensures tested Ant Design components have access to `ConfigProvider` theme tokens and `AntApp` feedback instances.

### Mock Factories
- **Prisma Mock Factory**: Reusable pattern implementing all Prisma model delegate methods (`findUnique`, `findMany`, `findFirst`, `create`, `update`, `delete`, `count`, `aggregate`) with mock transaction dispatching.
- **Ant Design `App.useApp()` Factory**:
  ```ts
  const mockAppInstance = {
    message: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
    modal: { confirm: vi.fn() },
    notification: { warning: vi.fn(), destroy: vi.fn(), info: vi.fn(), error: vi.fn(), success: vi.fn() },
  };
  ```

### Test Fixtures
- Strongly-typed entity fixtures created via `vi.hoisted()` for test isolation (e.g., `mockAssets`, `mockStats` in `AssetsPage.test.tsx`).
- In-memory mock Redis cache with `get`, `set`, `del`, and `flush` methods for testing caching layers in `notifications` and `audit`.
- Dynamically generated password hashes via `bcrypt.hash('...', 10)` in `beforeEach` blocks for auth boundary tests.

---

## CI/CD Testing

### Test Commands in `package.json`
- **Root (`package.json`)**:
  - `pnpm run test`: Runs `turbo run test` across all workspaces.
  - `pnpm run test:e2e`: Runs `turbo run test:e2e`.
- **API (`apps/api/package.json`)**:
  - `pnpm test`: Runs `vitest run`
  - `pnpm test:watch`: Runs `vitest` (interactive watch mode)
- **Frontend (`apps/web/package.json`)**:
  - `pnpm test`: Runs `vitest run`
- **Shared Packages (`packages/shared-*/package.json`)**:
  - `pnpm test`: Runs `vitest run`

### Pipeline Integration (`.github/workflows/ci.yml`)
All code pushed to `main` or opened in a pull request against `main` must pass the continuous integration pipeline:
- **Runner OS**: `ubuntu-latest`
- **Node.js**: 22 (`actions/setup-node@v4`)
- **Package Manager**: PNPM 11.21.0 (`pnpm/action-setup@v4`) with frozen lockfile (`pnpm install --frozen-lockfile`) and GitHub Actions store caching (`actions/cache@v4`).
- **Pipeline Execution Sequence**:
  1. **Prisma Client Generation**: `pnpm run db:generate`
  2. **Format Verification**: `pnpm run format:check` (Biome 2.5.12)
  3. **Static Linting**: `pnpm run lint` (ESLint 10.10.0 + Biome)
  4. **TypeScript Verification**: `pnpm run typecheck` (`tsc --noEmit` across workspaces)
  5. **Automated Testing**: `pnpm run test` (Turborepo execution of Vitest across all workspaces)
  6. **Monorepo Build**: `pnpm run build` (Turborepo compilation of all apps and shared libraries)

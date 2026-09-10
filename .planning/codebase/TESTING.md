# Testing Strategy & Infrastructure

## Test Framework & Tools
- **Framework**: [Vitest](https://vitest.dev/) is universally used for both backend and frontend unit/integration testing.
- **Frontend Environment**: `happy-dom` combined with `@vitejs/plugin-react` within `apps/web/vitest.config.ts`.
- **Backend Environment**: `node` environment within `apps/api/vitest.config.mts`.
- **Assertions**: Vitest's built-in `expect` assertions (globals are enabled: `globals: true`).

## Test Structure
- **Co-location**: Test files are placed immediately alongside the source files they test.
- **Naming Conventions**:
  - API: Generally uses `*.spec.ts` (e.g., `assets.controller.spec.ts`).
  - Web: Generally uses `*.test.ts` or `*.test.tsx` (e.g., `useAccess.test.ts`, `AssetsPage.test.tsx`).
  - Specialized Tests: `*.adversarial.spec.ts`, `*.stress.test.tsx`, `*.governance.spec.ts` are used for security/stress boundaries.

## Test Categories
Total test files found in the monorepo: 93.

### Unit Tests
- Extensively cover backend services, controllers, and frontend hooks/utilities.
- Examples: `assets.service.spec.ts`, `useAssetManagement.test.ts`, `qrDecoder.test.ts`.
- Shared utility coverage is high: `packages/shared-utils/src/format.test.ts`, `packages/shared-validators/src/role.validator.test.ts`.

### Integration & Boundary Tests
- Backend boundary tests ensuring system isolations: `auth-isolation.adversarial.spec.ts`, `directory.adversarial.spec.ts`, `notifications.boundary.spec.ts`.
- Frontend integration: Page level tests interacting with mocked services (e.g., `AccessControlPage.test.tsx`).

### E2E & Stress Tests
- Specialized stress testing files exist in the frontend targeting performance and edge cases (e.g., `milestone1-adversarial.stress.test.tsx`, `NetworkEmpiricalStress.test.tsx`, `NetworkAutomationStress.test.tsx`).
- End-to-End adversarial scenarios captured in `e2e-adversarial.spec.ts` for notifications.

## Test Configuration
- **API (`apps/api/vitest.config.mts`)**:
  - Excludes `dist` and `node_modules`.
  - Pass with no tests enabled (`passWithNoTests: true`).
- **Web (`apps/web/vitest.config.ts`)**:
  - Standard Vite path aliases are matched (`@/*`, `@uims/shared-types`, etc.).
  - Custom timeouts: `testTimeout: 20000`, `hookTimeout: 20000` accommodating complex dom-rendering or stress tests.

## Coverage & Quality Gates
- `AGENTS.md` explicitly defines the invariant verification gate prior to merges/pushes:
  - `pnpm run test` must have a "100% test pass rate across monorepo."
  - Linting (`pnpm run lint`) and formatting (`pnpm run format:check`) must have 0 errors and 100% compliance.
  - Zero-downgrade policy applies for underlying TypeScript architecture.

## Mock Strategies
- Heavy usage of generic unit test mocking (Vitest mocks/spies) replacing Axios HTTP calls inside `apps/web/src/services/*.test.ts`.
- Prisma databases and Redis services mock behavior in `apps/api/src/common/redis/redis.service.spec.ts` and controller specs.


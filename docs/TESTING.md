<!-- generated-by: gsd-doc-writer -->
# Testing

This document outlines the testing strategy, frameworks, execution workflows, and conventions for the UIMS (Unified IT Management System) monorepo.

## Test Frameworks and Setup

UIMS uses testing frameworks and environments tailored for each layer of the monorepo:

- **Unit & Integration Tests**: [Vitest](https://vitest.dev/) (`^5.0.0`) is standard across all workspaces for fast, multi-threaded test execution.
  - **API Workspace** ([`@uims/api`](file:///home/user/projects/uims/apps/api/package.json)): Configured with a `node` environment via [`apps/api/vitest.config.mts`](file:///home/user/projects/uims/apps/api/vitest.config.mts), using `@nestjs/testing` (`^11.2.3`) alongside Vitest mocking utilities (`vi`).
  - **Web Workspace** ([`@uims/web`](file:///home/user/projects/uims/apps/web/package.json)): Configured with a `happy-dom` (`^20.14.0`) browser simulation environment via [`apps/web/vitest.config.ts`](file:///home/user/projects/uims/apps/web/vitest.config.ts), supporting React 19 component testing, Ant Design rendering, and Zustand store verification.
  - **Shared Packages** ([`@uims/shared-validators`](file:///home/user/projects/uims/packages/shared-validators/package.json), [`@uims/shared-utils`](file:///home/user/projects/uims/packages/shared-utils/package.json)): Use Vitest's default Node runtime without requiring custom configuration files to validate Zod schemas and utility helpers.
- **End-to-End (E2E) Tests**: [Playwright](https://playwright.dev/) (`^1.63.0` and `@playwright/test` `^1.63.0`) is installed in root [`package.json`](file:///home/user/projects/uims/package.json) `devDependencies`. The root script `pnpm test:e2e` and Turborepo task are wired up, though dedicated Playwright configuration files (`playwright.config.ts`) and end-to-end browser test suites are not yet implemented.

All test tasks are orchestrated through [Turborepo](https://turbo.build/repo) ([`turbo.json`](file:///home/user/projects/uims/turbo.json)) with caching and dependency tracking against workspace build outputs (`^build`).

## Test Suite Distribution

The monorepo contains a comprehensive suite of unit, integration, and boundary/adversarial tests:

| Workspace | Test Files | Total Tests | Primary Focus Areas | Key Test Locations |
| :--- | :--- | :--- | :--- | :--- |
| **API** (`@uims/api`) | 40 files | 349 tests | Auth & RBAC guards, Prisma exception filters, audit interceptors, NestJS services/controllers, WebSocket notifications gateway, scheduled alert workers, adversarial stress suites | [`apps/api/src/common/guards/`](file:///home/user/projects/uims/apps/api/src/common/guards/), [`apps/api/src/modules/`](file:///home/user/projects/uims/apps/api/src/modules/) |
| **Web** (`@uims/web`) | 34 files | 284 tests | Zustand store state transitions, React Router navigation and error boundaries, Ant Design layouts and dark/light themes, QR code encoding/decoding, modal workflows, API services | [`apps/web/src/stores/`](file:///home/user/projects/uims/apps/web/src/stores/), [`apps/web/src/components/`](file:///home/user/projects/uims/apps/web/src/components/), [`apps/web/src/pages/`](file:///home/user/projects/uims/apps/web/src/pages/) |
| **Validators** (`@uims/shared-validators`) | 3 files | 12 tests | Zod schema validation (email, UUID, pagination, notifications, role assignments) | [`packages/shared-validators/src/`](file:///home/user/projects/uims/packages/shared-validators/src/) |
| **Utilities** (`@uims/shared-utils`) | 3 files | 15 tests | Timezone catalog generation, dayjs date formatting, enum transformations | [`packages/shared-utils/src/`](file:///home/user/projects/uims/packages/shared-utils/src/) |

## Workspace Configurations

### API Configuration ([`apps/api/vitest.config.mts`](file:///home/user/projects/uims/apps/api/vitest.config.mts))

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    passWithNoTests: true,
  },
});
```

Key features:
- **Node Environment**: Lightweight Node runtime execution without DOM overhead.
- **Pattern Matching**: Automatically discovers `.spec.ts` and `.test.ts` files inside `apps/api/src/`.
- **Global APIs**: `globals: true` enables Vitest test functions (`describe`, `it`, `expect`) in all spec files.

### Web Configuration ([`apps/web/vitest.config.ts`](file:///home/user/projects/uims/apps/web/vitest.config.ts))

```typescript
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@uims/shared-types': path.resolve(import.meta.dirname, '../../packages/shared-types/src'),
      '@uims/shared-validators': path.resolve(
        import.meta.dirname,
        '../../packages/shared-validators/src',
      ),
      '@uims/shared-utils': path.resolve(import.meta.dirname, '../../packages/shared-utils/src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    passWithNoTests: true,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
```

Key features:
- **`happy-dom`**: Simulates DOM and browser global objects with low memory footprint and high execution speed.
- **Path Resolution**: Directly resolves `@/` to `apps/web/src` and monorepo shared packages directly to source TypeScript files for instant testing without prior build steps.
- **Extended Timeouts**: 20-second timeout configuration accommodates complex React UI render trees and Ant Design component mounts.

### Shared Packages

[`packages/shared-validators`](file:///home/user/projects/uims/packages/shared-validators/package.json) and [`packages/shared-utils`](file:///home/user/projects/uims/packages/shared-utils/package.json) both include `vitest` in `devDependencies` and define `"test": "vitest run"`. They run seamlessly using Vitest's default Node environment without dedicated configuration files.

## Running Tests

Tests can be executed globally across the entire repository or targeted per workspace using `pnpm` and Turborepo.

### Monorepo-Wide Execution

Run all unit and integration tests across all workspaces:

```bash
pnpm test
```

Execute end-to-end test tasks:

```bash
pnpm test:e2e
```

### Workspace-Specific Execution

Run tests for a single workspace:

```bash
# Run API tests
pnpm --filter @uims/api test

# Run API tests in interactive watch mode
pnpm --filter @uims/api test:watch

# Run Web frontend tests
pnpm --filter @uims/web test

# Run shared validator tests
pnpm --filter @uims/shared-validators test

# Run shared utility tests
pnpm --filter @uims/shared-utils test
```

### Running Specific Test Files

To run a single test file, append the file path or name pattern with Vitest:

```bash
# Run specific API guard spec
pnpm --filter @uims/api vitest run permissions.guard.spec.ts

# Run specific Web store test
pnpm --filter @uims/web vitest run auth.store.test.ts
```

## Writing New Tests

### File Naming and Placement Conventions

- **File Naming**:
  - API: Use `.spec.ts` (e.g., [`apps/api/src/common/guards/permissions.guard.spec.ts`](file:///home/user/projects/uims/apps/api/src/common/guards/permissions.guard.spec.ts) or [`apps/api/src/modules/auth/auth.service.spec.ts`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.service.spec.ts)).
  - Web: Use `.test.ts` for stores/services/hooks (e.g., [`apps/web/src/stores/auth.store.test.ts`](file:///home/user/projects/uims/apps/web/src/stores/auth.store.test.ts)) and `.test.tsx` for React components/pages (e.g., [`apps/web/src/components/ErrorBoundary.test.tsx`](file:///home/user/projects/uims/apps/web/src/components/ErrorBoundary.test.tsx)).
  - Shared Packages: Use `.validator.test.ts` or `.test.ts` (e.g., [`packages/shared-validators/src/common.validator.test.ts`](file:///home/user/projects/uims/packages/shared-validators/src/common.validator.test.ts)).
- **File Placement**: Place test files directly adjacent to the source code file under test (co-located tests).

### API Testing Patterns

Even though `globals: true` is enabled, explicit imports from `vitest` are standard across the codebase to ensure consistent type hints and IDE autocomplete:

```typescript
import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('should allow access if no permissions are required', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: null }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(await guard.canActivate(context)).toBe(true);
  });
});
```

### Web Testing Patterns

When testing React components in `happy-dom`, wrap state mutations in React's `act(...)` helper and provide Ant Design context providers where required:

```typescript
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import ErrorBoundary from './ErrorBoundary';

describe('ErrorBoundary component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  it('renders children when no error occurs', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(ConfigProvider, null, createElement(AntApp, null, <div>Child Content</div>)),
      );
    });

    expect(container.textContent).toContain('Child Content');
    act(() => root.unmount());
  });
});
```

When testing Zustand stores (such as [`apps/web/src/stores/auth.store.ts`](file:///home/user/projects/uims/apps/web/src/stores/auth.store.ts)), reset store state in `beforeEach` to guarantee test isolation:

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, permissions: [] });
  });

  it('initializes with unauthenticated null state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated()).toBe(false);
  });
});
```

## Coverage Requirements

Turborepo configures `"outputs": ["coverage/**"]` for the `test` task in [`turbo.json`](file:///home/user/projects/uims/turbo.json). However, coverage reporting providers (such as `@vitest/coverage-v8`) are not currently registered in [`apps/api/vitest.config.mts`](file:///home/user/projects/uims/apps/api/vitest.config.mts) or [`apps/web/vitest.config.ts`](file:///home/user/projects/uims/apps/web/vitest.config.ts), and no minimum coverage threshold is enforced by default.

<!-- VERIFY: Check if coverage collection should be enabled in vitest configurations in the future. -->

## CI Integration

There are currently no Continuous Integration (CI) pipelines (such as GitHub Actions workflows or GitLab CI configurations) established in the repository.

<!-- VERIFY: When CI is configured, ensure that `pnpm test` and `pnpm test:e2e` are added as required build steps. -->

---
last_mapped_commit: 47a62716158aff0e5b1b981ab498a7df3f1defc4
last_mapped_at: 2026-10-12
---
# Coding Conventions

**Analysis Date:** 2026-10-12

## Naming Patterns

**Files:**
- React Components & Pages: PascalCase (`PageContainer.tsx`, `AssetsPage.tsx`, `MainLayout.tsx`)
- NestJS Controllers, Services & Modules: kebab-case with descriptive suffix (`assets.controller.ts`, `assets.service.ts`, `assets.module.ts`)
- Zustand Stores: kebab-case ending in `.store.ts` (`auth.store.ts`, `theme.store.ts`)
- Shared DTOs & Validators: kebab-case ending in `.dto.ts` or `.validator.ts` (`create-asset.dto.ts`, `asset.validator.ts`)
- Test Files: `.spec.ts` for API backend tests; `.test.ts` or `.test.tsx` for web/shared package tests

**Functions & Methods:**
- Action-oriented camelCase verbs: `findAll()`, `findById()`, `createAsset()`, `verifyAuditChain()`, `resolveAllowedOrigins()`
- Boolean predicates: prefixed with `is`, `has`, or `should` (`isOriginAllowed()`, `hasPermissions()`, `isLicenseKeyEncrypted()`)
- Event Handlers: prefixed with `handle` (`handleSearch()`, `handleStatusChange()`, `handleSubmit()`)

**Variables & Properties:**
- Standard identifiers: camelCase (`accessToken`, `costCenterId`, `activeUsersCount`)
- Constants & Environment Variables: UPPER_SNAKE_CASE (`DEFAULT_DEV_ORIGINS`, `JWT_SECRET`, `MAX_PAGE_SIZE`)
- Enums: PascalCase enum name with UPPER_SNAKE_CASE members (`enum AssetStatus { ACTIVE = 'ACTIVE', IN_REPAIR = 'IN_REPAIR' }`)

**Types & Interfaces:**
- PascalCase without Hungarian notation (`Asset`, `CreateAssetDto`, `PaginatedResponse<T>`)
- No `I` prefixes on interfaces (`interface UserProfile`, not `interface IUserProfile`)
- Discriminated union types: clear descriptive names (`type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading'`)

## Code Style

**Formatting:**
- Engine: Biome 2.5.13 (`@biomejs/biome`) via `pnpm format`
- Indentation: 2 spaces (no tabs)
- Quote Style: Single quotes (`'`) for TypeScript code; double quotes (`"`) in JSON and JSX attributes
- Line Length: 100 characters standard width
- Trailing Commas: ES5 trailing commas in multi-line objects, arrays, and imports

**Linting:**
- Linter: ESLint 10.10.0 with `typescript-eslint` 8.70.0 and shared config `@uims/eslint-config`
- Strict Diagnostics Policy: Zero `@ts-ignore`, zero `@ts-nocheck`, and zero unindexed `@ts-expect-error`
- Zero `any` Policy: Strict prohibition of `any` and `as any` across production code and test suites. Use `unknown`, generic parameters, or explicit interfaces.

## Import Organization

**Order:**
1. Built-in Node modules with `node:` protocol prefix (`import * as crypto from 'node:crypto';`, `import path from 'node:path';`)
2. External 3rd-party dependencies (`import { Injectable, Logger } from '@nestjs/common';`, `import { Card, Table } from 'antd';`)
3. Workspace packages (`import type { ApiResponse } from '@uims/shared-types';`, `import { createAssetSchema } from '@uims/shared-validators';`)
4. Internal application imports via path aliases or relative paths (`import { PrismaService } from '../database/prisma.service';`)
5. Style and asset imports (`import './styles/global.css';`)

**Path Aliases:**
- `@/*` -> `apps/web/src/*` (Web application root)
- `@uims/shared-types` -> `packages/shared-types/src`
- `@uims/shared-validators` -> `packages/shared-validators/src`
- `@uims/shared-utils` -> `packages/shared-utils/src`

**Circular Dependency Elimination:**
- Cyclic imports between state stores and service clients (`auth.store.ts` -> `auth.service.ts` -> `api.ts` -> `auth.store.ts`) are strictly prohibited.
- State stores hold reactive UI state; API clients manage network transport and token headers independently.

## Error Handling

**Typed Catch Mandate:**
- Catch clauses must always explicitly type errors as `unknown`: `catch (error: unknown)`
- Safely narrow errors before inspecting properties:
  ```typescript
  try {
    await this.prisma.asset.create({ data });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known database errors
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error('Failed to create asset', error instanceof Error ? error.stack : undefined);
    throw new InternalServerErrorException(message);
  }
  ```

**Zero Silent Catch Policy:**
- Empty catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly forbidden.
- Every caught exception must be:
  1. Logged via structured logger (`this.logger.error(...)`),
  2. Re-thrown as a domain exception (`HttpException`), or
  3. Reported to the user via dynamic notification (`notification.error(...)`).

**Ant Design v6 Dynamic Feedback Mandate:**
- **Required**: Consume feedback exclusively via dynamic React context:
  ```typescript
  const { message, modal, notification } = App.useApp();
  ```
- **Prohibited**: Static calls to `message.error()`, `message.success()`, `Modal.confirm()`, or `notification.open()` directly from `antd` imports (enforced by `AppFeedbackSafety.test.tsx`).

## Logging

**Backend Framework:**
- Structured NestJS `Logger` (`private readonly logger = new Logger(ContextName.name)`) with `pino` transport.
- Raw `console.log`, `console.warn`, `console.error`, and `console.info` are strictly prohibited in backend production code.
- Structured errors must pass both contextual explanation and error stack:
  ```typescript
  this.logger.error('Failed to synchronize directory records', error instanceof Error ? error.stack : String(error));
  ```

**Frontend Telemetry:**
- User-facing feedback is presented via `App.useApp().message` or `App.useApp().notification`.
- Unhandled render errors are captured by `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx`) and displayed via `ErrorResultView`.

## Comments

**When to Comment:**
- Explain the "why" and non-obvious business/security rationale, not the "what".
- Document security-sensitive flows, cryptographic envelopes, and multi-step transaction chunking.
- Avoid obvious restatements of code (e.g. `// increment counter`).

**JSDoc/TSDoc:**
- Required on shared utilities, cryptographic functions, and public service APIs.
- Specify parameter types, return contracts, and potential thrown exceptions.

## Function Design

**Size:**
- Single responsibility principle: Functions should do one conceptual task.
- Complex orchestration functions exceeding 50 lines should decompose sub-tasks into private helper methods.

**Parameters:**
- Functions with more than 3 arguments must group arguments into a typed options object (e.g. `resolveAllowedOrigins(options?: CorsResolutionOptions)`).

**Return Values:**
- Explicit return types are required on all public methods and exported functions.
- Avoid returning raw untyped objects; use shared interfaces or Prisma generated types.

## Module Design

**Exports:**
- Named exports preferred over default exports for utilities, services, and shared types.
- Default exports are reserved for React page components lazy-loaded via `React.lazy()`.

**Barrel Files:**
- Clean public interfaces exported via `index.ts` in shared packages (`packages/shared-types/src/index.ts`, `packages/shared-validators/src/index.ts`).
- Avoid deep internal package imports from outside the package boundaries.

---

*Convention analysis: 2026-10-12*

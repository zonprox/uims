# Coding Conventions

**Analysis Date:** 2026-08-14

## Naming Patterns

### Files
Follow these strict naming rules across workspaces:

- **Backend / NestJS Modules (`apps/api/src/`):**
  - Use kebab-case with descriptive role suffix:
    - Controllers: `[module].controller.ts` (e.g., `apps/api/src/modules/assets/assets.controller.ts`)
    - Services: `[module].service.ts` (e.g., `apps/api/src/modules/assets/assets.service.ts`)
    - Modules: `[module].module.ts` (e.g., `apps/api/src/modules/assets/assets.module.ts`)
    - DTOs: `dto/[action]-[entity].dto.ts` or `dto/[entity]-query.dto.ts` (e.g., `apps/api/src/modules/assets/dto/create-asset.dto.ts`, `apps/api/src/modules/assets/dto/asset-query.dto.ts`)
    - Guards: `[name].guard.ts` (e.g., `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/modules/auth/auth.guard.ts`)
    - Filters: `[name].filter.ts` (e.g., `apps/api/src/common/filters/http-exception.filter.ts`, `apps/api/src/common/filters/prisma-exception.filter.ts`)
    - Interceptors: `[name].interceptor.ts` (e.g., `apps/api/src/common/interceptors/transform.interceptor.ts`)
    - Pipes: `[name].pipe.ts` (e.g., `apps/api/src/common/pipes/zod-validation.pipe.ts`)
    - Decorators: `[name].decorator.ts` (e.g., `apps/api/src/common/decorators/current-user.decorator.ts`)
    - Strategies: `strategies/[name].strategy.ts` (e.g., `apps/api/src/modules/auth/strategies/jwt.strategy.ts`)
    - Unit Tests: `[name].spec.ts` (e.g., `apps/api/src/modules/assets/assets.service.spec.ts`)

- **Frontend / React Components (`apps/web/src/`):**
  - React Components, Pages, and Layouts: Use PascalCase with `.tsx` extension:
    - Pages: `[Name]Page.tsx` (e.g., `apps/web/src/pages/assets/AssetsPage.tsx`, `apps/web/src/pages/auth/LoginPage.tsx`)
    - Layouts: `[Name]Layout.tsx` (e.g., `apps/web/src/layouts/MainLayout.tsx`, `apps/web/src/layouts/AuthLayout.tsx`)
    - Reusable UI Components: `[Name].tsx` (e.g., `apps/web/src/components/ErrorBoundary.tsx`, `apps/web/src/components/PageContainer.tsx`, `apps/web/src/components/CommandPalette.tsx`)
  - Utilities, Services, Hooks, and Stores: Use camelCase with `.ts` extension:
    - Services: `[feature].service.ts` or `api.ts` (e.g., `apps/web/src/services/assets.service.ts`, `apps/web/src/services/api.ts`)
    - Stores: `[feature].store.ts` (e.g., `apps/web/src/stores/auth.store.ts`, `apps/web/src/stores/theme.store.ts`)
    - Hooks: `use[Feature].ts` (e.g., `apps/web/src/hooks/useAuth.ts`)
    - Setup/Config: `router.tsx`, `theme.ts`, `query-client.ts` (e.g., `apps/web/src/app/router.tsx`)
    - Tests: `[name].test.ts` (e.g., `apps/web/src/services/api.test.ts`, `apps/web/src/stores/auth.store.test.ts`)

- **Shared Packages (`packages/`):**
  - Types: `packages/shared-types/src/entities/[entity].ts`, `packages/shared-types/src/dto/[feature].dto.ts`, `packages/shared-types/src/enums/index.ts`
  - Validators: `packages/shared-validators/src/[feature].validator.ts`
  - Utilities: `packages/shared-utils/src/[utility].ts` (e.g., `enum.ts`, `format.ts`, `string.ts`, `validation.ts`)
  - Barrel entries: `index.ts` at the root of each package's `src/`

---

### Functions
- **Standard Functions and Methods:** Use camelCase describing action or purpose:
  - Service CRUD: `findAll`, `findOne`, `create`, `update`, `remove` (e.g., `apps/api/src/modules/assets/assets.service.ts`)
  - Query aggregations: `getStats`, `checkHealth` (e.g., `apps/api/src/modules/dashboard/dashboard.service.ts`)
  - Resolvers and private helpers: `resolveCategoryId`, `resolveLocationId`, `assignScalarFields`, `buildAssetUpdateData`, `formatAsset`
  - Data mapping and formatting: `mapAssetStatus`, `mapAssetStatusToLabel`, `formatDate`, `formatCurrency`, `formatBytes`, `slugify` (e.g., `packages/shared-utils/src/format.ts`)
  - Validation checkers: `isValidEmail`, `isValidIP`, `isValidCIDR`, `isValidMAC`, `isValidUUID` (e.g., `packages/shared-utils/src/validation.ts`)
- **React UI Event Handlers:** Prefix with `handle` followed by action and entity:
  - Examples: `handleOpenCreateModal`, `handleOpenEditModal`, `handleSaveAsset`, `handleDeleteAsset`, `handleShowDetails`, `handleExportCSV` (e.g., `apps/web/src/pages/assets/AssetsPage.tsx`)
- **Custom React Hooks:** Prefix with `use` (e.g., `useAuth` in `apps/web/src/hooks/useAuth.ts`, `useAuthStore` in `apps/web/src/stores/auth.store.ts`).

---

### Variables
- **Local variables and properties:** Use camelCase (e.g., `searchQuery`, `categoryFilter`, `isRefreshing`, `failedQueue`, `modalSubmitting`).
- **Global constants and Enum members:** Use UPPER_SNAKE_CASE for constant values and enum keys:
  ```ts
  export enum AssetStatus {
    AVAILABLE = 'AVAILABLE',
    IN_USE = 'IN_USE',
    MAINTENANCE = 'MAINTENANCE',
    RETIRED = 'RETIRED',
    LOST = 'LOST',
  }
  ```
- **Unused parameters / variables:** Prefix with leading underscore `_` to satisfy linter ignore rules (e.g., `_context`, `_metadata`, `_error`, `_passwordHash`).

---

### Types
- **Interfaces and Types:** Use PascalCase without `I` or `T` prefixes:
  - Entities: `Asset`, `User`, `Ticket`, `License`, `DirectoryUser` (e.g., `packages/shared-types/src/entities/asset.ts`)
  - Data Transfer Objects (DTO): Suffix with `Dto` (e.g., `CreateAssetDto`, `UpdateAssetDto`, `AssetQueryDto`, `AssetStatsDto`, `LoginDto`)
  - State interfaces: `AuthState`, `ThemeState`, `Props`, `State` (e.g., `apps/web/src/stores/auth.store.ts`, `apps/web/src/components/ErrorBoundary.tsx`)
  - Schema validators: Use camelCase with `Schema` suffix for Zod instances (e.g., `createAssetSchema`, `updateAssetSchema`, `emailSchema`, `uuidSchema` in `packages/shared-validators/src/asset.validator.ts`)

---

## Code Style

### Formatting
The project enforces code formatting via Biome 2.5.8 (`biome.json`):
- **Tool:** Biome (`@biomejs/biome`)
- **Settings:**
  - `indentStyle`: `"space"`
  - `indentWidth`: `2`
  - `lineWidth`: `100`
  - `lineEnding`: `"lf"`
  - `quoteStyle`: `'single'` (JavaScript/TypeScript)
  - `trailingCommas`: `'all'` (JavaScript/TypeScript), `'none'` (JSON)
  - `semicolons`: `'always'`
  - `unsafeParameterDecoratorsEnabled`: `true` (enables NestJS decorator compatibility)
- **Commands:**
  - `pnpm format` (`biome format --write .`)
  - `pnpm format:check` (`biome check .`)

### Linting
The project uses ESLint flat configuration (`eslint.config.mjs`) extending `@uims/eslint-config` (`packages/eslint-config/index.js`):
- **Base configs:** `typescript-eslint` recommended + `eslint-config-prettier`
- **Key ESLint Rules:**
  - `@typescript-eslint/no-explicit-any`: `'warn'`
  - `@typescript-eslint/no-unused-vars`: `['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]`
  - `@typescript-eslint/explicit-function-return-type`: `'off'`
- **Biome Linter Rules (`biome.json`):**
  - `complexity.noExcessiveCognitiveComplexity`: `'warn'` (maximum score: 15)
  - `style.noNonNullAssertion`: `'warn'`
  - `style.useConsistentArrayType`: `{ "level": "warn", "options": { "syntax": "generic" } }` -> Use `Array<T>` instead of `T[]`
  - `style.useImportType`: `'off'`
  - `suspicious.noExplicitAny`: `'warn'`

---

## Import Organization

### Order
Always organize imports into three clean blocks separated by blank lines:

1. **External Node & Third-Party Packages:**
   - Framework and vendor packages (e.g., `@nestjs/common`, `react`, `dayjs`, `axios`, `antd`, `@ant-design/icons`, `zod`, `zustand`, `vitest`).
2. **Monorepo Workspace Packages:**
   - Workspace libraries using package names:
     - `@uims/shared-types`
     - `@uims/shared-utils`
     - `@uims/shared-validators`
3. **Internal Module & Relative Imports:**
   - Project-relative or alias paths (`../stores/auth.store`, `./assets.service`, `../../database/prisma.service`).

```ts
// 1. External Third-Party
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// 2. Monorepo Shared Libraries
import type { AssetQueryDto, CreateAssetDto, UpdateAssetDto } from '@uims/shared-types';
import { mapAssetStatus, mapAssetStatusToLabel } from '@uims/shared-utils';

// 3. Internal Relative Modules
import { PrismaService } from '../../database/prisma.service';
import { AssetsService } from './assets.service';
```

### Type Imports
Use explicit `import type { ... }` or inline `type` specifiers for types to support isolated module transpilation:
```ts
import type { Prisma } from '@prisma/client';
import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
```

### Path Aliases
- **Frontend (`apps/web`):**
  - `@/*` maps to `./src/*` (configured in `apps/web/tsconfig.json` and `apps/web/vite.config.ts`).
- **Workspace Packages:**
  - Packages consume workspace dependencies via pnpm workspaces (`@uims/shared-types: "workspace:*"`).
- **Backend (`apps/api`):**
  - Relative imports with baseUrl `./` (e.g., `../../database/prisma.service`).

---

## Error Handling

### Backend API Error Patterns
- **Built-in NestJS Exceptions:** Throw standard NestJS HTTP exceptions with informative messages:
  ```ts
  if (!asset) {
    throw new NotFoundException(`Asset with ID ${id} not found`);
  }
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }
  ```
- **Centralized Exception Filters:**
  - `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`) catches all `HttpException` instances and normalizes responses:
    ```json
    {
      "success": false,
      "statusCode": 404,
      "message": "Asset with ID ast-1 not found",
      "timestamp": "2026-08-14T22:45:00.000Z"
    }
    ```
  - `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`) catches `Prisma.PrismaClientKnownRequestError` and maps database errors (e.g. `P2002` unique constraint violation -> `409 Conflict`).
- **Validation Errors:** Handled globally by `ValidationPipe({ whitelist: true, transform: true })` in `apps/api/src/main.ts` or `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`).

### Frontend UI Error Patterns
- **Error Boundaries:** Wrap component subtrees with `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx`) to catch unhandled rendering exceptions, display contextual details, and provide recovery actions (`Try Again`, `Reload Page`, `Dashboard`).
- **Async API Calls & User Notifications:** Always wrap asynchronous service operations in `try / catch / finally` and report user feedback using Ant Design's `message.error(...)` and `message.success(...)`:
  ```ts
  try {
    const values = await form.validateFields();
    setModalSubmitting(true);
    await assetsService.updateAsset(editingAsset.id, payload);
    message.success(`Asset "${payload.tag}" updated successfully.`);
    setModalOpen(false);
    loadData();
  } catch (err: unknown) {
    console.error(err);
    const apiErr = err as { response?: { data?: { message?: string } } };
    message.error(apiErr.response?.data?.message || 'Failed to save asset.');
  } finally {
    setModalSubmitting(false);
  }
  ```
- **Token Refresh & Interceptor Queue:** Handled automatically in `apps/web/src/services/api.ts`. When receiving a `401` response:
  1. Queues incoming concurrent requests in `failedQueue`.
  2. Requests a token refresh via `/auth/refresh`.
  3. Replays queued requests with new `Bearer` header.
  4. If refresh fails, triggers `useAuthStore.getState().logout()` and redirects to `/login`.

---

## Logging

### Framework
- **Backend API:** Uses Pino via `pino` and `pino-http` (`apps/api/package.json`), integrated into NestJS bootstrap with `{ bufferLogs: true }` in `apps/api/src/main.ts`.
- **Frontend / Client:** Uses standard `console.error` and `console.warn` inside error handlers, catch blocks, and `ErrorBoundary.componentDidCatch`.

### Logging Rules
- Do NOT use raw `console.log` for debugging in production code.
- Log error stack traces and contextual error info inside error boundaries and exception filters.
- Maintain structured log formats in backend services when logging audit trails or async background jobs.

---

## Comments

### When to Comment
- Document non-obvious business logic, database transactions, and data migrations (e.g. why fallback categories are created atomically).
- Document complex regex expressions (e.g., CIDR, MAC, IPv4/IPv6 validation regex in `packages/shared-utils/src/validation.ts`).
- Avoid trivial comments that describe self-explanatory code.

### JSDoc / TSDoc & Swagger Annotations
- Use NestJS Swagger decorators on controllers and endpoints as primary API documentation:
  - `@ApiTags('assets')`
  - `@ApiOperation({ summary: 'Create new asset' })`
  - `@ApiBearerAuth()`
  - `@Throttle({ default: { limit: 5, ttl: 60000 } })`

---

## Function Design

### Size & Single Responsibility
- Keep controller methods minimal (delegate orchestration and business logic to services).
- Break large service routines into private helper functions (e.g. `resolveCategoryId`, `resolveLocationId`, `assignScalarFields`, `buildAssetUpdateData`, `formatAsset` in `apps/api/src/modules/assets/assets.service.ts`).
- Adhere to Biome cognitive complexity threshold (`<= 15`).

### Parameters
- Prefer typed DTOs or config objects over long positional parameter lists:
  ```ts
  // Prescriptive pattern: Use DTO / structured object
  async create(data: CreateAssetDto): Promise<Asset>
  async findAll(query?: AssetQueryDto): Promise<Array<Asset>>
  ```
- Use parameter destructuring with defaults where applicable in utility functions:
  ```ts
  export function formatDate(date: string | Date, formatStr = 'YYYY-MM-DD'): string
  export function formatBytes(bytes: number, decimals = 2): string
  export function truncate(text: string, length = 100, suffix = '...'): string
  ```

### Return Values
- All API controller responses are automatically wrapped by `TransformInterceptor` (`apps/api/src/common/interceptors/transform.interceptor.ts`) into:
  ```ts
  export interface Response<T> {
    success: boolean;
    data: T;
    timestamp: string;
  }
  ```
- Frontend services unwrap the payload returning `res.data.data` as strongly typed models (`Promise<Array<Asset>>`, `Promise<AssetStats>`).

---

## Module Design

### Exports
- **Named Exports:** Use named exports for services, controllers, utility functions, stores, hooks, constants, and types:
  ```ts
  export class AssetsService { ... }
  export const useAuthStore = create<AuthState>()( ... );
  export function formatDate(date: string | Date): string { ... }
  ```
- **Default Exports:** Use default exports ONLY for React page components and layout wrappers to enable `React.lazy` route code splitting:
  ```ts
  // apps/web/src/pages/assets/AssetsPage.tsx
  export default function AssetsPage() { ... }

  // apps/web/src/app/router.tsx
  const AssetsPage = lazy(() => import('../pages/assets/AssetsPage'));
  ```

### Barrel Files
- Every package in `packages/` provides a single entry point `src/index.ts` exporting all submodules:
  - `packages/shared-types/src/index.ts`: Re-exports DTOs, entity interfaces, and enums.
  - `packages/shared-validators/src/index.ts`: Re-exports all Zod validation schemas.
  - `packages/shared-utils/src/index.ts`: Re-exports all utility helper modules (`enum`, `format`, `string`, `validation`).

---
*Convention analysis: 2026-08-14*

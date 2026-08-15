# Coding Conventions

**Analysis Date:** 2026-08-15

## Naming Patterns

### Files and Directories

- **NestJS Modules, Controllers, Services, Guards, Filters, Interceptors (`apps/api/src/`):**
  - Use kebab-case with explicit architectural role suffix:
    - Controllers: `<resource>.controller.ts` (e.g., `apps/api/src/modules/assets/assets.controller.ts`)
    - Services: `<resource>.service.ts` (e.g., `apps/api/src/modules/assets/assets.service.ts`)
    - Modules: `<resource>.module.ts` (e.g., `apps/api/src/modules/assets/assets.module.ts`)
    - Guards: `<purpose>.guard.ts` (e.g., `apps/api/src/common/guards/roles.guard.ts`)
    - Filters: `<type>-exception.filter.ts` (e.g., `apps/api/src/common/filters/http-exception.filter.ts`)
    - Interceptors: `<purpose>.interceptor.ts` (e.g., `apps/api/src/common/interceptors/transform.interceptor.ts`)
    - Decorators: `<purpose>.decorator.ts` (e.g., `apps/api/src/common/decorators/api-paginated.decorator.ts`)
    - Seeders: `<domain>.seeder.ts` (e.g., `apps/api/prisma/seeders/assets.seeder.ts`)
- **Backend DTOs (`apps/api/src/modules/*/dto/`):**
  - Use kebab-case with verb/action and resource prefix: `create-<resource>.dto.ts`, `update-<resource>.dto.ts`, `<resource>-query.dto.ts` (e.g., `apps/api/src/modules/assets/dto/create-asset.dto.ts`).
- **React Components & Views (`apps/web/src/`):**
  - Use PascalCase with `.tsx` extension for components and page containers:
    - Page views: `<Domain>Page.tsx` (e.g., `apps/web/src/pages/assets/AssetsPage.tsx`)
    - Feature subcomponents: `<Domain><Component>.tsx` (e.g., `apps/web/src/pages/assets/components/AssetTable.tsx`, `apps/web/src/pages/assets/components/AssetDetailDrawer.tsx`)
    - Shared layout / UI components: `PageContainer.tsx`, `SidebarContent.tsx`, `CommandPalette.tsx`
- **React Custom Hooks (`apps/web/src/hooks/` and `apps/web/src/pages/*/hooks/`):**
  - Use camelCase prefixed with `use` with `.ts` extension: `useAuth.ts`, `useSystemHealth.ts`, `useAssetManagement.ts`, `useLayoutTelemetry.ts`
- **Zustand State Stores (`apps/web/src/stores/`):**
  - Use kebab-case with `.store.ts` suffix: `apps/web/src/stores/auth.store.ts`, `apps/web/src/stores/theme.store.ts`
- **Frontend API Services (`apps/web/src/services/`):**
  - Use kebab-case with `.service.ts` suffix: `apps/web/src/services/assets.service.ts`, `apps/web/src/services/api.ts`
- **Shared Packages (`packages/`):**
  - Use kebab-case for entities, DTOs, and utility modules: `packages/shared-types/src/dto/assets.dto.ts`, `packages/shared-validators/src/asset.validator.ts`, `packages/shared-utils/src/format.ts`
- **Test Files:**
  - Backend unit tests: `<target>.spec.ts` co-located with source (e.g., `apps/api/src/modules/assets/assets.service.spec.ts`)
  - Frontend unit tests: `<target>.test.ts` or `<target>.test.tsx` co-located with source (e.g., `apps/web/src/services/services.test.ts`, `apps/web/src/hooks/useSystemHealth.test.ts`)
  - Package unit tests: `<target>.test.ts` co-located in `src/` (e.g., `packages/shared-utils/src/enum.test.ts`)

### Functions and Methods

- Use camelCase for standard functions, class methods, and utility routines:
  - CRUD and service methods: `findAll()`, `findOne()`, `create()`, `update()`, `remove()`, `getStats()`, `checkHealth()`
  - Utility and formatting functions: `formatDate()`, `formatCurrency()`, `mapAssetStatus()`, `resolveEntityName()`, `sanitizePayload()`
- Use PascalCase for React Function Components:
  - `export default function AssetsPage() { ... }`
  - `export function AssetTable({ ... }: AssetTableProps) { ... }`
  - `export default function PageContainer({ ... }: PageContainerProps) { ... }`
- Use camelCase prefixed with `use` for React Custom Hooks:
  - `export function useAssetManagement(form: FormInstance) { ... }`
  - `export function useSystemHealth(options?: SystemHealthOptions) { ... }`
- Use `handle<Action><Subject>` for UI event handlers:
  - `handleOpenCreateModal()`, `handleOpenEditModal()`, `handleSaveAsset()`, `handleDeleteAsset()`, `handleExportCSV()`, `handleResetFilters()`
- Use `set<StateName>` for Zustand store mutators and React state dispatchers:
  - `setMode()`, `setCompact()`, `setPresetKey()`, `setBorderRadius()`

### Variables and Constants

- Use camelCase for local variables, object properties, and function parameters:
  - `searchQuery`, `statusFilter`, `selectedAsset`, `modalSubmitting`, `purchaseCost`, `dbLatencyMs`
- Use UPPER_SNAKE_CASE for global constants, configuration tables, metadata keys, and environment variables:
  - `IS_PUBLIC_KEY` in `apps/api/src/common/decorators/public.decorator.ts`
  - `COLOR_PRESETS` in `apps/web/src/stores/theme.store.ts`
  - `VENDOR_RULES` in `apps/web/vite.config.ts`
- Use descriptive boolean variables with auxiliary verbs (`is`, `has`, `can`, `open`):
  - `loading`, `exporting`, `modalOpen`, `detailDrawerOpen`, `isAuthenticated`, `isHealthy`

### Types, Interfaces, and Enums

- Use PascalCase for all interfaces, type aliases, classes, and enums:
  - DTO classes: `CreateAssetDto`, `UpdateAssetDto`, `PaginationDto`
  - Interfaces: `ApiResponse<T>`, `PaginationMeta`, `PageContainerProps`, `AuthState`, `ThemeColorPreset`
  - Entity types: `Asset`, `User`, `Ticket`, `AuditLog`
  - Prisma generated types: `Prisma.AssetWhereInput`, `Prisma.TransactionClient`
- Enums:
  - PascalCase for enum identifier; UPPER_SNAKE_CASE for enum values:
    ```typescript
    export enum AssetStatus {
      AVAILABLE = 'AVAILABLE',
      IN_USE = 'IN_USE',
      MAINTENANCE = 'MAINTENANCE',
      RETIRED = 'RETIRED',
      LOST = 'LOST',
    }
    ```
- Generic Type Parameters:
  - Single letter `T` or descriptive PascalCase prefixed with `T`: `Response<T>`, `ApiResponseDto<T>`, `TModel extends Type<unknown>`.

---

## Code Style

### Formatting

- **Tool:** Biome (`@biomejs/biome` v2.5.8), configured in `biome.json`.
- **Command:** `pnpm format` (`biome format --write .`) and `pnpm format:check` (`biome check .`).
- **Core Rules:**
  - Indentation: 2 spaces (`"indentStyle": "space"`, `"indentWidth": 2`).
  - Line Width: 100 characters (`"lineWidth": 100`).
  - Line Endings: Unix LF (`"lineEnding": "lf"`).
  - Quotes: Single quotes for TypeScript/JavaScript (`"quoteStyle": "single"`).
  - Semicolons: Always required (`"semicolons": "always"`).
  - Trailing Commas: Always included on multi-line literals and parameters (`"trailingCommas": "all"`).
  - Parameter Decorators: Unsafe parameter decorators parser enabled (`"unsafeParameterDecoratorsEnabled": true`) to support NestJS dependency injection and param decorators (`@Body()`, `@Param()`, `@Query()`, `@CurrentUser()`).

### Linting

- **Tools:** Biome linter + ESLint 10 (`@uims/eslint-config` with `typescript-eslint` and `eslint-config-prettier`).
- **Commands:** `pnpm lint` (`turbo run lint`) and `pnpm lint:fix` (`turbo run lint:fix`).
- **Key Rules & Invariants:**
  - Array syntax: Use generic array syntax `Array<T>` over `T[]` (Biome rule `style.useConsistentArrayType: { "level": "warn", "options": { "syntax": "generic" } }`).
  - Explicit Any: Avoid `any`; use `unknown` or specific interfaces (`suspicious.noExplicitAny: "warn"`).
  - Unused Variables: Disallowed unless prefixed with an underscore `_` (`@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`, `caughtErrorsIgnorePattern: "^_"`).
  - Type-Only Imports: Enforced for type definitions: `import type { AssetQueryDto } from '@uims/shared-types'` or inline `import { type CallHandler, Injectable } from '@nestjs/common'`.

---

## Import Organization

### Order

Maintain standard import ordering across all backend and frontend files:

1. **External Node / Runtime Libraries:**
   ```typescript
   import fs from 'node:fs';
   import path from 'node:path';
   ```
2. **Third-Party Frameworks & Libraries:**
   ```typescript
   import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
   import { ApiOperation, ApiTags } from '@nestjs/swagger';
   import { Button, Card, Flex, Form, Tooltip } from 'antd';
   import axios from 'axios';
   import dayjs from 'dayjs';
   import { create } from 'zustand';
   ```
3. **Workspace Internal Packages (`@uims/*`):**
   ```typescript
   import type { AssetQueryDto, AssetStatsDto } from '@uims/shared-types';
   import { mapAssetStatus, mapAssetStatusToLabel } from '@uims/shared-utils';
   import { createAssetSchema } from '@uims/shared-validators';
   ```
4. **Internal Module & Relative Imports:**
   ```typescript
   import { PrismaService } from '../../database/prisma.service';
   import PageContainer from '../../components/PageContainer';
   import { AssetTable } from './components/AssetTable';
   import { useAssetManagement } from './hooks/useAssetManagement';
   ```

### Path Aliases

- **Frontend (`apps/web`):**
  - `@/*` maps to `apps/web/src/*` (e.g., `@/components/PageContainer`, `@/stores/auth.store`).
  - `@uims/shared-types` maps to `packages/shared-types/src`.
  - `@uims/shared-validators` maps to `packages/shared-validators/src`.
  - `@uims/shared-utils` maps to `packages/shared-utils/src`.
- **Backend (`apps/api`):**
  - Workspace packages referenced via `pnpm` workspace protocol: `@uims/shared-types`, `@uims/shared-utils`, `@uims/shared-validators`.
  - Local api module imports use relative paths (e.g., `../../database/prisma.service`).

---

## Error Handling

### Backend API Error Handling

- **Exception Filters (`apps/api/src/common/filters/`):**
  - `HttpExceptionFilter`: Captures all NestJS `HttpException` instances and serializes them into a consistent response envelope:
    ```typescript
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
    ```
  - `PrismaExceptionFilter`: Intercepts `Prisma.PrismaClientKnownRequestError` and `Prisma.PrismaClientValidationError` and translates DB error codes to standard HTTP statuses:
    - `P2002` (Unique constraint violation) &rarr; `409 CONFLICT`
    - `P2025` (Record not found) &rarr; `404 NOT_FOUND`
    - `P2003` (Foreign key constraint violation) &rarr; `400 BAD_REQUEST`
    - `P2014` (Relation constraint violation) &rarr; `400 BAD_REQUEST`
    - `P2000` (Value too long for column) &rarr; `400 BAD_REQUEST`
    - `PrismaClientValidationError` &rarr; `400 BAD_REQUEST`
- **Service Layer Exceptions:**
  - Throw standard NestJS exceptions from `@nestjs/common`: `NotFoundException`, `UnauthorizedException`, `BadRequestException`, `ForbiddenException`, `ConflictException`.
  - Never return raw database error instances or crash the process.

### Frontend Error Handling

- **Axios Interceptor (`apps/web/src/services/api.ts`):**
  - Requests failing with `401 Unauthorized` automatically trigger token refresh via `/auth/refresh`.
  - Concurrent failing requests are queued (`failedQueue`) and replayed once the new token is acquired.
  - If refresh fails, session state is cleared (`useAuthStore.getState().logout()`) and user is redirected to `/login`.
- **UI Notifications:**
  - Always use Ant Design's `App.useApp()` hook context (`const { message, notification, modal } = App.useApp();`) rather than static `message.error()` to support theme context.
  - Wrap async handlers with `try/catch`, extract error messages safely (`(err as any).response?.data?.message || 'Fallback message'`), and alert the user via `message.error(...)`.
- **React Error Boundary:**
  - `apps/web/src/components/ErrorBoundary.tsx` catches rendering faults and renders a fallback UI without unmounting the entire application.

---

## Logging

### Framework

- **Backend:** Pino (`pino`, `pino-http`) integrated with NestJS `Logger` (`@nestjs/common`).
- **Audit Logging:** Database-backed audit trail via `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`).

### Logging Patterns

- **NestJS Service & Bootstrap Logging:**
  - Instantiate contextual logger: `private readonly logger = new Logger(ServiceName.name);`
  - Log operational events: `this.logger.log(...)`, `this.logger.warn(...)`, `this.logger.error(...)`.
- **Audit Logging Interceptor:**
  - Automatically captures all mutating HTTP methods (`POST`, `PATCH`, `PUT`, `DELETE`).
  - Redacts sensitive request keys before persistence (`password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `secret`).
  - Records user ID, user email, action type, IP address (extracting `X-Forwarded-For`), client user agent, and JSON diff payload into PostgreSQL `AuditLog`.
- **Frontend Logging:**
  - Catch blocks output diagnostic details via `console.error(err)` while displaying sanitized user-friendly strings to the end user.

---

## Comments

### When to Comment

- Explain non-obvious business logic, data sanitization, complex SQL/Prisma transactions, and security policies.
- Explain UI layout quirks, responsive breakpoint arithmetic, or manual Vite chunking strategies (`apps/web/vite.config.ts`).
- Avoid trivial or redundant comments that merely restate method signatures.

### API Documentation (OpenAPI / Swagger)

- Annotate every NestJS Controller and Route with Swagger decorators:
  - `@ApiTags('<module-name>')` at controller level.
  - `@ApiOperation({ summary: '<descriptive summary>' })` on each endpoint.
  - `@ApiOkResponse()` / `@ApiPaginatedResponse(DtoClass)` on response schemas.
  - `@Public()` on unauthenticated public routes (`/auth/login`, `/health`).

---

## Function Design

### Size and Single Responsibility

- Functions must be concise and focused on a single task.
- Extract complex normalization, data mapping, and validation into pure helper functions:
  - Formatting helpers: `formatAsset(asset: AssetWithRelations)`
  - Payload builders: `buildAssetPayload(values)`, `buildAssetSpecs(values)`
  - Sanitize utilities: `sanitizePayload(obj)`

### Parameters

- Controller and service methods take structured DTO objects or explicit typed parameters rather than loose positional arguments:
  ```typescript
  async create(data: CreateAssetDto): Promise<AssetResponseDto>
  async findAll(query?: AssetQueryDto): Promise<Array<AssetResponseDto>>
  async update(id: string, data: UpdateAssetDto): Promise<AssetResponseDto>
  ```
- React hooks and complex UI functions accept an options or values configuration object with optional defaults.

### Return Values

- API controllers return typed objects directly. The global `TransformInterceptor` automatically wraps successful controller outputs into the standard envelope:
  ```json
  {
    "success": true,
    "data": { ... },
    "timestamp": "2026-08-15T08:50:00.000Z"
  }
  ```
- Frontend services unwrap the `data.data` envelope and return strongly-typed TypeScript entity objects or arrays directly to callers.

---

## Module Design

### Monorepo and Modular Monolith

- **NestJS Modular Design (`apps/api`):**
  - Encapsulate each domain into a self-contained module directory (`apps/api/src/modules/<feature>/`) containing:
    - `<feature>.module.ts`: NestJS module definition with `controllers` and `providers`.
    - `<feature>.controller.ts`: REST route endpoints, OpenAPI annotations, guards.
    - `<feature>.service.ts`: Business logic, Prisma transactions, query filtering.
    - `dto/`: Input validation classes (`class-validator`, `class-transformer`).
    - `<feature>.controller.spec.ts` & `<feature>.service.spec.ts`: Unit tests.
- **Frontend Page & Component Hierarchy (`apps/web`):**
  - Encapsulate features in `apps/web/src/pages/<feature>/`:
    - `<Feature>Page.tsx`: Top-level page container, statistics header, action buttons.
    - `components/`: Feature-specific modals, tables, drawers, filter bars.
    - `hooks/`: Feature custom hooks managing local state, forms, queries, and mutations (`use<Feature>Management.ts`).
- **Shared Code Extraction (`packages/`):**
  - `packages/shared-types`: Pure TypeScript interfaces, types, enums, DTO definitions. Zero runtime dependencies.
  - `packages/shared-validators`: Runtime Zod validation schemas for forms and request payload validation.
  - `packages/shared-utils`: Pure utility functions for dates, formatting, string manipulation, and enum mapping.
- **Barrel Files:**
  - All shared packages export their public API via root `src/index.ts` barrel files.
  - Avoid deep internal package imports; consume packages via their package root (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`).

---

*Convention analysis: 2026-08-15*

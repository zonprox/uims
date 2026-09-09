# Code Conventions
**Analysis Date:** 2026-09-09

## Naming Conventions

### Backend (`apps/api`)
- **File naming**: Strict kebab-case with role suffixes:
  - Modules: `*.module.ts` (e.g., `apps/api/src/modules/assets/assets.module.ts`)
  - Controllers: `*.controller.ts` (e.g., `apps/api/src/modules/assets/assets.controller.ts`)
  - Services: `*.service.ts` (e.g., `apps/api/src/modules/assets/assets.service.ts`)
  - DTOs: `*.dto.ts` (e.g., `apps/api/src/modules/assets/dto/create-asset.dto.ts`, `user-query.dto.ts`)
  - Guards: `*.guard.ts` (e.g., `apps/api/src/common/guards/roles.guard.ts`)
  - Interceptors: `*.interceptor.ts` (e.g., `apps/api/src/common/interceptors/audit.interceptor.ts`)
  - Filters: `*.filter.ts` (e.g., `apps/api/src/common/filters/http-exception.filter.ts`)
  - Decorators: `*.decorator.ts` (e.g., `apps/api/src/common/decorators/roles.decorator.ts`)
  - Tests: `*.spec.ts` (e.g., `assets.service.spec.ts`, `auth-isolation.adversarial.spec.ts`)
- **Class naming**: PascalCase matching entity and role:
  - Modules: `*Module` (e.g., `AssetsModule`, `AuthModule`, `AppModule`)
  - Controllers: `*Controller` (e.g., `AssetsController`, `UsersController`)
  - Services: `*Service` (e.g., `AssetsService`, `PrismaService`, `RedisService`)
  - Guards: `*Guard` (e.g., `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`)
  - Interceptors: `*Interceptor` (e.g., `TransformInterceptor`, `AuditInterceptor`)
  - Filters: `*Filter` (e.g., `HttpExceptionFilter`, `PrismaExceptionFilter`)
- **Variable and function naming**:
  - Functions & methods: camelCase (e.g., `findAll`, `formatAsset`, `resolveCategoryId`)
  - Variables & parameters: camelCase (e.g., `pageSize`, `sanitizedBody`, `userRole`)
  - Metadata keys & constants: UPPER_SNAKE_CASE (e.g., `IS_PUBLIC_KEY`, `PERMISSIONS_KEY`, `SENSITIVE_KEYS`)
- **DTO naming**:
  - Creation: `Create*Dto` (e.g., `CreateAssetDto`, `CreateUserDto`, `CreateGroupDto`)
  - Updates: `Update*Dto` (e.g., `UpdateAssetDto`, `UpdateUserDto` extending `PartialType`)
  - Queries / Filtering: `*QueryDto` (e.g., `UserQueryDto`, `AssetQueryDto`)
  - Responses / Stats: `*ResponseDto`, `*StatsDto` (e.g., `AssetStatsDto`)

### Frontend (`apps/web`)
- **Component naming**: PascalCase files and exports:
  - Pages: `*Page.tsx` (e.g., `apps/web/src/pages/assets/AssetsPage.tsx`, `LoginPage.tsx`, `DashboardPage.tsx`)
  - UI Components: PascalCase matching domain component (e.g., `AssetTable.tsx`, `AssetFormModal.tsx`, `AssetDetailDrawer.tsx`, `PageContainer.tsx`, `ErrorBoundary.tsx`)
- **Hook naming**: camelCase prefixed with `use*`:
  - Custom domain hooks: `use*` (e.g., `apps/web/src/hooks/useAccess.ts`, `useSystemHealth.ts`, `useRealtimeNotifications.ts`, `apps/web/src/pages/assets/hooks/useAssetManagement.ts`)
  - Hook tests: `use*.test.ts` (e.g., `useAccess.test.ts`)
- **Store naming**:
  - File naming: `*.store.ts` (e.g., `apps/web/src/stores/auth.store.ts`, `theme.store.ts`, `timezone.store.ts`)
  - Hook export: `use*Store` (e.g., `useAuthStore`, `useThemeStore`, `useTimezoneStore`, `useNotificationSettingsStore`)
  - Interface export: `*State` (e.g., `AuthState`, `ThemeState`, `TimezoneState`)
- **Service naming**:
  - Client instance: `apps/web/src/services/api.ts`
  - Domain API services: `*.service.ts` (e.g., `assets.service.ts`, `users.service.ts`, `directory.service.ts`)
  - Service objects: camelCase export (e.g., `assetsService`, `usersService`, `authService`)

---

## Code Patterns

### Backend Patterns
- **Service CRUD Pattern**:
  - Service methods return domain objects directly (delegating HTTP envelope wrapping to the global interceptor).
  - Standard method signatures:
    - `create(data: Create*Dto): Promise<T>`
    - `findAll(query?: *QueryDto): Promise<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number } | T[]>`
    - `findOne(id: string): Promise<T>`
    - `update(id: string, data: Update*Dto): Promise<T>`
    - `remove(id: string): Promise<T>`
    - `getStats(): Promise<*StatsDto>`
  - Complex entity writes use atomic interactive transactions: `await this.prisma.$transaction(async (tx) => { ... })` (e.g., `apps/api/src/modules/assets/assets.service.ts`).
  - Related entity lookups resolve or automatically provision relations inside transactions (e.g., `resolveCategoryId`, `resolveLocationId`).
- **Error Handling Patterns**:
  - Services throw standard NestJS built-in exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`).
  - Global `HttpExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`) normalizes HTTP exceptions into a standard JSON error envelope.
  - Global `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`) maps Prisma database codes (`P2002` -> 409 Conflict, `P2025` -> 404 Not Found, `P2003` -> 400 Bad Request, `P2000` -> 400 Bad Request, `PrismaClientValidationError` -> 400 Bad Request).
- **Validation Patterns**:
  - Request DTOs: Enforced via `class-validator` decorators (`@IsString()`, `@IsNotEmpty()`, `@IsOptional()`, `@IsInt()`, `@Min()`) and transformed via `class-transformer` (`@Type(() => Number)`).
  - Global ValidationPipe configured in `apps/api/src/main.ts`:
    ```ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    ```
  - Runtime environment configuration validation: Enforced using Zod schema parsing in `apps/api/src/config/app.config.ts`.
  - Shared domain schemas: Exported from `packages/shared-validators` using Zod for client-side or cross-boundary contract validation.
- **Auth Decorator & Guard Usage**:
  - All routes require JWT authentication by default via global `APP_GUARD` `JwtAuthGuard`.
  - `@Public()` (`apps/api/src/common/decorators/public.decorator.ts`): Bypasses JWT authentication for public endpoints (e.g., `auth/login`).
  - `@Roles('Admin', 'Super Admin')` (`apps/api/src/common/decorators/roles.decorator.ts`): Enforces role-based access control via global `RolesGuard`. Role inheritance rules: Super Admin inherits all roles; Admin inherits Manager, Technician, Auditor, and Employee.
  - `@RequirePermissions({ action: 'create', subject: 'assets' })` (`apps/api/src/common/decorators/require-permissions.decorator.ts`): Enforces granular permissions via global `PermissionsGuard` (supports wildcard subjects `subject:*` and global `*:*`).
  - `@ClientIP()` (`apps/api/src/common/decorators/client-ip.decorator.ts`): Extracts remote IP from proxy headers (`x-forwarded-for`, `cf-connecting-ip`).
- **Response Transformation Patterns**:
  - Global `TransformInterceptor` (`apps/api/src/common/interceptors/transform.interceptor.ts`) intercepts successful responses and wraps them in `{ success: true, data: T, timestamp: string }`.
  - Global `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`) logs non-GET mutations (`POST`, `PATCH`, `PUT`, `DELETE`), calculates HMAC SHA-256 tamper-evident signatures (`AUDIT_SIGNING_KEY`), redacts sensitive fields (passwords, tokens), and records execution latency.
- **Pagination Patterns**:
  - Base query: `PaginationDto` (`apps/api/src/common/dto/pagination.dto.ts`) provides optional `page = 1` and `limit = 10`.
  - Feature queries extend `PaginationDto` (e.g., `UserQueryDto`).
  - Clamping logic: `pageSize` clamped between 1 and 100 (`Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50))`).
  - Offset calculation: `skip = (page - 1) * pageSize`.

### Frontend Patterns
- **Component Structure**:
  - Functional components exclusively for all views and UI elements (`React.FC<T>` or direct `export function ComponentName()`).
  - Class components used only where mandated by React architecture: `apps/web/src/components/ErrorBoundary.tsx` (`Component<ErrorBoundaryProps, ErrorBoundaryState>`).
  - Performance optimization: Heavy data presentation components are memoized using `React.memo` (e.g., `AssetTable`, `AssetFormModal`).
  - Page layout consistency: All page views wrap their content in `<PageContainer>` (`apps/web/src/components/PageContainer.tsx`), supplying standard breadcrumbs, KPIs (`stats`), filter controls, and action buttons.
- **Data Fetching Patterns**:
  - TanStack React Query (`@tanstack/react-query` v5.102.8) is configured globally at the app root (`apps/web/src/app/App.tsx`, `apps/web/src/app/query-client.ts`) with `staleTime: 60000`, `gcTime: 600000`, and automatic 401/403 retry suppression.
  - Page-level feature state currently employs dedicated custom hooks (e.g., `useAssetManagement`, `useSystemHealth`) wrapping Axios service calls (`apps/web/src/services/`) with `useState`, `useEffect`, and `useCallback` for loading indicators, error reporting, and refetching.
- **Form Handling Patterns**:
  - Ant Design `Form.useForm()` creates controlled form instances (`const [form] = Form.useForm()`).
  - Vertical layout with responsive grid rows: `<Form form={form} layout="vertical">` combined with `<Row gutter={14}><Col span={12}>...`.
  - Field-level validation rules (`rules={[{ required: true, message: '...' }]}`).
  - Form population on edit: Modal triggers `form.setFieldsValue(...)` before opening.
- **Table / List Patterns with Ant Design**:
  - Memoized column definitions: `const columns = useMemo(() => [ ... ], [deps])`.
  - Rich cell formatting:
    - Identifiers rendered with `<Typography.Text code strong>`.
    - Categorical values and statuses mapped to colorized `<Tag color="...">`.
    - Formatted dates via `<FormattedDate date={...} />`.
    - Action buttons wrapped in `<Space size="small">` with `<Tooltip>` and destructive confirmations inside `<Popconfirm>`.
  - Responsive horizontal scrolling: `scroll={{ x: 'max-content' }}`.
  - Pagination configuration: `pageSizeOptions: ['10', '25', '50', '100']`, `showSizeChanger: true`, `showTotal: (total) => 'Total ${total} items'`.
- **Modal / Drawer Patterns**:
  - State management: Pair of `[open, setOpen]` and `[submitting, setSubmitting]` in parent component or custom hook.
  - Modals: `<Modal open={open} onOk={onSave} onCancel={onCancel} confirmLoading={submitting}>` (e.g., `AssetFormModal.tsx`).
  - Drawers: `<Drawer open={open} onClose={onClose} width={...}>` (e.g., `AssetDetailDrawer.tsx`).
- **Error Boundary Patterns**:
  - Two-tier boundary hierarchy:
    - Root boundary in `App.tsx` guarding the full application tree.
    - Inner boundary in `App.tsx` guarding router transitions inside `<AntApp>`.
  - Fallback view: `ErrorResultView.tsx` provides diagnostics, collapsible technical stack trace, and action recovery buttons (`Try Again`, `Reload Page`, `Return to Dashboard`, `Sign In Again`).
- **Theme & Feedback Context Usage**:
  - Strict consumption of Ant Design dynamic feedback via `App.useApp()`:
    ```tsx
    const { message, notification, modal } = App.useApp();
    ```
  - Static `message.error(...)` or `Modal.confirm(...)` is forbidden in components to prevent React context leakage and broken theme styling.
  - Semantic styling: Use `styles={{ body: ... }}` / `styles={{ content: ... }}` rather than deprecated Ant Design v4/v5 props (`bodyStyle`, `headStyle`).

---

## Import Conventions

### Ordering
Imports strictly follow a three-tier block structure separated by blank lines:
1. **Framework & Standard Library**:
   ```ts
   import React, { useMemo, useState, useCallback } from 'react';
   import { Injectable, Controller, Get, Post, Body } from '@nestjs/common';
   import path from 'node:path';
   import crypto from 'node:crypto';
   ```
2. **Third-Party Libraries**:
   ```ts
   import { Button, Table, Modal, Card, Tag } from 'antd';
   import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
   import { z } from 'zod';
   import axios from 'axios';
   ```
3. **Internal Workspaces & Local Modules**:
   ```ts
   import type { Asset, AssetStats } from '@uims/shared-types';
   import { mapAssetStatus } from '@uims/shared-utils';
   import { PrismaService } from '../../database/prisma.service';
   import { useAuthStore } from '../stores/auth.store';
   ```

### Path Aliasing
- **Frontend (`apps/web`)**:
  - `@/*` maps to `./src/*` (configured in `apps/web/tsconfig.json` and `apps/web/vite.config.ts`).
  - Monorepo package aliases point to source directories during development:
    - `@uims/shared-types` -> `packages/shared-types/src/index.ts`
    - `@uims/shared-validators` -> `packages/shared-validators/src/index.ts`
    - `@uims/shared-utils` -> `packages/shared-utils/src/index.ts`
- **Backend (`apps/api`)**:
  - Uses relative path imports within the `src` directory tree (e.g., `../../common/guards/roles.guard`).
  - Uses workspace package specifiers for monorepo packages (`@uims/shared-types`, `@uims/shared-utils`, `@uims/shared-validators`).

### Barrel Exports Patterns
- Shared packages export their public API through root `index.ts`:
  - `packages/shared-types/src/index.ts`: exports DTOs (`./dto/*`), Entities (`./entities/*`), and Enums (`./enums`).
  - `packages/shared-validators/src/index.ts`: exports all Zod schema validators.
  - `packages/shared-utils/src/index.ts`: exports utility functions, formatters, and dayjs setup.
- Selective re-exports in backend common directories (e.g., `apps/api/src/common/guards/jwt-auth.guard.ts` re-exports `JwtAuthGuard` from `modules/auth/auth.guard.ts`).

---

## API Contract Conventions

### Base URL & Versioning
- All API routes are strictly versioned under `/api/v1` (configured via `app.setGlobalPrefix('api/v1')` in `apps/api/src/main.ts`).
- Interactive Swagger OpenAPI documentation is hosted at `/api/v1/docs`.
- Frontend Axios client is pre-configured with `baseURL: '/api/v1'`.

### Response Envelope Format
Successful responses conform to the standard envelope:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-09-09T11:00:00.000Z"
}
```

### Error Response Format
All application and database exceptions are serialized into the standard error envelope:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed on field 'serialNumber'",
  "errors": ["serialNumber must be a string"],
  "timestamp": "2026-09-09T11:00:00.000Z"
}
```

### Pagination Contract
- **Request parameters**:
  - `page`: 1-indexed positive integer (default: `1`).
  - `limit` or `pageSize`: items per page (default: `10` or `50`, maximum: `100`).
  - `search`: optional substring search term.
  - `sort`: optional field name to order by.
  - `order`: `'asc'` | `'desc'`.
- **Response structure**:
  ```json
  {
    "success": true,
    "data": {
      "items": [ ... ],
      "total": 142,
      "page": 1,
      "pageSize": 20,
      "totalPages": 8
    },
    "timestamp": "2026-09-09T11:00:00.000Z"
  }
  ```

---

## Git & Commit Conventions

### Commit Format
The repository adheres to Conventional Commits: `<type>(<scope>): <subject>`
- **Permitted Types**:
  - `feat`: New feature or user capability.
  - `fix`: Bug fix.
  - `refactor`: Code change that neither fixes a bug nor adds a feature.
  - `test`: Adding or correcting tests.
  - `docs`: Documentation updates or guidelines.
  - `chore`: Build tasks, dependency updates, configuration adjustments.
  - `ci`: CI/CD workflow updates.
- **Observed Scopes**: `assets`, `identity`, `guidelines`, `api`, `web`, `copy`, `notifications`, `users`, `dev`.
- **Commit History Examples**:
  - `feat(assets): encode raw asset tag in QR codes for enterprise ITAM standard`
  - `feat(identity): decouple app access accounts from corporate directory records`
  - `test(api): declare AUDIT_SIGNING_KEY in turbo globalEnv and stabilize audit test async wait`
  - `ci: inject fail-fast database and secret environment variables in CI workflow`
  - `refactor: resolve security vulnerabilities, upgrade dependencies, and establish GEMINI.md standards`

### Language & Copy Conventions
- 100% Professional, Concise Enterprise English is strictly mandatory across all commit messages, PR descriptions, source code comments, UI labels, alert notifications, modal copy, and API messages.
- Elimination of buzzwords: UI labels must not use redundant prefixes such as "Enterprise ...", "Unified ...", or "Master ..." unless differentiating functional namespaces.
- Action buttons are short, direct, and verb-first (`Create Asset`, `Export CSV`, `Save Changes`).

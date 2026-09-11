# Coding Conventions

**Analysis Date:** 2026-09-11

## Naming Patterns

**Files:**
- Backend: `kebab-case.ts` — `auth.service.ts`, `jwt-auth.guard.ts`, `create-asset.dto.ts`, `http-exception.filter.ts`
- Frontend components: `PascalCase.tsx` — `DashboardPage.tsx`, `ErrorBoundary.tsx`, `MainLayout.tsx`, `PageContainer.tsx`
- Frontend services: `kebab-case.ts` — `api.ts`, `auth.service.ts`, `assets.service.ts`
- Frontend stores: `kebab-case.ts` — `auth.store.ts`, `theme.store.ts`, `notification-settings.store.ts`
- Frontend hooks: `camelCase.ts` — `useAccess.ts`, `useRealtimeNotifications.ts`, `useSystemHealth.ts`
- Tests: `*.spec.ts` (API), `*.test.ts` / `*.test.tsx` (Web and packages)
- DTOs: `{action}-{entity}.dto.ts` — `create-asset.dto.ts`, `update-asset.dto.ts`

**Functions:**
- Use `camelCase` — `findAll()`, `getStats()`, `handleConnection()`, `resolveAllowedOrigins()`
- Service methods: verb-first — `create()`, `findAll()`, `findOne()`, `update()`, `remove()`
- Utility functions: descriptive — `generateAssetTag()`, `mapAssetStatus()`, `resolveDescendantLocationIds()`

**Variables:**
- Use `camelCase` — `isConnected`, `memoryCache`, `dbLatencyMs`, `webPort`
- Constants: `UPPER_SNAKE_CASE` — `VENDOR_RULES`, `APP_GUARD`, `APP_INTERCEPTOR`
- Private class fields: `private readonly logger`, `private client`, `private isConnected`

**Types/Interfaces:**
- Use `PascalCase` — `AssetWithRelations`, `AuthenticatedSocketData`, `Response<T>`
- Enums: `PascalCase` with `UPPER_SNAKE_CASE` members — `AssetStatus.IN_USE`, `LicenseType.SUBSCRIPTION`
- DTOs: `PascalCase` ending in `Dto` — `CreateAssetDto`, `UpdateAssetDto`, `PaginationDto`, `AssetQueryDto`
- Prisma generated types: `Prisma.AssetGetPayload<{ include: {...} }>` for complex includes

**NestJS Modules:**
- Module: `{Domain}Module` — `AssetsModule`, `AuthModule`
- Controller: `{Domain}Controller` — `AssetsController`
- Service: `{Domain}Service` — `AssetsService`
- Guard: `{Purpose}Guard` — `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`

## Code Style

**Formatting (Biome — `biome.json`):**
- Indent: 2 spaces
- Line width: 100 characters
- Line ending: LF
- Quotes: Single quotes
- Semicolons: Always
- Trailing commas: All positions

**Linting (ESLint — `packages/eslint-config/index.js`):**
- Base: `typescript-eslint` recommended
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: error (ignore `_` prefixed)
- `@typescript-eslint/explicit-function-return-type`: off

**Biome Linting (`biome.json`):**
- Preset: recommended
- `noExcessiveCognitiveComplexity`: warn
- `noExplicitAny`: warn
- `noNonNullAssertion`: warn
- `useConsistentArrayType`: warn (generic syntax — `Array<T>` over `T[]`)
- `useImportType`: off

## Import Organization

**Order (API — NestJS):**
1. NestJS framework imports (`@nestjs/common`, `@nestjs/core`, etc.)
2. Third-party library imports (`bcrypt`, `rxjs`, `socket.io`)
3. Prisma imports (`@prisma/client`)
4. Shared package imports (`@uims/shared-types`, `@uims/shared-utils`, `@uims/shared-validators`)
5. Relative imports (local modules, services, DTOs)

**Order (Web — React):**
1. React and React-related imports (`react`, `react-router`)
2. Ant Design imports (`antd`, `@ant-design/icons`, `@ant-design/pro-components`)
3. Third-party imports (`@tanstack/react-query`, `axios`, `dayjs`, `zod`, `zustand`)
4. Shared package imports (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`)
5. Relative imports (components, hooks, stores, services)

**Path Aliases (Web):**
- `@/*` → `apps/web/src/*`
- `@uims/shared-types` → `packages/shared-types/src`
- `@uims/shared-validators` → `packages/shared-validators/src`
- `@uims/shared-utils` → `packages/shared-utils/src`

**Import Type:**
- Use `import type { ... }` for type-only imports (enforced in API): `import type { AssetQueryDto } from '@uims/shared-types'`
- Use regular `import` for runtime values

## Error Handling

**Backend (NestJS):**
- Throw `HttpException` subclasses: `NotFoundException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `ServiceUnavailableException`
- Catch clauses type errors as `unknown`: `catch (error: unknown)`
- Narrow errors safely: `error instanceof Error ? error.message : String(error)`
- Log errors with context: `this.logger.error('Context message', error instanceof Error ? error.stack : undefined)`
- Global filters translate Prisma errors to HTTP responses: `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`)

**Frontend (React):**
- `ErrorBoundary` wraps entire app and individual routes (`apps/web/src/components/ErrorBoundary.tsx`)
- `RouteErrorBoundary` provides per-route error isolation (`apps/web/src/components/RouteErrorBoundary.tsx`)
- Use `App.useApp()` for feedback: `const { message, notification, modal } = App.useApp()`
- Never use static `message.error()` from `antd` — always use dynamic context

## Logging

**Backend:**
- Framework: NestJS `Logger` class
- Pattern: `private readonly logger = new Logger(ClassName.name)`
- Usage: `this.logger.log(...)`, `this.logger.warn(...)`, `this.logger.error(...)`
- Banned: `console.log`, `console.warn`, `console.error` in production code
- Exception: `console.error` for startup validation failures in `apps/api/src/config/app.config.ts`

**Frontend:**
- `console.error` only in `ErrorBoundary.componentDidCatch` (`apps/web/src/components/ErrorBoundary.tsx`)
- All other error reporting via Ant Design feedback: `message.error(...)`, `notification.error(...)`

## Comments

**When to Comment:**
- Non-obvious business logic or edge cases
- Security-relevant decisions (CORS, auth bypass)
- API documentation via Swagger decorators (`@ApiOperation`, `@ApiTags`)
- Complex Prisma queries with joins or aggregations

**JSDoc/TSDoc:**
- Minimal usage — Swagger decorators serve as API documentation
- Type information conveyed through TypeScript types rather than JSDoc

## Function Design

**Size:** Most service methods are 20-60 lines. Pages are larger (100-300 lines) but decomposed into hooks and sub-components.

**Parameters:**
- DTOs for controller inputs: `@Body() body: CreateAssetDto`, `@Query() query: AssetQueryDto`
- Constructor injection for dependencies: `constructor(private readonly assetsService: AssetsService) {}`
- `@Optional()` decorator for optional injections: `@Optional() private readonly prisma?: PrismaService`

**Return Values:**
- Services return plain objects or Prisma query results
- Controllers delegate entirely to services (no business logic in controllers)
- Response envelope applied automatically by `TransformInterceptor`

## Module Design

**Backend (NestJS):**
- Each domain module exports: Module, Controller, Service, DTOs
- Services inject `PrismaService` for database access
- Cross-module service injection via module imports
- Global modules: `RedisModule`, `PrismaModule` (available everywhere)

**Frontend (React):**
- Pages are lazy-loaded via `React.lazy()` + `Suspense` in router
- State stores are standalone Zustand stores (not context-based)
- API services are plain functions calling Axios (not hooks)
- TanStack Query wraps API calls in `useQuery`/`useMutation` inside page components

**Shared Packages:**
- ESM-only output (`*.mjs`) via tsdown bundler
- Barrel re-export via `src/index.ts`
- Type declarations generated alongside (`*.d.mts`)

**Barrel Files:**
- `packages/shared-types/src/index.ts` — Re-exports all DTOs and entities
- `packages/shared-validators/src/index.ts` — Re-exports all validators
- `packages/shared-utils/src/index.ts` — Re-exports all utility modules

## Ant Design v6 Conventions

**Mandatory Patterns:**
- Wrap app in `<ConfigProvider>` → `<App>` for theme context (`apps/web/src/app/index.tsx`)
- Use `App.useApp()` for dynamic feedback: `const { message, modal, notification } = App.useApp()`
- Use semantic token styles: `styles={{ body: { ... } }}` for Card, Drawer, Modal
- Use `<PageContainer>` for consistent page structure (`apps/web/src/components/PageContainer.tsx`)
- Use `@ant-design/pro-components` with `ProConfigProvider` and `enUSIntl`

**Banned Anti-Patterns:**
- Static `message.error()` / `Modal.confirm()` / `notification.open()` from `antd`
- Deprecated props: `bodyStyle`, `headStyle`, `valueStyle`
- Raw global CSS overrides on Ant Design components

---

*Convention analysis: 2026-09-11*

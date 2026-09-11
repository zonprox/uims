# Coding Conventions & Architectural Patterns

Authoritative coding conventions, naming rules, architectural patterns, and type safety standards for the Unified IT Management System (UIMS) monorepo.

---

## 1. Tooling & Ecosystem Standards (2026)

| Tool / Technology | Version | Purpose & Configuration |
|:---|:---|:---|
| **TypeScript** | `^7.0.2` | Monorepo-wide language standard; strict type safety; zero-downgrade policy enforced. |
| **Node.js** | `>=22.0.0` | Production runtime and developer environment standard. |
| **Package Manager** | `pnpm 11.21.0` | Workspace management with Turborepo orchestration. |
| **Linter** | `ESLint 10.10.0` | `@typescript-eslint/eslint-plugin ^8.70.0`, `@typescript-eslint/parser ^8.70.0`. |
| **Formatter** | `Biome 2.5.12` | Indent: 2 spaces, line width: 100, single quotes, trailing commas: `all`, semicolons: `always`. |
| **Backend Framework** | `NestJS 11.2.3` | Modular monolith architecture on Express platform. |
| **Frontend Framework** | `React 19.2.8` | Single-Page Application (SPA) with Ant Design `^6.6.3` and Vite `^8.2.2`. |

---

## 2. Naming Conventions

- **Files and Directories**:
  - Backend modules, filters, guards, and services use `kebab-case` with functional suffixes:
    - Evidence: [`apps/api/src/common/filters/http-exception.filter.ts`](file:///home/user/projects/uims/apps/api/src/common/filters/http-exception.filter.ts), [`apps/api/src/common/guards/permissions.guard.ts`](file:///home/user/projects/uims/apps/api/src/common/guards/permissions.guard.ts), [`apps/api/src/modules/assets/assets.service.ts`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.service.ts).
  - React components, pages, and layout views use `PascalCase`:
    - Evidence: [`apps/web/src/pages/assets/AssetsPage.tsx`](file:///home/user/projects/uims/apps/web/src/pages/assets/AssetsPage.tsx), [`apps/web/src/components/PageContainer.tsx`](file:///home/user/projects/uims/apps/web/src/components/PageContainer.tsx), [`apps/web/src/components/ErrorBoundary.tsx`](file:///home/user/projects/uims/apps/web/src/components/ErrorBoundary.tsx).
  - Stores and hooks use `kebab-case` or `camelCase` prefixed with `use`:
    - Evidence: [`apps/web/src/stores/auth.store.ts`](file:///home/user/projects/uims/apps/web/src/stores/auth.store.ts), [`apps/web/src/pages/assets/hooks/useAssetManagement.ts`](file:///home/user/projects/uims/apps/web/src/pages/assets/hooks/useAssetManagement.ts).
- **Classes, Interfaces, and DTOs**:
  - Classes and Interfaces use `PascalCase`:
    - Evidence: `AssetsController`, `TransformInterceptor<T>`, `ApiResponse<T>`.
  - Data Transfer Objects (DTOs) suffix with `Dto`:
    - Evidence: [`CreateAssetDto`](file:///home/user/projects/uims/apps/api/src/modules/assets/dto/create-asset.dto.ts), [`UpdateAssetDto`](file:///home/user/projects/uims/apps/api/src/modules/assets/dto/update-asset.dto.ts), [`AssetQueryDto`](file:///home/user/projects/uims/packages/shared-types/src/dto/assets.dto.ts).
- **Functions and Variables**:
  - Functions and variables use `camelCase`:
    - Evidence: `generateAssetTag()`, `extractClientIp()`, `buildThemeConfig()`.
  - Constants and environment keys use `UPPER_SNAKE_CASE`:
    - Evidence: `PERMISSIONS_KEY`, `JWT_SECRET`, `AUDIT_SIGNING_KEY`.

---

## 3. Backend Architecture & Module Organization (NestJS)

Each domain module in `apps/api/src/modules/<feature>/` adheres to a strict structural pattern:

- **Module Definition (`<feature>.module.ts`)**: Encapsulates controllers, services, database providers, and internal/external exports.
  - Evidence: [`apps/api/src/modules/assets/assets.module.ts`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.module.ts), [`apps/api/src/modules/auth/auth.module.ts`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.module.ts).
- **Controller Layer (`<feature>.controller.ts`)**: Handles HTTP routing, Swagger documentation (`@ApiTags()`, `@ApiOperation()`), and RBAC guards (`@Roles()`, `@RequirePermissions()`). Controllers contain no business or database logic.
  - Evidence: [`apps/api/src/modules/assets/assets.controller.ts`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.controller.ts), [`apps/api/src/modules/directory/directory.controller.ts`](file:///home/user/projects/uims/apps/api/src/modules/directory/directory.controller.ts).
- **Service Layer (`<feature>.service.ts`)**: Implements domain business logic, manages Prisma `$transaction` blocks, and injects NestJS `Logger`.
  - Evidence: [`apps/api/src/modules/assets/assets.service.ts`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.service.ts), [`apps/api/src/modules/auth/auth.service.ts`](file:///home/user/projects/uims/apps/api/src/modules/auth/auth.service.ts).
- **Validation DTOs (`dto/`)**: Class definitions using `class-validator` and `class-transformer` decorators.
  - Evidence: [`apps/api/src/modules/assets/dto/create-asset.dto.ts`](file:///home/user/projects/uims/apps/api/src/modules/assets/dto/create-asset.dto.ts).
- **Authentication Strategies (`strategies/`)**: Passport strategy implementations.
  - Evidence: [`apps/api/src/modules/auth/strategies/jwt.strategy.ts`](file:///home/user/projects/uims/apps/api/src/modules/auth/strategies/jwt.strategy.ts).

---

## 4. Frontend Component & Layout Architecture (React 19 + Ant Design v6)

Frontend feature development follows a unidirectional hierarchical pipeline:
`Page -> PageContainer -> Feature Components -> Custom Hooks -> Domain Services -> Axios API Client`

- **Page Structure**:
  - Domain pages wrap top-level UI in `<PageContainer>` providing title, subtitle, breadcrumbs, metrics summary, and action buttons.
  - Evidence: [`apps/web/src/pages/assets/AssetsPage.tsx`](file:///home/user/projects/uims/apps/web/src/pages/assets/AssetsPage.tsx), [`apps/web/src/pages/directory/DirectoryPage.tsx`](file:///home/user/projects/uims/apps/web/src/pages/directory/DirectoryPage.tsx).
- **Component Decomposition**:
  - Modals, drawers, tables, and filter bars reside in dedicated `components/` directories under each feature page.
  - Evidence: [`apps/web/src/pages/assets/components/AssetFilterBar.tsx`](file:///home/user/projects/uims/apps/web/src/pages/assets/components/AssetFilterBar.tsx), [`apps/web/src/pages/assets/components/AssetTable.tsx`](file:///home/user/projects/uims/apps/web/src/pages/assets/components/AssetTable.tsx), [`apps/web/src/pages/assets/components/AssetDetailDrawer.tsx`](file:///home/user/projects/uims/apps/web/src/pages/assets/components/AssetDetailDrawer.tsx).
- **Custom Business Hooks**:
  - Complex UI state, form bindings, and query executions are factored out of pages into hooks.
  - Evidence: [`apps/web/src/pages/assets/hooks/useAssetManagement.ts`](file:///home/user/projects/uims/apps/web/src/pages/assets/hooks/useAssetManagement.ts), [`apps/web/src/hooks/useSystemHealth.ts`](file:///home/user/projects/uims/apps/web/src/hooks/useSystemHealth.ts).
- **Ant Design v6 Semantic Token Styling Mandate**:
  - Components use semantic `styles` props:
    - `Card`: `styles={{ body: { padding: '16px 20px' } }}`
    - `Statistic`: `styles={{ content: { ... } }}`
    - `Drawer` / `Modal`: `styles={{ body: { ... } }}`
  - Prohibited anti-patterns: Deprecated v4/v5 `bodyStyle`, `headStyle`, `valueStyle`.
  - Evidence: [`apps/web/src/pages/assets/AssetsPage.tsx:L113`](file:///home/user/projects/uims/apps/web/src/pages/assets/AssetsPage.tsx#L113).
- **Dynamic Feedback Context (`App.useApp()`)**:
  - Feedback instances must be acquired dynamically: `const { message, modal, notification } = App.useApp();`. Calling static methods `message.error()` or `Modal.confirm()` directly from an `antd` import is forbidden due to theme context loss and React 19 concurrency issues.
  - Evidence: [`apps/web/src/pages/assets/hooks/useAssetManagement.ts:L70`](file:///home/user/projects/uims/apps/web/src/pages/assets/hooks/useAssetManagement.ts#L70), [`apps/web/src/app/App.tsx:L41`](file:///home/user/projects/uims/apps/web/src/app/App.tsx#L41).

---

## 5. State Management Patterns (Zustand 5)

Client-side state stores reside in `apps/web/src/stores/` and use Zustand `5.0.15`:

- **Persistence**: Stores requiring local retention use `persist` middleware with unique storage keys.
  - Evidence: [`apps/web/src/stores/auth.store.ts`](file:///home/user/projects/uims/apps/web/src/stores/auth.store.ts) (`uims-auth-storage`), [`apps/web/src/stores/theme.store.ts`](file:///home/user/projects/uims/apps/web/src/stores/theme.store.ts) (`uims-theme-storage`).
- **Selector Pattern**: Components subscribe to atomic state slices to prevent unnecessary re-renders:
  - `const mode = useThemeStore((state) => state.mode);`
  - Evidence: [`apps/web/src/app/App.tsx:L18-22`](file:///home/user/projects/uims/apps/web/src/app/App.tsx#L18-L22).
- **Zero Circular Dependencies**:
  - Network clients (`api.ts`) read authentication state directly via `useAuthStore.getState().token` without triggering circular service imports.
  - Evidence: [`apps/web/src/services/api.ts:L30`](file:///home/user/projects/uims/apps/web/src/services/api.ts#L30).

---

## 6. Error Handling & Resilience Patterns

- **Backend Global Exception Filters**:
  - `HttpExceptionFilter`: Intercepts standard NestJS HTTP exceptions, formatting responses into `{ success: false, statusCode, message, errors?, timestamp }`.
    - Evidence: [`apps/api/src/common/filters/http-exception.filter.ts`](file:///home/user/projects/uims/apps/api/src/common/filters/http-exception.filter.ts).
  - `PrismaExceptionFilter`: Catches `PrismaClientKnownRequestError` and translates error codes (`P2002` -> 409 Conflict, `P2025` -> 404 Not Found, `P2003`/`P2014`/`P2000` -> 400 Bad Request) into user-safe messages without exposing raw database details.
    - Evidence: [`apps/api/src/common/filters/prisma-exception.filter.ts`](file:///home/user/projects/uims/apps/api/src/common/filters/prisma-exception.filter.ts).
- **Frontend Error Boundaries**:
  - Centralized `<ErrorBoundary>` catches render crashes, provides full diagnostic inspection in development, and offers reset/reload navigation fallbacks via `<ErrorResultView>`.
  - Evidence: [`apps/web/src/components/ErrorBoundary.tsx`](file:///home/user/projects/uims/apps/web/src/components/ErrorBoundary.tsx), [`apps/web/src/components/RouteErrorBoundary.tsx`](file:///home/user/projects/uims/apps/web/src/components/RouteErrorBoundary.tsx).
- **Zero Silent Catch Policy**:
  - Empty catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly banned. Every error must be logged with structured context, re-thrown as a domain error, or surfaced via user feedback.
  - Catch clauses must explicitly declare errors as `unknown`: `catch (error: unknown)` and narrow with `if (error instanceof Error)`.
  - Evidence: [`apps/web/src/services/api.ts:L100-104`](file:///home/user/projects/uims/apps/web/src/services/api.ts#L100-L104), [`apps/web/src/components/ErrorBoundary.tsx:L105-107`](file:///home/user/projects/uims/apps/web/src/components/ErrorBoundary.tsx#L105-L107).

---

## 7. TypeScript Strictness & Defect Prevention Directives

- **Zero `any` Policy**:
  - Usage of `any` or `as any` is strictly forbidden. Use `unknown`, exact interfaces, or Prisma generated types (`Prisma.AssetGetPayload<{ include: ... }>`).
  - Evidence: [`apps/api/src/modules/assets/assets.service.ts:L19-27`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.service.ts#L19-L27), [`apps/api/src/modules/assets/dto/create-asset.dto.ts:L62`](file:///home/user/projects/uims/apps/api/src/modules/assets/dto/create-asset.dto.ts#L62).
- **Zero Diagnostics Suppressions**:
  - `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` are prohibited without explicit tracking identifiers.
- **Mandatory Bounded Queries & Pagination**:
  - Every Prisma `findMany()` query must enforce explicit bounds (`take: pageSize`, capped at `Math.min(limit, 100)`) with deterministic `orderBy`. Unbounded queries are banned.
  - Evidence: [`apps/api/src/modules/assets/assets.service.ts:L223-238`](file:///home/user/projects/uims/apps/api/src/modules/assets/assets.service.ts#L223-L238).
- **Zero In-Memory Aggregations**:
  - Sums, counts, and filters must execute directly inside PostgreSQL using Prisma filter operators or `$queryRaw`, never loaded into Node.js memory arrays.

---

## 8. API Response Envelope Contract

All successful REST API responses are enveloped by `TransformInterceptor`:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-09-11T07:30:00.000Z"
}
```

- **Backend Interceptor**: [`apps/api/src/common/interceptors/transform.interceptor.ts`](file:///home/user/projects/uims/apps/api/src/common/interceptors/transform.interceptor.ts).
- **Shared Response Types**: [`packages/shared-types/src/dto/api-response.ts`](file:///home/user/projects/uims/packages/shared-types/src/dto/api-response.ts) (`ApiResponse<T>`, `PaginationMeta`, `ApiErrorResponse`).
- **Axios Client Unwrapping**: Frontend services unwrap payloads via `res.data.data`:
  - Evidence: [`apps/web/src/services/assets.service.ts:L61`](file:///home/user/projects/uims/apps/web/src/services/assets.service.ts#L61).

---

## 9. Security & Authorization Conventions

- **Fail-Fast Environment Validation**:
  - Server startup terminates immediately if required environment variables fail Zod validation (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_SIGNING_KEY`).
  - Evidence: [`apps/api/src/config/app.config.ts`](file:///home/user/projects/uims/apps/api/src/config/app.config.ts).
- **Execution Guard Pipeline**:
  - Global guards in [`apps/api/src/app.module.ts`](file:///home/user/projects/uims/apps/api/src/app.module.ts):
    1. `ThrottlerGuard`: Rate limits endpoints (`1000` requests/minute).
    2. `JwtAuthGuard`: Authenticates tokens (bypassed only when `@Public()` is applied).
    3. `RolesGuard`: Validates role claims (`Admin`, `Super Admin`).
    4. `PermissionsGuard`: Validates fine-grained subject/action permissions (`@RequirePermissions({ subject: 'assets', action: 'create' })`).
- **Strict CORS & Header Security**:
  - Strict origins validation via `CORS_ORIGIN` / `ALLOWED_ORIGINS` with non-production dynamic `.trycloudflare.com` tunnel support; `credentials: true`.
  - Helmet enterprise headers enabled with HSTS preload.
  - Evidence: [`apps/api/src/main.ts:L21-67`](file:///home/user/projects/uims/apps/api/src/main.ts#L21-L67).

---

## 10. Code Style, Formatting & Import Rules

- **Import Organization**:
  - Organize imports from external libraries to local scopes:
    1. Third-party packages (`react`, `@nestjs/common`, `antd`)
    2. Workspace packages (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`)
    3. Internal absolute path aliases (`@/...`)
    4. Relative file imports (`./components/...`, `../services/...`)
- **Biome & ESLint Rules**:
  - Configured in [`biome.json`](file:///home/user/projects/uims/biome.json) and [`packages/eslint-config/index.js`](file:///home/user/projects/uims/packages/eslint-config/index.js):
  - `@typescript-eslint/no-unused-vars`: Error out unless prefixed with `_` (e.g. `_context`, `_data`).
  - `@typescript-eslint/no-explicit-any`: Set to `warn` (strictly banned by monorepo `AGENTS.md`).
  - Biome checks cognitive complexity (`noExcessiveCognitiveComplexity: 'warn'`).

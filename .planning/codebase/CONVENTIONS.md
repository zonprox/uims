# Code Quality & Conventions

**Analysis Date:** 2026-08-20

## File Naming
- **API (NestJS)**: Files are organized by feature and named using kebab-case with explicit suffixes (e.g., `inventory.controller.ts`, `inventory.service.ts`, `inventory.module.ts`). DTOs follow the `.dto.ts` pattern (e.g., `create-inventory-item.dto.ts`).
- **Web (React)**: 
  - **Components & Layouts**: PascalCase (e.g., `MainLayout.tsx`, `PageContainer.tsx`, `ErrorBoundary.tsx`).
  - **Hooks**: camelCase with a `use` prefix (e.g., `useLayoutTelemetry.ts`, `useRealtimeNotifications.ts`).
  - **Stores (Zustand)**: camelCase with a `.store.ts` suffix (e.g., `auth.store.ts`, `theme.store.ts`).
  - **Utilities**: camelCase (e.g., `menuConfig.ts`).

## Code Organization
The repository is a Turborepo monorepo with a separation between frontend and backend.
- **Backend (`apps/api/src`)**: 
  - Modular architecture grouped by feature under `modules/` (e.g., `modules/inventory`, `modules/notifications`).
  - Cross-cutting concerns are organized in `common/` (e.g., `common/filters/`, `common/decorators/`).
- **Frontend (`apps/web/src`)**:
  - `components/`: Generic, reusable UI components.
  - `layouts/`: Application structural wrappers.
  - `pages/`: Feature-based routing components.
  - `hooks/`: Extracted business logic and UI state.
  - `stores/`: Global state management.
  - `services/`: API clients and data fetching logic.

## Backend Conventions
- **Framework**: NestJS.
- **Decorators**: Extensive use of standard decorators (`@Controller()`, `@Get()`, `@Body()`) for routing and parameter extraction.
- **Validation**: Data Transfer Objects (DTOs) with class-validator/class-transformer are used to define request payload shapes (e.g., `CreateInventoryItemDto`).
- **Access Control**: Role-based access control (RBAC) is implemented via custom decorators (e.g., `@Roles('Admin', 'Super Admin')`).
- **API Documentation**: Endpoints are richly decorated with Swagger/OpenAPI metadata (`@ApiTags()`, `@ApiOperation()`, `@ApiBearerAuth()`).

## Frontend Conventions
- **Framework & Libraries**: React (TypeScript), built with Vite.
- **UI Framework**: Ant Design (`antd`) is the primary UI library. Components like `Layout`, `App`, `Drawer`, and `Grid` are heavily utilized.
- **State Management**: Zustand is used for lightweight, hook-based global state (e.g., `useAuthStore`, `useThemeStore`).
- **Routing**: React Router is used for client-side navigation (`useNavigate`, `useLocation`, `<Outlet />`).

## Naming Standards
- **Variables and Functions**: `camelCase`.
- **Classes, Interfaces, and Types**: `PascalCase`.
- **Constants**: Typically `UPPER_SNAKE_CASE` or `camelCase` depending on scope and mutability.

## Import Organization
- **Paths**: The web app uses path aliases configured in Vite (e.g., `@/` for `apps/web/src` and `@uims/*` for shared monorepo packages like `shared-types` and `shared-utils`).
- **Sorting**: Imports are generally organized but Biome's `organizeImports` is set to `"off"` in `biome.json`.

## Error Handling
- **Backend**: NestJS Exception Filters are used to intercept and format errors. Dedicated filters like `http-exception.filter.ts` and `prisma-exception.filter.ts` handle generic HTTP and database-specific errors respectively.
- **Frontend**: React Error Boundaries (`<ErrorBoundary />`) are implemented to catch unhandled exceptions in the component tree and prevent the entire application from crashing.

## Style Enforcement
- **Tooling**: Biome is used exclusively for both formatting and linting. ESLint and Prettier are not used.
- **Formatting Rules**:
  - Indentation: 2 spaces.
  - Line width: 100 characters.
  - Quotes: Single quotes (`quoteStyle: 'single'`).
  - Semicolons: Always.
  - Trailing Commas: All (except for JSON files where it is "none").
- **Linting Rules**:
  - `noExplicitAny`: Warn.
  - `noExcessiveCognitiveComplexity`: Warn.
  - `useImportType`: Off.

---
*Analysis Date: 2026-08-20*

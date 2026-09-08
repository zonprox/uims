# Coding Conventions
**Analysis Date:** 2026-09-08

## File & Naming Conventions
- **Backend Directories & Files**: Grouped by domain modules (e.g., `apps/api/src/modules/assets`). Files follow dot notation: `*.service.ts`, `*.controller.ts`, `*.module.ts` (e.g., `assets.controller.ts`).
- **Frontend Components**: React components use PascalCase (e.g., `AssetsPage.tsx`, `AssetTable.tsx`) and are organized into `pages/` and `components/`.
- **Zustand Stores**: Placed in `apps/web/src/stores/` and follow dot notation (e.g., `auth.store.ts`).
- **Hooks**: Placed in `hooks/` directories using camelCase with a `use` prefix (e.g., `useAssetManagement.ts`).

## Backend Patterns
### Module Structure
The NestJS backend (`apps/api`) is structured by domain feature (Assets, Users, Auth, Inventory, etc.). Each module encapsulates its controller, service, and DTOs.

### Service Pattern
- **Dependency Injection**: Services (`@Injectable`) inject `PrismaService` and other domain services (e.g., `NotificationsService`).
- **Transactions**: Complex operations (like creating an asset with related models) use interactive transactions via `this.prisma.$transaction`.
- **Business Logic**: Services encapsulate business rules, data mapping, and trigger notifications based on entity lifecycle events.

### Controller Pattern
- Controllers are thin, primarily handling routing and delegating logic to services.
- **Decorators**: Extensive use of NestJS Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`) for documentation.
- HTTP methods are mapped using standard `@Get()`, `@Post()`, `@Patch()`, `@Delete()`.

### DTO Pattern
- Shared DTO interfaces (e.g., `CreateAssetDto`, `UpdateAssetDto`, `AssetQueryDto`) are imported from a central monorepo package: `@uims/shared-types`.

### Error Handling
- Services throw standard NestJS exceptions (e.g., `NotFoundException`).
- Global exception filters (`http-exception.filter.ts`, `prisma-exception.filter.ts`) exist in `apps/api/src/common/filters/` to intercept and normalize API responses.

### Guard & Decorator Usage
- Authorization is handled via a custom `@Roles()` decorator and presumably corresponding role guards (e.g., `@Roles('Admin', 'Super Admin')`).

## Frontend Patterns
### Component Structure
- Built with React 19 functional components.
- Components leverage `React.memo` for performance optimization, especially for complex UI elements like data tables (e.g., `AssetTable.tsx`).

### State Management (Zustand)
- Zustand (v5.0.15) is used for global state (e.g., `useAuthStore`). Stores are strongly typed and often use the `persist` middleware for local storage.

### Data Fetching (TanStack Query vs Custom Hooks)
- While `@tanstack/react-query` is installed in `apps/web/package.json`, some feature hooks (like `useAssetManagement`) manually handle data fetching with `useState`, `useEffect`, and raw Axios service calls. 
- *Recommendation*: Migrate manual fetching logic in custom hooks to TanStack Query for better caching and loading state management.

### UI Components (Ant Design v6)
- The frontend relies heavily on Ant Design (`antd` v6.6.1).
- Uses complex layout elements (`PageContainer`, `Flex`, `Card`), data presentation (`Table`, `Tag`, `Typography`), and feedback controls (`message` via `App.useApp()`, `Popconfirm`, `Modal`, `Drawer`).

### Routing Patterns
- Uses `react-router` (v8) for client-side routing. Views are partitioned into layouts (e.g., `MainLayout.tsx`, `AuthLayout.tsx`).

## Shared Package Patterns
- **Type Definitions**: Exported from `@uims/shared-types`.
- **Validation Schemas**: Exported from `@uims/shared-validators` (using Zod).
- **Utilities**: Shared helpers (like mapping statuses) are in `@uims/shared-utils`.

## Formatting & Linting
- **Formatting**: Handled by Biome (`biome.json`). Configurations specify 2-space indentation, 100 line width, and single quotes for JavaScript.
- **Linting**: Biome handles recommended rules and cognitive complexity checks. ESLint is also configured (`eslint` v10.8.1, `@uims/eslint-config`) for deep static analysis across the monorepo workspaces.

## Import Conventions
- Biome is configured to disable automatic import organization (`organizeImports: "off"`). Absolute path aliasing (e.g., `@uims/...`) is heavily used across the monorepo to avoid deep relative paths, though intra-module relative imports are common.

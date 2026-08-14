# Codebase Conventions

**Analysis Date:** 2026-08-14

## Architecture & Workspaces
This project is a UIMS (Unified IT Management System) monorepo managed with `pnpm` and Turborepo.
- **apps/api**: NestJS backend leveraging Prisma ORM, PostgreSQL, and Redis/BullMQ for asynchronous job processing.
- **apps/web**: React frontend powered by Vite, utilizing Ant Design for UI components, Zustand for state management, and React Query for server state.
- **packages/***: Shared configurations (`eslint-config`) and shared domain logic (`shared-types`, `shared-validators`).

## Code Style & Formatting
- **Formatter**: Biome (`biome.json`). Configuration enforces 2-space indentation, single quotes for JS/TS, trailing commas, and a 100-character line width.
- **Linter**: ESLint (via workspace package `@uims/eslint-config`) running alongside Biome's linter.
- **Complexity Guidelines**: Biome warns on excessive cognitive complexity (`noExcessiveCognitiveComplexity`). Code should be kept modular and easy to read.
- **Typing**: Use explicit typings. The `noExplicitAny` rule is set to warn.

## Naming Conventions
- **Backend (`apps/api`)**:
  - File names use `kebab-case` (e.g., `assets.service.ts`, `health.controller.ts`, `create-asset.dto.ts`).
  - Class names use `PascalCase` (e.g., `AssetsService`, `CreateAssetDto`).
- **Frontend (`apps/web`)**:
  - React Component/Page files use `PascalCase` (e.g., `LoginPage.tsx`, `PageContainer.tsx`).
  - Services, Stores, and utility files use `kebab-case` or dot-notation (e.g., `auth.service.ts`, `auth.store.ts`).
- **Variables/Functions**: Standard `camelCase`.

## Code Patterns
### Backend (NestJS)
- **Controller-Service Split**: Controllers handle routing and HTTP aspects, while Services encapsulate business logic and database interactions.
- **Interceptors**: The application uses a global `TransformInterceptor` (`apps/api/src/common/interceptors/transform.interceptor.ts`) that standardizes all successful API responses into the following shape:
  ```json
  {
    "success": true,
    "data": { ... },
    "timestamp": "2026-08-14T..."
  }
  ```
  *Controllers should return raw data and allow the interceptor to format it.*

### Frontend (React)
- **Data Fetching**: Primarily uses `axios` and React Query to interact with the backend API.
- **State Management**: Zustand is used for global state (e.g., `useAuthStore` managing `user`, `token`, and `isAuthenticated`).
- **UI Components**: Ant Design is the standard for building user interfaces. Leverage its `App`, `Form`, and layout components heavily.

## Error Handling Patterns
### Backend Global Filters
Errors are managed via global exception filters located in `apps/api/src/common/filters/`:
- **`HttpExceptionFilter`**: Catches standard HTTP exceptions and normalizes them into a consistent error response:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "message": "Error details",
    "timestamp": "2026-08-14T..."
  }
  ```
- **`PrismaExceptionFilter`**: Catches `PrismaClientKnownRequestError` to prevent raw database details from leaking. Specific error codes like `P2002` (Unique constraint) are mapped to `409 Conflict`, while unhandled Prisma errors default to `500 Internal Server Error`.

### Frontend
- Components rely on Ant Design's built-in `Form` validation for inline errors.
- Global application errors should be handled gracefully via Ant Design's notification APIs (e.g., `App.useApp()`).

## Data Validation
- **Backend DTOs**: Utilize `class-validator` decorators alongside NestJS `@nestjs/swagger` decorators (`@ApiProperty`) to validate incoming request bodies (e.g., `apps/api/src/modules/auth/dto/login.dto.ts`).
- **Shared Validation Logic**: Zod is adopted within `packages/shared-validators` to provide portable validation schemas (e.g., `loginSchema`, `emailSchema`) that can be used across boundaries.

*Codebase conventions analysis: 2026-08-14*
<!-- refreshed: 2026-08-14 -->

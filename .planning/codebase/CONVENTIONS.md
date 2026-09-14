# UIMS Codebase Conventions

**Date:** September 2026

This document defines the core conventions, architectural patterns, and quality standards for the UIMS (Unified IT Management System) codebase. Strict adherence is required to maintain consistency across the monorepo.

## 1. Language & Naming
- **Enterprise English:** 100% Enterprise English is enforced across all code, comments, documentation, and user interfaces.
- **Classes/Types/Interfaces:** Use `PascalCase`.
- **Functions/Variables:** Use `camelCase`.
- **File Naming:** 
  - Standard files and directories use `kebab-case` (e.g., `user-profile.controller.ts`).
  - React components use `PascalCase` (e.g., `UserProfile.tsx`).
- **Module Naming:** Use singular domain names (e.g., `auth`, `assets`, `network`, not `auths` or `networks`).

## 2. TypeScript Configuration
- **API (`apps/api`):** 
  - Module: `CommonJS`
  - Target: `ES2022`
  - Strict mode enabled (`strict: true`), no implicit any (`noImplicitAny: true`)
  - Decorators enabled (`experimentalDecorators: true`, `emitDecoratorMetadata: true`)
- **Web (`apps/web`):**
  - Module: `ESNext`
  - Resolution: `bundler`
  - JSX: `react-jsx`
  - Strict mode enabled (`strict: true`)
- **Type Safety Policy:** A zero `any` policy is enforced across both workspaces. All types must be explicitly defined or correctly inferred.

## 3. Backend Patterns (NestJS)
The backend follows strict domain-driven modularity across its 15 domains.

- **Architecture:** Standard NestJS Module → Controller → Service pattern.
- **Validation:** DTOs are validated using `class-validator` decorators with `whitelist: true` and `transform: true` enabled in the global validation pipe.
- **Global Guards (Execution Order):**
  1. `ThrottlerGuard` (Rate limiting)
  2. `JwtAuthGuard` (Authentication)
  3. `RolesGuard` (Role-based access)
  4. `PermissionsGuard` (Fine-grained permissions)
- **Global Interceptors:**
  - `TransformInterceptor`: Envelopes all successful responses in a standard JSON structure.
  - `AuditInterceptor`: Automatically logs critical mutations for auditing.
- **Global Filters:**
  - `HttpExceptionFilter`: Formats standard HTTP errors.
  - `PrismaExceptionFilter`: Catches database errors and translates them to safe HTTP responses without leaking schema details.
- **Custom Decorators:**
  - `@Public()`: Bypasses authentication.
  - `@Roles(...)`: Defines allowed roles.
  - `@RequirePermissions(...)`: Defines fine-grained required permissions.
  - `@ClientIP()`: Extracts the caller's IP address.
- **Pagination:** Use the standard `PaginationDto` which provides `skip`, `take`, `sort`, and `search` parameters.
- **Logging:** Use the built-in NestJS `Logger`. `console.log` is strictly prohibited.

## 4. Frontend Patterns (React 19 + Ant Design v6)
- **UI Framework:** Ant Design v6. Use `App.useApp()` for dynamic feedback (message, modal, notification) to ensure context availability.
- **Page Structure:** Every domain page must be wrapped in `<PageContainer>`.
- **Routing & Loading:**
  - Routes must be lazy-loaded.
  - Use `Suspense` with `<PageLoader />` as the fallback.
  - Every route must be wrapped with `<RouteErrorBoundary>`.
- **Service Layer:** One file per domain for API calls (e.g., `auth.service.ts`, `assets.service.ts`).
- **State Management:**
  - **Client State:** Zustand 5 (Redux is not used).
  - **Server State:** TanStack Query 5 (No manual `useEffect` fetching).

## 5. Shared Package Conventions
To maintain DRY principles, shared logic is located in the `packages` directory.

- **`shared-types`:** Contains cross-boundary TypeScript interfaces, DTOs, entities, and enums. Must use barrel exports (`index.ts`).
- **`shared-validators`:** Contains Zod 4 runtime schemas organized by domain.
- **`shared-utils`:** Pure, stateless utility functions (format, network, timezone, string, enum, brand).

## 6. Import Organization
Imports must follow a strict sorting hierarchy:
1. **External Packages:** (e.g., `react`, `@nestjs/common`)
2. **Internal Packages:** (e.g., `@uims/shared-types`, `@uims/shared-utils`)
3. **Relative Imports:** (e.g., `../components`, `./utils`)

## 7. Error Handling
- Use `try/catch` with explicit `catch (error: unknown)`.
- Use `instanceof` narrowing to determine the error type before acting on it.
- **Never** leave `catch` blocks empty. Errors must be logged or handled appropriately.

## 8. CORS
CORS configuration is centralized entirely within `cors.config.ts`. Individual route or controller CORS configuration is strictly forbidden to prevent security misconfigurations.

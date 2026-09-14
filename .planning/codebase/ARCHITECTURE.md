# UIMS Architecture
*Date: September 2026*

## 1. Architecture Style
The UIMS (Unified IT Management System) follows a **Modular Monolith** architecture within a `pnpm` monorepo. This approach provides the simplicity of a single deployable unit while maintaining strict logical boundaries between domains. The system is split into two primary applications:
* **Backend (`apps/api`)**: A NestJS 11 application organizing 15 distinct domain modules.
* **Frontend (`apps/web`)**: A React 19 Single Page Application (SPA).

## 2. Backend Architecture
The backend is a robust NestJS application designed for scalability, security, and maintainability.

* **Entry Point**: [`apps/api/src/main.ts`](file:///home/user/projects/uims/apps/api/src/main.ts)
  Bootstraps the Nest application, configuring `helmet` for HTTP headers, CORS, global validation pipes, and Swagger documentation generation.
* **App Module**: [`apps/api/src/app.module.ts`](file:///home/user/projects/uims/apps/api/src/app.module.ts)
  The root module imports all 15 domain modules. It registers 4 global guards (`ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`) and 1 global interceptor (`AuditInterceptor`).
* **Module Pattern**: Every domain follows a strict module/controller/service/DTO structure to enforce separation of concerns.
* **Database Layer**: Leverages a global `PrismaModule` and `PrismaService` for database operations targeting PostgreSQL 17.
* **Cache Layer**: Implements a global `RedisModule` and `RedisService` backed by Redis 8.
* **Config Validation**: Uses Zod for fail-fast startup validation. Environmental variables are validated against `envSchema` defined in `app.config.ts`.
* **CORS**: Centralized configuration in `cors.config.ts`, exporting functions like `resolveAllowedOrigins`, `isOriginAllowed`, `getApiCorsOptions`, and `getWebSocketCorsOptions`.

## 3. Domain Modules
The API is horizontally sliced into 15 business domains:

1. **Auth**: JWT and refresh token strategies, login/logout, and token refresh logic.
2. **Users**: Application user CRUD and bulk CSV imports.
3. **Roles**: RBAC (Role-Based Access Control) with granular permissions, role cloning, and synchronization.
4. **Directory**: Employee directory, logical groups, and CSV import capabilities.
5. **Organization**: Organizational hierarchy management, departments, positions, and locations.
6. **Assets**: Hardware asset tracking, asset categories, and QR code generation.
7. **Licenses**: Software license management and per-seat assignments.
8. **Inventory**: Consumable items, inventory categories, and restock tracking.
9. **Network**: IPAM (IP Address Management) covering VLANs, subnets, and individual IP address allocations.
10. **Audit**: Tamper-evident audit trail logging with cryptographic signing.
11. **Reports**: Scheduled and on-demand report generation.
12. **Settings**: Dynamic key-value store for application-wide system settings.
13. **Dashboard**: Aggregated statistics and widgets for administrative overviews.
14. **Health**: System health checks including PostgreSQL and Redis connectivity status.
15. **Search**: Full-text search integration using MeiliSearch.
16. **Notifications**: In-app notifications and WebSocket-based real-time alerts.

## 4. Frontend Architecture
The frontend is a modern React SPA tailored for high-performance enterprise usage.

* **Routing**: Built on React Router 8 with lazy-loaded route configuration.
* **App Wrapper Structure**: Components wrap the core app logically: `ConfigProvider` -> `ProConfigProvider` -> `AntApp` -> `RouterProvider`.
* **Auth Flow**: Protected routes are gated by `AuthLayout`, falling through to `MainLayout` (comprising standard sider and content areas).
* **State Management**: Client state is managed via Zustand stores (e.g., `auth.store`, `theme`, `timezone`, `notification-settings`).
* **Data Fetching**: TanStack Query 5 is used for robust server state management, caching, and invalidation.
* **Services Layer**: Domain-specific Axios service clients abstract REST calls.
* **Component Hierarchy**: Follows standard separation (`pages/` -> `components/` -> `hooks/` -> `utils/`).

## 5. Security Architecture
The security architecture enforces a strict "defense in depth" strategy on all requests.

* **4-Layer Guard Stack**:
  1. `ThrottlerGuard`: Rate limiting.
  2. `JwtAuthGuard`: Identity validation.
  3. `RolesGuard`: Role verification.
  4. `PermissionsGuard`: Granular operation clearance.
* **Audit Interceptor**: An `AuditInterceptor` guarantees that all state-mutating (write) operations are logged.
* **CORS & Tunneling**: Centralized CORS config ensures browser security, with native support for Cloudflare Tunnels used in development.
* **Fail-Fast Validation**: Zod ensures that missing or malformed environment secrets halt startup immediately.

## 6. API Design
* **REST Constraints**: All endpoints are strictly RESTful, exposed under the `/api/v1/*` global prefix.
* **Response Formatting**: A global `TransformInterceptor` ensures a standardized JSON response envelope for all successful requests.
* **Exception Handling**: Global exception filters (like `http-exception.filter.ts` and `prisma-exception.filter.ts`) map thrown errors to a standardized error envelope format.

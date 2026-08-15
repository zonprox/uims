<!-- refreshed: 2026-08-15 -->
# Architecture

**Analysis Date:** 2026-08-15

## System Overview
UIMS (Unified IT Management System) is a full-stack monorepo built using Turbo and pnpm workspaces. It contains a backend REST API and a frontend Single Page Application (SPA), alongside several shared packages for types and validation.

## Component Responsibilities
- **Frontend (`apps/web`)**: Provides the user interface for managing assets, users, tickets, and licenses. Handled by a Vite + React application.
- **Backend (`apps/api`)**: Serves as the central API, handling business logic, database interactions, and authentication. Built with NestJS.
- **Database**: PostgreSQL, managed via Prisma ORM (`apps/api/prisma`).
- **Shared Packages**:
  - `@uims/shared-types`: Core TypeScript interfaces (entities, DTOs, enums).
  - `@uims/shared-validators`: Zod schemas for client-side form validation.
  - `@uims/shared-utils`: Reusable utility functions.

## Pattern Overview
- **Monorepo**: Managed by `pnpm-workspace.yaml` and `turbo.json`.
- **Backend**: Traditional layered NestJS architecture (Controller-Service-Repository). Uses Prisma client as the data access layer.
- **Frontend**: Standard React SPA layout.
  - **Server State**: Managed by `@tanstack/react-query` to fetch and cache API responses.
  - **Global/Client State**: Managed by `zustand`.
  - **UI/Forms**: Built with Ant Design (`antd`). Forms often integrate with Zod (via `shared-validators`) or use Ant Design's built-in validation rules.

## Layers
### Backend Layers
1. **Controllers (`*.controller.ts`)**: Receive HTTP requests, validate input via `class-validator` DTOs, and delegate to services.
2. **Services (`*.service.ts`)**: Contain business logic and invoke Prisma queries.
3. **Prisma ORM (`prisma.config.ts`, `schema.prisma`)**: Defines the data model and executes queries against PostgreSQL.

### Frontend Layers
1. **Pages (`src/pages/*`)**: Smart components representing routes. Often coordinate fetching and pass data to components.
2. **Components (`src/components/*`)**: Dumb/presentational UI pieces.
3. **Services (`src/services/*`)**: Axios API client wrappers (`assets.service.ts`).
4. **Stores (`src/stores/*`)**: Zustand stores for client-side state.

## Data Flow
1. User interacts with Ant Design UI in a React **Page** (`apps/web/src/pages`).
2. Component triggers a React Query mutation or an Axios call in a **Service** (`apps/web/src/services`).
3. Request hits NestJS **Controller** (`apps/api/src/modules/**/*.controller.ts`), validated by `class-validator`.
4. Controller calls NestJS **Service** (`apps/api/src/modules/**/*.service.ts`).
5. Service queries PostgreSQL via **Prisma Client** (`apps/api/prisma`).
6. Response is transformed via `TransformInterceptor` and sent back as a unified API response (`ApiResponse` from `@uims/shared-types`).
7. React Query updates the local cache, triggering a re-render in the UI.

## Key Abstractions
- **Global Error Handling**: `PrismaExceptionFilter` and `HttpExceptionFilter` in NestJS catch and normalize errors before sending to the client.
- **Shared Types**: API models (`Asset`, `Ticket`) and DTOs are defined centrally in `packages/shared-types` so both frontend and backend are strongly typed.
- **Unified API Response**: `TransformInterceptor` wraps all NestJS responses in a standard `{ data, meta }` or `{ success, data }` format.

## Entry Points
- **Backend**: `apps/api/src/main.ts` (Bootstraps the NestJS application).
- **Frontend**: `apps/web/src/main.tsx` (Bootstraps React, mounts to `#root`).
- **Database Schema**: `apps/api/prisma/schema.prisma`.

## Architectural Constraints
- **Strict Typing**: Code must be strictly typed across the boundary using `@uims/shared-types`.
- **Validation Separation**: Backend uses `class-validator` decorators on DTO classes. Frontend uses `zod` schemas from `@uims/shared-validators`.
- **Direct DB Access**: Backend services must interact with the database solely through Prisma Client. No raw queries unless explicitly necessary for performance.

## Anti-Patterns
- **Fat Controllers**: Business logic must reside in NestJS services, not controllers.
- **Direct API Calls in UI**: React components should not use Axios directly; use `apps/web/src/services` and wrap them in React Query hooks.
- **Type Duplication**: Do not redefine entity types in `apps/web` or `apps/api`. Always import from `@uims/shared-types`.

## Error Handling
- **Backend**: Throw standard `HttpException` (or subclasses like `NotFoundException`). Unhandled Prisma errors are caught by `PrismaExceptionFilter`.
- **Frontend**: API errors should be displayed using Ant Design's `App` or `message` provider based on standard error response shapes.

## Cross-Cutting Concerns
- **Authentication**: JWT-based authentication managed by NestJS Passport module.
- **API Documentation**: Generated automatically via NestJS Swagger (`@nestjs/swagger`) from Controller/DTO decorators.

---
*Architecture analysis: 2026-08-15*

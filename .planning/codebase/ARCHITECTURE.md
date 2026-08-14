# UIMS Architecture

**Analysis Date:** 2026-08-14

## System Overview
The Unified IT Management System (UIMS) is built as a monorepo managed with `pnpm` and Turborepo. The repository consists of a NestJS backend (`apps/api`), a React frontend (`apps/web`), and shared packages (`packages/*`).

## Architecture Patterns

### Monorepo Structure
The project uses a monorepo architecture to share types, utilities, and validation logic across the frontend and backend, reducing duplication and drift.
- `apps/api`: NestJS backend.
- `apps/web`: React + Vite frontend.
- `packages/shared-*`: Shared logic.

### Backend (apps/api)
- **Framework:** NestJS
- **Pattern:** Layered Architecture / Modular Monolith
  - **Controllers (`*.controller.ts`):** Handle HTTP requests, routing, and input validation (using NestJS Pipes and DTOs).
  - **Services (`*.service.ts`):** Contain business logic.
  - **Data Access:** Handled via Prisma ORM injected into services (`PrismaService`).
- **Data Flow:** Request -> Controller -> Service -> Prisma (Database) -> Service -> Controller -> Response
- **Cross-cutting Concerns:** Handled via NestJS interceptors (`TransformInterceptor`), filters (`HttpExceptionFilter`, `PrismaExceptionFilter`), guards, and pipes located in `src/common/`.
- **Database:** PostgreSQL (via Prisma).
- **Caching / Async Jobs:** Redis & BullMQ (based on environment context).

### Frontend (apps/web)
- **Framework:** React + Vite
- **State Management:** 
  - **Zustand:** For global client state (`src/stores/`).
  - **React Query:** For server state and API data fetching (via custom hooks in `src/hooks/`).
- **UI Library:** Ant Design
- **API Communication:** Axios instances configured in `src/services/api.ts` with dedicated service files (e.g., `users.service.ts`) corresponding to backend modules.
- **Pattern:** Component-Based Architecture with clear separation of pages (`src/pages/`) and reusable components (`src/components/`).

## Data Flow
1. User interacts with a React component in `apps/web`.
2. The component calls a custom React Query hook or service function.
3. The API request is made via an Axios instance (`api.ts`), hitting the `api/v1/*` endpoint.
4. The request reaches `apps/api/src/main.ts` where global middleware (compression, helmet, cookie-parser) and interceptors/filters process it.
5. The request is routed to the appropriate NestJS Controller.
6. The Controller uses DTOs for validation and passes data to a Service.
7. The Service executes business logic and interacts with PostgreSQL via Prisma.
8. The response flows back through the Service, Controller, and global Interceptor (which transforms the payload structure), back to the React frontend.

## Abstractions & Shared Boundaries
- **Shared Packages:** Types and validation rules are abstracted into `packages/shared-types` and `packages/shared-validators`.
- **Interceptors/Filters:** Abstract response formatting and error handling centrally in the backend.

## Entry Points
- **Backend:** `apps/api/src/main.ts` (Bootstraps the Nest application, sets up Swagger docs, global prefixes, and filters).
- **Frontend:** `apps/web/src/main.tsx` (Bootstraps the React application into the root DOM element).
- **Database Definitions:** `apps/api/prisma/schema.prisma` (Defines models and relationships).

<!-- refreshed: 2026-08-14 -->
*UIMS Architecture analysis: 2026-08-14*

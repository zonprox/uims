# Codebase Structure
**Analysis Date:** 2026-08-17

## Directory Layout
```text
/home/user/projects/uims
├── apps
│   ├── api                 # NestJS API Backend
│   │   ├── prisma          # Prisma schema and migrations
│   │   └── src             # API source code
│   │       ├── common      # Global filters, interceptors, pipes, redis
│   │       ├── config      # Configuration files
│   │       ├── database    # Prisma service and module
│   │       ├── modules     # Feature domains (auth, users, assets, etc.)
│   │       └── main.ts     # API entry point
│   └── web                 # React/Vite Frontend
│       ├── certs           # SSL Certificates
│       └── src             # Frontend source code
│           ├── app         # App configuration, router, and query-client
│           ├── components  # Reusable UI components
│           ├── hooks       # Custom React hooks (e.g., realtime, health)
│           ├── layouts     # Layout components (Main, Auth, Sidebar)
│           ├── pages       # Route-level page components (assets, auth, etc.)
│           ├── services    # Axios service layer for API communication
│           ├── stores      # Zustand state stores
│           ├── styles      # Global CSS
│           ├── utils       # Constants and helper functions
│           └── main.tsx    # Frontend entry point
├── docker                  # Docker configuration and infrastructure (nginx, postgres)
├── packages                # Shared packages in monorepo
│   ├── eslint-config       # Shared ESLint configuration
│   ├── shared-types        # Shared TypeScript definitions (DTOs, entities)
│   ├── shared-utils        # Shared utilities (formatters, timezone logic)
│   └── shared-validators   # Shared Zod validation schemas
└── scripts                 # Utility scripts for the project
```

## Directory Purposes

| Directory | Purpose |
|---|---|
| `apps/api/` | Houses the NestJS backend application. Manages authentication, business logic, PostgreSQL communication, and real-time data streaming via WebSockets. |
| `apps/api/src/modules/` | Contains self-contained feature modules (e.g., `assets`, `inventory`, `network`) wrapping Controllers, Services, and business logic. |
| `apps/web/` | Houses the React SPA frontend application built with Vite and Ant Design v6. |
| `apps/web/src/pages/` | Contains the top-level route components mapping directly to application views. |
| `apps/web/src/services/` | Centralizes all external data fetching using Axios wrappers, connecting React components with the NestJS API. |
| `apps/web/src/stores/` | Houses Zustand stores handling global frontend state such as user session (`auth.store.ts`), theme (`theme.store.ts`), and localization (`timezone.store.ts`). |
| `packages/shared-types/` | Defines universal TypeScript interfaces (Entities, DTOs, Enums) utilized symmetrically across both the API and Web App to maintain strict type contracts. |
| `packages/shared-validators/` | Contains Zod schemas ensuring consistent input validation rules on both frontend forms and backend request payloads. |

## Key File Locations

- **Frontend Application Entry:** `apps/web/src/main.tsx` and `apps/web/src/app/App.tsx`
- **Backend Application Entry:** `apps/api/src/main.ts`
- **Database Schema:** `apps/api/prisma/schema.prisma`
- **Frontend Routing Configuration:** `apps/web/src/app/router.tsx`
- **Global API Response/Exception Handling:** `apps/api/src/common/filters/http-exception.filter.ts`
- **Core Real-time Logic:** `apps/api/src/modules/notifications/notifications.gateway.ts` and `apps/web/src/hooks/useRealtimeNotifications.ts`

## Naming Conventions
- **Files & Directories:** 
  - Kebab-case for typical files and directories (e.g., `user-query.dto.ts`, `assets.controller.ts`).
  - PascalCase for React component files (e.g., `AssetFormModal.tsx`, `PageContainer.tsx`).
- **NestJS Components:** Suffixed with `.controller.ts`, `.service.ts`, `.module.ts`, `.guard.ts`.
- **Data Transfer Objects:** Suffixed with `.dto.ts` (e.g., `create-asset.dto.ts`).
- **Tests:** Placed alongside implementation, suffixed with `.test.ts`, `.test.tsx`, or `.spec.ts` (e.g., `auth.service.spec.ts`).
- **Packages:** Prefixed with `@uims/` in `package.json` for internal cross-workspace consumption.

## Where to Add New Code
- **New Feature/Domain:**
  - Create a new module inside `apps/api/src/modules/` with its Controller and Service.
  - Create a corresponding page in `apps/web/src/pages/` and an API wrapper in `apps/web/src/services/`.
  - Define all required data structures in `packages/shared-types/` and validation logic in `packages/shared-validators/`.
- **New Reusable UI Element:** Add to `apps/web/src/components/`.
- **New Reusable Logic (Frontend):** Add custom hooks to `apps/web/src/hooks/`.
- **New Reusable Logic (Global):** Add utilities that don't depend on DOM or Nest context to `packages/shared-utils/`.

## Special Directories
- `.planning/codebase/`: Stores structural, architectural, and planning documentation automatically generated/updated by GSD agents.
- `.turbo/`: Turborepo's internal cache and configuration folder. Do not edit directly.
- `docker/`: Contains configurations for provisioning necessary infrastructure like the reverse proxy (Nginx) and databases (PostgreSQL).

---
*Structure analysis: 2026-08-17*

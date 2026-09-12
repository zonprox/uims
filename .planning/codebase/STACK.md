# Technology Stack
> Last Updated: 2026-09-12

## Runtime & Language
- **Node.js**: >= 22.0.0
- **TypeScript**: 7.0.2
- **Package Manager**: pnpm 11.21.0

## Backend Stack
- **Framework**: NestJS 11.2.3
- **Database ORM**: Prisma 7.10.0
- **Database Engine**: PostgreSQL 17
- **Caching & Queues**: Redis 8, BullMQ 6.3.4, `@nestjs/bullmq` 11.0.5
- **Authentication**: JWT, Passport (`passport-jwt`), bcrypt 6.0.0
- **Validation**: `class-validator`, `zod` 4.6.1
- **API Documentation**: `@nestjs/swagger` 11.4.7

## Frontend Stack  
- **Library**: React 19.3.0
- **Component Library**: Ant Design 6.6.3, `@ant-design/pro-components` 2.8.10
- **State Management**: Zustand 5.0.15
- **Data Fetching**: TanStack Query (`@tanstack/react-query`) 5.102.8
- **Routing**: React Router 8.3.1
- **Build Tool**: Vite 8.3.0
- **HTTP Client**: Axios 1.20.0

## Shared Packages
- **`@uims/shared-types` (v1.0.0)**: Common TypeScript interfaces, types, and DTOs.
- **`@uims/shared-validators` (v1.0.0)**: Shared Zod validation schemas.
- **`@uims/shared-utils` (v1.0.0)**: Common utility functions (e.g., date formatting with Day.js).
- **`@uims/eslint-config` (v1.0.0)**: Shared ESLint configuration for the workspace.

## Build & DevOps
- **Monorepo Tool**: Turborepo 2.10.12
- **Linting & Formatting**: Biome 2.5.13 and ESLint 10.10.0
- **Docker Compose Services**: `postgres`, `redis`, `meilisearch`, `seaweedfs-master`, `seaweedfs-volume`, `seaweedfs-filer`, `api`, `web`.
- **Dev Scripts**: Managed via Turbo and `docker compose`.

## Key Dependencies Table

| Package | Version | Workspace | Purpose |
| --- | --- | --- | --- |
| `@nestjs/core` | `^11.2.3` | `apps/api` | Core backend framework |
| `prisma` | `^7.10.0` | `apps/api` | Database ORM |
| `react` | `^19.3.0` | `apps/web` | Frontend library |
| `antd` | `^6.6.3` | `apps/web` | UI component library |
| `zod` | `^4.6.1` | `packages/shared-validators`, `apps/api`, `apps/web` | Schema validation |
| `vite` | `^8.3.0` | `apps/web` | Frontend bundler |
| `turbo` | `^2.10.12` | Root | Monorepo build system |
| `@biomejs/biome` | `^2.5.13` | Root | Code formatting and linting |

# Technology Stack

**Analysis Date:** 2026-08-15

## Languages
- **TypeScript**: Primary language for both frontend (`apps/web`) and backend (`apps/api`).
- **Node.js**: Underlying runtime environment.

## Runtime
- **Node.js**: `>=22.0.0`
- **Package Manager**: `pnpm` `>=11.0.0`
- **Containerization**: Docker (managed via Docker Compose for local and production deployment)

## Frameworks
- **Backend (API)**:
  - **NestJS** (v11): Server-side framework (`apps/api`).
  - **Express**: HTTP adapter for NestJS.
  - **Prisma**: ORM for database access.
- **Frontend (Web)**:
  - **React** (v19): UI library (`apps/web`).
  - **Vite** (v8): Build tool and dev server.
  - **Ant Design** (v6) / Pro Components: UI component library.
  - **React Router** (v8): Client-side routing.
- **Monorepo / Build**:
  - **Turborepo** (v2): High-performance build system.

## Key Dependencies
- **Data & Queueing**:
  - `pg`, `@prisma/adapter-pg`: PostgreSQL database drivers.
  - `ioredis`, `bullmq`: Redis client and job queue management.
- **State & Data Fetching (Web)**:
  - `zustand`: State management.
  - `@tanstack/react-query`: Asynchronous state/data fetching.
  - `axios`: HTTP client.
- **Auth & Security**:
  - `@nestjs/jwt`, `passport`, `passport-jwt`: Authentication on API.
  - `bcrypt`: Password hashing.
  - `helmet`: HTTP header security.
- **Validation**:
  - `zod`, `class-validator`, `class-transformer`: Data validation and transformation.
- **Logging**:
  - `pino`, `pino-http`: High-performance logging.
- **Tooling & Testing**:
  - `@biomejs/biome`: Formatting.
  - `eslint`: Linting (configured via `packages/eslint-config`).
  - `vitest`, `@playwright/test`: Unit and end-to-end testing.

## Configuration
- Workspace: `pnpm-workspace.yaml`, `turbo.json`
- Linter/Formatter: `biome.json`
- Environment Variables: `.env`, `.env.example`, `apps/api/.env`
- Container: `docker-compose.yml`, `docker-compose.dev.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`

## Platform Requirements
- **Docker** and **Docker Compose** (for running the data layer and services locally).
- **Node.js** 22 (for local development or running services outside Docker).

---
*Stack analysis: 2026-08-15*

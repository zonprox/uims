# Technology Stack
**Analysis Date:** 2026-08-20

## Languages
- **TypeScript**: v7.0.2 (configured via `tsconfig.json` across packages and apps)
- **Node.js**: >=22.0.0 (specified in root `package.json` engines)

## Runtime
- **Package Manager**: pnpm v11.21.0
- **Monorepo Manager**: Turborepo v2.10.10 (configured via `turbo.json`)
- **Containerization**: Docker & Docker Compose (`docker-compose.yml`, `docker-compose.dev.yml`)

## Frameworks
### Backend
- **NestJS**: v11.2.1
- **Prisma ORM**: v7.9.1 (with `@prisma/adapter-pg`)

### Frontend
- **React**: v19.2.8
- **Vite**: v8.2.1

## Key Dependencies
### Shared (`packages/*`)
- **Validation**: Zod v4.4.3
- **Internal Packages**: `@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`

### API (`apps/api`)
- **Authentication**: Passport (v0.7.0), `@nestjs/jwt` (v11.0.2), `bcrypt` (v6.0.0)
- **Database/Cache**: `pg` (v8.23.0), `ioredis` (v6.0.0)
- **Task Queue**: `bullmq` (v6.1.1), `@nestjs/bullmq` (v11.0.5)
- **WebSockets**: `socket.io` (v4.8.3), `@nestjs/websockets` (v11.2.1)
- **Logging/Utility**: `pino-http` (v11.0.0), `helmet` (v8.3.0), `compression` (v1.8.1)
- **API Documentation**: `@nestjs/swagger` (v11.4.6)

### Web (`apps/web`)
- **UI Framework**: Ant Design v6.6.0 (`@ant-design/pro-components` v2.8.10)
- **Routing**: React Router v8.3.0
- **State Management**: Zustand v5.0.15
- **Data Fetching**: TanStack Query v5.101.4, Axios v1.19.0
- **WebSockets**: `socket.io-client` (v4.8.3)
- **Utilities**: `dayjs` (v1.11.21), `@fontsource/inter` (v5.3.0)

### Dev & Testing
- **Formatting/Linting**: Biome v2.5.8 (root format), ESLint v10.8.1 (linting)
- **Unit Testing**: Vitest v4.1.10 (with `happy-dom` v20.11.2 for web)
- **E2E Testing**: Playwright v1.62.1
- **Development Tools**: `tsx`, `nodemon`

## Configuration
- **Build Tools**: Turborepo manages the build pipeline (`build`, `dev`, `lint`, `test`). Vite builds the frontend; `tsc` builds the backend.
- **Linting & Formatting**: Biome configured globally via `biome.json` (rules for formatting and linting). ESLint is also present in workspaces.
- **Environment Management**: `.env` and `.env.example` at the root. `turbo.json` defines global env dependencies (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, etc.).

## Platform Requirements
- **Database**: PostgreSQL
- **Cache & Queue**: Redis
- **Search Engine**: MeiliSearch
- **File Storage**: SeaweedFS (S3-compatible API)

---
*2026-08-20*

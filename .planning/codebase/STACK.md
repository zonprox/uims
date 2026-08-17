# Technology Stack
**Analysis Date:** 2026-08-17

## Languages
- TypeScript (Strict type checking, `tsc`, `@types/*` definitions)
- Node.js (Engine requirement: `>=22.0.0`)
- HTML/CSS (React components and Ant Design)

## Runtime
- **Package Manager:** `pnpm` (v11.21.0)
- **Runtime Environment:** Node.js `>=22.0.0`
- **Monorepo Manager:** Turborepo (`turbo` v2.10.10) - configured via `turbo.json`
- **Containerization:** Docker & Docker Compose (`docker-compose.yml`, `docker-compose.dev.yml`)

## Frameworks
### Backend (`apps/api/package.json`)
- **Core:** NestJS v11 (`@nestjs/core`, `@nestjs/common`)
- **Transport/Web:** Express (via `@nestjs/platform-express`)
- **ORM:** Prisma v7.9.1 (`@prisma/client`, `@prisma/adapter-pg`)
- **Real-time:** Socket.IO v4.8 (`@nestjs/websockets`, `@nestjs/platform-socket.io`)

### Frontend (`apps/web/package.json`)
- **Core:** React v19.2 (`react`, `react-dom`)
- **Build Tool:** Vite v8.2
- **Routing:** React Router v8.3
- **State Management:** Zustand v5, TanStack React Query v5
- **UI Library:** Ant Design v6.6 (`antd`, `@ant-design/pro-components`)

## Key Dependencies
### Shared (`packages/*`)
- **Validation:** Zod v4.4
- **Shared Types & Utils:** Internal workspace packages (`@uims/shared-types`, `@uims/shared-validators`)

### API Dependencies
- **Task Queues:** BullMQ v6.1 (`@nestjs/bullmq`)
- **Caching/Redis:** ioredis v6
- **Security:** Helmet, Passport (`passport-jwt`), bcrypt
- **Logging:** Pino (`pino`, `pino-http`)

### Web Dependencies
- **Styling:** `@fontsource-variable/inter`
- **HTTP Client:** Axios v1.19
- **Dates:** Day.js

### Dev & Testing
- **Linting & Formatting:** Biome v2.5 (`biome.json`), ESLint v10
- **Testing:** Vitest v4.1, Playwright v1.62 (E2E)

## Configuration
- **Monorepo Config:** `turbo.json` (Caching, Task dependencies)
- **Formatting/Linting:** `biome.json` (Recommended preset, LF endings, 2 spaces)
- **Environment:** Managed via `.env` (development) and Docker environment variables (production)
- **Nginx:** Reverse proxy configured in `docker/nginx/nginx.conf`

## Platform Requirements
- Docker and Docker Compose (required for local dev via `pnpm docker:dev`)
- PostgreSQL 17
- Redis 8
- MeiliSearch
- SeaweedFS (S3 Gateway)

---
*Stack analysis: 2026-08-17*

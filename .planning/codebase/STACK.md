# Technology Stack

**Analysis Date:** 2026-08-15

## Languages

**Primary:**
- TypeScript 5.9.3 (API) / 7.0.2 (Web) - Fullstack application language
- Node.js >= 22.0.0 - Execution environment

**Secondary:**
- SQL (PostgreSQL) - Database queries via Prisma
- Shell - Build and helper scripts

## Runtime

**Environment:**
- Node.js >= 22.0.0

**Package Manager:**
- pnpm 11.21.0
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks

**Core:**
- NestJS 11.1.29 - Backend API framework
- React 19.2.8 - Frontend UI library
- Ant Design v6.6.0 - UI components and design system (v6+ semantic tokens)
- Vite 8.2.1 - Frontend build tooling

**Testing:**
- Vitest 4.1.10 - Unit and integration testing
- Playwright 1.62.1 - End-to-end testing

**Build/Dev:**
- Turborepo 2.10.9 - Monorepo build system
- Biome 2.5.8 - Code formatter and linter

## Key Dependencies

**Critical:**
- Prisma 7.9.1 - Database ORM
- Zustand 5.0.15 - Frontend state management
- @tanstack/react-query 5.101.4 - Server state and data fetching
- Passport \u0026 bcrypt - Authentication and password hashing

**Infrastructure:**
- BullMQ 6.1.1 - Redis-based message queue
- ioredis 6.0.0 - Redis client
- Pino 10.3.1 - Logging

## Configuration

**Environment:**
- Configured via `.env` files (e.g., `.env.example`). Loaded via `@nestjs/config` and dotenv in the API, and Vite env vars in the Web app.
- Key configs required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `S3_ENDPOINT`, `MEILISEARCH_HOST`.

**Build:**
- `turbo.json` - Monorepo task pipeline
- `apps/web/vite.config.ts` (implied) - Frontend bundler config
- `tsconfig.json` - TypeScript compiler options
- `biome.json` - Linting and formatting rules

## Platform Requirements

**Development:**
- Node.js \u003e= 22.0.0, pnpm \u003e= 11.0.0
- Docker Desktop or Engine (for local dependencies via `docker-compose.dev.yml`)

**Production:**
- Docker deployment (defined in `docker-compose.yml`)
- Nginx for frontend serving (`docker/nginx/nginx.conf`)

---

*Stack analysis: 2026-08-15*

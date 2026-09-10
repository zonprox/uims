# Technology Stack

**Analysis Date:** 2026-09-10

## Languages
**Primary:**
- TypeScript 7.0.2 - Full stack (`apps/api`, `apps/web`, `packages/*`)

**Secondary:**
- None detected

## Runtime
**Environment:**
- Node.js >=22.0.0

**Package Manager:**
- pnpm 11.21.0
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks
**Core:**
- NestJS 11.2.3 - API Framework (`apps/api`)
- React 19.2.8 - Web Framework (`apps/web`)

**Testing:**
- Vitest 5.0.0 - Unit testing (API, Web)
- Playwright 1.63.0 - E2E testing

**Build/Dev:**
- Turborepo 2.10.12 - Monorepo management
- Vite 8.2.2 - Web build tool (`apps/web`)
- Biome 2.5.12 - Formatting and linting
- ESLint 10.10.0 - Linting (API, Web)

## Key Dependencies
**Critical:**
- Prisma 7.10.0 - Database ORM (`@prisma/client` in API)
- Zod 4.5.4 - Schema validation
- Ant Design 6.6.3 - UI component library (`apps/web`)
- Zustand 5.0.15 - State management (`apps/web`)
- TanStack React Query 5.102.8 - Data fetching (`apps/web`)

**Infrastructure:**
- Socket.io 4.8.3 - WebSockets for real-time updates (`socket.io` in API, `socket.io-client` in Web)
- BullMQ 6.3.4 - Background jobs and message queue (`apps/api`)

## Configuration
**Environment:**
- Configured via `.env` files (dotenv) and `@nestjs/config` for the API.
- Key configs required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `S3_*`, `MEILISEARCH_*`

**Build:**
- Monorepo: `turbo.json`
- API Build: `apps/api/tsconfig.json` (tsc)
- Web Build: `apps/web/vite.config.ts`, `apps/web/tsconfig.json`

## Platform Requirements
**Development:**
- Docker & Docker Compose (for Postgres, Redis, Meilisearch, SeaweedFS)
- Node.js >=22.0.0, pnpm >=11.0.0

**Production:**
- Docker (deploy target specified via `docker-compose.yml`)

---
*Stack analysis: 2026-09-10*

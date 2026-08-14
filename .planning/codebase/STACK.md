# Technology Stack

**Analysis Date:** 2026-08-14

## Languages

**Primary:**
- TypeScript 5.9.3 - Used universally across backend, frontend, and shared packages (`@uims/api`, `@uims/web`, `@uims/shared-*`)

**Secondary:**
- HTML/CSS - Web app frontend structure and styling

## Runtime

**Environment:**
- Node.js >=22.0.0

**Package Manager:**
- pnpm 11.21.0
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks

**Core:**
- NestJS 11.1.29 - Core backend API framework (`@uims/api`)
- React 19.2.8 & React Router 8.3.0 - Frontend web application UI and routing (`@uims/web`)
- Vite 8.2.1 - Frontend build tool and dev server
- Prisma 7.9.1 - ORM and database schema management

**Testing:**
- Vitest 4.1.10 - Unit and integration testing across API and Web packages

**Build/Dev:**
- Turborepo 2.10.9 - Monorepo build system and task orchestration
- Biome 2.5.8 - Fast code formatting and checking
- ESLint 10.8.1 - Code linting
- Docker & Docker Compose - Local development environment for backing services

## Key Dependencies

**Critical:**
- @tanstack/react-query 5.101.4 - Frontend data fetching, caching, and state management
- zustand 5.0.15 - Lightweight frontend state management
- antd 6.6.0 & @ant-design/pro-components - Comprehensive frontend UI component library
- bullmq 6.1.1 - Background jobs and queues in API
- @nestjs/platform-socket.io 11.1.29 - Realtime WebSocket communications in API
- zod 3.25.76 - Schema validation shared across frontend and backend
- passport-jwt 4.0.1 & bcrypt 6.0.0 - Authentication and password hashing

**Infrastructure:**
- pg 8.13.3 - PostgreSQL client adapter for database connections
- ioredis 6.0.0 - Redis client for caching and BullMQ

## Configuration

**Environment:**
- Configured via `dotenv` with `.env` files. A comprehensive `.env.example` at the monorepo root documents required configurations.
- NestJS `@nestjs/config` module validates and injects env vars on the backend.
- Key configs required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`

**Build:**
- `package.json` workspaces for monorepo configuration
- `tsconfig.json` for TypeScript configuration across apps and packages
- `vite.config.ts` for frontend bundling

## Platform Requirements

**Development:**
- Node.js >= 22.0.0
- pnpm >= 11.0.0
- Docker (for `docker compose` to run Postgres and Redis locally)

**Production:**
- Deployment target: Standard Node.js environment capable of running compiled Express/NestJS apps (backend) and serving static Vite builds (frontend).
- Requires PostgreSQL and Redis instances.

---

*Stack analysis: 2026-08-14*

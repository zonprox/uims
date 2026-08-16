# Technology Stack

**Analysis Date:** 2026-08-16

## Languages

**Primary:**
- TypeScript 5.9.3 / 7.0.2 - Fullstack application language (API & Web)
- Node.js >=22.0.0 - Runtime environment

**Secondary:**
- HTML/CSS - Web frontend via Ant Design

## Runtime

**Environment:**
- Node.js >=22.0.0

**Package Manager:**
- pnpm 11.21.0
- Lockfile: present (pnpm-lock.yaml)

## Frameworks

**Core:**
- NestJS 11.1.29 - Backend API framework
- React 19.2.8 - Frontend UI framework
- Turborepo 2.10.9 - Monorepo build system

**Testing:**
- Vitest 4.1.10 - Unit and integration testing
- Playwright 1.62.1 - End-to-end testing (E2E)

**Build/Dev:**
- Vite 8.2.1 - Frontend build tool and dev server
- Biome 2.5.8 - Fast formatter and linter
- tsx 4.23.12 - TypeScript execution

## Key Dependencies

**Critical:**
- Prisma 7.9.1 - TypeScript ORM for database access
- Ant Design 6.6.0 - React UI component library
- Zustand 5.0.15 - Frontend state management
- @tanstack/react-query 5.101.4 - Data fetching and state synchronization
- Zod 4.4.3 - Schema declaration and validation

**Infrastructure:**
- @nestjs/bullmq 11.0.5 & bullmq 6.1.1 - Redis-based queue management
- @nestjs/websockets 11.1.29 & socket.io - Real-time websocket communication
- pino 10.3.1 - High-performance logging

## Configuration

**Environment:**
- Environment variables via `.env` file (based on `.env.example`)
- Requires database connection, Redis, JWT secrets, MeiliSearch, and S3 credentials

**Build:**
- `turbo.json` (Turborepo pipeline configuration)
- `biome.json` (Biome lint/format configuration)
- `pnpm-workspace.yaml` (Workspace packages configuration)

## Platform Requirements

**Development:**
- Node.js >=22.0.0
- pnpm >=11.0.0
- Docker & Docker Compose (for Postgres, Redis, Meilisearch, SeaweedFS)

**Production:**
- Docker containers orchestrating API and static web delivery
- PostgreSQL database
- Redis instance

---

*Stack analysis: 2026-08-16*

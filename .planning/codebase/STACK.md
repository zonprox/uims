# Technology Stack
> Generated: 2026-09-13 | Focus: Full stack inventory with 2026 assessment

## Runtime & Build
- **Node.js**: `>=22.0.0` (API, Web, Packages)
- **Package Manager**: `pnpm@11.21.0`
- **Build/Monorepo Tool**: Turborepo `^2.10.12`
- **Linter/Formatter**: Biome `^2.5.13` (formatting), ESLint `^10.10.0` (linting)
- **Containerization**: Docker & Docker Compose
- **Package Bundler**: tsdown `^0.23.0` (for shared packages)

## Backend Stack (apps/api)
- **Framework**: NestJS `^11.2.3` (running on Express `^11.2.3`)
- **Language**: TypeScript `^7.0.2`
- **API Paradigm**: REST via NestJS controllers
- **Validation**: class-validator `^0.15.1`, class-transformer `^0.5.1`, and Zod `^4.6.1`
- **Real-time**: Socket.IO `^4.8.3`, `@nestjs/websockets` `^11.2.3`
- **Background Jobs**: BullMQ `^6.3.4`, `@nestjs/bullmq` `^11.0.5`
- **Testing**: Vitest `^5.0.0`
- **Security**: Helmet `^8.3.0`, bcrypt `^6.0.0`, Passport `^0.7.0`, `@nestjs/jwt` `^11.0.2`

## Frontend Stack (apps/web)
- **Framework**: React `^19.3.0`
- **Language**: TypeScript `^7.0.2`
- **Build Tool**: Vite `^8.3.0`
- **Component Library**: Ant Design (antd) `^6.6.3`, Pro Components `^2.8.10`
- **State Management**: Zustand `^5.0.15`
- **Data Fetching**: TanStack Query `^5.102.8`, Axios `^1.20.0`
- **Router**: React Router `^8.3.1`
- **Real-time**: socket.io-client `^4.8.3`
- **Testing**: Vitest `^5.0.0`, Happy DOM `^20.14.3`
- **Typography**: Fontsource Inter Variable `^5.3.0`
- **E2E Testing**: Playwright `^1.63.0` (managed at root workspace)

## Shared Packages
- **`@uims/shared-types`**: Common TypeScript definitions and core business logic DTOs.
- **`@uims/shared-utils`**: Utility functions, including a Day.js `^1.11.23` wrapper.
- **`@uims/shared-validators`**: Shared isomorphic validation utilizing Zod `^4.6.1`.
- **`@uims/eslint-config`**: Centralized ESLint 10 flat configuration leveraging `typescript-eslint` `^8.70.0`.

## Database & Storage
- **Relational Database**: PostgreSQL 17 (Alpine image)
- **ORM**: Prisma `^7.10.0` (utilizing `@prisma/adapter-pg` driver)
- **Object Storage**: SeaweedFS (S3-compatible via Filer gateway)

## Cache & Queue
- **In-memory Datastore**: Redis 8 (Alpine image, LRU eviction policy)
- **Queue System**: BullMQ for robust job scheduling and background processing
- **Cache client**: ioredis `^6.0.0`

## DevOps & Infrastructure
- **Tunneling**: Cloudflared (Quick Tunnels for ad-hoc secure HTTPS web access)
- **Orchestration**: Docker Compose (for robust, isolated dev environments)
- **Process Manager**: Custom bash-based lifecycle script (`scripts/dev.sh`) utilizing `setsid` and `ss/lsof` port checks.

## 2026 Maturity Assessment

| Component | Choice | 2026 Assessment | Notes |
| :--- | :--- | :--- | :--- |
| **Node Runtime** | Node >=22 | [Leading Edge] | Fully leverages modern V8 and LTS capabilities natively. |
| **Monorepo** | pnpm 11 + Turbo 2.10 | [Modern] | Highly optimized industry standard for workspace management. |
| **Frontend Framework** | React 19 + Vite 8 | [Leading Edge] | Employs the React compiler paradigm and ultra-fast HMR builds. |
| **State Management** | Zustand 5 + TanStack 5 | [Modern] | Streamlined, un-opinionated state and sophisticated async caching. |
| **Backend Framework** | NestJS 11 | [Modern] | Standardized, sturdy enterprise choice with mature DI container. |
| **Database ORM** | Prisma 7 | [Modern] | Adopts modern `@prisma/adapter-pg` to circumvent legacy driver limits. |
| **Queue / Background** | BullMQ 6 + Redis 8 | [Modern] | Robust, highly-performant, and Redis-backed ecosystem standard. |
| **Dev Toolchain** | Biome 2.5 + Vitest 5 | [Leading Edge] | Massive performance gains over legacy tools (Jest/Prettier). |
| **Validation Layer** | class-validator & Zod | [Current/Legacy] | Transitioning; the mix of `class-validator` (legacy) with shared `Zod` (modern isomorphic validation) represents tech debt being paid down. |

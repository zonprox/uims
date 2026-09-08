# Technology Stack
**Analysis Date:** 2026-09-08

## Languages
- **TypeScript**: `7.0.2` (used across all workspaces)
- **Node.js**: `>=22.0.0` target in engines

## Runtime & Build
- **Package Manager**: `pnpm` `11.21.0` (Workspaces)
- **Monorepo Tool**: `turbo` `^2.10.11`
- **Frontend Bundler**: `vite` `^8.2.1`
- **Shared Package Builder**: `tsdown` `^0.22.14`
- **TypeScript Config**: Strict null checks enabled, ES2022 target.

## Frameworks
### Backend (`apps/api`)
- **Framework**: `NestJS` `^11.2.1`
- **ORM**: `Prisma` `^7.9.1` with `@prisma/adapter-pg`
- **WebSockets**: `@nestjs/platform-socket.io` `^11.2.1`, `socket.io` `^4.8.3`
- **Validation**: `class-validator` `^0.15.1`, `zod` `^4.4.3`

### Frontend (`apps/web`)
- **Framework**: `React` `^19.2.8` (with `react-dom` `^19.2.8`)
- **Routing**: `react-router` `^8.3.0`
- **UI Library**: `antd` `^6.6.1`, `@ant-design/pro-components` `^2.8.10`
- **State Management**: `zustand` `^5.0.15`
- **Data Fetching**: `@tanstack/react-query` `^5.101.4`
- **API Client**: `axios` `^1.19.0`, `socket.io-client` `^4.8.3`

## Key Dependencies
### Shared Packages
- `@uims/shared-types`: Exports TypeScript types/interfaces
- `@uims/shared-validators`: Exports `zod` schemas
- `@uims/shared-utils`: Utilities including `dayjs` `^1.11.23`

### API Dependencies
- **Security**: `helmet` `^8.3.0`, `bcrypt` `^6.0.0`, `@nestjs/throttler` `^6.5.0`
- **Auth**: `@nestjs/jwt` `^11.0.2`, `passport-jwt` `^4.0.1`
- **Queue/Cache**: `bullmq` `^6.1.2`, `ioredis` `^6.0.0`
- **Logging**: `pino` `^10.3.1`, `pino-http` `^11.0.0`

### Web Dependencies
- **Icons**: `@ant-design/icons` `^6.3.2`
- **Styling/Fonts**: `@fontsource-variable/inter`

### Dev & Testing
- **Linter/Formatter**: `@biomejs/biome` `^2.5.9`, `eslint` `^10.8.1`
- **Test Runner**: `vitest` `^4.1.11`
- **E2E Testing**: `@playwright/test` `^1.62.1`

## Infrastructure
- **Database**: `postgres:17-alpine`
- **Cache/Queue**: `redis:8-alpine`
- **Search**: `getmeili/meilisearch:latest`
- **File Storage**: `chrislusf/seaweedfs:latest` (Master, Volume, Filer/S3 Gateway)

## Configuration
- **Linter**: Biome handles formatting & linting in CI/CD, ESLint available for specific JS/TS ecosystems.
- **Docker**: Development uses `docker-compose.dev.yml` to spin up node instances with hot-reloading (`chokidar` polling).

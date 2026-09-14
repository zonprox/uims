# UIMS Technology Stack

Date: September 2026

## 1. Runtime & Ecosystem
- **Node.js**: >=22.0.0
- **TypeScript**: ^7.0.2
- **Package Manager**: pnpm 11.21.0
- **Monorepo Build System**: Turborepo ^2.10.12

## 2. Backend Framework (apps/api)
- **Framework**: NestJS 11
- **Key Modules**:
  - `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`: ^11.2.3
  - `@nestjs/config`: ^4.0.4
  - `@nestjs/jwt`: ^11.0.2
  - `@nestjs/passport`: ^11.0.5
  - `@nestjs/platform-socket.io`, `@nestjs/websockets`: ^11.2.3
  - `@nestjs/schedule`: ^6.1.3
  - `@nestjs/swagger`: ^11.4.7
  - `@nestjs/throttler`: ^6.5.0

## 3. Database & ORM
- **Database**: PostgreSQL 17-alpine (via Docker)
- **ORM**: Prisma ^7.10.0 (Client, Config, Adapter-PG)
- **Driver**: pg ^8.23.0
- **Scale**: ~640-line schema, 24+ models

## 4. Cache Layer
- **Store**: Redis 8-alpine (via Docker)
- **Client**: ioredis ^6.0.0

## 5. Search Engine
- **Engine**: MeiliSearch latest (via Docker on port 7700)
- **Integration**: Custom SearchService module in API

## 6. Object Storage
- **Store**: SeaweedFS (Master + Volume + Filer with S3 gateway, via Docker)
- **Access**: S3 compatible gateway at port 8333

## 7. Frontend Framework (apps/web)
- **Library**: React ^19.3.0 (with react-dom)
- **UI Framework**: Ant Design ^6.6.3
- **UI Components**: `@ant-design/pro-components` ^2.8.10, `@ant-design/icons` ^6.3.4
- **Fonts**: Fontsource Inter Variable ^5.3.0

## 8. State Management
- **Store**: Zustand ^5.0.15 (used for auth, theme, timezone, notification-settings)

## 9. Data Fetching
- **Client**: TanStack React Query ^5.102.8
- **DevTools**: `@tanstack/react-query-devtools` ^5.102.8

## 10. Routing
- **Router**: React Router ^8.3.1

## 11. HTTP Client
- **Client**: Axios ^1.20.0

## 12. Real-time Communications
- **Protocol**: WebSockets
- **Server**: Socket.IO ^4.8.3 (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- **Client**: `socket.io-client` ^4.8.3

## 13. Validation
- **Runtime**: Zod ^4.6.4 (shared-validators)
- **DTO Validation**: class-validator ^0.15.1, class-transformer ^0.5.1

## 14. Security
- **Headers**: Helmet ^8.3.0
- **Auth**: Passport ^0.7.0, passport-jwt ^4.0.1
- **Hashing**: bcrypt ^6.0.0
- **Rate Limiting**: `@nestjs/throttler` ^6.5.0

## 15. API Documentation
- **Specs**: `@nestjs/swagger` ^11.4.7
- **UI**: Swagger UI hosted at `/api/v1/docs`

## 16. Build & Development Tools
- **Bundler**: Vite ^8.3.0 (with HTTPS dev server, HMR, custom API proxy, manual chunking)
- **Compiler**: tsc for API
- **Dev Runner**: nodemon ^3.1.14 for API watch/reload

## 17. Testing
- **Unit/Integration**: Vitest ^5.0.0 (API and web)
- **Browser Environment**: happy-dom ^20.14.5
- **E2E**: Playwright ^1.63.0

## 18. Linting & Formatting
- **Formatter/Linter (Root)**: Biome ^2.5.13
- **Linter (Workspaces)**: ESLint ^10.10.0

## 19. Logging
- **Logger**: Pino ^10.3.1
- **HTTP Middleware**: pino-http ^11.0.0

## 20. Scheduling
- **Task Runner**: `@nestjs/schedule` ^6.1.3 (cron-based workers)

## 21. Data Import
- **Parser**: ExcelJS ^4.4.0 (for Excel/CSV parsing)


## Dependency Version Matrix

| Dependency | Version | Workspace |
|------------|---------|-----------|
| @biomejs/biome | ^2.5.13 | Root |
| turbo | ^2.10.12 | Root |
| playwright | ^1.63.0 | Root |
| typescript | ^7.0.2 | API, Web |
| eslint | ^10.10.0 | API, Web |
| vitest | ^5.0.0 | API, Web |
| @nestjs/* | ^11.2.3 | API |
| @nestjs/swagger | ^11.4.7 | API |
| @nestjs/jwt | ^11.0.2 | API |
| @nestjs/passport | ^11.0.5 | API |
| @nestjs/schedule | ^6.1.3 | API |
| @nestjs/throttler | ^6.5.0 | API |
| @prisma/client | ^7.10.0 | API |
| @prisma/config | ^7.10.0 | API |
| @prisma/adapter-pg | ^7.10.0 | API |
| pg | ^8.23.0 | API |
| ioredis | ^6.0.0 | API |
| socket.io | ^4.8.3 | API |
| class-validator | ^0.15.1 | API |
| class-transformer | ^0.5.1 | API |
| zod | ^4.6.4 | API, Web |
| helmet | ^8.3.0 | API |
| passport | ^0.7.0 | API |
| passport-jwt | ^4.0.1 | API |
| bcrypt | ^6.0.0 | API |
| pino | ^10.3.1 | API |
| pino-http | ^11.0.0 | API |
| exceljs | ^4.4.0 | API |
| react | ^19.3.0 | Web |
| react-dom | ^19.3.0 | Web |
| antd | ^6.6.3 | Web |
| @ant-design/icons | ^6.3.4 | Web |
| @ant-design/pro-components | ^2.8.10 | Web |
| react-router | ^8.3.1 | Web |
| @tanstack/react-query | ^5.102.8 | Web |
| axios | ^1.20.0 | Web |
| zustand | ^5.0.15 | Web |
| socket.io-client | ^4.8.3 | Web |
| dayjs | ^1.11.23 | Web |
| vite | ^8.3.0 | Web |
| happy-dom | ^20.14.5 | Web |

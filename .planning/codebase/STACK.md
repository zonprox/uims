# UIMS Technology Stack Analysis

## 1. Runtime & Language Environment

### Node.js
- **Version**: `>=22.0.0`
- **Usage**: Serving as the core runtime for the API, build tooling, and package management.
- **Best Practices**: Leveraging Node 22 ensures access to the latest V8 engine features, built-in standard library updates, and optimized garbage collection suited for enterprise applications.

### TypeScript
- **Version**: `^7.0.2`
- **Configuration Path**: `apps/api/tsconfig.json`, `apps/web/tsconfig.json`, and root configurations.
- **Strict Mode**: Fully enabled (`strict: true`, `noImplicitAny: true`).
- **Target**: ES2022 output target, allowing native support for top-level await and advanced module resolution (`NodeNext` for the backend, `bundler` for the frontend).
- **Patterns**: Zero `any` policy enforced across the repository. Type boundaries are explicitly defined between frontend and backend via shared workspace packages (`@uims/shared-types`).

---

## 2. Backend Framework: NestJS

### Version & Core
- **Version**: `^11.2.3`
- **Runtime Environment**: Built on `@nestjs/platform-express` allowing seamless middleware integration.
- **Modules Structure**: Following domain-driven design, isolated into `apps/api/src/modules/` with cross-cutting concerns in `apps/api/src/common/`.

### Interceptors & Pipes
- **Validation**: Uses `class-validator` `^0.15.1` and `class-transformer` `^0.5.1` inside global pipes for strict runtime payload verification against DTOs.
- **Serialization**: Interceptors ensure response payloads are stripped of sensitive fields (e.g., passwords) and follow a standard JSON envelope format.

### Guards & Security
- **Authentication**: Custom AuthGuards relying on `@nestjs/jwt` `^11.0.2` and `passport-jwt`.
- **Rate Limiting**: `@nestjs/throttler` `^6.5.0` protects against DDoS and brute-force endpoints.
- **Headers**: `helmet` `^8.3.0` for safe HTTP header injection.

### Real-time Communication
- **WebSockets**: `@nestjs/websockets` with `socket.io` `^4.8.3` gateway integration to push live updates to connected web clients.

---

## 3. Database & ORM

### Prisma Engine
- **Version**: `^7.10.0`
- **Schema Location**: `apps/api/prisma/schema.prisma` (approx 17KB, defining complex relations).
- **Client Generation**: Managed via Turborepo scripts (`db:generate`) using `@prisma/client`.
- **Database Driver**: Leveraging the new `@prisma/adapter-pg` `^7.10.0` working in tandem with the native `pg` (`^8.23.0`) driver to optimize connection pooling under heavy concurrent loads.
- **Migrations**: Standard `prisma migrate dev` for local schema evolution and `prisma migrate deploy` for CI/CD environments.

### PostgreSQL
- **Version**: `17-alpine`
- **Connection Configuration**: Tuned via Docker Compose with `max_connections=200` and `shared_buffers=256MB`.

### Redis Caching
- **Version**: `8-alpine`
- **Client**: `ioredis` `^6.0.0`
- **Usage Patterns**:
  - Distributive caching for heavy read-queries.
  - Refresh token blacklisting and session tracking.

---

## 4. Frontend Framework: React & Vite

### React 19
- **Version**: `^19.3.0`
- **Rendering Mode**: Client-side rendering tailored for complex dashboard interactions, utilizing React 19 concurrent features.
- **Routing**: `react-router` `^8.3.1` (Latest iteration, unified standard).

### UI Library: Ant Design
- **Version**: `^6.6.3` with `@ant-design/pro-components` `^2.8.10`.
- **Design Tokens**: Leverages Ant Design v6 semantic tokens and CSS-in-JS configurations mapped in `apps/web/src/styles`.

### State Management: Zustand & TanStack Query
- **Zustand**: `^5.0.15` used for global, volatile UI state (e.g., sidebar toggles, theme preferences). Found in `apps/web/src/stores`.
- **TanStack Query**: `^5.102.8` managing all server-state, caching, background polling, and optimistic UI updates. Includes `@tanstack/react-query-devtools` for debugging.

### Build Tooling: Vite
- **Version**: `^8.3.0`
- **Plugins**: `@vitejs/plugin-react` `^6.1.1` for Fast Refresh.
- **Optimization**: Custom manual chunking implemented in `vite.config.ts` to strictly separate vendor boundaries (`vendor-react`, `vendor-antd-core`, etc.), achieving granular cache invalidation.

---

## 5. Monorepo & Tooling

### Package Management
- **pnpm**: Version `11.21.0`.
- **Configuration**: Workspaces defined in `pnpm-workspace.yaml`, spanning `apps/*` and `packages/*` (`shared-types`, `shared-utils`, `shared-validators`).

### Turborepo Pipeline
- **Version**: `^2.10.12`
- **Task Orchestration**: `turbo.json` defines task dependencies (e.g., `build` depends on `^build`), ensuring typed shared packages are compiled before API or Web consumption.

### Linting & Formatting (Biome)
- **Tool**: Biome `^2.5.13` completely replaces ESLint and Prettier.
- **Configuration Path**: `biome.json` at the root.
- **Rules**: Enforces `noExplicitAny` as a warning, `useConsistentArrayType`, and strict formatting (indent style: space, width: 2).

### Testing Automation
- **Unit/Integration**: `vitest` `^5.0.0` providing near-instant watch modes and native TS execution without compiling.
- **E2E**: Playwright `^1.63.0` testing integration.

---

## 6. Emerging 2026 Best Practices Adherence

1. **Rust-based Toolchain Adoption**: Fully adopted Biome over legacy ESLint/Prettier combinations, massively accelerating CI lint/format steps.
2. **ESNext / NodeNext strictness**: Module resolution aligns perfectly with native ES Modules, dropping legacy CommonJS fallbacks.
3. **Database Driver Optimization**: Using Prisma's `adapter-pg` over the native Rust engine interface reduces serialization overhead between Node and Rust binaries, a standard best practice in late 2025/2026 for high-throughput NestJS APIs.
4. **Declarative Server State**: Segregating UI state (Zustand) from asynchronous server data (TanStack Query) entirely eliminates "fat store" anti-patterns.

# Coding Conventions

**Analysis Date:** 2026-08-14

## Naming Patterns

**Files:**
- **Backend (API):** kebab-case with type suffix (e.g., `users.controller.ts`, `app.module.ts`, `http-exception.filter.ts`).
- **Frontend (Web):** PascalCase for React components (e.g., `CommandPalette.tsx`, `PageContainer.tsx`). kebab-case for stores and utils (e.g., `auth.store.ts`).

**Functions:**
- camelCase (e.g., `findAll`, `bootstrap`).

**Variables:**
- camelCase. Unused variables prefixed with `_` (e.g., `_pagination`).

**Types:**
- PascalCase for Classes, Interfaces, and DTOs (e.g., `CreateUserDto`, `JwtAuthGuard`).

## Code Style

**Formatting:**
- **Tool used:** Biome (`biome format --write .`)
- **Key settings:** 2 spaces indent, 100 character line width, single quotes, trailing commas, and required semicolons (`biome.json`).

**Linting:**
- **Tool used:** Biome (`biome check .`) and ESLint (`@uims/eslint-config`) via `turbo run lint`.
- **Key rules:**
  - Warnings on excessive cognitive complexity and `any` types.
  - Errors on unused variables unless prefixed with an underscore (`^_`).
  - Prettier config used within ESLint to disable conflicting formatting rules.

## Import Organization

**Order:**
1. Third-party packages and external libraries (e.g., `@nestjs/common`, `bcrypt`, `react`).
2. Internal/relative imports (e.g., `../../common/dto/pagination.dto`).

**Path Aliases:**
- **Web:** Uses `@/*` mapped to `./src/*` (configured in `apps/web/tsconfig.json` and `vite.config.ts`).
- **API:** Primarily uses relative imports without aliases.

## Error Handling
- **API:** Centralized through NestJS global exception filters (`HttpExceptionFilter` and `PrismaExceptionFilter` mapped in `main.ts`).
- Built-in NestJS exceptions used for HTTP errors (`NotFoundException`, `ConflictException`).
- Payload validation enforced globally via `ValidationPipe` and `class-validator` DTOs.

## Logging
- Backend uses `pino` and `pino-http` for structured logging.
- NestJS app initialization buffers logs until the custom logger is fully instantiated (`bufferLogs: true`).

## Comments
- JSDoc/TSDoc is not strictly enforced, but Swagger decorators (`@ApiOperation`, `@ApiProperty`) double as documentation on DTOs and Controllers.

## Function Design
- Controllers strictly delegate logic to Services.
- Services utilize async/await for asynchronous operations (especially database interactions via Prisma).

## Module Design
- NestJS modules are organized by domain/feature (e.g., `apps/api/src/modules/users/`).
- Separation of concerns: DTOs, controllers, and services are split into dedicated files within the module.

---

*Convention analysis: 2026-08-14*

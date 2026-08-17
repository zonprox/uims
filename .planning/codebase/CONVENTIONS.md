# Coding Conventions
**Analysis Date:** 2026-08-17

## Naming Patterns
- **Files:** Use `kebab-case` for standard module files (e.g., `assets.controller.ts`, `assets.service.ts`). React component files use `PascalCase` (`OrganizationCanvas.tsx`).
- **Functions:** Use `camelCase` for all functions and methods (e.g., `getStats`, `formatAsset`).
- **Variables:** Use `camelCase` for standard variables. 
- **Classes/Types:** Use `PascalCase` for classes, interfaces, and types (e.g., `AssetsController`, `AssetQueryDto`). Do not use the `I` prefix for interfaces.
- **DTOs:** Add a `Dto` suffix for data transfer objects (e.g., `CreateAssetDto`).

## Code Style
- **Formatter/Linter:** Managed centrally by Biome (`biome.json`).
- **Formatting Rules:** 2-space indent, 100 character line width, single quotes, trailing commas enabled, semicolons required.
- **TypeScript:** Use explicit type imports (`import type { ... }`).
- **Simplicity First:** Write the minimum code required to solve the problem. Do not introduce abstractions for single-use code or unrequested "configurability" (per `AGENTS.md`).
- **Surgical Changes:** Only touch necessary code. Match existing style when making edits.

## Import Organization
Group imports in the following order:
1. **External Libraries:** Top-level dependencies (e.g., `import { Injectable } from '@nestjs/common';`).
2. **Monorepo Shared Types:** Type imports from internal packages (e.g., `import type { AssetQueryDto } from '@uims/shared-types';`).
3. **Monorepo Shared Utils:** Utilities and constants (e.g., `import { mapAssetStatus } from '@uims/shared-utils';`).
4. **Relative Imports:** Local modules, services, and DTOs (e.g., `import { PrismaService } from '../../database/prisma.service';`).

## Error Handling
- **API:** Use standard NestJS HTTP exceptions (e.g., `NotFoundException`). Centralized exception handling is done via `HttpExceptionFilter` (found at `apps/api/src/common/filters/http-exception.filter.ts`) which guarantees standardized `{ success: false, statusCode, message, timestamp }` responses.
- **Web:** Handle errors through central Axios interceptors and do not build excessive handling for impossible states.
- **UI Context:** Always consume dynamic theme context via `App.useApp()` for UI notifications (`const { message, notification } = App.useApp();`).

## Logging
- Standard structured logging via platform defaults. Emphasize tracking errors at the boundary rather than pervasive inline debugging logs.
- All logs MUST be written in 100% Professional Enterprise English (`AGENTS.md`).

## Comments
- Avoid restating what the code does; explain the *why* or non-obvious business rules.
- Use Swagger decorators (`@ApiOperation`, `@ApiTags`) instead of inline comments to document API endpoints.
- Ensure all comments strictly follow the Enterprise English standard policy.

## Function Design
- **Single Responsibility:** Isolate concerns. Controllers handle HTTP boundaries; Services execute domain logic (e.g., `resolveCategoryId`, `buildAssetUpdateData`).
- **Data Hydration:** Construct complex update inputs iteratively inside private service methods rather than within the main controller path.

## Module Design
- **API:** Organized by feature domains in NestJS (e.g., `modules/assets/assets.module.ts`).
- **Web:** React state is managed in feature-specific Zustand slices with persistence (`stores/auth.store.ts`).

---
*Convention analysis: 2026-08-17*

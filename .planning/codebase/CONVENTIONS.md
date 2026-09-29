# Coding Conventions

**Analysis Date:** 2026-09-28

## Naming Patterns
**Files:**
- Kebab-case with type suffix (`apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/health/health.controller.spec.ts`) for backend code.
- PascalCase for React components and their test files (`apps/web/src/layouts/MainLayout.tsx`, `apps/web/src/layouts/components/SidebarTheme.test.tsx`).
- Kebab-case for general scripts and configs (`scripts/run-e2e-network.mjs`, `vitest.config.ts`).
**Functions:**
- camelCase (`generateAssetTag`, `resolveCategoryId`, `handleToggleSidebar`).
**Variables:**
- camelCase for instances, primitives (`assetCategory`, `resolvedMode`).
- PascalCase for React component variables (`MainLayout`, `NotificationDrawer`).
**Types:**
- PascalCase for Types, Interfaces, Classes, and DTOs (`AssetWithRelations`, `AssetsService`, `CreateAssetDto`).

## Code Style
**Formatting:**
- Biome
- Key settings: `indentStyle: "space"`, `indentWidth: 2`, `lineWidth: 100`, `quoteStyle: "single"`, `trailingCommas: "all"`, `semicolons: "always"`.
**Linting:**
- Biome and ESLint (in `@uims/eslint-config`)
- Key rules: Biome `preset: "recommended"`, `noExplicitAny: "warn"`, `noExcessiveCognitiveComplexity: "warn"`.

## Import Organization
**Order:**
1. External libraries / framework modules (e.g., `@nestjs/common`, `@prisma/client`, `react`, `antd`)
2. Workspace packages (e.g., `@uims/shared-types`, `@uims/shared-utils`)
3. Internal modules / Stores (e.g., `../stores/auth.store`, `../../database/prisma.service`)
4. Relative local files / Components (e.g., `./components/SidebarContent`)
**Path Aliases:**
- `@/*` for `src/` in the web application (configured in vitest/vite/tsconfig).
- `@uims/*` for workspace packages (`shared-types`, `shared-validators`, `shared-utils`).

## Error Handling
**Patterns:**
- Backend relies on NestJS built-in exceptions (`NotFoundException`, `BadRequestException`, `ServiceUnavailableException`).
- Exceptions are explicitly thrown in the service layer when resolving entities or constraints fail.
```typescript
if (!cat) {
  throw new NotFoundException(`Asset category with ID "${categoryId}" not found`);
}
```

## Logging
**Framework:** `@nestjs/common` Logger (Console wrapper in NestJS)
**Patterns:**
- Instantiated per class: `private readonly logger = new Logger(AssetsService.name);`
- Used for logging service-level operational events and errors.

## Comments
**When to Comment:**
- Minimal inline comments. The code is generally self-documenting through strict TypeScript typing and descriptive naming.
- Occasional comments for specific workarounds or keyboard shortcut definitions (e.g., `// Toggle Command Palette with Cmd+K`).
**JSDoc/TSDoc:**
- Minimal usage; relies primarily on TypeScript type annotations and DTO decorators for schema documentation.

## Function Design
**Size:** Small to medium methods focusing on a single domain operation (e.g., `resolveCategoryId`).
**Parameters:** 
- Mostly strongly typed DTOs (e.g., `data: CreateAssetDto`) for public service methods.
- Prisma transaction clients `tx: Prisma.TransactionClient` passed directly for transactional operations.
**Return Values:** 
- Promises of explicitly defined entities or types.
- Relies on Prisma's generated types (e.g., `Prisma.AssetGetPayload`).

## Module Design
**Exports:** 
- Explicit named exports for types, constants, and utilities.
- React components primarily use `export default function`.
- NestJS services and controllers use `export class` with appropriate decorators (`@Injectable()`).
**Barrel Files:** 
- Rarely used internally in modules, standard direct path imports are prevalent.

---
*Convention analysis: 2026-09-28*

# Code Conventions & Patterns

## TypeScript Standards
- **Version**: TypeScript 7.0.2 (authoritative monorepo standard per `AGENTS.md`)
- **Strictness**: `strict: false` globally across `apps/api` and `apps/web`. However, backend `tsconfig.json` enforces `strictNullChecks: true` and `strictBindCallApply: true`. Frontend disables most strict checks.
- **Module Resolution**: Backend uses `commonjs` and `ES2022` target. Frontend uses `bundler` resolution with `ESNext` target.
- **Path Aliases**: Consistent use of `@/*` pointing to `./src/*`, and workspace dependencies mapped explicitly (e.g., `@uims/shared-types` -> `../../packages/shared-types/src`).

## Code Style & Formatting
- **Linter (ESLint)**: Uses `@typescript-eslint/recommended`. Explicit `any` is warned (`@typescript-eslint/no-explicit-any: 'warn'`). Unused variables error out unless prefixed with `_`. Explicit return types are disabled (`off`).
- **Formatter (Biome)**: Configured in `biome.json` at the root.
  - Indent: 2 spaces
  - Line Width: 100 characters
  - Quotes: Single quotes
  - Trailing commas: `all`
  - Semicolons: `always`
  - Code Complexity: Cognitive complexity warned via `noExcessiveCognitiveComplexity`.
  
## Naming Conventions
- **Files/Directories**: Kebab-case (hyphenated lowercase) is used extensively across both API and Web (e.g., `http-exception.filter.ts`, `assets.controller.ts`, `auth.store.ts`). React component files use PascalCase (e.g., `AssetsPage.tsx`, `PageContainer.tsx`).
- **Classes/DTOs**: PascalCase, generally suffixed by their structural purpose (e.g., `PaginationDto`, `HttpExceptionFilter`, `TransformInterceptor`).
- **Hooks**: CamelCase prefixed with `use` (e.g., `useAssetManagement.ts`, `useSystemHealth.ts`).
- **Components**: PascalCase (e.g., `AssetFilterBar.tsx`).

## API Patterns (NestJS)
- **REST Conventions**: Standard controller mapping (e.g., `@Controller('assets')` with `@Get()`, `@Post()`, `@Patch()`, `@Delete()`).
- **DTO Validation**: Class-validator and class-transformer patterns used heavily (`@IsInt()`, `@Min(1)`, `@Type(() => Number)`).
- **Response Envelopes**: Consistent global responses using `TransformInterceptor` that wraps data:
  ```json
  { "success": true, "data": { ... }, "timestamp": "2026-09-10..." }
  ```
- **Security & Metadata**: Route access control uses custom decorators (`@Roles('Admin')`, `@Public()`). Swagger documentation is attached via `@ApiTags()`, `@ApiOperation()`, and `@ApiBearerAuth()`.

## Frontend Patterns (React)
- **Component Patterns**: Strong separation of UI layouts (`layouts/MainLayout.tsx`) and domain pages (`pages/assets/AssetsPage.tsx`). Component parts are logically separated into `components/` subdirectories.
- **State Management**: Zustand is the standard for global state. Stores implement persistence via `zustand/middleware` (`persist`). Example: `auth.store.ts` handling `hasRole`, `hasPermission`, and `can(action, subject)`.
- **UI Framework**: Ant Design (AntD) is heavily used, including Pro Components (`@ant-design/pro-table`, `@ant-design/pro-field`, `@ant-design/pro-descriptions`).
- **API Client**: Axios interceptor pattern in `services/api.ts` wrapping tokens on request and automatically queuing and refreshing tokens on `401 Unauthorized` responses before retrying.

## Error Handling Patterns
- **Backend Error Handling**: Handled globally via custom exception filters (`HttpExceptionFilter`, `PrismaExceptionFilter`). They transform failures into consistent JSON:
  ```json
  { "success": false, "statusCode": 400, "message": "...", "errors": [...], "timestamp": "..." }
  ```
- **Frontend Error Handling**: React Error Boundaries (`ErrorBoundary.tsx`, `RouteErrorBoundary.tsx`) capture rendering issues. Axios intercepts HTTP errors globally. UI warnings are provided via AntD or custom `ErrorResultView.tsx`.

## Import Organization
- Avoids source import organization (`"organizeImports": "off"` in Biome). Relies on explicit developer ordering, typically third-party libraries first, workspace packages second, relative imports last.


# Code Conventions & Standards
> Last Updated: 2026-09-12

## TypeScript Standards
- **Strict mode configuration**: Enabled across all workspaces (`apps/api`, `apps/web`, shared packages).
- **Zero `any` policy enforcement**: Biome configuration enforces `"noExplicitAny": "warn"` and `"noNonNullAssertion": "warn"`. Use `unknown` and type narrowing instead.
- **Type narrowing patterns used**: Explicit narrowing using `typeof` and `instanceof`. 
- **Error handling patterns**: Catch blocks type errors as `unknown` and narrow them via `error instanceof Error ? error.message : String(error)`.
- **Import organization**: Biome's `organizeImports` is disabled (`"organizeImports": "off"`). Manual logical grouping is encouraged.

## Backend Conventions
### NestJS Patterns
- **Module structure conventions**: Feature modules contain controllers, services, and tests (`users.controller.ts`, `users.service.ts`, `users.service.spec.ts`).
- **Controller patterns**: Use class-based decorators (`@Controller()`, `@Get()`, `@Post()`, `@Patch()`, `@Delete()`). Decorate endpoints with `@ApiOperation` and `@ApiTags`. Use DTOs for request body parsing.
- **Service patterns**: Use Dependency Injection via the constructor (e.g., `PrismaService`, `RedisService`). `Optional()` used for optional services like `DirectoryService`.
- **Guard and interceptor patterns**: Use `@Roles()` custom decorator for role-based access control. Guards sit at the controller or method level.
- **Data sanitization**: Service layer maps database results to strip sensitive fields (e.g., `const { passwordHash: _hash, ...safe } = user`).

### Database Patterns
- **Prisma query patterns**: Queries use strict bounds checking for pagination (e.g., `Math.min(100, Math.max(1, Number(pageSize)))`). Case-insensitive searching uses `mode: 'insensitive'`.
- **Transaction usage**: Prisma transactions are used for batch updates.
- **Data isolation**: Separation of `appUser` and `directoryUser` in the schema.

### API Design Conventions
- **URL naming**: Plural noun endpoints (e.g., `/users`, `/users/stats`, `/users/:id/toggle-status`). Use kebab-case for actions.
- **Pagination contract**: Responses include `items`, `total`, `page`, `pageSize`, and `totalPages`.
- **Error response format**: Standard NestJS HttpException formats (`NotFoundException`, `ConflictException`).

## Frontend Conventions
### React Patterns
- **Component file structure**: PascalCase files (`UsersPage.tsx`, `NavbarSections.tsx`). Keep components modular. Use `React.memo` and `useMemo` for performance optimization on complex layouts.
- **State management conventions**: Zustand 5 is used for global state (e.g., `useAuthStore`, `useThemeStore`), with `persist` middleware.
- **Form handling**: Ant Design Form is the standard for complex forms.

### Ant Design v6 Usage
- **Theme configuration**: Centralized through `ConfigProvider`. `theme.useToken()` hook is widely used to access design tokens for inline styling.
- **Component styling**: Inline styles using semantic tokens (e.g., `token.colorBgContainer`, `token.colorTextTertiary`) instead of magic colors.
- **Notification/Message usage**: Use `App.useApp()` from Ant Design for contextual messages and modals.
- **Icons**: Utilize `@ant-design/icons`.

### Styling
- **CSS approach**: Primary usage of Ant Design tokens within React `style` objects. Heavy reliance on Ant Design's `Flex` and `Layout` components.
- **Responsive design patterns**: Explicit prop flags (e.g., `isMobile`, `isXs`) passed down from layout wrappers.

## Naming Conventions
- **Files and directories**: kebab-case for directories and standard TypeScript files (`users.service.ts`). PascalCase for React components (`NavbarSections.tsx`).
- **Components, hooks, services**: `use[Feature]` for hooks, `[Feature]Service` for backend services.
- **API endpoints and DTOs**: DTOs use `Create[Entity]Dto`, `Update[Entity]Dto`.
- **Database models and enums**: Prisma uses PascalCase for models (`AppUser`) and UPPER_SNAKE_CASE or PascalCase for enum values.

## Code Organization Rules
- **Import ordering**: Biome automation is off; keep external dependencies grouped above internal paths. Use absolute aliases (e.g., `@uims/shared-types`).
- **File length guidelines**: Keep files under 500 lines. Refactor large files.
- **Function size guidelines**: Biome warns on `noExcessiveCognitiveComplexity`. Keep functions focused.

## Linting & Formatting
- **Biome configuration details**: Biome acts as the primary linter and formatter.
  - `indentStyle`: "space", `indentWidth`: 2, `lineWidth`: 100, `lineEnding`: "lf".
  - `quoteStyle`: "single", `trailingCommas`: "all", `semicolons`: "always".
- **ESLint**: Not used. Biome replaces ESLint and Prettier.

# Code Conventions & Patterns

This document outlines the standard coding conventions and architectural patterns used across the UIMS (Unified IT Management System) monorepo. It is based on an exhaustive review of the codebase (NestJS 11 backend, React 19 frontend).

## 1. TypeScript Configuration & Type Safety

### Backend (`apps/api/tsconfig.json`)
The backend strictly adheres to modern TypeScript settings:
- **Module & Resolution**: `NodeNext` for both `module` and `moduleResolution`, ensuring proper ESM support.
- **Target**: `ES2022`.
- **Strict Mode**: Full strict mode is enabled (`"strict": true`).
- **Zero-Any Policy**: `"noImplicitAny": true` prevents implicit `any` types.
- **Decorators**: `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` are enabled for NestJS compatibility.

### Frontend (`apps/web/tsconfig.json`)
- **Module & Resolution**: `ESNext` module with `bundler` resolution for Vite compatibility.
- **JSX**: `"jsx": "react-jsx"`.
- **Path Aliases**: Heavily uses aliases mapped to packages (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`) and `@/*` for `src/`.

### Enforcement
- Strict typings are enforced by the compiler.
- Shared types are extracted to the `packages/shared-types` workspace and imported via path aliases across both web and api boundaries.

---

## 2. NestJS Backend Conventions

### Controller Patterns
Controllers in UIMS follow standard NestJS RESTful patterns with heavy OpenAPI (Swagger) decoration.
Example from `UsersController` (`apps/api/src/modules/users/users.controller.ts`):
- **Routing**: `@Controller('users')`
- **Swagger**: Annotated with `@ApiTags('users')`, `@ApiBearerAuth()`, and `@ApiOperation()`.
- **Guards/Decorators**: Role-based access control is enforced via custom decorators like `@Roles('Admin', 'Super Admin')`.

### Service Patterns
Services contain the core business logic and database interactions.
Example from `UsersService` (`apps/api/src/modules/users/users.service.ts`):
- **Dependency Injection**: Dependencies like `PrismaService` and `RedisService` are injected via the constructor. Optional dependencies use the `@Optional()` decorator.
- **Error Handling**: Uses built-in NestJS exceptions like `ConflictException` and `NotFoundException`.
- **Logging**: Instantiates a logger via `private readonly logger = new Logger(UsersService.name);`.

### DTO Patterns
Data Transfer Objects utilize `class-validator` and `@nestjs/swagger` decorators.
Example (`CreateUserDto`):
```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Admin@2026' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
```

---

## 3. API Design Conventions

- **Endpoint Naming**: Plural nouns (e.g., `/users`, `/users/organizational-units`).
- **Standard Verbs**: `GET` for fetching, `POST` for creation/actions (e.g., `/users/sync-domain`), `PATCH` for partial updates, `DELETE` for removal.
- **Pagination**: Uses a standardized pagination DTO (`UserQueryDto`) yielding `{ items, total, page, pageSize, totalPages }`.

---

## 4. State Management Patterns (Frontend)

Zustand is the primary state management library for global UI state, coupled with `persist` middleware for local storage.

### Zustand Store Structure
Stores are defined in `apps/web/src/stores/`.
Example from `auth.store.ts`:
- **Interface Definition**: Clearly defines the state and actions (`AuthState`).
- **Creation**: Uses `create<AuthState>()(persist(...))`.
- **Encapsulation**: Business logic (e.g., `isSuperAdmin`, `hasRole`, `hasPermission`) is encapsulated within the store itself.

---

## 5. Database & Prisma Patterns

- **Prisma Client**: The backend interacts with PostgreSQL via `PrismaService`.
- **Queries**: Queries are strongly typed. E.g., `Prisma.AppUserWhereInput`.
- **Soft Deletes / Statuses**: Records often use status enums (`ACTIVE`, `SUSPENDED`) rather than hard deletes where appropriate.
- **Search**: Uses Prisma's `mode: 'insensitive'` for case-insensitive text search.

---

## 6. File & Directory Naming Conventions

- **Backend**: Kebab-case naming (e.g., `users.controller.ts`, `create-user.dto.ts`). Grouped by domain modules (`src/modules/users/`).
- **Frontend**: Stores use `.store.ts` suffix (e.g., `auth.store.ts`).
- **Tests**: Co-located with implementation files using `.spec.ts` suffix (e.g., `users.controller.spec.ts`).

---

## 7. Import Organization & Path Aliases

Path aliases are heavily utilized to decouple internal workspace packages.
In `vite.config.ts` and `tsconfig.json`, paths point directly to package sources:
- `@uims/shared-types` -> `packages/shared-types/src`
- `@uims/shared-validators` -> `packages/shared-validators/src`
This ensures hot-reloading across workspace boundaries during development.

---

## 8. Error Handling & Validation Patterns

- **Backend Validation**: `class-validator` handles incoming payload validation automatically via global pipes.
- **Exception Throwing**: Services throw specific HTTP exceptions (`NotFoundException`, `ConflictException`) rather than returning error tuples.
- **Optional Services**: Safe fallbacks are used when services are optional (e.g., falling back to direct Prisma queries if `DirectoryService` is unavailable).

---

## 9. Security Patterns

- **Authentication**: JWT-based authentication validated by guards.
- **Authorization**: Fine-grained role and permission checks. Both backend (via `@Roles()` decorator) and frontend (via `useAuthStore().hasPermission()`) implement RBAC (Role-Based Access Control).
- **Passwords**: Hashed using `bcrypt` (10 rounds). Secure random passwords are automatically generated if not provided during user creation.

---

## 10. Logging Patterns

The standard NestJS `Logger` is used contextually within classes.
```typescript
private readonly logger = new Logger(UsersService.name);
// Usage
this.logger.warn('Failed to count assets', error instanceof Error ? error.message : String(error));
```
Errors are explicitly coerced to strings or checked with `instanceof Error` to satisfy the strict zero-any TypeScript policy.

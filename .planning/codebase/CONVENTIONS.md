# Codebase Conventions

**Analysis Date:** 2026-09-09

## 1. Code Style and Linting
The UIMS monorepo utilizes **Biome** for formatting and **ESLint** + **TypeScript** for linting (`packages/eslint-config/index.js`, `biome.json`).

- **Formatting Rules (`biome.json`):**
  - Indentation: 2 spaces (`indentStyle: "space"`, `indentWidth: 2`)
  - Line Width: 100 characters max (`lineWidth: 100`)
  - Quotes: Single quotes (`quoteStyle: 'single'`)
  - Semicolons: Always (`semicolons: 'always'`)
  - Trailing Commas: All (except JSON which requires none)
- **Linting Rules:**
  - **Zero `any` policy:** Explicit `any` is warned/restricted (`@typescript-eslint/no-explicit-any`). Never use `any` in new code.
  - **Unused variables:** Strictly checked, but variables prefixed with an underscore (e.g., `_hash`) are permitted via `argsIgnorePattern` and `varsIgnorePattern`.

## 2. Comments
- **Self-Documenting Code:** Prefer clear, descriptive variable/function names over inline comments.
- **JSDoc/TSDoc:** Used primarily on shared utility functions and complex service logic to provide editor context. Avoid restating what the function signature already makes clear.

## 3. Function Design
- **Return Value Patterns:** Functions and services should return well-defined types or interfaces. Avoid returning generic wrappers unless required by the framework.
- **Parameter Patterns:** Use configuration objects (DTOs or typed objects) for functions requiring more than 2-3 arguments.
- **Mandatory Bounded Queries:** Database queries must always be bounded and implement deterministic sorting.
  - *Example (`users.service.ts`):*
    ```typescript
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 50));
    // ...
    orderBy: { createdAt: 'desc' }
    ```

## 4. Module Design
- **API (NestJS):** Standard separation into `*.controller.ts` (routing and HTTP mapping) and `*.service.ts` (business logic).
- **Dependency Injection:** Services use `@Injectable()`. Cross-module dependencies are injected via the constructor (e.g., `PrismaService`, `RedisService`). Soft dependencies use `@Optional()`.
- **Exports:** Prefer explicit named exports over default exports, except for React page components loaded via router where default exports are often required. Barrel files (`index.ts`) are used in shared packages (e.g., `packages/shared-validators/src/index.ts`).

## 5. Path Aliases
Path aliases are configured in `vite.config.ts` (and corresponding `tsconfig.json` files):
- `@/`: Resolves to `apps/web/src` for frontend imports.
- `@uims/shared-types`: Shared TypeScript interfaces.
- `@uims/shared-validators`: Shared Zod validation schemas.
- `@uims/shared-utils`: Shared utility functions.

## 6. Error Handling
- **Typed Catch Blocks:** NEVER use silent catches. Always specify the error as `unknown` and narrow the type before accessing its properties.
  - *Frontend Example (`LoginPage.tsx`):*
    ```typescript
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errMsg = err.response?.data?.message || err.message || 'Invalid credentials.';
      message.error(errMsg);
    }
    ```
  - *Backend Example (`users.service.ts`):*
    ```typescript
    } catch (error: unknown) {
      this.logger.warn('Failed...', error instanceof Error ? error.message : String(error));
    }
    ```

## 7. DTO & Validation Patterns
- **API DTOs:** Use `class-validator` and `class-transformer` alongside `@nestjs/swagger` decorators.
  - *Example (`create-user.dto.ts`):*
    ```typescript
    @ApiProperty({ example: 'john.doe@company.com' })
    @IsEmail()
    email!: string;

    @ApiPropertyOptional({ example: 'Production' })
    @IsString()
    @IsOptional()
    department?: string;
    ```
- **Zod:** Available via `@uims/shared-validators` for schema sharing and runtime validations outside the NestJS DTO boundaries.

## 8. API Response Envelope
Global exception handling is standardized via `HttpExceptionFilter` in the API. Error responses strictly follow this envelope format:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["email must be an email"],
  "timestamp": "2026-09-09T12:00:00.000Z"
}
```

## 9. Frontend Component Patterns
- **Ant Design v6 Integration:** Heavy usage of standard Antd components (`Card`, `Flex`, `Typography`).
- **Dynamic Context (App.useApp):** The `App` wrapper is used for static functions. Always extract context using `App.useApp()`.
  - *Example (`LoginPage.tsx`):*
    ```tsx
    const { message } = App.useApp();
    // ...
    message.warning('Please enter your email...');
    ```
- **Styling:** Inline styling object notation is common for precise layout control, leveraging global theme variables (`useThemeStore`).

## 10. State Management Patterns
- **Zustand Stores:** Used for global client state (Auth, Theme). Stores are typed with interfaces and often use the `persist` middleware.
  - *Example (`auth.store.ts`):*
    ```typescript
    export const useAuthStore = create<AuthState>()(
      persist((set, get) => ({
        user: null,
        token: null,
        // actions
        login: (token, user, perms) => set({ token, user, permissions: perms }),
      }), { name: 'uims-auth-storage' })
    );
    ```

*Convention analysis: 2026-09-09*

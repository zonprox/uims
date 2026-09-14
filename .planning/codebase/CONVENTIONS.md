# UIMS Code Conventions & Patterns

## 1. TypeScript Strictness
The codebase strictly adheres to standard TypeScript best practices across all environments.
- **Strict Mode**: Configured globally via `"strict": true` in all TS configs (`apps/api/tsconfig.json`, `apps/web/tsconfig.json`).
- **Any Usage**: The `any` keyword is discouraged but presently appears roughly 131 times. All new PRs must use `unknown` or strong types instead.
- **Error Types**: Try-catch statements are strongly typed. Error variables (e.g. `catch (error: unknown)`) should be checked via type narrowing instead of assuming the error shape.
- **Indexed Access**: It is strongly advised to enforce `noUncheckedIndexedAccess: true` in the `tsconfig.json` to prevent out-of-bounds array and object lookup errors.

## 2. Naming Conventions
Consistency is key across the repository to ensure predictability.
- **Files and Directories**: Strictly **kebab-case** across the board. 
  - *Correct*: `http-exception.filter.ts`, `scheduled-alerts.worker.ts`
  - *Incorrect*: `HTTPExceptionFilter.ts`, `scheduledAlertsWorker.ts`
- **React Components**: Strictly **PascalCase** for both the file name and the exported component.
  - *Correct*: `NotificationDrawer.tsx`, `SidebarBrandHeader.tsx`
- **Test Files**: Append `.test.ts(x)` or `.spec.ts(x)`. `.spec.ts` is favored for NestJS and `.test.tsx` for React components.
- **Interfaces and Types**: Standard **PascalCase** without leading `I` prefixes (e.g., `ThemeState`, not `IThemeState`).

## 3. Zustand Store Patterns
React state that transcends simple local component boundaries must reside in `apps/web/src/stores/`.
- **Definition Pattern**: Use `zustand`'s `create` with explicit TypeScript generic typing `create<ThemeState>()(...)`.
- **Middleware Usage**: `persist` is utilized heavily for UX continuity (theme, settings, auth). 
- **Example Pattern (`theme.store.ts`)**:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeState {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      resolvedMode: 'light',
      setMode: (mode: ThemeMode) => set({ mode, resolvedMode: resolveThemeMode(mode) }),
      toggleMode: () => {
        const nextMode = get().resolvedMode === 'dark' ? 'light' : 'dark';
        set({ mode: nextMode, resolvedMode: nextMode });
      },
    }),
    { name: 'uims-theme-settings' }
  )
);
```

## 4. Hook Patterns & Data Fetching
- **Naming**: Custom hooks are prefixed with `use` (e.g. `useSystemHealth.ts`).
- **Encapsulation**: Instead of invoking `fetch` or `axios` directly in React components, all API calls must be wrapped inside a custom hook. 
- **Return Shape**: Standard hooks return a standardized object containing the data and meta-state variables.
```typescript
// useSystemHealth.ts return signature:
export function useSystemHealth(options: UseSystemHealthOptions = {}) {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // ...
  return { health, isLoading, isRefreshing, error, refresh: fetchHealth };
}
```

## 5. DTO & Validation Pipeline
Data transfer objects ensure strong boundary typing between the client and the NestJS server.
- **Library Split**: The codebase uses `class-validator` and `class-transformer` exclusively in the API layer, while `Zod` is maintained in `packages/shared-validators/` for potential frontend overlap.
- **DTO Structure**: Uses decorators from `@nestjs/swagger` and `class-validator`.
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification headline / title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ enum: ['alerts', 'tasks'], description: 'Optional category' })
  @IsString()
  @IsOptional()
  category?: 'alerts' | 'tasks' | 'general';
}
```
- **Pipeline Implementation**: `ValidationPipe` is registered globally in `main.ts` with `whitelist: true` and `transform: true`.

## 6. Prisma Query Patterns
- **Abstraction**: Controllers must never inject `PrismaService`. All database operations live inside the `Injectable` Services.
- **Transactions**: For operations that modify multiple tables (like updating a user and spawning a notification), `$transaction` is strictly enforced.
- **Types**: Service methods rely on Prisma's auto-generated types (e.g., `Notification` vs `CreateNotificationDto`) to ensure seamless database type mapping.

## 7. Guard & Decorator Patterns
- **Decorator Definition**: Custom decorators leverage NestJS `SetMetadata` to tag route handlers.
```typescript
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: Array<string>) => SetMetadata('roles', roles);
```
- **Guard Consumption**: Custom guards like `RolesGuard` read this metadata using the core `Reflector` service.
```typescript
const roles = this.reflector.getAllAndOverride<Array<string>>('roles', [
  context.getHandler(),
  context.getClass(),
]);
```
- **Chaining**: Standard endpoints enforce `@UseGuards(JwtAuthGuard, RolesGuard)` sequentially to ensure authentication before authorization.

## 8. Module Structure Pattern
To prevent circular dependencies and maintain predictability, NestJS modules must be organized vertically by domain:
```
apps/api/src/modules/notifications/
├── dto/                          # Sub-folder for all Data Transfer Objects
│   ├── create-notification.dto.ts
│   └── notification-query.dto.ts
├── notifications.controller.ts   # Entry point: HTTP Routing and decorators
├── notifications.controller.spec.ts
├── notifications.service.ts      # Core logic: DB queries, business rules
├── notifications.service.spec.ts
├── notifications.gateway.ts      # Real-time WebSocket emission via Socket.io
└── notifications.module.ts       # Module declaration binding Controller/Service
```

## 9. Frontend Page Pattern
- **Layout Usage**: Route components are grouped under layout providers (e.g., `MainLayout.tsx`, `AuthLayout.tsx`).
- **Page Construction**: A standard page begins with a structural container (`PageContainer`) wrapping breadcrumbs, dynamic headers, and feature-specific components.
- **Lazy Loading**: Major routes are generally code-split to optimize initial bundle size.

## 10. Ant Design v6 Patterns
- **Imperative UI**: Context-aware modals and alerts are triggered using Ant Design's `App.useApp()`. This guarantees the modal has access to the current theme/store context, unlike legacy `Modal.confirm()`.
```typescript
import { App } from 'antd';

export function ErrorResultView() {
  const { modal, message } = App.useApp();
  // Call modal.error(...) or message.info(...)
}
```
- **Theming & Tokens**: Inline styles and dynamic CSS-in-JS properties utilize semantic tokens via `theme.useToken()`. This ensures absolute consistency across Light/Dark modes.
```typescript
import { theme } from 'antd';

export function NavIconWithBadge() {
  const { token } = theme.useToken();
  return <div style={{ color: token.colorPrimary, backgroundColor: token.colorBgContainer }}>...</div>;
}
```

## 11. API Response Envelopes
To ensure robust client-side parsing, all API endpoints are funneled through a global `TransformInterceptor`.
```typescript
// All 2xx success responses are shaped like:
export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
```

## 12. Global Error Handling
Errors are gracefully caught by a global `HttpExceptionFilter`. Raw error stack traces are never leaked to the client.
```typescript
// Standard 4xx/5xx payload:
{
  success: false,
  statusCode: 400,
  message: "Invalid UUID format",
  errors?: ["id must be a UUID"], // Optional detailed messages
  timestamp: "2026-09-14T02:42:04Z"
}
```

# Project Structure

## Monorepo Layout
```
/home/user/projects/uims
├── .github/          # GitHub actions workflows
├── apps/
│   ├── api/          # NestJS 11 backend with Prisma ORM
│   └── web/          # React 19 SPA frontend with Ant Design v6
├── docker/           # Docker Compose services config, DB init scripts, Nginx conf
├── docs/             # Project documentation (Architecture, Deployment, Dev, Testing)
├── packages/
│   ├── eslint-config/      # Shared ESLint configurations
│   ├── shared-types/       # Shared TypeScript DTOs, interfaces, and API response types
│   ├── shared-utils/       # Shared utilities for formatting, networking, timezone validation
│   └── shared-validators/  # Zod validation schemas shared between frontend and backend
├── scripts/          # Shell scripts for dev environment, stack runner, test runners
├── .env.example      # Example environment variables (parameterized)
├── AGENTS.md         # Authoritative Engineering & Defect Prevention Directives
├── README.md         # Project overview
├── pnpm-workspace.yaml # pnpm workspaces configuration
└── package.json      # Root dependencies
```

## Key Directories

### apps/api/
The `apps/api/` directory houses the monolithic backend service using NestJS 11.
- `prisma/`: Prisma ORM schema (`schema.prisma`), migrations, seeds (`seed.ts`, `seeders/`), and batch import scripts.
- `src/`: Main source code directory.
  - `common/`: Global utilities, custom decorators (`@ClientIP`, `@Roles`, `@Public`), guards, exceptions, and middlewares.
  - `config/`: Environment configuration loading logic.
  - `database/`: Database connection and specific providers.
  - `modules/`: Feature modules, separating the domain logic. Key modules include:
    - `assets/`, `audit/`, `auth/`, `dashboard/`, `directory/`, `health/`, `inventory/`, `licenses/`, `network/`, `notifications/`, `organization/`, `reports/`, `roles/`, `search/`, `settings/`, `users/`.
  - `app.module.ts`: Root module bootstrapping the application.
  - `main.ts`: Application entry point setting up Swagger, global pipes, and validation.

### apps/web/
The `apps/web/` directory holds the React 19 frontend application.
- `src/`: Main source code directory.
  - `app/`: Application setup components (`App.tsx`), layout providers.
  - `components/`: Shared React UI components built with Ant Design v6. (e.g., `PageContainer`).
  - `hooks/`: Shared React hooks (e.g., custom hooks for TanStack query).
  - `layouts/`: Core visual layouts like `MainLayout` mapping out standard app shell structure.
  - `pages/`: Route-specific page components mirroring the modules in the API:
    - `access/`, `assets/`, `audit/`, `auth/`, `dashboard/`, `directory/`, `inventory/`, `licenses/`, `network/`, `notifications/`, `organization/`, `reports/`, `settings/`, `users/`.
  - `services/`: API client services using Axios to interface with the backend.
  - `stores/`: Zustand global state stores (e.g., `theme` store).
  - `styles/`: Global CSS/styling rules overrides and Ant Design token configs.
  - `main.tsx`: Entry point rendering the React root.
- `index.html`: Vite HTML template.
- `vite.config.ts`: Vite build and dev server configuration.

### packages/
Monorepo workspace packages.
- `shared-types/`: `src/dto/`, `src/entities/`, `src/enums/`. Exports base API envelopes.
- `shared-utils/`: `src/network.ts`, `src/timezone.ts`, `src/format.ts`. High fan-in core utilities.
- `shared-validators/`: Zod schemas mirroring the backend modules (`user.validator.ts`, `organization.validator.ts`, etc.) for dual-sided validation.

## Configuration Files
- `apps/api/nest-cli.json`: NestJS project configurations.
- `apps/api/prisma.config.ts`: Prisma programmatic configuration.
- `apps/web/vite.config.ts`: Vite frontend bundling rules, local HTTPS setup, API proxy.
- `docker-compose.yml`: Main services orchestrator for Postgres 17, Redis 8, Meilisearch, SeaweedFS, and API/Web containers.
- `docker-compose.dev.yml`: Overrides for the local development stack.
- `pnpm-workspace.yaml`: Declares monorepo package locations.
- `eslint.config.mjs`: Central ESLint flat configs extending `@uims/eslint-config`.

## Scripts & Automation
- `scripts/dev.sh`: Core stack lifecycle management script (start, stop, restart, logs, url) to launch Docker dependencies and node processes with Cloudflare tunnel.
- `scripts/test-login.mjs` & `scripts/test-responsive.mjs`: E2E test scripts for specific workflows.
- `apps/api/package.json` contains `prisma:*` commands for schema migrations and seeding.
- Frontend scripts rely on Vite (`vite`, `vite build`, `vite preview`).

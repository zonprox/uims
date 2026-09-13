# Original User Request

## 2026-09-12T01:02:48Z

Streamline and simplify UIMS into a minimalist, clean, text-oriented IT Asset Management system across Hardware Assets, Software Licenses, Inventory, and Network IPAM. Prune unnecessary enterprise bloat (Security Policies, Access Simulator, Network Credentials, and redundant fields) across the full stack while standardizing the UI/UX for density, speed, and clarity.

Working directory: /home/user/projects/uims
Integrity mode: development

## Requirements

### R1. Prune Out-of-Scope Enterprise Features
Completely remove obsolete and out-of-scope enterprise features across both frontend and backend, specifically:
- Access Simulator and Security Policy evaluation engines and UI dialogs.
- Network Credential storage, secret vaults, and related API endpoints/models.
- Any dead navigation items, routes, and unused permission checks related to these pruned features.

### R2. Simplify & Minimalize Core Domain Entities
Retain Hardware Assets, Software Licenses, Consumable Inventory, and Network (VLAN/Subnet/IP allocation), but strip them down to essential text metadata, status tags, identifiers, and core operational fields. Remove unneeded complex background integrations, over-engineered sync workers, and redundant relational bloat.

### R3. Modernize, Standardize & Compact UI/UX
Redesign the user interface into a cohesive, minimalist, and compact layout adhering strictly to Ant Design v6 guidelines:
- High-density, readable tables with instant text-based filtering and concise column sets.
- Clean and unified drawer/modal forms for asset creation and editing without nested tabs or unnecessary form fields.
- Simplified sidebar navigation that emphasizes the 4 core domains (Assets, Licenses, Inventory, Network) alongside Dashboard and Settings, eliminating clutter.
- Responsive, concise Enterprise English UI copy with zero filler text or redundant prefixes.

### R4. Clean Build & Quality Assurance Invariants
Refactor all affected unit tests, component tests, and seeders to reflect the pruned architecture. Ensure zero dangling imports, zero orphan schema references, and zero type diagnostics across all workspaces.

## Acceptance Criteria

### Scope & Architecture
- [ ] Security Policy, Access Simulator, and Network Credentials features are completely removed from frontend navigation, routes, API controllers, services, and database schema.
- [ ] Core modules (Assets, Licenses, Inventory, Network) remain fully functional with simplified, clean text-oriented attributes.
- [ ] Sidebar navigation reflects the simplified structure without orphan links or empty groups.

### UI/UX & Ant Design Standards
- [ ] Table views for Assets, Licenses, Inventory, and Network provide clean, high-density layouts with functional search and filtering.
- [ ] Creation and edit flows use streamlined forms containing only essential fields.
- [ ] Dynamic feedback (App.useApp()) and semantic token styling (styles={{ ... }}) are maintained with zero deprecated Ant Design anti-patterns.

### Verification & Quality Gates
- [ ] pnpm run typecheck exits with code 0 across all workspaces (apps/api, apps/web, packages/*).
- [ ] pnpm run lint exits with code 0 across all workspaces.
- [ ] pnpm run format:check passes with 0 formatting violations.
- [ ] pnpm run test passes with 100% success rate across all workspaces.
- [ ] pnpm run build cleanly compiles both apps/api and apps/web without errors.

## 2026-09-13T12:03:26Z

Refactor and harden the UIMS enterprise monorepo by systematically addressing all technical risks and performance bottlenecks documented in `.planning/codebase/CONCERNS.md`, modernizing all dependencies to their latest compatible releases under a strict zero-downgrade policy, updating authoritative engineering directives in `AGENTS.md`, and achieving 100% green CI verification across all workspaces.

Working directory: /home/user/projects/uims
Integrity mode: development

## Requirements

### R1. Resolve Codebase Concerns & Modernize Security and Performance
Systematically remediate all risks identified in `.planning/codebase/CONCERNS.md` in compliance with strict 2026 architectural standards:
- **CORS & WebSocket Security**: Unify and extract CORS origin resolution into a shared config utility. Eliminate hardcoded localhost fallbacks and wildcards; enforce strict origin allowlisting while securely permitting Cloudflare preview domains in development. Ensure WebSocket gateway token authentication verifies token validity without accepting query-string tokens.
- **Database Query Ceilings & Deterministic Ordering**: Ensure all service and dashboard queries enforce explicit pagination limits (`take: Math.min(limit, 100)`) and deterministic `orderBy` clauses. Eliminate unbounded `findMany()` queries across all services (audit, directory, dashboard, inventory, network, assets).
- **Zero In-Memory Aggregations & N+1 Elimination**: Refactor dashboard metrics and directory batch lookups to utilize database-level aggregations (`_sum`, `_count`, `groupBy`) or Prisma batching/DataLoader patterns instead of loading raw tables into Node.js memory.
- **Resilience & Graceful Shutdown**: Implement connection draining and shutdown hooks for WebSockets and background queues. Enhance health check probe endpoints (`/api/v1/health`) to verify database and cache connectivity.
- **Logging & Type Safety**: Ensure structured logging standards are respected with zero console logging in production code, typed catch blocks (`catch (error: unknown)`), and zero `@ts-ignore` or `any` casts.

### R2. Monorepo Dependency Modernization (Strict Zero-Downgrade)
Upgrade all dependencies across the monorepo (`package.json`, `apps/api/package.json`, `apps/web/package.json`, `packages/*/package.json`) to their latest compatible versions:
- Enforce strict zero-downgrade: Under no circumstances may any dependency (such as TypeScript 7.x, NestJS 11.x, React 19.x, Prisma 7.x) be downgraded, even if lower versions were referenced in historical notes or older issues.
- Synchronize lockfile via `pnpm install --no-frozen-lockfile` and deduplicate dependencies via `pnpm dedupe`.
- Preserve build pipeline compatibility and monorepo workspace protocol invariants.

### R3. Update Engineering Directives & Architecture Rules (`AGENTS.md`)
Update `AGENTS.md` with explicit, authoritative engineering directives to permanently prevent these architectural, security, and performance defects from recurring:
- Document zero-unbounded query invariants, mandatory pagination ceilings, and deterministic sorting rules.
- Document zero-in-memory table scan and aggregation rules.
- Document WebSocket auth and CORS allowlist standards.
- Document structured logging and zero-downgrade policies.

### R4. Verification, Version Control & CI Pipeline Delivery
Verify the full monorepo lifecycle locally and in CI:
- Execute verification loop: `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm run test`, and `pnpm run build`.
- Stage all modified files, create clean and conventional git commits, push changes to `origin/main`, and track the CI pipeline until all checks pass green.

## Acceptance Criteria

### Security & Architecture
- [ ] CORS logic is extracted into a DRY configuration utility and applied consistently to both HTTP and WebSocket layers.
- [ ] No unbounded `.findMany()` calls exist in API services or workers; all queries enforce pagination (`take`) and deterministic `orderBy`.
- [ ] Dashboard metrics compute sums and counts via Prisma aggregations rather than JavaScript in-memory loops.
- [ ] Health check and graceful shutdown procedures are cleanly integrated.

### Dependency Management
- [ ] Dependencies across root and all workspace packages are upgraded to latest versions.
- [ ] Zero packages have been downgraded; TypeScript 7.x and latest stable major versions are preserved.
- [ ] `pnpm-lock.yaml` is clean, deduplicated, and synchronized with package manifests.

### Directives & Documentation
- [ ] `AGENTS.md` contains comprehensive, enforceable directives covering the remediated concerns.

### Verification & CI
- [ ] `pnpm run typecheck` exits with 0 errors across all workspaces.
- [ ] `pnpm run lint` exits with 0 errors across all workspaces.
- [ ] `pnpm run format:check` reports 0 formatting violations.
- [ ] `pnpm run test` passes with 100% success rate across all unit and integration tests.
- [ ] `pnpm run build` succeeds across all packages.
- [ ] All changes are committed, pushed to `origin/main`, and remote CI build runs green.

## 2026-09-13T13:40:25Z

CRITICAL USER DIRECTIVE INCOMING:
The user has submitted an additional requirement:
"removel all fixed url/link, so this app can run with any custom url/port"

Please ensure the following are implemented before concluding Milestone 4 and claiming victory:
1. `apps/web/src/hooks/useRealtimeNotifications.ts`: Remove hardcoded `'http://localhost:3002'`. Make socket URL resolution completely dynamic: use `window.location.origin` in browser, or relative `'/notifications'` when origin is not set, never falling back to a fixed host or port.
2. `apps/web/src/services/api.ts`: Ensure `baseURL` dynamically defaults to relative `'/api/v1'` (or `import.meta.env.VITE_API_URL`), working seamlessly on any domain, port, or reverse proxy.
3. `apps/api/src/config/cors.config.ts`: Remove fixed port restrictions for dev/local environments. In non-production, permit any custom port on localhost/127.0.0.1/0.0.0.0 (`/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/`), as well as reading `process.env.WEB_PORT`, `PORT`, and explicit `CORS_ORIGIN`, so the API accepts requests from any custom URL or port.
4. `apps/web/vite.config.ts`: Respect custom ports from `process.env.PORT`, `VITE_PORT`, `WEB_PORT`, `APP_PORT`, with `host: '0.0.0.0'` and `allowedHosts: true`.
5. Run full verification (`typecheck`, `lint`, `format:check`, `test`, `build`) and push all changes to `origin/main`.

# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Enterprise English & UI/UX Copy Standards

**100% Professional, Concise Enterprise English Mandatory.**

- All user-facing UI labels, descriptions, alert messages, toasts/notifications, table columns, modal titles, placeholder text, code identifiers, comments, documentation, test descriptions, API payloads, error messages, and git commits MUST be in clear, standardized Enterprise English.
- No non-English or mixed language text in source code, UI strings, comments, DTOs, seeds, or logs.
- **Concise & High-Signal UI Copy (No Fluff):**
  - **Eliminate Redundant Buzzwords & Prefixes:** Do not prepend verbose prefixes like "Enterprise ...", "Unified ...", "Global ...", "Master ...", or "System ..." unless strictly differentiating namespaces (e.g., use `Notifications` instead of `Enterprise Notifications`, `Assets` instead of `Unified Asset Inventory`, `Settings` instead of `Global System Settings`).
  - **Action-Oriented Buttons & Controls:** Keep actions short, direct, and verb-first (e.g., `Create Asset` instead of `Create New Asset Record`, `Export CSV` instead of `Export Data to CSV File`, `Save` instead of `Save Current Changes`).
  - **Casing Consistency:** Use Title Case for page titles, modal headers, navigation menus, and tab labels. Use sentence case for subtitles, helper text, toasts, and descriptions.
  - **Clean & Informative Empty/Error States:** Clearly state the state and the next action without filler words (e.g., "No assets found. Click 'Add Asset' to get started.").

## 6. Ant Design v6+ UI/UX Guidelines

- Always consume dynamic theme context via `App.useApp()` (`const { message, modal, notification } = App.useApp();`). Never invoke static `message.*`.
- Use semantic token styling with `styles={{ body: ... }}` / `styles={{ content: ... }}` rather than deprecated `bodyStyle` / `valueStyle`.
- Use `<PageContainer>` for all views to maintain consistent breadcrumbs, KPI statistics, search controls, and primary action buttons.
- Keep table density high and information readable with dedicated quick actions (e.g., 1-click credential/email copying, status tags, responsive drawers).
- In component tests, cleanly unmount root instances in `afterEach` (`await act(async () => { currentRoot?.unmount(); })`) and remove portal DOM elements (`.ant-modal-root`, `.ant-drawer`, `.ant-popover`) to avoid React 19 microtask leaks.

## 7. Secret Management & Container Configuration Directives

- **Zero Hardcoded Secrets & Plaintext Fallbacks**:
  - In `docker-compose.yml` and `.env.example`, parameterize `DATABASE_URL` and `REDIS_URL` using `${DATABASE_PASSWORD}` and `${REDIS_PASSWORD}`. Never provide default plaintext passwords or secrets in fallbacks.
  - `AUDIT_SIGNING_KEY: ${AUDIT_SIGNING_KEY}` is required in API environment definitions to satisfy startup verification.
  - Fail fast at startup if required environment variables are absent.
- **Cryptographic Password Provisioning**:
  - Never use predictable default passwords (e.g. `Ad#${username}2026!`). Automatically generate cryptographically strong passwords, enforce password reset on initial login, and never return initial passwords in API responses.

## 8. Error Handling & Structured Logging Invariants

- **Zero Silent Catch Policy**:
  - Silent catch blocks (`catch (err) {}` or `.catch(() => {})`) are strictly banned.
  - Always use typed `catch (error: unknown)` and narrow with type guards before inspecting.
  - All errors must be logged with context using NestJS structured `Logger`, rethrown as domain exceptions, or surfaced via user notifications.
- **Production Logging Mandate**:
  - Backend: Use `private readonly logger = new Logger(Context.name)`. Raw `console.log`, `console.warn`, and `console.error` are banned.
  - Frontend: Raw `console.error` in production components and hooks is banned; surface actionable errors via `App.useApp().message.error(...)` or error boundaries.

## 9. WebSocket Gateway Security Standards

- **Dynamic CORS Allowlist**:
  - WebSocket gateways must strictly enforce the dynamic CORS allowlist (`CORS_ORIGIN` / `ALLOWED_ORIGINS`). Never use `origin: '*', credentials: true`.
- **Secure Token Transport**:
  - Transmit tokens exclusively via `auth.token` handshake payloads or `Authorization: Bearer` headers.
  - Never extract or transmit JWT tokens in URL query strings (`socket.handshake.query.token`).
- **Fail-Closed Connection Rejection**:
  - Disconnect unauthenticated sockets immediately.
  - Never default unverified sockets or users to `'Employee'` or fallback roles.

## 10. Database Access, Query Bounding & Schema Indexing

- **Mandatory Query Limits & Deterministic Sorting**:
  - Every Prisma `findMany()` across service methods and cron workers must specify `take` (capped at 100) and deterministic `orderBy`.
- **Zero In-Memory Scans & Aggregations**:
  - Full-table scans into Node.js memory (e.g. scanning all items to check thresholds in JS) and in-memory sum reductions are strictly prohibited.
  - Use database-level `where` filters and database aggregates (`_sum` or SQL aggregates).
- **Mandatory Schema Indexing**:
  - All relational foreign keys in `schema.prisma` (`organizationId`, `departmentId`, `positionId`, `locationId`, `roleId`, `vlanId`) must have `@@index([foreignKey])`.
  - Filter columns, timestamp sort keys, and scheduled alert fields (`warrantyExpiry`, `expiryDate`, composite `[status, updatedAt]`) must be indexed.
  - Composite primary keys must have reverse indexes on secondary foreign keys (`RolePermission.permissionId`).

## 11. Frontend Architecture & Circular Dependency Elimination

- **Decoupled Stores and Services**:
  - Circular dependencies between stores and services (e.g., `auth.store.ts` -> `auth.service.ts` -> `api.ts` -> `auth.store.ts`) are prohibited.
  - State stores manage UI state; API clients manage network transport without cyclical store imports.
  - Remove empty stub methods that trigger module evaluation cycles.

## 12. Monorepo Dependency Maintenance & Strict Zero-Downgrade Invariant

- **Zero-Downgrade Policy**:
  - Under no circumstances may any dependency be downgraded, even if lower versions or downgrades are mentioned in historical notes or concerns (specifically refuting TD-020).
  - TypeScript 7.x (`^7.0.2` / latest) is the authoritative monorepo standard and MUST be preserved across all manifests.
- **Lockfile Hygiene**:
  - Always update `pnpm-lock.yaml` via `pnpm install --no-frozen-lockfile && pnpm dedupe` after manifest updates.

## 13. System Startup & Hot Reload via Cloudflare Tunnel Directives

Whenever the user requests to start, launch, or run the system (e.g., "khởi động hệ thống", "start system", "chạy app", "deploy hot reload"):
- **Automated Stack Startup**:
  1. Ensure the backend database (PostgreSQL 17 / Docker) is healthy and start the NestJS API server (`PORT=3002 node dist/main.js` or `pnpm --filter @uims/api start:dev`).
  2. Start the Vite web frontend with Hot Module Replacement (HMR) enabled (`pnpm --filter @uims/web dev`).
  3. **Auto-start Cloudflare Tunnel**: Launch the Cloudflare quick tunnel in the background (`cloudflared tunnel --url https://localhost:5679 --no-tls-verify`) pointing to the active Vite dev server.
- **Immediate Public URL Display**: Extract and output the public `.trycloudflare.com` URL to the user in chat immediately so they can inspect and test changes live with hot reload.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

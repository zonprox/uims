# UIMS Codebase Concerns & Technical Debt
**Analysis Date:** 2026-08-14

This document outlines known issues, technical debt, security concerns, and fragile areas discovered in the UIMS monorepo.

## 1. Security Concerns

### 1.1 Privilege Escalation Vulnerability (API)
- **Location:** `apps/api/src/modules/auth/auth.service.ts`
- **Issue:** In `login()` and `refresh()`, if a user's role is undefined, it defaults to a highly privileged role: `const role = user.roleName || 'Super Admin';`.
- **Fix:** Default to the least privileged role (e.g., `'Employee'`) or throw an error if the user lacks a role.

### 1.2 JWT Token Storage (Web)
- **Location:** `apps/web/src/stores/auth.store.ts`
- **Issue:** Uses Zustand's `persist` middleware which defaults to `localStorage` for state persistence. Storing JWT access tokens in local storage exposes the application to Cross-Site Scripting (XSS) token theft.
- **Fix:** Move authentication token storage to `HttpOnly` secure cookies set by the backend, using the Zustand store only for non-sensitive user metadata.

### 1.3 Hardcoded Secrets in Environment Templates
- **Location:** `apps/api/.env.example`
- **Issue:** The template contains hardcoded production-like secrets (e.g., `DATABASE_PASSWORD=uims_secret_2026`, `MEILISEARCH_API_KEY=uims_meili_master_key_2026`). 
- **Fix:** Remove explicit password strings from example templates. Replace them with placeholder text like `<INSERT_YOUR_SECURE_PASSWORD>`.

### 1.4 Docker Container Runs as Root
- **Location:** `apps/api/Dockerfile`
- **Issue:** The `runner` stage lacks a `USER node` directive, meaning the Node process runs as the `root` user within the container.
- **Fix:** Add `USER node` before the `CMD` instruction in the runner stage.

---

## 2. Database Schema & Data Integrity
**Location:** `apps/api/prisma/schema.prisma`

### 2.1 Missing Cascade Deletes
- **Issue:** `User` relations (e.g., `auditLogs`, `assignedAssets`, `licenseAssignments`) do not define `onDelete` behaviors. Prisma defaults to `Restrict`. Deleting a user via `UsersService.remove()` will fail if they have associated audit logs or assets.
- **Fix:** Add `onDelete: Cascade` or `onDelete: SetNull` to appropriate relations.

### 2.2 Denormalization and Duplication
- **Issue:** `Ticket` model has both `categoryId` (relation) and `category` (String).
- **Issue:** `LicenseAssignment` duplicates `assignedName` and `assignedEmail` which should just be resolved via the `userId` relation. Data can easily fall out of sync.
- **Issue:** `Ticket.affectedAsset` is a plain `String?` rather than a strong relation to the `Asset` table, losing referential integrity.

---

## 3. Code Quality & Architectural Debt

### 3.1 Unsafe Type Assertions (`any`)
- **Location:** `apps/web/src/pages/**/*.tsx`
- **Issue:** Pervasive use of `any` types in `catch` blocks (e.g., `catch (err: any)`) and Ant Design table definitions (e.g., `render: (text: string, record: any)`). This breaks TypeScript's type safety.
- **Fix:** Use `unknown` in catch blocks with proper type narrowing (or custom Error classes). Use proper interfaces for component props and table records.

### 3.2 Lack of React Error Boundaries
- **Location:** `apps/web/src/pages/dashboard/DashboardPage.tsx` (and other pages)
- **Issue:** API fetch failures are logged to `console.error` but the UI does not gracefully transition to an error state. 
- **Fix:** Implement robust React Error Boundaries and localized fallback components for failed data fetches.

### 3.3 API Performance / Pagination
- **Location:** `apps/api/src/modules/users/users.service.ts`
- **Issue:** `findAll()` uses `skip` and `take` (offset-based pagination) to retrieve records. As tables grow large (like AuditLogs or Users), offset pagination becomes highly inefficient.
- **Fix:** Implement cursor-based pagination for high-volume endpoints.

<!-- refreshed: 2026-08-14 -->
*UIMS System codebase analysis: 2026-08-14*

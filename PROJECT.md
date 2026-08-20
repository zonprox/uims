# Project: UIMS UI/UX Copy Standardization to Enterprise English Standard

## Architecture
The UIMS platform is a monorepo consisting of:
- `apps/web`: React 19 + Vite + Ant Design v6 + Zustand web frontend.
- `apps/api`: NestJS 11 + Prisma ORM + Redis + Meilisearch backend API.
- `packages/shared-types`: Shared TypeScript interfaces and DTOs.
- `packages/shared-utils`: Shared formatting, timezones, and enum-to-label mapping utilities.
- `packages/shared-validators`: Shared Zod validation schemas.
- `scripts/`: Playwright E2E and responsive verification suites.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Web Shell & Navigation Standardization | Eliminate redundant prefixes ("Enterprise", "Unified", "Fleet"), standardize navbar labels, quick actions, user menu, and notification/config drawers in `apps/web`. | M1 | explorer_survey_web |
| 2 | Core Resource Views Copy Standardization | Standardize page headers, KPI ribbons, action buttons, table columns, and modals for Dashboard, Assets, Licenses, Inventory, and Network views. | M1 | explorer_survey_web |
| 3 | Management & Governance Views Standardization | Standardize page headers, table headers, forms, drawers, and action buttons for Organization, Users & Access (AD DS, RBAC, Roles, Permissions), Audit Trail, Reports & Analytics, and Settings. | M2 | explorer_survey_web |
| 4 | Table Header & Form Casing Harmonization | Convert all-caps table column headers to Title Case and convert alerts, descriptions, popconfirms, and toasts to active Sentence Case. | M2 | explorer_survey_web |
| 5 | API Exceptions & Response Messages | Standardize all 404, 400, 401, 403, and 409 exception messages across all 15 API modules to consistent, active Enterprise English patterns. | M3 | explorer_survey_api |
| 6 | API Swagger / OpenAPI & Notification Templates | Standardize controller `@ApiOperation` summaries, real-time WebSocket notification payloads, and database seed titles/schedules. | M3 | explorer_survey_api |
| 7 | User Master Export Key Standardization | Replace legacy/Vietnamese abbreviated keys (`STT`, `HEmploy`, `HName`, `HIsclose`, etc.) in `exportMaster()` with clear Enterprise English keys. | M3 | explorer_survey_api |
| 8 | Monorepo Test Assertion Synchronization | Update all unit and integration test expectations in `apps/web`, `apps/api`, and `packages/` to match standardized copy. | M3, M4 | explorer_survey_tests |
| 9 | E2E Playwright Suite & Quality Verification | Update `scripts/test-login.mjs` and `scripts/test-responsive.mjs` page/menu selectors. Verify `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm test`. | M4 | explorer_survey_tests |
| 10 | Git Cleanliness & Enterprise Commit | Inspect git status/diff, ensure `.gitignore` covers untracked files/artifacts, and create a clean git commit with standard enterprise commit message. | M4 | original_request |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Scope Inventory | Map monorepo copy, tests, and API surfaces across web, api, and test tracks | None | DONE |
| M1 | Web Shell, Navigation & Core Views Copy Standardization | `index.html`, `apps/web/src/layouts/`, `src/components/`, and views: Dashboard, Assets, Licenses, Inventory, Network + web unit tests | M0 | DONE |
| M2 | Web Management Views, Modals & Drawers Copy Standardization | Organization, Users & Access, Audit, Reports, Settings views + drawers, modals, tabs, table column casing | M1 | DONE |
| M3 | API Exceptions, Swagger, Notifications, Seeds & Export Standardization | `apps/api/src/modules/`, `src/common/`, `prisma/seeders/`, `main.ts` + API spec tests | M0 | DONE |
| M4 | Quality Verification, E2E Test Alignment & Git Commit | `scripts/test-login.mjs`, `scripts/test-responsive.mjs`, `pnpm format`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `.gitignore`, git commit | M1, M2, M3 | DONE |

## Interface Contracts
### Web Navigation & Views ↔ Backend API
- Programmatic enum keys (e.g. `AssetStatus.IN_USE`, `IPStatus.ASSIGNED`, `UserStatus.ACTIVE`) remain intact in DTO payloads and backend logic.
- UI presentation labels are formatted in clean Title Case via utility mappings or direct view standardizations.
- API exception messages returned in JSON error responses (`{ message: string, statusCode: number }`) are consumed by frontend axios interceptors and displayed in notifications/toasts.

### Web Export & API Export Contracts
- `usersService.exportMaster()` CSV columns use standardized Enterprise English headers (`No.`, `Employee Code`, `Full Name`, `Job Title`, `Company`, `Plant`, `Department`, `Section`, `Sub-Section`, `Email`, `Telephone`, `Is Closed`, `Initial Password`, `Directory Group`, `Status`).

## Code Layout
- `apps/web/src/layouts/`: Navigation definitions, layout shell, navbar components (`menuConfig.tsx`, `MainLayout.tsx`, `NavbarSections.tsx`).
- `apps/web/src/components/`: Global drawers and shared UI elements (`NotificationDrawer.tsx`, `QuickConfigDrawer.tsx`).
- `apps/web/src/pages/`: Module page components, sub-tabs, modals, and drawers.
- `apps/api/src/modules/`: Backend domain modules (controllers, services, DTOs).
- `apps/api/src/common/`: Exception filters, interceptors, pipes, guards.
- `apps/api/prisma/seeders/`: Initial database records, notifications, report schedules.
- `scripts/`: Playwright verification scripts (`test-login.mjs`, `test-responsive.mjs`).

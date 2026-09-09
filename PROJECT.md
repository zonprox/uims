# Project: UIMS User Architecture Decoupling

## Architecture
Clean architectural decoupling of application access accounts (system operators who authenticate and manage UIMS) from corporate directory records (enterprise personnel, AD accounts, and hardware/license custodians).
- Data Layer: Prisma `AppUser` (console credentials, role, status, refresh tokens) vs `DirectoryUser` (employeeCode, company, plant, section, computerName, adGroup, ouPath, assigned hardware/licenses; zero passwords or login privileges).
- Shared Layer: `packages/shared-types` & `packages/shared-validators` providing strict types and Zod schemas for both entities.
- Backend API: `UsersModule` for `AppUser` management; `DirectoryModule` for directory records, AD domain sync, and CSV batch processing; `AuthModule` strictly authenticating `AppUser` and rejecting directory records.
- Frontend Web: Two distinct primary navigation views: "Access Control" (`/users` or `/access-control`) and "Directory" (`/directory`).

## Feature Inventory
Every feature from the Survey phase appears here with its assigned milestone.
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Prisma Schema Decoupling | Separate AppUser and DirectoryUser entities, update relations | M1 | survey_explorer_1 |
| 2 | Shared Types & Validators | Define AppUser and DirectoryUser types, DTOs, and Zod schemas | M1 | survey_explorer_2 |
| 3 | Authentication Isolation | AuthService validates AppUser only, strictly rejects DirectoryUser | M1 | survey_explorer_1,3 |
| 4 | Users API Refactoring | UsersService & UsersController dedicated to AppUser management | M1 | survey_explorer_1,3 |
| 5 | Directory API Module | DirectoryModule (DirectoryService & Controller) for employee records, AD sync, CSV | M1 | survey_explorer_1,3 |
| 6 | Database Seeders Decoupling | Clean separation in roles-users, directory, assets, and licenses seeders | M1 | survey_explorer_1,3 |
| 7 | Web Navigation Separation | Expose Access Control and Directory in menuConfig and router | M2 | survey_explorer_2 |
| 8 | Access Control Web View | AccessControlPage: AppUser accounts, roles, permissions, access simulator | M2 | survey_explorer_2 |
| 9 | Directory Web View | DirectoryPage: DirectoryUser records, AD domain sync, CSV import/export, groups, OUs | M2 | survey_explorer_2 |
| 10 | Monorepo Quality Gates & E2E | Typecheck, lint, format check, full test suite pass, production build | M3 | survey_explorer_3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Data Layer & Backend Decoupling | Prisma schema, client generation, shared-types, shared-validators, AuthService, UsersModule, DirectoryModule, seeders, API tests (344/344 tests passed, 0 typecheck/lint errors) | none | DONE |
| 2 | Web Frontend & Navigation Views | menuConfig, router, AccessControlPage, DirectoryPage, web services, frontend tests (284/284 tests passed, 0 typecheck/lint errors) | M1 | DONE |
| 3 | Monorepo Verification & E2E Acceptance | Monorepo verification (typecheck, lint, format:check, test, build), E2E criteria (643 total tests passed) | M2 | DONE |

## Code Layout
- `apps/api/prisma/schema.prisma`: Data models (`AppUser`, `DirectoryUser`, relations)
- `packages/shared-types/src/entities/user.ts`: `AppUser` entity definitions
- `packages/shared-types/src/entities/directory.ts`: `DirectoryUser` entity definitions
- `packages/shared-types/src/dto/users.dto.ts`: `AppUser` DTOs
- `packages/shared-types/src/dto/directory.dto.ts`: `DirectoryUser` DTOs
- `packages/shared-validators/src/user.validator.ts`: `AppUser` validation schemas
- `packages/shared-validators/src/directory.validator.ts`: `DirectoryUser` validation schemas
- `apps/api/src/modules/auth/`: `AuthService`, `AuthController`
- `apps/api/src/modules/users/`: `UsersService`, `UsersController`
- `apps/api/src/modules/directory/`: `DirectoryService`, `DirectoryController`, `DirectoryModule`
- `apps/api/prisma/seeders/`: `roles-users.seeder.ts`, `directory.seeder.ts`, `assets.seeder.ts`, `licenses.seeder.ts`
- `apps/web/src/layouts/menuConfig.tsx`: Sidebar menu navigation
- `apps/web/src/app/router.tsx`: Application routes
- `apps/web/src/pages/access/`: `AccessControlPage.tsx` (and tabs)
- `apps/web/src/pages/directory/`: `DirectoryPage.tsx` (and tabs)

## Interface Contracts
### AppUser vs DirectoryUser
- AppUser: `{ id, username, email, passwordHash, roleId, roleName, status, isLocked, refreshTokens, auditLogs, notifications }`
- DirectoryUser: `{ id, employeeCode, email, firstName, lastName, displayName, jobTitle, company, plant, section, computerName, adGroup, ouPath, status, assignedAssets, licenseAssignments, groupMemberships }`
- Auth `/api/auth/login`: takes `{ identifier, password }`, queries ONLY `AppUser` by username/email. If identifier matches `DirectoryUser`, immediately rejects with 401 Unauthorized.
- Directory `/api/directory`: provides employee records, CSV import/export (no password creation), AD domain sync.

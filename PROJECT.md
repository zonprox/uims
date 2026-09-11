# Project: Multi-Tier Spatial Location Hierarchy for Hardware Assets and Inventory Items

## Architecture
- **Monorepo Structure**: NestJS 11 API (`apps/api`), React 19 + Ant Design v6 SPA (`apps/web`), shared packages (`@uims/shared-types`, `@uims/shared-validators`, `@uims/shared-utils`).
- **Database Engine**: PostgreSQL 17 via Prisma 7 ORM.
- **Spatial Hierarchy Engine**: Self-referential parent-child tree on `Location` model with `parentId`, `parent`, `children`, `LocationType` enum, and denormalized `fullPath` for zero-N+1 query performance.
- **Descendant Resolution Algorithm**: Recursive CTE in PostgreSQL with cycle detection (`WHERE NOT (l.id = ANY(lt.path))`) resolving `locationId=X` to `[X, child1, child2, ...]` to power high-speed spatial index scans (`where.locationId = { in: descendantIds }`).
- **UI Architecture**: Ant Design v6 `<TreeSelect>` and `<Breadcrumb>` integration consuming `/api/v1/locations/tree`, rendering full hierarchical paths while submitting clean UUID scalars.
- **Orthogonal Department Dimension**: `Asset.departmentId` (organizational owner) is strictly decoupled and independent from `Asset.locationId` (physical spatial location).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Self-referential Location Schema | Add `parentId`, `parent`, `children`, `fullPath`, `status`, and index `@@index([parentId])` to `Location` model in `schema.prisma` | M1 | Survey / R1 |
| F2 | LocationType Enum Classification | Define 4-tier flexible classification types (`CAMPUS`, `SITE`, `BRANCH`, `BUILDING`, `WORKSHOP`, `WAREHOUSE`, `FLOOR`, `ZONE`, `LINE`, `AREA`, `ROOM`, `RACK`, `SHELF`, `STATION`, `BIN`) | M1 | Survey / R1 |
| F3 | Shared Types & Tree Contracts | Update `@uims/shared-types` with `LocationType`, `LocationTreeNode`, `LocationPathNode`, updated `Location` and DTOs | M1 | Survey / R1 |
| F4 | Backend Location Tree & Endpoints | Implement `getLocationTree()`, dedicated `LocationController` (`/api/v1/locations/tree`, `/api/v1/locations/:id/descendants`, etc.), and preserve `/organizations/locations/tree` | M1 | Survey / R1 |
| F5 | Descendant-Aware Spatial Filter Engine | Recursive CTE descendant resolver integrated into `AssetsService.findAll` and `InventoryService.findAll` | M1 | Survey / R1 |
| F6 | Frontend Web Location Service | Add `getLocationTree()` with memoized caching to `apps/web/src/services/organization.service.ts` | M2 | Survey / R2 |
| F7 | Asset Hierarchical TreeSelect | Replace flat location select in `AssetFormModal.tsx` with Ant Design `<TreeSelect>` showing breadcrumb paths | M2 | Survey / R2 |
| F8 | Orthogonal Department Selector | Preserve/add independent Department `<Select>` in `AssetFormModal.tsx` orthogonal to spatial location | M2 | Survey / R2 |
| F9 | Asset Table & Detail Breadcrumbs | Display full location path tags/breadcrumbs with tooltips in `AssetTable.tsx` and `AssetDetailDrawer.tsx` | M2 | Survey / R2 |
| F10 | Asset Hierarchical Location Filter | Add `<TreeSelect>` location filter to `AssetFilterBar.tsx` and connect through `useAssetManagement.ts` | M2 | Survey / R2 |
| F11 | Inventory Service Location Param | Add `locationId?: string;` parameter to `inventoryService.getItems` in `apps/web` | M3 | Survey / R3 |
| F12 | Inventory Hierarchical TreeSelect | Replace flat location select and disconnected bin text in `InventoryPage.tsx` modal with `<TreeSelect>` for warehouse/MDC storage | M3 | Survey / R3 |
| F13 | Inventory Table & Detail Breadcrumbs | Display multi-tier location breadcrumbs and storage tags in `InventoryPage.tsx` | M3 | Survey / R3 |
| F14 | Inventory Hierarchical Stock Filter | Add hierarchical location `<TreeSelect>` filter to `InventoryPage.tsx` toolbar for parent-location stock filtering | M3 | Survey / R3 |
| F15 | BSL Facility Graph & Seed Pipeline | Standardize `seed.ts` and `seeders/` with complete BSL garment facility hierarchy (Business Center, Warehouse, Factories 1-7, MDC, Sewing Lines, Racks, Bins) and BSH HQ | M4 | Survey / R4 |
| F16 | Asset & Inventory Seed Allocations | Bind realistic garment factory assets and inventory items to specific leaf location nodes in seeders | M4 | Survey / R4 |
| F17 | Seed Pipeline Clean Deletion Order | Nullify `Location.parentId` prior to deletion in `clearDatabase` in `seed.ts` to prevent FK constraint violations | M4 | Survey / R4 |
| F18 | Monorepo Quality Gate Compliance | 100% pass on `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm run test`, `pnpm run build` | M4 | Survey / R4 |
| F19 | E2E Test Suite Pass (Tiers 1-4) | Pass 100% of requirement-driven E2E test suite published in `TEST_READY.md` | Final | Project Pattern |
| F20 | Adversarial Coverage Hardening (Tier 5) | White-box adversarial testing, edge cases, cycle prevention, stress testing | Final | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Hierarchical Location Data Architecture & Backend Engine | Schema enum & self-reference, shared types, tree builder, descendant resolution, API endpoints, spatial filtering in Assets & Inventory | none | DONE |
| M2 | Hardware Asset Spatial Integration & Orthogonal Department | Frontend organization service tree method, AssetFormModal TreeSelect, orthogonal Department selector, AssetTable breadcrumbs, AssetFilterBar hierarchical filter | M1 | DONE |
| M3 | Inventory Management Spatial Integration & Warehouse Storage | Inventory service parameter, InventoryPage TreeSelect for warehouse/MDC storage, breadcrumb display, parent-location stock filtering | M1, M2 | DONE |
| M4 | Enterprise Seeding & Monorepo Verification | BSL Garment Manufacturing facility seeders, asset/inventory allocations, seed script execution, full monorepo test & build verification | M1, M2, M3 | DONE |
| Final | E2E Test Pass & Adversarial Hardening | Pass 100% E2E tests (Tiers 1-4), white-box adversarial stress testing (Tier 5) | M4, TEST_READY | DONE |

## Interface Contracts
### Location Entity ↔ Downstream Models
- `Location.id`: UUID primary key.
- `Location.parentId`: Optional UUID referencing `Location.id` with `onDelete: SetNull`.
- `Location.fullPath`: Denormalized breadcrumb string (e.g. `"BSL - Soc Trang Campus > Factory 1 > Sewing Line 01"`).
- `Location.type`: `LocationType` enum.
- `Asset.locationId`: Foreign key to `Location.id` (`onDelete: SetNull`).
- `Asset.departmentId`: Foreign key to `Department.id` (`onDelete: SetNull`) — independent, orthogonal dimension.
- `InventoryItem.locationId`: Foreign key to `Location.id` (`onDelete: SetNull`).

### Location API Endpoints
- `GET /api/v1/locations/tree?organizationId=UUID`: Returns `LocationTreeNode[]` with recursive `children`, Ant Design tree keys (`key`, `value`, `title`, `label`), and `fullPath`.
- `GET /api/v1/locations/:id/descendants`: Returns `string[]` containing target ID and all descendant location IDs.
- `GET /api/v1/locations`: Returns bounded list of locations with optional filters (`organizationId`, `type`, `parentId`, `search`).
- `GET /api/v1/organizations/locations/tree`: Backward-compatible alias returning `LocationTreeNode[]`.

### Spatial Filtering Contract
- `GET /api/v1/assets?locationId=UUID`: Service resolves `locationId` and all descendants via recursive CTE, querying `where: { locationId: { in: descendantIds } }`.
- `GET /api/v1/inventory?locationId=UUID`: Service resolves `locationId` and all descendants via recursive CTE, querying `where: { locationId: { in: descendantIds } }`.

## Code Layout
- Backend Schema: `apps/api/prisma/schema.prisma`
- Backend Modules: `apps/api/src/modules/organization/` (`organization.service.ts`, `organization.controller.ts`, `location.controller.ts`, `location.module.ts`)
- Backend Services: `apps/api/src/modules/assets/assets.service.ts`, `apps/api/src/modules/inventory/inventory.service.ts`
- Database Seeders: `apps/api/prisma/seed.ts`, `apps/api/prisma/seeders/` (`organization.seeder.ts`, `taxonomy.seeder.ts`, `assets.seeder.ts`, `inventory.seeder.ts`)
- Shared Packages: `packages/shared-types/src/entities/common.ts`, `packages/shared-types/src/dto/organization.dto.ts`, `packages/shared-types/src/enums/index.ts`
- Frontend Services: `apps/web/src/services/organization.service.ts`, `apps/web/src/services/inventory.service.ts`
- Frontend Asset Components: `apps/web/src/pages/assets/components/` (`AssetFormModal.tsx`, `AssetTable.tsx`, `AssetFilterBar.tsx`, `AssetDetailDrawer.tsx`), `apps/web/src/pages/assets/hooks/useAssetManagement.ts`
- Frontend Inventory Components: `apps/web/src/pages/inventory/InventoryPage.tsx`
- Tests: `apps/api/src/modules/organization/location-tree.spec.ts`, `apps/api/src/modules/assets/assets-spatial.spec.ts`, `apps/api/src/modules/inventory/inventory-spatial.spec.ts`, `apps/web/src/pages/assets/components/AssetFormModalSpatial.test.tsx`, `apps/web/src/pages/inventory/InventorySpatialFilter.test.tsx`

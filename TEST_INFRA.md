# E2E Test Infra: Multi-Tier Spatial Location Hierarchy

## Test Philosophy
- Opaque-box, requirement-driven derived from `ORIGINAL_REQUEST.md` (headers `## 2026-09-11T04:44:01Z`, `## 2026-09-11T04:47:05Z`, and `## 2026-09-11T04:47:47Z`).
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinations + Real-World Workload Testing.
- Progressive Testability: Test mechanisms do not depend on features more complex than what they verify.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | Location Tree Retrieval (`/locations/tree`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Descendant Spatial Resolution & Querying | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Asset Hierarchical Selection & Filtering | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Asset Orthogonal Department Handling | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | Inventory Storage Location & Stock Filtering | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 6 | Location Breadcrumbs & Path Display | ORIGINAL_REQUEST §R2, §R3 | 5 | 5 | ✓ |
| 7 | Enterprise Seeding & BSL Garment Taxonomy | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: Vitest (`pnpm --filter @uims/api test`, `pnpm --filter @uims/web test`, `pnpm run test`)
- API Test Location: `apps/api/test/e2e/spatial-locations.e2e-spec.ts` or `apps/api/src/modules/organization/location-tree.spec.ts`
- Web UI Test Location: `apps/web/src/pages/assets/components/AssetFormModalSpatial.test.tsx`, `apps/web/src/pages/inventory/InventorySpatialFilter.test.tsx`
- Pass/Fail Semantics: 100% test pass rate with exit code 0.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | BSL Garment Factory End-to-End Asset Allocation (Sewing Line 04 Station 12 with QA Dept Owner) | F1, F2, F3, F4, F6 | High |
| 2 | Central Warehouse Raw Material Receiving & Bin Storage (`BSL > WH > Fabric > Rack 101 > Bin 02`) | F1, F2, F5, F6 | High |
| 3 | MDC Sub-Warehouse Material Request & Spatial Stock Aggregation across Factory 1 | F2, F5, F6, F7 | High |
| 4 | Executive & Admin Fleet Query at Business Center Floor 2 without mixing with Factory Assets | F2, F3, F4 | Medium |
| 5 | Re-parenting / Relocation of Machinery across Factory Lines with Path Re-computation | F1, F2, F6 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥ 35 test cases)
- Tier 2: ≥5 per feature (Total ≥ 35 test cases)
- Tier 3: Pairwise combinations of major feature interactions (Total ≥ 10 test cases)
- Tier 4: Realistic enterprise application scenarios (Total ≥ 5 test cases)
- **Total Minimum: ≥ 85 test cases**

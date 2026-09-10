# Project: Ant Design v6 UI/UX & Layout Standardization

## Architecture
Standardization and modernization of the React frontend (`apps/web`) to strictly comply with Ant Design v6 specifications (`docs/ant-design-llms-full.txt`) and `AGENTS.md` directives.
- **Layout Architecture**: Strict desktop Sider dimensions (280px expanded, 80px collapsed), mobile navigation Drawer (290px left placement), responsive breakpoint handling via Ant Design `Grid.useBreakpoint()`.
- **Navigation & Truncation Defense**: Menu items wrapped in `<Flex style={{ width: '100%', minWidth: 0, gap: 8 }}>` with ellipsis text and `flexShrink: 0` for badges/tags. Collapsed state accessibility via Tooltips.
- **Styling Architecture**: Semantic token styling via `styles={{ body: ..., header: ... }}`. Elimination of raw `.ant-*` CSS overrides in favor of `theme.ts` component design tokens.
- **Feedback & Lifecycle Architecture**: Universal dynamic context consumption via `App.useApp()`. Modal lifecycle managed cleanly via `destroyOnHidden`.
- **Data Display**: Tables standardizing on high density, typed column sorters, deterministic renderers, and standard pagination (`pageSize: 10`, `showSizeChanger: true`, `pageSizeOptions: ['10', '25', '50', '100']`).

## Feature Inventory
Every feature from the Survey phase appears here with its assigned milestone. No feature is left unassigned.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Navigation Truncation Defense | Wrap all 11 menu items in menuConfig.tsx with `<Flex style={{ width: '100%', minWidth: 0, gap: 8 }}>` and text truncation | M1 | survey_explorer_1 |
| 2 | Collapsed Navigation Accessibility | Compact tooltip-wrapped organization trigger and tooltips for brand logo and navbar user profile | M1 | survey_explorer_1 |
| 3 | Global CSS Token Migration | Eliminate `.ant-*` overrides in global.css (lines 76-95, 153-321); consolidate tokens in theme.ts | M1 | survey_explorer_1,3 |
| 4 | PageContainer Design Token Refinement | Consume design tokens for secondary text and trend labels in PageContainer.tsx | M1 | survey_explorer_1 |
| 5 | ErrorResultView & CommandPalette Cleanup | Remove static message fallback in ErrorResultView.tsx and typed catch in CommandPalette.tsx | M1 | survey_explorer_1 |
| 6 | Tabs First-Class Icon Props | Migrate inline JSX icons to first-class `icon` prop in OrganizationPage.tsx and SettingsPage.tsx | M2 | survey_explorer_2 |
| 7 | Table Pagination Standardization | Standardize AppUsersTab.tsx and EmployeesTab.tsx to `pageSize: 10`, `['10', '25', '50', '100']` | M2 | survey_explorer_2,3 |
| 8 | okButtonProps Danger Migration | Replace deprecated `okType="danger"` with `okButtonProps={{ danger: true }}` across 11 files | M2 | survey_explorer_3 |
| 9 | Typed Table Column Sorters | Add typed comparator functions to primary domain tables (AssetTable, AuditPage, AppUsersTab, EmployeesTab, InventoryPage, LicensesPage) | M2 | survey_explorer_3 |
| 10 | Modal Lifecycle Uniformity (`destroyOnHidden`) | Add `destroyOnHidden` to 11 data/edit modals across AssetFormModal, AssetQrModal, Inventory, Licenses, Network, Organization, Reports | M3 | survey_explorer_3 |
| 11 | Semantic Modal & Drawer Styling Polish | Ensure all modals and drawers utilize semantic `styles={{ body: ... }}` and clean padding | M3 | survey_explorer_3 |
| 12 | Monorepo Quality Gates & Verification | Verify 0 errors on typecheck, lint, format:check, test, and build across all workspaces | M4 | orchestrator |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Navigation, Layout & Styling Tokens | menuConfig.tsx truncation, collapsed tooltips, global.css cleanup, theme.ts tokens, PageContainer tokens, ErrorResultView/CommandPalette cleanup | none | PLANNED |
| 2 | Tabs, Tables & Prop Standardization | Tabs first-class `icon` props, table pagination (pageSize: 10), `okButtonProps={{ danger: true }}`, typed table column sorters | M1 | PLANNED |
| 3 | Modal Lifecycle & Semantic Polish | Add `destroyOnHidden` to 11 modals, semantic `styles={{ body: ... }}` validation across modals and drawers | M2 | PLANNED |
| 4 | Verification & Quality Gates | Monorepo verification invariants (typecheck, lint, format, test, build), reviewer approval, challenger verification, forensic audit | M3 | PLANNED |

## Code Layout
- `apps/web/src/layouts/menuConfig.tsx`: Navigation menu configuration and truncation defense
- `apps/web/src/layouts/MainLayout.tsx`: Sider (280px/80px) and Mobile Drawer (290px left)
- `apps/web/src/layouts/components/SidebarContent.tsx`: Sidebar structure and collapsed state
- `apps/web/src/layouts/components/SidebarBrandHeader.tsx`: Brand logo home button with tooltip
- `apps/web/src/layouts/components/SidebarOrgSelector.tsx`: Organization selector trigger
- `apps/web/src/layouts/components/NavbarSections.tsx`: Header user profile trigger with tooltip
- `apps/web/src/styles/global.css`: Global styles without conflicting `.ant-*` token overrides
- `apps/web/src/app/theme.ts`: Ant Design v6 theme tokens for Layout, Menu, Table, Tabs
- `apps/web/src/components/PageContainer.tsx`: PageContainer layout, breadcrumbs, titles, KPI stats
- `apps/web/src/components/ErrorResultView.tsx`: Error feedback using `App.useApp()`
- `apps/web/src/components/CommandPalette.tsx`: Palette search with typed catch
- `apps/web/src/pages/organization/OrganizationPage.tsx`: Tabs with first-class `icon` prop
- `apps/web/src/pages/settings/SettingsPage.tsx`: Tabs with first-class `icon` prop
- `apps/web/src/pages/users/components/AppUsersTab.tsx`: Standard table pagination (pageSize: 10) & sorters
- `apps/web/src/pages/directory/EmployeesTab.tsx`: Standard table pagination (pageSize: 10) & sorters
- `apps/web/src/pages/assets/components/AssetTable.tsx`: okButtonProps danger & column sorters
- `apps/web/src/pages/inventory/InventoryPage.tsx`: okButtonProps danger, column sorters, destroyOnHidden
- `apps/web/src/pages/licenses/LicensesPage.tsx`: okButtonProps danger, column sorters, destroyOnHidden
- `apps/web/src/pages/network/`: okButtonProps danger, destroyOnHidden for modals
- `apps/web/src/pages/audit/AuditPage.tsx`: column sorters

## Interface Contracts
### Menu Item Truncation Contract (`menuConfig.tsx`)
All navigation menu items must render labels with the pattern:
```tsx
<Flex justify="space-between" align="center" style={{ width: '100%', minWidth: 0, gap: 8 }}>
  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {title}
  </span>
  {badge && <span style={{ flexShrink: 0 }}>{badge}</span>}
</Flex>
```

### Table Pagination Contract
All primary domain tables must configure pagination as:
```tsx
pagination={{
  pageSize: 10,
  showSizeChanger: true,
  pageSizeOptions: ['10', '25', '50', '100'],
  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
}}
```

### Modal Lifecycle Contract
All data creation/editing modals must configure:
```tsx
<Modal
  open={open}
  onCancel={onClose}
  destroyOnHidden={true}
  styles={{ body: { paddingTop: 16 } }}
  ...
>
```

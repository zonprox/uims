# Original User Request

## Initial Request — 2026-08-20T03:10:49Z

Standardize and polish all UI/UX copy, navigation labels, page headers, modals, forms, action buttons, table columns, tooltips, toasts, and user-facing API messages across the UIMS platform into clean, concise, standardized Enterprise English.

Working directory: /home/user/projects/uims
Integrity mode: development

## Requirements

### R1. Full-Scope UI/UX Copy Standardization
Scan and standardize all user-facing strings across `apps/web` (views, layouts, navigation, modals, drawers, forms, tables, empty states, error boundaries, notifications) and `apps/api` (user-facing exception messages, validation feedback, email/notification templates, seed titles). Remove redundant prefixes, buzzwords, and verbose padding (e.g., replace "Enterprise Notifications" with "Notifications", "Unified Asset Inventory" with "Asset Inventory" or "Assets", "Global System Configuration" with "System Settings").

### R2. Enterprise UX Phrasing Standards
Ensure all copy adheres to professional Enterprise English conventions:
- High-signal, action-oriented button and menu labels (e.g., "Create Asset", "Export CSV", "Save Changes").
- Consistent title casing for page titles, menu items, tab titles, and modal headers.
- Consistent sentence casing and active voice for alerts, helper descriptions, confirmation dialogues, and toast notifications.
- No colloquial, awkward, non-standard, or mixed-language text.

### R3. Quality and Build Integrity
Maintain complete integrity of types, linters, tests, and formatting across the monorepo. Any test fixtures or assertions that verify specific user-facing text must be updated in tandem.

## Acceptance Criteria

### Copy Polish & Pattern Uniformity
- [ ] Every page header, navigation menu item, modal title, table column, and action button in `apps/web` is verified to use concise, professional enterprise copy without redundant fluff words.
- [ ] All user-facing alert, toast, empty state, and validation messages are clear, concise, and grammatically accurate in Enterprise English.

### Code Quality & Build Verification
- [ ] `pnpm typecheck` executes across all workspaces with zero TypeScript errors.
- [ ] `pnpm format:check` and `pnpm lint` pass across the entire repository.
- [ ] `pnpm test` passes cleanly across all packages.

## 2026-08-20T03:13:49Z

User instruction update: After finishing the copy standardization and verification, check git status/diff and ensure all ignore files (.gitignore, etc.) are properly updated if any untracked artifacts or temp files exist.

## 2026-08-20T03:13:56Z

User instruction update: After finishing the task and verifying builds/tests, check git diff, update .gitignore / ignore files as needed, and create a clean git commit with a standard enterprise commit message.

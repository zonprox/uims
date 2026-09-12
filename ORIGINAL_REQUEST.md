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

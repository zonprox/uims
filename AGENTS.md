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

- Always consume dynamic theme context via `App.useApp()` (`const { message, modal, notification } = App.useApp();`).
- Use semantic token styling with `styles={{ body: ... }}` / `styles={{ content: ... }}` rather than deprecated `bodyStyle` / `valueStyle`.
- Use `<PageContainer>` for all views to maintain consistent breadcrumbs, KPI statistics, search controls, and primary action buttons.
- Keep table density high and information readable with dedicated quick actions (e.g., 1-click credential/email copying, status tags, responsive drawers).

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.


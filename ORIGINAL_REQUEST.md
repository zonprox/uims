# Original User Request

## Initial Request — 2026-08-20T09:26:00Z

Implement an enterprise-grade, comprehensive Error Boundary and resilience system for the UIMS web application following React Router best practices, Ant Design v6 guidelines, and full error recovery workflows.

Requirements:
1. R1. Comprehensive Route Error Boundary Architecture: Provide a robust RouteErrorBoundary component integrated into the React Router configuration at root and layout levels. Handle different HTTP/Route error status codes (401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Server/Application Error) and unhandled runtime JS exceptions with clean, accessible Ant Design v6 <Result> layouts.
2. R2. Global Application Error Boundary & Error Telemetry Fallbacks: Implement a top-level React Error Boundary wrapping the root app container to catch rendering errors outside router contexts, provide graceful error recovery (page reload, state reset, session refresh), and include collapsible sanitized diagnostic information with 1-click error copying.
3. R3. Enterprise UI/UX & Resilient User Recovery Actions: Ensure all error views provide clear, verb-first recovery actions (e.g. "Reload Page", "Return to Dashboard", "Sign In Again"), seamless dark/light theme integration via App.useApp(), zero redundant prefixes, and 100% compliant Enterprise English copy.

Acceptance Criteria:
- React Router default developer error screen ('Hey developer...') is replaced with custom RouteErrorBoundary on all routes.
- 404 Not Found errors display a dedicated, styled 404 Result page with navigation back to the dashboard.
- 401/403 Authentication/Authorization errors guide the user to sign in or request access.
- 500 / Runtime exceptions render a graceful error UI with action buttons to reload the page or return home, preventing white-screen crashes.
- Collapsible diagnostic details panel allows copying error stack/message for support without cluttering the main UI.
- Dedicated unit and integration tests (pnpm --filter @uims/web test) verify error boundary rendering, status code handling, and recovery action handlers.
- Monorepo typecheck and build (pnpm typecheck and pnpm build) pass with 0 errors.
- All UI strings adhere strictly to AGENTS.md Enterprise English standards.

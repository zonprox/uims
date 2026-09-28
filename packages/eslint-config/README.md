<!-- generated-by: gsd-doc-writer -->
# @uims/eslint-config

Shared ESLint flat configuration for the UIMS monorepo.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/eslint-config` provides a unified, pre-configured ESLint flat configuration (`eslint.config.mjs` / `eslint.config.js`) for TypeScript and JavaScript applications and packages across the UIMS monorepo. It bundles and standardizes TypeScript linting via `typescript-eslint` and integrates `eslint-config-prettier` to prevent conflicts with code formatters.

## Usage

As a private monorepo workspace package, `@uims/eslint-config` is consumed internally by declaring a workspace dependency in the target package's `package.json`:

```json
{
  "devDependencies": {
    "@uims/eslint-config": "workspace:*"
  }
}
```

### Basic Flat Configuration

To apply the shared configuration to an application or package, create an `eslint.config.mjs` file at the root of the consuming workspace:

```javascript
import config from '@uims/eslint-config';

export default config;
```

This default export is used directly in `apps/api/eslint.config.mjs` and `apps/web/eslint.config.mjs`.

### Extending and Customizing Rules

To extend or override rules for a specific workspace, import the configuration and compose it using `tseslint.config` from `typescript-eslint`:

```javascript
import baseConfig from '@uims/eslint-config';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
```

### Workspace Scripts

Add standard linting scripts to `package.json` in consuming workspaces:

```json
{
  "scripts": {
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "lint:fix": "eslint \"src/**/*.{ts,tsx}\" --fix"
  }
}
```

### Monorepo Execution

Run linting across workspace projects using Turborepo or targeted pnpm filters:

```bash
# Run linting across all workspace packages
pnpm run lint

# Run linting with automatic fixes across all packages
pnpm run lint:fix

# Run linting on a specific workspace
pnpm --filter @uims/api lint
pnpm --filter @uims/web lint
```

## Configuration Summary

The configuration exported by `index.js` applies the following defaults:

### Global Ignores

The following paths are ignored by default across all lint runs:

- `dist/**`
- `node_modules/**`
- `.turbo/**`
- `coverage/**`

### Presets and Plugins

- **`tseslint.configs.recommended`**: Applies recommended rules from `typescript-eslint` for TypeScript codebases.
- **`eslint-config-prettier`**: Disables all stylistic and formatting ESLint rules that may conflict with Prettier or Biome.

### Language Options

- **Parser**: `@typescript-eslint/parser` (`tseslint.parser`)
- **ECMAScript Version**: `latest`
- **Source Type**: `module`

### Rule Specifications

| Rule | Severity | Details |
| :--- | :--- | :--- |
| `@typescript-eslint/no-explicit-any` | `warn` | Discourages the use of explicit `any` types. |
| `@typescript-eslint/no-unused-vars` | `error` | Disallows unused variables. Ignores unused variables, arguments, and caught errors prefixed with `_` (`argsIgnorePattern`, `varsIgnorePattern`, `caughtErrorsIgnorePattern`). |
| `@typescript-eslint/explicit-function-return-type` | `off` | Disables requirement for explicit return types, allowing TypeScript type inference. |

### Dependencies

| Dependency | Version | Purpose |
| :--- | :--- | :--- |
| `eslint` | `^10.10.0` | Core ESLint linter engine |
| `typescript-eslint` | `^8.70.0` | TypeScript ESLint tooling and flat config utilities |
| `@typescript-eslint/parser` | `^8.70.0` | ESLint parser for TypeScript source files |
| `@typescript-eslint/eslint-plugin` | `^8.70.0` | TypeScript ESLint rule plugin |
| `eslint-config-prettier` | `^10.1.8` | Disables formatting rules conflicting with code formatters |

## Testing

Because `@uims/eslint-config` is a configuration-only package without a standalone test runner, verification is performed by validating configuration syntax and running the lint pipeline against consuming applications in the monorepo:

### Syntax Validation

Validate the JavaScript syntax of `index.js`:

```bash
node --check packages/eslint-config/index.js
```

### Integration Verification

Verify that the ESLint configuration resolves and executes cleanly against consuming workspace packages:

```bash
# Verify linting on the API service
pnpm --filter @uims/api lint

# Verify linting on the Web application
pnpm --filter @uims/web lint

# Run monorepo-wide lint task via Turborepo
pnpm run lint
```

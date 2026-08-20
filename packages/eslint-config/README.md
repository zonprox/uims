<!-- generated-by: gsd-doc-writer -->
# @uims/eslint-config

Shared ESLint flat configuration for the UIMS monorepo.

Part of the [UIMS](../../README.md) monorepo.

## Overview

`@uims/eslint-config` provides a unified ESLint configuration across all applications and packages within the workspace. It uses the ESLint flat configuration format (`eslint.config.js` / `eslint.config.mjs`) backed by `typescript-eslint` and `eslint-config-prettier`.

## Installation

In a workspace package, add `@uims/eslint-config` as a development dependency:

```json
{
  "devDependencies": {
    "@uims/eslint-config": "workspace:*"
  }
}
```

Or using `pnpm`:

```bash
pnpm --filter <target-package> add -D @uims/eslint-config@workspace:*
```

## Quick Start

Create an `eslint.config.mjs` (or `eslint.config.js`) file in the root of the consuming package:

```javascript
import config from '@uims/eslint-config';

export default config;
```

Add the lint script to your package's `package.json`:

```json
{
  "scripts": {
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "lint:fix": "eslint \"src/**/*.{ts,tsx}\" --fix"
  }
}
```

Run linting directly:

```bash
pnpm run lint
```

## Usage Examples

### Standard Configuration

For most packages and apps (`apps/api`, `apps/web`), importing the default export is all that is required:

```javascript
import config from '@uims/eslint-config';

export default config;
```

### Customizing & Extending Rules

To extend or customize rules for a specific package, combine the base configuration with custom rule definitions using `typescript-eslint`:

```javascript
import baseConfig from '@uims/eslint-config';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,
  {
    rules: {
      // Custom overrides
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
```

### Running in Monorepo

Linting can be executed across all workspace packages via Turborepo:

```bash
# Lint all packages
pnpm run lint

# Lint and auto-fix across all packages
pnpm run lint:fix

# Lint only a specific workspace
pnpm --filter @uims/api lint
pnpm --filter @uims/web lint
```

## Configuration

The shared configuration exported by `index.js` includes the following defaults:

### Global Ignores

- `dist/**`
- `node_modules/**`
- `.turbo/**`
- `coverage/**`

### Presets and Plugins

- **`tseslint.configs.recommended`**: Standard TypeScript ESLint recommended rule presets.
- **`eslint-config-prettier`**: Turns off all formatting rules that might conflict with code formatters.

### Language Options

- **Parser**: `@typescript-eslint/parser`
- **ECMAScript Version**: `latest`
- **Source Type**: `module`

### Rules

| Rule | Setting | Options / Description |
| :--- | :--- | :--- |
| `@typescript-eslint/no-explicit-any` | `warn` | Warns when the `any` type is explicitly used. |
| `@typescript-eslint/no-unused-vars` | `error` | Disallows unused variables while ignoring identifiers prefixed with `_` (`argsIgnorePattern`, `varsIgnorePattern`, `caughtErrorsIgnorePattern`). |
| `@typescript-eslint/explicit-function-return-type` | `off` | Disables requirement for explicit return types on functions. |

## Contributing

For guidelines on coding standards, contributing workflows, and workspace commands, please refer to the [Development Guide](../../docs/DEVELOPMENT.md) and root [Contributing Guidelines](../../README.md#contributing).

## License

UNLICENSED (Private workspace package)

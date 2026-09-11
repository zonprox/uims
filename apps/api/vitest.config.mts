import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec,e2e-spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    passWithNoTests: true,
  },
});

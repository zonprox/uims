import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@uims/shared-types': path.resolve(import.meta.dirname, '../../packages/shared-types/src'),
      '@uims/shared-validators': path.resolve(
        import.meta.dirname,
        '../../packages/shared-validators/src',
      ),
      '@uims/shared-utils': path.resolve(import.meta.dirname, '../../packages/shared-utils/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec,e2e-spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    passWithNoTests: true,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

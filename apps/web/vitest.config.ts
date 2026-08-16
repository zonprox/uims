import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
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
    environment: 'happy-dom',
    passWithNoTests: true,
  },
});

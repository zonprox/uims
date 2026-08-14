import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, '../../'), '');
  const webPort = parseInt(env.WEB_PORT || '5679', 10);
  const apiPort = parseInt(env.APP_PORT || '3002', 10);

  return {
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
    server: {
      port: webPort,
      host: '0.0.0.0',
      strictPort: false,
      allowedHosts: true,
      cors: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});

import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

const VENDOR_RULES: Array<{ chunk: string; patterns: Array<string> }> = [
  { chunk: 'vendor-react', patterns: ['react/', 'react-dom/', 'react-router'] },
  { chunk: 'vendor-antd-icons', patterns: ['@ant-design/icons'] },
  { chunk: 'vendor-rc', patterns: ['/rc-', '@rc-component/'] },
  { chunk: 'vendor-antd-pro', patterns: ['@ant-design/pro-'] },
  { chunk: 'vendor-antd-core', patterns: ['antd'] },
  { chunk: 'vendor-query', patterns: ['@tanstack'] },
  { chunk: 'vendor-utils', patterns: ['dayjs', 'axios', 'zustand', 'zod', 'socket.io-client'] },
];

function resolveManualChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  for (const rule of VENDOR_RULES) {
    if (rule.patterns.some((pattern) => id.includes(pattern))) {
      return rule.chunk;
    }
  }
  return 'vendor-other';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, '../../'), '');
  const webPort = parseInt(env.WEB_PORT || '5679', 10);
  const apiPort = parseInt(env.APP_PORT || '3002', 10);

  // In Docker, proxy to internal container; otherwise localhost
  const proxyTarget =
    process.env.API_PROXY_URL ||
    env.API_PROXY_URL ||
    (process.env.HOSTNAME || process.env.NODE_ENV === 'development'
      ? 'http://uims-api-dev:3000'
      : `http://localhost:${apiPort}`);

  // SSL certs for dev HTTPS
  const certPath = path.resolve(import.meta.dirname, './certs/cert.pem');
  const keyPath = path.resolve(import.meta.dirname, './certs/key.pem');
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);
  const httpsConfig = hasCerts
    ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    : undefined;

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
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router',
        'antd',
        '@ant-design/icons',
        '@ant-design/pro-components',
        '@tanstack/react-query',
        'axios',
        'zustand',
        'dayjs',
        'zod',
        'socket.io-client',
      ],
    },
    server: {
      port: webPort,
      host: '0.0.0.0',
      https: httpsConfig,
      strictPort: false,
      allowedHosts: true,
      cors: true,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
  };
});

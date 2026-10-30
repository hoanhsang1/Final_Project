import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Đích của proxy khi dev/preview.
 *
 * Mọi request (auth, organization, departments, positions, permissions, students, classes)
 * đều đi qua API Gateway (`127.0.0.1:8080`). Khi cần trỏ sang BE đã deploy
 * (tunnel/remote) thì đặt biến môi trường, KHÔNG sửa file:
 *
 *   VITE_API_TARGET=https://xxx.trycloudflare.com npm run dev
 */
const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080';

const gatewayProxy = {
  target: apiTarget,
  changeOrigin: true,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': gatewayProxy,
      '/departments': gatewayProxy,
      '/positions': gatewayProxy,
      '/permissions': gatewayProxy,
      '/students': gatewayProxy,
      '/classes': gatewayProxy,
    },
  },
  preview: {
    proxy: {
      '/api': gatewayProxy,
      '/departments': gatewayProxy,
      '/positions': gatewayProxy,
      '/permissions': gatewayProxy,
      '/students': gatewayProxy,
      '/classes': gatewayProxy,
    },
  },
  test: {
    pool: 'threads',
    testTimeout: 20000,
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});

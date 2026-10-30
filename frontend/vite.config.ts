import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Đích của proxy `/api` khi dev/preview.
 *
 * Mặc định là gateway chạy máy (`127.0.0.1:8080`). Khi cần trỏ sang BE đã deploy
 * (tunnel/remote) thì đặt biến môi trường, KHÔNG sửa file:
 *
 *   VITE_API_TARGET=https://xxx.trycloudflare.com npm run dev
 */
const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080';
const peopleApiTarget = process.env.VITE_PEOPLE_API_TARGET ?? 'http://127.0.0.1:8082';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/departments': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/positions': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/permissions': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/students': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/classes': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/departments': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/positions': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/permissions': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/students': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
      '/classes': {
        target: peopleApiTarget,
        changeOrigin: true,
      },
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

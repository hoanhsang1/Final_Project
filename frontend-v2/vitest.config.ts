import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    // Toàn bộ test chạy trên mock adapter, không gọi mạng.
    'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('mock'),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    // Môi trường Windows bị hạn chế quyền tạo tiến trình con; worker thread
    // chạy được mà vẫn cô lập từng file test.
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/tests/**', 'src/services/mocks/**'],
    },
  },
})

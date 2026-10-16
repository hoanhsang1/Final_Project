import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend KHÔNG cấu hình CORS (đã kiểm chứng: không có Access-Control-Allow-Origin),
    // nên browser chặn FE gọi thẳng http://localhost:8080. Giải pháp: dev server
    // của Vite nhận request /api/* rồi chuyển tiếp (proxy) sang gateway.
    // FE chỉ thấy origin của chính nó → CORS không còn là vấn đề khi dev.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    // `forks` (mặc định của Vitest 5) bị treo worker trên máy Windows này; `threads` chạy được.
    pool: 'threads',
    // Render antd trong jsdom khá nặng; khi nhiều file test chạy song song thì một lần render
    // đầu có thể vượt mốc 5s mặc định. Test vẫn đúng, chỉ chậm.
    testTimeout: 20000,
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Đích của proxy `/api` khi dev/preview.
 *
 * Mặc định là gateway chạy máy (`127.0.0.1:8080`). Khi cần trỏ sang BE đã deploy
 * (tunnel/remote) thì đặt biến môi trường, KHÔNG sửa file:
 *
 *   VITE_API_TARGET=https://xxx.trycloudflare.com npm run dev
 *
 * Nhờ vậy không hardcode URL tunnel (URL đổi mỗi lần restart tunnel) vào repo.
 */
const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080';

/**
 * Các tiền tố cần chuyển tiếp sang BE.
 *
 * - `/api` — IdentityService/gateway (đăng nhập, tài khoản, tổ chức).
 * - `/departments`, `/positions`, `/permissions` — PeopleService phục vụ các path
 *   này ở GỐC (không nằm dưới `/api`), xem `DepartmentController`/`PositionController`.
 * - `/members` — không cần: mọi thao tác nhân viên đều đi qua `/departments/{id}/members`.
 *
 * Dùng 127.0.0.1 cho chắc chắn (không phụ thuộc thứ tự resolve IPv4/IPv6 của Node).
 */
const backendPrefixes = ['/api', '/departments', '/positions', '/permissions'] as const;

const proxy = Object.fromEntries(
  backendPrefixes.map((prefix) => [prefix, { target: apiTarget, changeOrigin: true }]),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend KHÔNG cấu hình CORS (đã kiểm chứng: không có Access-Control-Allow-Origin),
    // nên browser chặn FE gọi thẳng http://localhost:8080. Giải pháp: dev server
    // của Vite nhận request rồi chuyển tiếp (proxy) sang gateway.
    // FE chỉ thấy origin của chính nó → CORS không còn là vấn đề khi dev.
    proxy,
  },
  // `vite preview` (phục vụ bản build) dùng cho e2e → cần proxy giống dev server
  // để khi nào chuyển e2e sang gọi BE thật thì không phải sửa cấu hình.
  preview: {
    proxy,
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
    // E2E do PLAYWRIGHT chạy (không phải Vitest) — loại khỏi để Vitest không nhặt nhầm.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});

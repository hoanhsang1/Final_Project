import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình Playwright cho e2e của màn quản trị Admin hệ thống (Sprint 2).
 *
 * Vì sao MOCK API thay vì gọi BE thật:
 * - BE chưa sẵn sàng (`D-05` chưa nhận `reason`, `D-16` chưa có `PUT …/modules`),
 *   nên e2e chạy trên BE thật sẽ đỏ vì lý do BE, không phải lý do FE.
 * - Các ca `TC-*` tầng FE chỉ cần contract đã kiểm chứng → mock đúng contract đó.
 * - Khi BE xong, đổi `MOCK_API = false` là chạy được ngay trên BE thật.
 *
 * Lệnh chạy: `npm run test:e2e` (tự bật dev server trước).
 */
export default defineConfig({
  testDir: './e2e',
  // 1 ca = 1 TC-* trong Đặc tả Sprint 2 §5.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  // Máy dev chạy song song Vite + nhiều worker → thời gian load trang có thể vượt
  // 30s. Nới timeout để tránh đỏ giả (ca đỏ vì hết thời gian, không phải vì lỗi).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Giới hạn số worker để máy không quá tải.
  workers: 4,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    // `EVIDENCE=1` chụp ảnh cuối mỗi ca để nhúng vào file test case (.xlsx).
    screenshot: process.env.EVIDENCE === '1' ? 'on' : 'off',
    // Tiếng Việt có dấu → kiểm tra text dễ đọc.
    locale: 'vi-VN',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Dùng BẢN BUILD (`vite preview`) thay vì dev server:
    // dev server phải transform hàng trăm module cho lần tải đầu → khi chạy
    // nhiều worker song song, các ca đỏ giả vì hết thời gian (không phải lỗi FE).
    //
    // `--host 127.0.0.1` là BẮT BUỘC trên máy này: Vite mặc định bind `localhost`
    // (IPv6 ::1) nên `127.0.0.1` không kết nối được → Playwright chờ webServer vô hạn.
    //
    // Cổng 4173 (mặc định của `vite preview`) — KHÁC cổng dev server 5173 để không
    // đụng nhau. `reuseExistingServer: false` để không bao giờ test nhầm bundle cũ.
    command:
      'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 300_000,
  },
});

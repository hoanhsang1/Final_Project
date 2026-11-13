import { defineConfig, devices } from '@playwright/test';

/**
 * E2E "sống": FE (Vite dev) → API Gateway → 4 service → MySQL thật.
 *
 * Khác `playwright.config.ts` (mock API), config này KHÔNG mock và KHÔNG tự
 * build; chạy sau khi `npm run dev` đã lên cổng 5173 và Docker stack đang chạy.
 *
 *   npx playwright test -c playwright.live.config.ts
 */
export default defineConfig({
  testDir: './e2e-live',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-live' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'vi-VN',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'live-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});

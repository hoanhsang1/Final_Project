/**
 * ux-review/probe-a11y-names.mjs — CHẨN ĐOÁN R-02: tên truy cập của nút icon-only,
 * ô tìm kiếm và phân trang trong console (DOM hiện tại, không phụ thuộc antd).
 *
 * Chạy:
 *   & $node "ux-review\\probe-a11y-names.mjs"
 *
 * Yêu cầu: dev server frontend đang chạy (mặc định http://127.0.0.1:5173) và
 * Playwright browser channel khả dụng (mặc định msedge). Script mock API bằng
 * `page.route` nên không cần BE thật.
 */

import { createRequire } from 'node:module';
const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'admin.he.thong',
  roles: ['SUPER_ADMIN'],
  permissions: [],
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.fake-signature`;

const accounts = Array.from({ length: 25 }, (_, i) => ({
  id: `acc-${i + 1}`,
  username: `nguoi.dung.${i + 1}`,
  email: `u${i + 1}@example.edu.vn`,
  full_name: `Người dùng ${i + 1}`,
  organization_id: 'org-1',
  organization_name: 'Trường THPT Nguyễn Du',
  role: 'ACADEMIC_STAFF',
  status: 'active',
  created_at: '2026-10-01T08:30:00',
  last_login_at: '2026-11-10T07:45:00',
}));

async function inspect(page, route, label) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const iconOnlyButtons = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('button, [role="button"], a'));
    const results = [];
    for (const el of nodes) {
      const hasIcon = Boolean(el.querySelector('svg, [aria-hidden="true"] svg, img'));
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!hasIcon || text) continue;
      const ariaLabel = el.getAttribute('aria-label') || '';
      const title = el.getAttribute('title') || '';
      const labelledBy = el.getAttribute('aria-labelledby') || '';
      results.push({
        tag: el.tagName.toLowerCase(),
        ariaLabel,
        title,
        ariaLabelledBy: labelledBy,
        outerHTML: (el.outerHTML || '').slice(0, 220),
      });
    }
    return results;
  });

  const searchControls = await page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll('input[type="search"], input[placeholder*="Tìm" i], [role="search"] input, [role="searchbox"]'),
    );
    return inputs.map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      placeholder: el.getAttribute('placeholder') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      ariaLabelledBy: el.getAttribute('aria-labelledby') || '',
      name: el.getAttribute('name') || '',
    }));
  });

  const pagination = await page.evaluate(() => {
    const navs = Array.from(
      document.querySelectorAll('nav, [role="navigation"]'),
    ).filter((el) => /phân trang|pagination|page/i.test(el.getAttribute('aria-label') || '') || el.querySelector('button[aria-current], [aria-label*="Trang" i], [aria-label*="page" i]'));
    if (navs.length === 0) return null;
    const nav = navs[0];
    const controls = Array.from(nav.querySelectorAll('button, a, [role="button"]')).map((el) => ({
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      ariaLabel: el.getAttribute('aria-label') || '',
      title: el.getAttribute('title') || '',
      disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
      current: el.getAttribute('aria-current') || '',
    }));
    return {
      ariaLabel: nav.getAttribute('aria-label') || '',
      controls,
    };
  });

  let mainAriaSnapshot = null;
  try {
    const main = page.getByRole('main').first();
    if ((await main.count()) > 0 && typeof main.ariaSnapshot === 'function') {
      mainAriaSnapshot = await main.ariaSnapshot();
    }
  } catch (e) {
    mainAriaSnapshot = `LỖI ariaSnapshot: ${String(e).slice(0, 160)}`;
  }

  return { route, label, iconOnlyButtons, searchControls, pagination, mainAriaSnapshot };
}

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'vi-VN' });
  await context.addInitScript(
    ([access]) => {
      localStorage.setItem('mems.accessToken', access);
      localStorage.setItem('mems.refreshToken', 'fake-refresh');
    },
    [token],
  );

  const page = await context.newPage();
  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const p = url.pathname;
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (p === '/api/v1/modules') {
      return json([
        { code: 'STUDENT_MANAGEMENT', name: 'Quản lý sinh viên', is_core: true },
        { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học', is_core: true },
      ]);
    }
    if (p === '/api/v1/organizations/options') {
      return json([{ id: 'org-1', name: 'Trường THPT Nguyễn Du' }]);
    }
    if (p === '/api/v1/accounts') {
      return json({ items: accounts, total: accounts.length, page: 1, size: 20, pages: 2 });
    }
    if (p === '/api/v1/audit-logs') {
      return json({ items: [], total: 0, page: 1, size: 20, pages: 1 });
    }
    return json({});
  });

  const results = [];
  results.push(await inspect(page, '/quan-tri/tai-khoan', 'Quản lý tài khoản'));
  results.push(await inspect(page, '/quan-tri/module', 'Danh mục module'));
  results.push(await inspect(page, '/quan-tri/nhat-ky', 'Nhật ký hệ thống'));

  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
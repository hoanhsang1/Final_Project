/**
 * ux-review/probe-a11y-names.mjs — CHẨN ĐOÁN: các nút chỉ có icon trong console
 * antd có "tên truy cập" (accessible name) không?
 *
 * Dump text (`ux-dump.mjs`) suy tên nút từ aria-label/aria-labelledby/textContent/title.
 * Nó in `button ""` cho một số nút → cần xác minh bằng công cụ thật của Playwright
 * (`ariaSnapshot`, tính tên theo chuẩn ARIA) trước khi kết luận là lỗi.
 *
 * Chạy: & $node "ux-review\probe-a11y-names.mjs"
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

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
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
  if (p === '/api/v1/modules') return json([{ code: 'STUDENT_MANAGEMENT', name: 'Quản lý sinh viên' }]);
  if (p === '/api/v1/organizations/options') return json([{ id: 'org-1', name: 'Trường THPT Nguyễn Du' }]);
  if (p === '/api/v1/accounts') return json({ items: accounts, total: accounts.length, page: 1, size: 20, pages: 2 });
  if (p === '/api/v1/audit-logs') return json({ items: [], total: 0, page: 1, size: 20, pages: 1 });
  return json({});
});

/** In tên truy cập + HTML ngoài của các nút icon trên trang. */
async function inspect(route, label) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const out = { route, label };

  // 1) Nút "icon-only": có <span role="img"> nhưng không có chữ.
  out.iconOnlyButtons = await page.evaluate(() => {
    const res = [];
    for (const b of document.querySelectorAll('button')) {
      const hasIcon = b.querySelector('[role="img"], svg');
      const text = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (hasIcon && !text) {
        res.push({
          ariaLabel: b.getAttribute('aria-label'),
          title: b.getAttribute('title'),
          cls: b.className.slice(0, 80),
          outerHTML: b.outerHTML.slice(0, 220),
        });
      }
    }
    return res;
  });

  // 2) Tên truy cập THẬT (chuẩn ARIA) của cả nhóm pagination.
  const pag = page.locator('ul.ant-pagination');
  if ((await pag.count()) > 0) {
    try {
      out.paginationAria = await pag.first().ariaSnapshot();
    } catch (e) {
      out.paginationAria = 'LỖI ariaSnapshot: ' + String(e).slice(0, 160);
    }
  } else {
    out.paginationAria = '(không có ul.ant-pagination)';
  }

  // 3) Tên truy cập của ô tìm kiếm (input + nút icon) — cùng chuẩn ARIA.
  const search = page.locator('.ant-input-search, .ant-input-group-wrapper');
  if ((await search.count()) > 0) {
    try {
      out.searchAria = await search.first().ariaSnapshot();
    } catch (e) {
      out.searchAria = 'LỖI ariaSnapshot: ' + String(e).slice(0, 160);
    }
  } else {
    out.searchAria = '(không có ô tìm kiếm)';
  }

  return out;
}

const results = [];
results.push(await inspect('/quan-tri/tai-khoan', 'Quản lý tài khoản'));
results.push(await inspect('/quan-tri/module', 'Danh mục module'));
results.push(await inspect('/quan-tri/nhat-ky', 'Nhật ký hệ thống'));

console.log(JSON.stringify(results, null, 2));
await browser.close();

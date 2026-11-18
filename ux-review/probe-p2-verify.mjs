/**
 * ux-review/probe-p2-verify.mjs — XÁC MINH nhóm P2.
 *
 *  R-04: màn 403/404 KHÔNG còn SVG tiếng Anh ("Unauthorized"/"No Found") và CÓ `h1`.
 *  R-07: nút "Sửa"/"Xoá" ở màn Chức vụ phân biệt từng dòng; hộp xác nhận xoá NÊU TÊN.
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi endpoint chặn bằng `page.route` (BE không chạy).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p2-verify.mjs"
 */

import { createRequire } from 'node:module';
const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function tokenFor(roles, permissions = [], username = 'nguoi.dung') {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    userId: '11111111-1111-4111-8111-111111111111',
    username,
    roles,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.fake-signature`;
}

const TEACHER = tokenFor(['TEACHER'], [], 'giao.vien');
const OWNER = tokenFor(['OWNER'], [], 'chu.to.chuc');

const POSITIONS = [
  { id: 'p1', name: 'Giáo viên', description: 'Giảng dạy', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW'] },
  { id: 'p2', name: 'Tổ trưởng', description: 'Quản lý tổ', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT'] },
];

const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;
const ENGLISH = /Unauthorized|No Found|Server Error/;

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const report = { r04: [], r07: null };

/** Mở 1 route với phiên cho trước, trả về dữ liệu a11y của màn. */
async function inspectRoute(route, token, mocks = []) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'vi-VN' });
  await context.addInitScript(
    ([access]) => {
      localStorage.setItem('mems.accessToken', access);
      localStorage.setItem('mems.refreshToken', 'fake-refresh');
    },
    [token],
  );
  const page = await context.newPage();
  await page.route(
    (url) => API_RE.test(url.pathname),
    async (r, request) => {
      const url = new URL(request.url());
      const hit = mocks.find((m) => m.method === request.method() && new RegExp('^' + m.path.replace(/\//g, '\\/') + '$').test(url.pathname));
      await r.fulfill({
        status: hit?.status ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(hit?.json ?? []),
      });
    },
  );

  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  const h1 = (await page.locator('h1').count())
    ? (await page.locator('h1').first().textContent())?.trim()
    : null;
  const svgTitles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('svg title')).map((t) => (t.textContent || '').trim()),
  );
  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b) => b.getAttribute('aria-label') || (b.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  );

  const out = {
    route,
    h1,
    svgTitles,
    englishLeak: ENGLISH.test(svgTitles.join(' ') + ' ' + bodyText),
    bodyText,
    buttons,
  };
  await context.close();
  return out;
}

/* ── R-04: 5 màn 403/404 ─────────────────────────────────────────────────── */
report.r04.push(await inspectRoute('/quan-tri', TEACHER));
report.r04.push(await inspectRoute('/to-chuc', TEACHER));
report.r04.push(await inspectRoute('/dao-tao', TEACHER));
report.r04.push(await inspectRoute('/xem-thu/khong-ton-tai', TEACHER));
report.r04.push(await inspectRoute('/khong-ton-tai', TEACHER));

/* ── R-07: màn Chức vụ — nhãn nút + hộp xác nhận xoá ─────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'vi-VN' });
  await context.addInitScript(
    ([access]) => {
      localStorage.setItem('mems.accessToken', access);
      localStorage.setItem('mems.refreshToken', 'fake-refresh');
    },
    [OWNER],
  );
  const page = await context.newPage();
  await page.route(
    (url) => API_RE.test(url.pathname),
    async (r, request) => {
      const p = new URL(request.url()).pathname;
      const json = p === '/positions' ? POSITIONS : p === '/permissions' ? [] : [];
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    },
  );

  await page.goto(BASE + '/to-chuc/chuc-vu', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  const actionLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b) => b.getAttribute('aria-label'))
      .filter((l) => l && (l.startsWith('Sửa chức vụ') || l.startsWith('Xoá chức vụ'))),
  );

  // Mở hộp xác nhận xoá của dòng đầu tiên và đọc nội dung.
  const del = page.locator('button[aria-label^="Xoá chức vụ"]').first();
  let confirmText = null;
  if (await del.count()) {
    await del.click();
    const pop = page.locator('.ant-popover').first();
    await pop.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    confirmText = ((await pop.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  report.r07 = { actionLabels, confirmText };
  await context.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();

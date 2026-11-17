/**
 * ux-review/probe-dept-narrow.mjs — DEBUG: vì sao dump nói trang Phòng ban tràn
 * ngang ở 320px mà probe trước lại không?
 *
 * Chặn request y như `ux-dump.mjs` (API_RE) và IN RA những request đã chặn,
 * cùng DOM thật của bảng + ô "Thao tác".
 *
 * Chạy: & $node "ux-review\probe-dept-narrow.mjs"
 */

import { createRequire } from 'node:module';
const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
const tkn = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'chu.to.chuc',
  roles: ['OWNER'],
  permissions: [],
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.fake-signature`;

const DEPARTMENTS = [
  { id: 'd1', name: 'Tổ Toán', description: 'Tổ bộ môn Toán', createdAt: '2026-09-01T08:00:00' },
  { id: 'd2', name: 'Tổ Văn', description: null, createdAt: '2026-09-01T08:00:00' },
];

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const context = await browser.newContext({ viewport: { width: 320, height: 640 }, locale: 'vi-VN' });
await context.addInitScript(
  ([access]) => {
    localStorage.setItem('mems.accessToken', access);
    localStorage.setItem('mems.refreshToken', 'fake-refresh');
  },
  [tkn],
);

const intercepted = [];
const page = await context.newPage();

// Dùng ĐÚNG regex của ux-dump.mjs để chắc chắn chặn được /departments.
const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;
await page.route(API_RE, (route, request) => {
  const p = new URL(request.url()).pathname;
  intercepted.push(`${request.method()} ${p}`);
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (p === '/departments') return json(DEPARTMENTS);
  return json({ items: [], total: 0, page: 1, size: 20, pages: 1 });
});

await page.goto(BASE + '/to-chuc', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const tables = [...document.querySelectorAll('table')];
  const actionsTh = [...document.querySelectorAll('thead th')].map((th) => ({
    text: th.textContent.trim(),
    w: Math.round(th.getBoundingClientRect().width),
  }));
  const actionsTd = document.querySelector('tbody td:last-child');
  const buttons = [...document.querySelectorAll('tbody button')].map((b) => ({
    text: b.textContent.trim(),
    aria: b.getAttribute('aria-label'),
    w: Math.round(b.getBoundingClientRect().width),
  }));
  const spaces = [...document.querySelectorAll('tbody .ant-space')].map((s) => ({
    cls: s.className.slice(0, 40),
    w: Math.round(s.getBoundingClientRect().width),
    wrap: getComputedStyle(s).flexWrap,
  }));
  const overflowing = [];
  const vw = document.documentElement.clientWidth;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && Math.round(r.right) > vw) {
      overflowing.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
      if (overflowing.length > 12) break;
    }
  }
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: vw,
    overflow: document.documentElement.scrollWidth - vw,
    tableCount: tables.length,
    tableBoxes: tables.map((t) => {
      const r = t.getBoundingClientRect();
      return { x: Math.round(r.left), w: Math.round(r.width), layout: getComputedStyle(t).tableLayout };
    }),
    actionsTh,
    actionsTdHtml: actionsTd ? actionsTd.outerHTML.slice(0, 300) : null,
    buttons,
    spaces,
    overflowing,
    fontFamily: getComputedStyle(document.body).fontFamily,
  };
});

console.log(JSON.stringify({ intercepted, info }, null, 2));
await browser.close();

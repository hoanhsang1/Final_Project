/**
 * ux-review/probe-antd-locale.mjs — CHẨN ĐOÁN (không phải dump chính thức).
 *
 * Câu hỏi: vì sao Pagination của antd hiện tiếng Anh ("Page Size", "20 / page")
 * trong khi `ConfigProvider locale={viVN}`?
 *
 * Cách kiểm: nhờ chính Vite dev server phân giải module, rồi xem hình dạng
 * object locale mà app nhận được.
 *
 * Chạy: & $node "ux-review\probe-antd-locale.mjs"   (từ D:\Final_Project)
 */

import { createRequire } from 'node:module';
const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
const access = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'admin.he.thong',
  roles: ['SUPER_ADMIN'],
  permissions: [],
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.fake`;

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'vi-VN' });
await context.addInitScript(
  ([a]) => {
    localStorage.setItem('mems.accessToken', a);
    localStorage.setItem('mems.refreshToken', 'fake');
  },
  [access],
);
const page = await context.newPage();
await page.goto(BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(async () => {
  const describe = (label, v) => ({
    label,
    typeofValue: typeof v,
    topKeys: v && typeof v === 'object' ? Object.keys(v).slice(0, 14) : null,
    hasPagination: Boolean(v && v.Pagination),
    paginationItemsPerPage: v && v.Pagination ? v.Pagination.items_per_page : null,
    // Dấu hiệu interop sai: giá trị nhận được chính là namespace CJS lồng nhau.
    looksLikeCjsNamespace: Boolean(v && v.__esModule === true && v.default),
    nestedHasPagination: Boolean(v && v.default && v.default.Pagination),
    nestedPaginationItemsPerPage: v && v.default && v.default.Pagination ? v.default.Pagination.items_per_page : null,
  });
  const out = {};
  // Đây chính là file mà Vite đã sinh ra cho `import viVN from 'antd/locale/vi_VN'`.
  try {
    const dep = await import('/node_modules/.vite/deps/antd_locale_vi___VN.js');
    out.depDefault = describe('dep.default', dep.default);
  } catch (e) {
    out.depDefault = 'LỖI: ' + String(e).slice(0, 200);
  }
  return out;
});

console.log(JSON.stringify(result, null, 2));
await browser.close();

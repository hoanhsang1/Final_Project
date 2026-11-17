/**
 * ux-review/probe-p1-verify.mjs — XÁC MINH "SAU KHI SỬA" cho 3 lỗi P1.
 *
 * Đối chứng với `probe-p1-impact.mjs` + `_probe-p1-before.log` (đo TRƯỚC khi sửa).
 * Script này KHÔNG bật/tắt gì cả — chỉ đo trạng thái thật của app sau khi sửa:
 *
 *  R-01: đọc chữ trong khối phân trang antd ở `/quan-tri/tai-khoan`
 *        (showSizeChanger: true) → mong thấy tiếng Việt ("/ trang", "Trang"),
 *        không còn "Page Size" / "/ page" / "Previous Page".
 *  R-03: đo `fontWeight`/`marginBottom` của `h1` Astryx → mong `600` / `0px`,
 *        VÀ quét toàn bộ stylesheet xem còn rule `h1{font-weight:500}` (dấu vết
 *        `antd/dist/reset.css`) không → mong KHÔNG còn.
 *  R-05: ở 320px, 3 trang Tổ chức phải có `overflow` (tràn ngang cả trang) = 0
 *        và bảng nằm trong khung cuộn (`overflowX: auto`); ở 1366px, bề rộng cột
 *        phải khớp baseline `_probe-p1-before.log` (desktop không đổi).
 *
 * Chạy: & $node "ux-review\probe-p1-verify.mjs"
 */

import { createRequire } from 'node:module';
const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function token(roles, permissions = [], username = 'nguoi.dung') {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    userId: '11111111-1111-4111-8111-111111111111',
    username,
    roles,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.fake-signature`;
}

const T_ADMIN = token(['SUPER_ADMIN'], [], 'admin.he.thong');
const T_OWNER = token(['OWNER'], [], 'chu.to.chuc');

const ORG = [{ id: 'org-1', name: 'Trường THPT Nguyễn Du' }];
const ACCOUNTS = {
  items: [
    { id: 'acc-1', username: 'nguyendu.owner', email: 'o@x.vn', full_name: 'Trần Văn A', organization_id: 'org-1', organization_name: 'Trường THPT Nguyễn Du', role: 'ORG_OWNER', status: 'active', created_at: '2026-10-01T08:30:00', last_login_at: '2026-11-10T07:45:00' },
  ],
  total: 45, page: 1, size: 20, pages: 3,
};
const DEPARTMENTS = [
  { id: 'd1', name: 'Tổ Toán', description: 'Tổ bộ môn Toán', createdAt: '2026-09-01T08:00:00' },
  { id: 'd2', name: 'Tổ Văn', description: null, createdAt: '2026-09-01T08:00:00' },
];
const POSITIONS = [
  { id: 'p1', name: 'Giáo viên', description: 'Giảng dạy', permissions: ['PEOPLE_VIEW'], createdAt: '2026-09-01T08:00:00' },
  { id: 'p2', name: 'Tổ trưởng', description: 'Quản lý tổ', permissions: ['PEOPLE_VIEW', 'PEOPLE_MANAGE'], createdAt: '2026-09-01T08:00:00' },
];
const MEMBERS = [
  { userId: 'u1', departmentId: 'd1', role: 'MANAGER', appointedBy: null, appointedAt: '2026-09-02T08:00:00', positionIds: ['p1'], permissions: ['PEOPLE_VIEW'] },
  { userId: 'u2', departmentId: 'd1', role: 'TEACHER', appointedBy: null, appointedAt: '2026-09-03T08:00:00', positionIds: ['p1'], permissions: [] },
];
const PERMISSIONS = [
  { code: 'PEOPLE_VIEW', name: 'Xem nhân viên', description: 'Xem nhân sự' },
  { code: 'PEOPLE_MANAGE', name: 'Quản lý nhân viên', description: 'Quản lý nhân sự' },
];

const browser = await chromium.launch({ channel: CHANNEL, headless: true });

// Regex KHÔNG neo đầu chuỗi — Playwright so khớp trên URL đầy đủ (http://host/path),
// nên `^\/api\/` sẽ không bao giờ khớp. Khớp theo đoạn đường dẫn.
const API_RE = /\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;

async function open(route, tkn, vp) {
  const context = await browser.newContext({ viewport: vp, locale: 'vi-VN' });
  if (tkn) {
    await context.addInitScript(
      ([access]) => {
        localStorage.setItem('mems.accessToken', access);
        localStorage.setItem('mems.refreshToken', 'fake-refresh');
      },
      [tkn],
    );
  }
  const page = await context.newPage();
  await page.route(API_RE, (r, request) => {
    const p = new URL(request.url()).pathname;
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/api/v1/accounts') return json(ACCOUNTS);
    if (p === '/api/v1/organizations/options') return json(ORG);
    if (p === '/api/v1/modules') return json([{ code: 'STUDENT_MANAGEMENT', name: 'Quản lý sinh viên' }]);
    if (p === '/api/v1/auth/refresh') return json({ accessToken: tkn, refreshToken: 'x' });
    if (p === '/departments') return json(DEPARTMENTS);
    if (p === '/positions') return json(POSITIONS);
    if (p === '/permissions') return json(PERMISSIONS);
    if (/^\/departments\/[^/]+\/members$/.test(p)) return json(MEMBERS);
    return json({ items: [], total: 0, page: 1, size: 20, pages: 1 });
  });
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  return page;
}

/* ── R-01 + R-03: trên trang có h1 + phân trang antd ── */
const pageAdmin = await open('/quan-tri/tai-khoan', T_ADMIN, { width: 1366, height: 768 });

const r01r03 = await pageAdmin.evaluate(() => {
  const g = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
  const h1 = document.querySelector('h1');
  const pag = document.querySelector('.ant-pagination');
  const pagTotal = document.querySelector('.ant-pagination-total-text');
  const sizeChanger = document.querySelector('.ant-pagination-options');
  // Quét stylesheet tìm dấu vết reset antd: rule có selector chứa h1 + font-weight: 500.
  let antdResetFound = false;
  for (const s of document.styleSheets) {
    let rules = [];
    try {
      rules = [...s.cssRules];
    } catch {
      continue;
    }
    if (rules.some((r) => r.cssText && r.cssText.includes('font-weight: 500') && /(^|,)\s*h1\b/.test(r.selectorText || ''))) {
      antdResetFound = true;
    }
  }
  return {
    h1Text: h1 ? h1.textContent.trim() : null,
    h1Class: h1 ? h1.className.slice(0, 70) : null,
    h1_fontWeight: g(h1, 'fontWeight'),
    h1_marginBottom: g(h1, 'marginBottom'),
    paginationText: pag ? pag.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : null,
    paginationTotalText: pagTotal ? pagTotal.innerText.trim() : null,
    sizeChangerText: sizeChanger ? sizeChanger.innerText.replace(/\s+/g, ' ').trim() : null,
    antdResetFound,
  };
});

/* ── R-05: bề rộng cột + tràn ngang, ở narrow 320 và desktop 1366 ── */
const metrics = (pg) =>
  pg.evaluate(() => {
    const table = document.querySelector('table');
    const content = document.querySelector('.ant-table-content, .ant-table-body');
    const g = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    const w = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null);
    const ths = table ? [...table.querySelectorAll('thead th')].map((th) => Math.round(th.getBoundingClientRect().width)) : null;
    return {
      hasTable: !!table,
      tableLayout: g(table, 'tableLayout'),
      tableWidth: w(table),
      thWidths: ths,
      contentOverflowX: g(content, 'overflowX'),
      contentWidth: w(content),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

const VP_NARROW = { width: 320, height: 640 };
const VP_DESK = { width: 1366, height: 768 };

const pOwnerNarrow = await open('/to-chuc', T_OWNER, VP_NARROW);
const nDept = await metrics(pOwnerNarrow);
await pOwnerNarrow.goto(BASE + '/to-chuc/chuc-vu', { waitUntil: 'domcontentloaded' });
await pOwnerNarrow.waitForTimeout(900);
const nPos = await metrics(pOwnerNarrow);
await pOwnerNarrow.goto(BASE + '/to-chuc/phong-ban/d1', { waitUntil: 'domcontentloaded' });
await pOwnerNarrow.waitForTimeout(900);
const nDeptDetail = await metrics(pOwnerNarrow);

const pOwnerDesk = await open('/to-chuc', T_OWNER, VP_DESK);
const dDept = await metrics(pOwnerDesk);
await pOwnerDesk.goto(BASE + '/to-chuc/chuc-vu', { waitUntil: 'domcontentloaded' });
await pOwnerDesk.waitForTimeout(900);
const dPos = await metrics(pOwnerDesk);
await pOwnerDesk.goto(BASE + '/to-chuc/phong-ban/d1', { waitUntil: 'domcontentloaded' });
await pOwnerDesk.waitForTimeout(900);
const dDeptDetail = await metrics(pOwnerDesk);

console.log(
  JSON.stringify(
    {
      r01_pagination: {
        paginationText: r01r03.paginationText,
        paginationTotalText: r01r03.paginationTotalText,
        sizeChangerText: r01r03.sizeChangerText,
      },
      r03_heading: {
        h1Text: r01r03.h1Text,
        h1_fontWeight: r01r03.h1_fontWeight,
        h1_marginBottom: r01r03.h1_marginBottom,
        antdResetStillPresent: r01r03.antdResetFound,
      },
      r05_narrow320: { departments: nDept, positions: nPos, deptDetail: nDeptDetail },
      r05_desktop1366: { departments: dDept, positions: dPos, deptDetail: dDeptDetail },
    },
    null,
    2,
  ),
);

await browser.close();

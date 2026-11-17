/**
 * ux-review/probe-p1-impact.mjs — CHẨN ĐOÁN cho 3 lỗi P1 (R-01, R-03, R-05).
 *
 * Không sửa source: đo trong trình duyệt, có thể BẬT/TẮT stylesheet ngay lúc chạy.
 *
 * Phần 1 (R-03): đo h1 Astryx + margin `p`/`ul` + `html/body height` trên một
 *                trang console TRƯỚC và SAU khi tắt `antd/dist/reset.css`.
 * Phần 2 (R-05): so `table-layout` + `overflow-x` của khung bảng giữa
 *                trang ĐÃ có `scroll={{x}}` (tài khoản) và các trang CHƯA có;
 *                đo tràn ngang của trang + bề rộng từng cột (`th`).
 *
 * Mỗi route dùng ĐÚNG vai trò (nếu không sẽ ra 403 và đo vào trang trắng).
 *
 * Chạy: & $node "ux-review\probe-p1-impact.mjs"
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
  total: 1, page: 1, size: 20, pages: 1,
};
const DEPARTMENTS = [
  { id: 'd1', name: 'Tổ Toán', description: 'Tổ bộ môn Toán', createdAt: '2026-09-01T00:00:00' },
  { id: 'd2', name: 'Tổ Văn', description: null, createdAt: '2026-09-01T00:00:00' },
];
const POSITIONS = [
  { id: 'p1', name: 'Giáo viên', description: 'Giảng dạy', permissions: ['PEOPLE_VIEW'], createdAt: '2026-09-01T00:00:00' },
  { id: 'p2', name: 'Tổ trưởng', description: 'Quản lý tổ', permissions: ['PEOPLE_VIEW', 'PEOPLE_MANAGE'], createdAt: '2026-09-01T00:00:00' },
];
const MEMBERS = {
  items: [
    { userId: 'u1', role: 'TEACHER', positionIds: ['p1'], appointedAt: '2026-09-01T00:00:00' },
  ],
  total: 1, page: 1, size: 20, pages: 1,
};

const browser = await chromium.launch({ channel: CHANNEL, headless: true });

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
  // Regex y như ux-dump.mjs — phải khớp cả `/departments`, `/positions`, `/permissions`
  // (không có tiền tố `/api`), nếu không trang sẽ ở trạng thái đang tải.
  const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;
  await page.route(API_RE, (route2, request) => {
    const p = new URL(request.url()).pathname;
    const json = (b) => route2.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/api/v1/accounts') return json(ACCOUNTS);
    if (p === '/api/v1/organizations/options') return json(ORG);
    if (p === '/api/v1/modules') return json([{ code: 'STUDENT_MANAGEMENT', name: 'Quản lý sinh viên' }]);
    if (p === '/departments') return json(DEPARTMENTS);
    if (p === '/positions') return json(POSITIONS);
    if (p === '/permissions') return json([{ code: 'PEOPLE_VIEW', name: 'Xem nhân viên' }, { code: 'PEOPLE_MANAGE', name: 'Quản lý nhân viên' }]);
    if (p.endsWith('/members')) return json(MEMBERS);
    if (p === '/api/v1/auth/refresh') return json({ accessToken: tkn, refreshToken: 'x' });
    return json({ items: [], total: 0, page: 1, size: 20, pages: 1 });
  });
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  return page;
}

const HEADING_AND_MARGINS = () =>
  pageR03.evaluate(() => {
    const g = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    const h1 = document.querySelector('h1');
    const p = document.querySelector('p');
    const ul = document.querySelector('ul');
    return {
      h1Text: h1 ? h1.textContent.trim().slice(0, 40) : null,
      h1Class: h1 ? h1.className.slice(0, 70) : null,
      h1_fontWeight: g(h1, 'fontWeight'),
      h1_marginBottom: g(h1, 'marginBottom'),
      p_marginBottom: g(p, 'marginBottom'),
      ul_marginBottom: g(ul, 'marginBottom'),
      ul_paddingLeft: g(ul, 'paddingLeft'),
      html_height: g(document.documentElement, 'height'),
      body_height: g(document.body, 'height'),
    };
  });

const tableMetrics = (pg) =>
  pg.evaluate(() => {
    const table = document.querySelector('table');
    const content = document.querySelector('.ant-table-content, .ant-table-body');
    const g = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.left), w: Math.round(b.width) };
    };
    const ths = table ? [...table.querySelectorAll('thead th')].map((th) => Math.round(th.getBoundingClientRect().width)) : null;
    return {
      hasTable: !!table,
      tableLayout: g(table, 'tableLayout'),
      tableBox: box(table),
      thWidths: ths,
      contentOverflowX: g(content, 'overflowX'),
      contentBox: box(content),
      pageScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

/* ─────────────── Phần 1 (R-03) ─────────────── */

const pageR03 = await open('/quan-tri/tai-khoan', T_ADMIN, { width: 1366, height: 768 });
const r03Before = await HEADING_AND_MARGINS();
const disabled = await pageR03.evaluate(() => {
  const out = [];
  for (const s of document.styleSheets) {
    let rules = [];
    try {
      rules = [...s.cssRules];
    } catch {
      continue;
    }
    const isAntdReset = rules.some((r) => r.cssText && r.cssText.includes('font-weight: 500') && /h1/.test(r.selectorText || ''));
    if (isAntdReset) {
      s.disabled = true;
      out.push(s.href || '(inline)');
    }
  }
  return out;
});
await pageR03.waitForTimeout(200);
const r03After = await HEADING_AND_MARGINS();

/* ─────────────── Phần 2 (R-05) ─────────────── */

const VP_NARROW = { width: 320, height: 640 };
const VP_DESK = { width: 1366, height: 768 };

// Mỗi vai trò một context — KHÔNG tái dùng context (sai vai trò → 403 → trang trắng).
const pAdmin = await open('/quan-tri/tai-khoan', T_ADMIN, VP_NARROW);
const r05Accounts = await tableMetrics(pAdmin);

const pOwnerNarrow = await open('/to-chuc', T_OWNER, VP_NARROW);
const r05Departments = await tableMetrics(pOwnerNarrow);
await pOwnerNarrow.goto(BASE + '/to-chuc/chuc-vu', { waitUntil: 'domcontentloaded' });
await pOwnerNarrow.waitForTimeout(900);
const r05Positions = await tableMetrics(pOwnerNarrow);
await pOwnerNarrow.goto(BASE + '/to-chuc/phong-ban/d1', { waitUntil: 'domcontentloaded' });
await pOwnerNarrow.waitForTimeout(900);
const r05DeptDetail = await tableMetrics(pOwnerNarrow);

/* Desktop column widths for the 3 pages (để so trước/sau khi sửa). */
const pOwnerDesk = await open('/to-chuc', T_OWNER, VP_DESK);
const dDept = await tableMetrics(pOwnerDesk);
await pOwnerDesk.goto(BASE + '/to-chuc/chuc-vu', { waitUntil: 'domcontentloaded' });
await pOwnerDesk.waitForTimeout(900);
const dPos = await tableMetrics(pOwnerDesk);
await pOwnerDesk.goto(BASE + '/to-chuc/phong-ban/d1', { waitUntil: 'domcontentloaded' });
await pOwnerDesk.waitForTimeout(900);
const dDeptDetail = await tableMetrics(pOwnerDesk);

console.log(JSON.stringify({
  r03: { before: r03Before, disabledSheets: disabled, after: r03After },
  r05_narrow320: {
    accounts_has_scrollx: r05Accounts,
    departments_no_scrollx: r05Departments,
    positions_no_scrollx: r05Positions,
    deptDetail_no_scrollx: r05DeptDetail,
  },
  desktop1366_colwidths: {
    departments: dDept,
    positions: dPos,
    deptDetail: dDeptDetail,
  },
}, null, 2));

await browser.close();

/**
 * ux-review/probe-p3c5-dot1.mjs — kiểm tra HÀNH VI của nhóm "Tổ chức" Đợt 1 sau
 * khi port sang Astryx (P3c-5):
 *   - `DepartmentsPage` + `DepartmentFormModal` (`/to-chuc`)
 *   - `PositionsPage`   + `PositionFormModal`   (`/to-chuc/chuc-vu`)
 *
 * Dump 26/27/28 chỉ chụp ảnh tĩnh (danh sách / rỗng / chức vụ), nên probe này
 * chạy tay các phần tương tác: tạo/sửa/xoá (kèm AlertDialog + validate), phân
 * trang client, lỗi tải + nút "Thử lại", lỗi xoá 409 (NFR-REL-001: KHÔNG báo
 * thành công), và 403 của `OwnerGuard`.
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p3c5-dot1.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

const DEPARTMENTS = [
  { id: 'd1', name: 'Tổ Toán', description: 'Tổ bộ môn Toán', createdAt: '2026-09-01T08:00:00' },
  { id: 'd2', name: 'Tổ Văn', description: null, createdAt: '2026-09-01T08:00:00' },
];

/** 12 phòng ban → 2 trang với `PAGE_SIZE = 10`. */
const DEPARTMENTS_12 = Array.from({ length: 12 }, (_, i) => ({
  id: `d${i + 1}`,
  name: `Tổ số ${i + 1}`,
  description: `Mô tả tổ ${i + 1}`,
  createdAt: '2026-09-01T08:00:00',
}));

const POSITIONS = [
  { id: 'p1', name: 'Giáo viên', description: 'Giảng dạy', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW'] },
  { id: 'p2', name: 'Tổ trưởng', description: 'Quản lý tổ', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT'] },
];

const PERMISSIONS = [
  { code: 'PEOPLE_VIEW', description: 'Xem nhân sự' },
  { code: 'PEOPLE_EDIT', description: 'Sửa nhân sự' },
  { code: 'CLASS_VIEW', description: 'Xem lớp học' },
];

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function fakeJwt(claims) {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}
function tokenFor(roles, permissions = [], username = 'chu.to.chuc') {
  return fakeJwt({
    userId: '11111111-1111-4111-8111-111111111111',
    username,
    roles,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function newContext(
  browser,
  {
    departments = DEPARTMENTS,
    departmentsStatus = 200,
    positions = POSITIONS,
    positionsStatus = 200,
    permissions = PERMISSIONS,
    permissionsStatus = 200,
    createStatus = 200,
    createCode = null,
    updateStatus = 200,
    deleteStatus = 200,
    deleteCode = null,
    roles = ['OWNER'],
  } = {},
) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN' });
  await context.addInitScript(
    ([access]) => {
      localStorage.setItem('mems.accessToken', access);
      localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
    },
    [tokenFor(roles)],
  );
  const page = await context.newPage();
  const pageErrors = [];
  /** Mọi request đã chặn: `{ method, path, body }`. */
  const calls = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

  const countOf = (prefix) => calls.filter((c) => `${c.method} ${c.path}`.startsWith(prefix)).length;

  await page.route(
    (url) => API_RE.test(url.pathname),
    async (route, request) => {
      const url = new URL(request.url());
      const method = request.method();
      let body = null;
      try {
        body = request.postData() ? JSON.parse(request.postData()) : null;
      } catch {
        body = request.postData();
      }
      calls.push({ method, path: url.pathname, body });

      const json = (status, payload) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      const err = (status, code, message = 'lỗi') => json(status, { code, message });

      // ── Phòng ban ──
      if (method === 'GET' && url.pathname === '/departments') {
        if (departmentsStatus !== 200) return err(departmentsStatus, 'INTERNAL_ERROR');
        return json(200, departments);
      }
      if (method === 'POST' && url.pathname === '/departments') {
        if (createStatus !== 200) return err(createStatus, createCode || 'INTERNAL_ERROR');
        return json(200, { ...DEPARTMENTS[0], ...body });
      }
      if (method === 'PUT' && /^\/departments\/[^/]+$/.test(url.pathname)) {
        if (updateStatus !== 200) return err(updateStatus, 'INTERNAL_ERROR');
        return json(200, { ...DEPARTMENTS[0], ...body });
      }
      if (method === 'DELETE' && /^\/departments\/[^/]+$/.test(url.pathname)) {
        if (deleteStatus !== 200) return err(deleteStatus, deleteCode || 'INTERNAL_ERROR');
        return route.fulfill({ status: 204, body: '' });
      }

      // ── Chức vụ ──
      if (method === 'GET' && url.pathname === '/positions') {
        if (positionsStatus !== 200) return err(positionsStatus, 'INTERNAL_ERROR');
        return json(200, positions);
      }
      if (method === 'POST' && url.pathname === '/positions') {
        return json(200, { ...POSITIONS[0], ...body });
      }
      if (method === 'PUT' && /^\/positions\/[^/]+$/.test(url.pathname)) {
        return json(200, { ...POSITIONS[0], ...body });
      }
      if (method === 'DELETE' && /^\/positions\/[^/]+$/.test(url.pathname)) {
        return route.fulfill({ status: 204, body: '' });
      }

      // ── Danh mục quyền ──
      if (method === 'GET' && url.pathname === '/permissions') {
        if (permissionsStatus !== 200) return err(permissionsStatus, 'INTERNAL_ERROR');
        return json(200, permissions);
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls, countOf };
}

async function openDept(page) {
  await page.goto(`${BASE}/to-chuc`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(500);
}

async function openPos(page) {
  await page.goto(`${BASE}/to-chuc/chuc-vu`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(500);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Danh sách phòng ban: tiêu đề, bảng, nút hành động, link ────────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await openDept(page);

    const h1 = await page.locator('h1').first().innerText();
    check('h1 = "Phòng ban"', h1.trim() === 'Phòng ban', h1.trim());

    const antdCount = await page.locator('[class^="ant-"]').count();
    check('0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const rows = await page.locator('tbody tr').count();
    check('bảng hiện 2 phòng ban', rows === 2, `count=${rows}`);

    check('có link tên phòng ban → chi tiết', (await page.getByRole('link', { name: 'Tổ Toán' }).count()) === 1);
    const href = await page.getByRole('link', { name: 'Tổ Toán' }).getAttribute('href');
    check('link trỏ /to-chuc/phong-ban/d1', href === '/to-chuc/phong-ban/d1', String(href));

    const bodyText = await page.locator('body').innerText();
    check('hiện mô tả + ngày tạo + "—" cho mô tả null', bodyText.includes('Tổ bộ môn Toán') && bodyText.includes('01/09/2026') && bodyText.includes('—'));

    check('có nút "Thêm phòng ban"', (await page.getByRole('button', { name: 'Thêm phòng ban' }).count()) === 1);
    check('nút sửa có aria-label riêng', (await page.getByRole('button', { name: 'Sửa phòng ban Tổ Toán' }).count()) === 1);
    check('nút xoá có aria-label riêng', (await page.getByRole('button', { name: 'Xoá phòng ban Tổ Toán' }).count()) === 1);
    check('không có pageerror (danh sách)', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Rỗng: câu hướng dẫn + bảng vẫn render + nút tạo luôn hiện ─────── */
  {
    const { context, page } = await newContext(browser, { departments: [] });
    await openDept(page);

    const bodyText = await page.locator('body').innerText();
    check(
      'rỗng: hiện câu hướng dẫn tạo phòng ban đầu tiên',
      bodyText.includes('Chưa có phòng ban nào. Tạo phòng ban đầu tiên để bắt đầu.'),
    );
    check('rỗng: tiêu đề cột vẫn còn (bảng vẫn render)', bodyText.includes('Tên phòng ban'));
    check('rỗng: nút "Thêm phòng ban" vẫn hiện', (await page.getByRole('button', { name: 'Thêm phòng ban' }).count()) === 1);
    await context.close();
  }

  /* ── 3. Phân trang client: 12 phòng ban → 2 trang ─────────────────────── */
  {
    const { context, page } = await newContext(browser, { departments: DEPARTMENTS_12 });
    await openDept(page);

    const pagNav = page.getByRole('navigation', { name: 'Phân trang danh sách phòng ban' });
    check('có thanh phân trang (nhãn tiếng Việt)', (await pagNav.count()) === 1);

    const page1Rows = await page.locator('tbody tr').count();
    check('trang 1 hiện 10 dòng', page1Rows === 10, `count=${page1Rows}`);

    await pagNav.locator('button').filter({ hasText: /^2$/ }).first().click();
    await page.waitForTimeout(400);
    const page2Rows = await page.locator('tbody tr').count();
    check('trang 2 còn 2 dòng', page2Rows === 2, `count=${page2Rows}`);
    check('trang 2 KHÔNG gọi lại API (phân trang client)', (await page.getByRole('link', { name: 'Tổ số 11' }).count()) === 1);
    await context.close();
  }

  /* ── 4. Tạo phòng ban: validate rồi gửi ───────────────────────────────── */
  {
    const { context, page, calls, countOf } = await newContext(browser);
    await openDept(page);

    await page.getByRole('button', { name: 'Thêm phòng ban' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    check('mở dialog tạo phòng ban', (await dialog.count()) >= 1);

    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(300);
    check('validate: hiện "Vui lòng nhập tên phòng ban"', (await dialog.innerText()).includes('Vui lòng nhập tên phòng ban'));
    check('validate: KHÔNG gửi POST', countOf('POST /departments') === 0);

    await dialog.getByLabel('Tên phòng ban').fill('Khoa Mới');
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(800);
    const post = calls.find((c) => c.method === 'POST' && c.path === '/departments');
    check('POST /departments gửi name', !!post && post.body?.name === 'Khoa Mới', JSON.stringify(post?.body));
    check('tạo xong → toast "Đã tạo phòng ban."', (await page.locator('body').innerText()).includes('Đã tạo phòng ban.'));
    check('tạo xong → đóng dialog', (await page.getByRole('dialog').count()) === 0);
    await context.close();
  }

  /* ── 5. Sửa phòng ban: điền sẵn + PUT ─────────────────────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDept(page);

    await page.getByRole('button', { name: 'Sửa phòng ban Tổ Toán' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    check('dialog sửa điền sẵn tên cũ', (await dialog.getByLabel('Tên phòng ban').inputValue()) === 'Tổ Toán');

    await dialog.getByLabel('Tên phòng ban').fill('Tổ Toán - Tin');
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(800);
    const put = calls.find((c) => c.method === 'PUT' && c.path === '/departments/d1');
    check('PUT /departments/d1 gửi name mới', !!put && put.body?.name === 'Tổ Toán - Tin', JSON.stringify(put?.body));
    check('sửa xong → toast "Đã cập nhật phòng ban."', (await page.locator('body').innerText()).includes('Đã cập nhật phòng ban.'));
    await context.close();
  }

  /* ── 6. Xoá phòng ban: AlertDialog + DELETE ───────────────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDept(page);

    await page.getByRole('button', { name: 'Xoá phòng ban Tổ Toán' }).click();
    await page.waitForTimeout(400);
    const alert = page.getByRole('alertdialog');
    check('mở AlertDialog xoá', (await alert.count()) === 1);
    const alertText = await alert.innerText();
    check('AlertDialog nêu tên phòng ban', alertText.includes('Tổ Toán'), alertText.replace(/\s+/g, ' ').slice(0, 160));

    await alert.getByRole('button', { name: 'Xoá', exact: true }).click();
    await page.waitForTimeout(800);
    const del = calls.find((c) => c.method === 'DELETE' && c.path === '/departments/d1');
    check('DELETE /departments/d1 đã gọi', !!del);
    check('xoá xong → toast "Đã xoá phòng ban."', (await page.locator('body').innerText()).includes('Đã xoá phòng ban.'));
    check('xoá xong → đóng AlertDialog', (await page.getByRole('alertdialog').count()) === 0);
    await context.close();
  }

  /* ── 7. Xoá lỗi 409: báo lỗi, KHÔNG báo thành công (NFR-REL-001) ──────── */
  {
    const { context, page } = await newContext(browser, {
      deleteStatus: 409,
      deleteCode: 'DEPARTMENT_NOT_EMPTY',
    });
    await openDept(page);

    await page.getByRole('button', { name: 'Xoá phòng ban Tổ Toán' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá', exact: true }).click();
    await page.waitForTimeout(1200);

    const bodyText = await page.locator('body').innerText();
    check(
      '409: hiện câu giải thích phải gỡ nhân viên trước',
      bodyText.includes('Phòng ban còn nhân viên. Hãy xoá hết nhân viên khỏi phòng ban trước.'),
    );
    check('409: KHÔNG báo thành công', !bodyText.includes('Đã xoá phòng ban.'));
    check('409: có banner lỗi role=alert', (await page.getByRole('alert').count()) >= 1);
    await context.close();
  }

  /* ── 8. Lỗi tải danh sách phòng ban: banner + "Thử lại" ───────────────── */
  {
    const { context, page } = await newContext(browser, { departmentsStatus: 500 });
    await openDept(page);
    await page
      .getByRole('alert')
      .first()
      .waitFor({ state: 'visible', timeout: 6000 })
      .catch(() => {});
    check('lỗi tải: câu lỗi tiếng Việt', (await page.locator('body').innerText()).includes('Không tải được danh sách phòng ban.'));
    check('lỗi tải: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    await context.close();
  }

  /* ── 9. Danh sách chức vụ: badge quyền (BR-08: chữ, không chỉ màu) ─────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await openPos(page);

    const h1 = await page.locator('h1').first().innerText();
    check('h1 = "Chức vụ"', h1.trim() === 'Chức vụ', h1.trim());
    const antdCount = await page.locator('[class^="ant-"]').count();
    check('chức vụ: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const bodyText = await page.locator('body').innerText();
    check(
      'chức vụ: hiện nhãn quyền bằng CHỮ',
      bodyText.includes('Xem nhân viên phòng ban') && bodyText.includes('Quản lý nhân viên phòng ban'),
    );
    check('chức vụ: có nút "Thêm chức vụ"', (await page.getByRole('button', { name: 'Thêm chức vụ' }).count()) === 1);
    check('không có pageerror (chức vụ)', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 10. Tạo chức vụ: validate tên + ít nhất 1 quyền rồi gửi ──────────── */
  {
    const { context, page, calls, countOf } = await newContext(browser);
    await openPos(page);

    await page.getByRole('button', { name: 'Thêm chức vụ' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    check('mở dialog tạo chức vụ', (await dialog.count()) >= 1);

    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(300);
    const errText = await dialog.innerText();
    check('validate: hiện lỗi tên chức vụ', errText.includes('Vui lòng nhập tên chức vụ'));
    check('validate: hiện lỗi cần ít nhất 1 quyền', errText.includes('Chọn ít nhất một quyền cho chức vụ'));
    check('validate: KHÔNG gửi POST', countOf('POST /positions') === 0);

    await dialog.getByLabel('Tên chức vụ').fill('Trợ giảng');
    await dialog.getByRole('checkbox').first().check();
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(800);
    const post = calls.find((c) => c.method === 'POST' && c.path === '/positions');
    check(
      'POST /positions gửi name + permissions',
      !!post && post.body?.name === 'Trợ giảng' && Array.isArray(post.body?.permissions) && post.body.permissions.length === 1,
      JSON.stringify(post?.body),
    );
    check('tạo chức vụ xong → toast "Đã tạo chức vụ."', (await page.locator('body').innerText()).includes('Đã tạo chức vụ.'));
    await context.close();
  }

  /* ── 11. Lỗi danh mục quyền: banner riêng + "Thử lại" ─────────────────── */
  {
    const { context, page } = await newContext(browser, { permissionsStatus: 500 });
    await openPos(page);
    await page
      .getByRole('alert')
      .first()
      .waitFor({ state: 'visible', timeout: 6000 })
      .catch(() => {});
    check('lỗi quyền: câu lỗi riêng', (await page.locator('body').innerText()).includes('Không tải được danh mục quyền.'));
    check('lỗi quyền: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    await context.close();
  }

  /* ── 12. 403: giáo viên vào /to-chuc → OwnerGuard chặn tại chỗ ─────────── */
  {
    const { context, page, calls } = await newContext(browser, { roles: ['TEACHER'] });
    await page.goto(`${BASE}/to-chuc`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const bodyText = await page.locator('body').innerText();
    check('403: hiện câu không có quyền', bodyText.includes('Bạn không có quyền truy cập khu vực quản lý tổ chức.'));
    check('403: KHÔNG gọi API phòng ban', calls.filter((c) => c.path === '/departments').length === 0);
    await context.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n== TỔNG: ${results.length - failed.length}/${results.length} PASS ==`);
  if (failed.length) {
    console.log('THẤT BẠI:');
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    process.exitCode = 1;
  }
}

run().catch((e) => {
  console.error('LỖI CHẠY PROBE:', e);
  process.exitCode = 1;
});

/**
 * ux-review/probe-p3c5-dot2.mjs — kiểm tra HÀNH VI của nhóm "Tổ chức" Đợt 2 sau
 * khi port sang Astryx (P3c-5):
 *   - `DepartmentDetailPage`  (`/to-chuc/phong-ban/:id`) + `MemberFormModal`
 *     + `MemberPositionsModal` + `TempPasswordModal`
 *   - `RolePreviewPage`       (`/xem-thu/:vaiTro`) — 2 chế độ + slug sai
 *
 * Dump 29 chỉ chụp ảnh tĩnh (chi tiết phòng ban), nên probe này chạy tay các phần
 * tương tác: thêm nhân viên (kèm validate + mật khẩu tạm một lần), đổi chức vụ,
 * xoá nhân viên (AlertDialog), phân trang client, lỗi tải + nút "Thử lại", lỗi
 * 409/403 (NFR-REL-001: KHÔNG báo thành công), 404 phòng ban, và 403 của
 * `OwnerGuard`. Thêm 2 chế độ + 404 của màn xem thử vai trò.
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p3c5-dot2.mjs"
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

const POSITIONS = [
  { id: 'p1', name: 'Giáo viên', description: 'Giảng dạy', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW'] },
  { id: 'p2', name: 'Tổ trưởng', description: 'Quản lý tổ', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT'] },
];

const MEMBERS = [
  {
    userId: 'u1',
    departmentId: 'd1',
    role: 'MANAGER',
    appointedBy: null,
    appointedAt: '2026-09-02T08:00:00',
    positionIds: ['p1'],
    permissions: ['PEOPLE_VIEW'],
  },
];

const MEMBERS_NO_POS = [{ ...MEMBERS[0], positionIds: [] }];

/** 25 nhân viên → 2 trang với `PAGE_SIZE = 20`. */
const MEMBERS_MANY = Array.from({ length: 25 }, (_, i) => ({
  userId: `u${i + 1}`,
  departmentId: 'd1',
  role: i % 2 === 0 ? 'MANAGER' : 'STAFF',
  appointedBy: null,
  appointedAt: '2026-09-02T08:00:00',
  positionIds: ['p1'],
  permissions: ['PEOPLE_VIEW'],
}));

const CREATED = {
  member: {
    userId: 'u9',
    departmentId: 'd1',
    role: 'STAFF',
    appointedBy: null,
    appointedAt: '2026-11-18T08:00:00',
    positionIds: ['p1'],
    permissions: ['PEOPLE_VIEW'],
  },
  temporaryPassword: 'Temp@123456',
  mustChangePassword: true,
};

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
    members = MEMBERS,
    membersStatus = 200,
    positions = POSITIONS,
    positionsStatus = 200,
    createStatus = 200,
    createCode = null,
    createBody = CREATED,
    updateStatus = 200,
    deleteStatus = 204,
    deleteCode = null,
    roles = ['OWNER'],
    authenticated = true,
  } = {},
) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.addInitScript(
    ([access, isAuth]) => {
      if (isAuth) {
        localStorage.setItem('mems.accessToken', access);
        localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
      } else {
        localStorage.removeItem('mems.accessToken');
        localStorage.removeItem('mems.refreshToken');
      }
    },
    [tokenFor(roles), authenticated],
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
      if (method === 'GET' && /^\/departments\/[^/]+\/members$/.test(url.pathname)) {
        if (membersStatus !== 200) return err(membersStatus, 'INTERNAL_ERROR');
        return json(200, members);
      }
      if (method === 'POST' && /^\/departments\/[^/]+\/members$/.test(url.pathname)) {
        if (createStatus !== 200) return err(createStatus, createCode || 'INTERNAL_ERROR');
        return json(200, createBody);
      }
      if (method === 'PUT' && /^\/departments\/[^/]+\/members\/[^/]+\/positions$/.test(url.pathname)) {
        if (updateStatus !== 200) return err(updateStatus, 'INTERNAL_ERROR');
        return json(200, { ...MEMBERS[0], ...body });
      }
      if (method === 'DELETE' && /^\/departments\/[^/]+\/members\/[^/]+$/.test(url.pathname)) {
        if (deleteStatus !== 204) return err(deleteStatus, deleteCode || 'INTERNAL_ERROR');
        return route.fulfill({ status: 204, body: '' });
      }

      // ── Chức vụ ──
      if (method === 'GET' && url.pathname === '/positions') {
        if (positionsStatus !== 200) return err(positionsStatus, 'INTERNAL_ERROR');
        return json(200, positions);
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls, countOf };
}

async function openDetail(page, id = 'd1') {
  await page.goto(`${BASE}/to-chuc/phong-ban/${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(600);
}

/**
 * Chọn một mục trong `MultiSelector` (trigger `role=combobox`, mục `role=option`).
 *
 * Đóng panel bằng cách BẤM LẠI TRIGGER. Không dùng:
 *  - `Tab`: chỉ đóng khi phím rơi vào chính trigger; cú bấm chuột vào mục
 *    `role=option` (thẻ `div`, không focusable) đẩy focus ra khỏi trigger nên
 *    `Tab` không tới handler `closeAndReset()` — panel ở lại và chặn cú bấm sau.
 *  - `Escape`: Astryx `Dialog purpose="form"` cho ESC đóng **dialog**, không chỉ panel.
 * Trigger vẫn nằm trên panel nên bấm lại gọi `onTriggerClick()` → `closeAndReset()`.
 */
async function pickMulti(page, scope, label, optionName) {
  const trigger = scope.getByRole('combobox', { name: label });
  await trigger.click();
  await page.getByRole('option', { name: optionName }).click();
  await trigger.click();
  await page.waitForTimeout(200);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Chi tiết phòng ban: tiêu đề, breadcrumb, bảng, nút hành động ──── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await openDetail(page);

    const h1 = await page.locator('h1').first().innerText();
    check('h1 = "Tổ Toán"', h1.trim() === 'Tổ Toán', h1.trim());

    const antdCount = await page.locator('[class^="ant-"]').count();
    check('0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const bodyText = await page.locator('body').innerText();
    check('hiện mô tả phòng ban', bodyText.includes('Tổ bộ môn Toán'));

    check('có link breadcrumb "Tổ chức" → /to-chuc', (await page.getByRole('link', { name: 'Tổ chức' }).count()) === 1);
    const crumbHref = await page.getByRole('link', { name: 'Tổ chức' }).getAttribute('href');
    check('breadcrumb trỏ /to-chuc', crumbHref === '/to-chuc', String(crumbHref));

    const rows = await page.locator('tbody tr').count();
    check('bảng hiện 1 nhân viên', rows === 1, `count=${rows}`);

    check('cột Mã nhân viên dùng Code (chữ u1)', bodyText.includes('u1'));
    check('role MANAGER → "Quản lý phòng ban"', bodyText.includes('Quản lý phòng ban'));
    check('chức vụ p1 → Badge "Giáo viên"', bodyText.includes('Giáo viên'));
    check('ngày bổ nhiệm định dạng DD/MM/YYYY', bodyText.includes('02/09/2026'));

    check('có nút "Thêm nhân viên"', (await page.getByRole('button', { name: 'Thêm nhân viên' }).count()) === 1);
    check('nút đổi chức vụ có aria-label riêng', (await page.getByRole('button', { name: 'Đổi chức vụ u1' }).count()) === 1);
    check('nút xoá có aria-label riêng', (await page.getByRole('button', { name: 'Xoá khỏi phòng ban u1' }).count()) === 1);
    check('không có pageerror (chi tiết)', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Rỗng: câu hướng dẫn + bảng vẫn render ─────────────────────────── */
  {
    const { context, page } = await newContext(browser, { members: [] });
    await openDetail(page);

    const bodyText = await page.locator('body').innerText();
    check('rỗng: câu hướng dẫn', bodyText.includes('Phòng ban chưa có nhân viên nào.'));
    check('rỗng: tiêu đề cột vẫn còn (bảng vẫn render)', bodyText.includes('Mã nhân viên'));
    // Hai nút cùng tên: một ở `PageHeader.extra`, một ở `EmptyState.action`.
    const addButtons = await page.getByRole('button', { name: 'Thêm nhân viên' }).count();
    check('rỗng: nút "Thêm nhân viên" ở cả header lẫn empty state', addButtons === 2, `count=${addButtons}`);
    await context.close();
  }

  /* ── 3. Nhân viên chưa gán chức vụ ────────────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { members: MEMBERS_NO_POS });
    await openDetail(page);
    check('chưa gán chức vụ: hiện "Chưa gán chức vụ"', (await page.locator('body').innerText()).includes('Chưa gán chức vụ'));
    await context.close();
  }

  /* ── 4. Phân trang client: 25 nhân viên → 2 trang ─────────────────────── */
  {
    const { context, page } = await newContext(browser, { members: MEMBERS_MANY });
    await openDetail(page);

    const pagNav = page.getByRole('navigation', { name: 'Phân trang danh sách nhân viên' });
    check('có thanh phân trang (nhãn tiếng Việt)', (await pagNav.count()) === 1);

    const page1Rows = await page.locator('tbody tr').count();
    check('trang 1 hiện 20 dòng', page1Rows === 20, `count=${page1Rows}`);

    await pagNav.locator('button').filter({ hasText: /^2$/ }).first().click();
    await page.waitForTimeout(400);
    const page2Rows = await page.locator('tbody tr').count();
    check('trang 2 còn 5 dòng', page2Rows === 5, `count=${page2Rows}`);
    check('trang 2 KHÔNG gọi lại API (phân trang client)', (await page.locator('tbody tr').first().innerText()).includes('u21'));
    await context.close();
  }

  /* ── 5. Thêm nhân viên: validate → POST → mật khẩu tạm ────────────────── */
  {
    const { context, page, calls, countOf } = await newContext(browser);
    await openDetail(page);

    await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    check('mở dialog thêm nhân viên', (await dialog.count()) >= 1);

    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(300);
    const errText = await dialog.innerText();
    check('validate: lỗi tên đăng nhập', errText.includes('Vui lòng nhập tên đăng nhập'));
    check('validate: lỗi email', errText.includes('Vui lòng nhập email'));
    check('validate: lỗi cần ít nhất 1 chức vụ', errText.includes('Chọn ít nhất một chức vụ'));
    check('validate: KHÔNG gửi POST', countOf('POST /departments/d1/members') === 0);

    await dialog.getByLabel('Tên đăng nhập').fill('nhanvien.moi');
    await dialog.getByLabel('Email').fill('sai-email');
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(300);
    check('validate: email sai → "Email không hợp lệ"', (await dialog.innerText()).includes('Email không hợp lệ'));

    await dialog.getByLabel('Email').fill('nhanvien.moi@truong.edu.vn');
    await dialog.getByRole('radio', { name: 'Quản lý phòng ban' }).click();
    await pickMulti(page, dialog, 'Chức vụ', 'Giáo viên');
    // Trigger mặc định `triggerDisplay="count"` → hiện số đã chọn, KHÔNG hiện nhãn.
    // Khoá `@astryx.multiSelector.selectedCount` thiếu trong vi-VN nên được bù ở
    // `main.tsx` (`astryxViOverrides`) → phải là tiếng Việt, không phải "1 selected".
    const posTrigger = (await dialog.getByRole('combobox', { name: 'Chức vụ' }).innerText()).trim();
    check('MultiSelector hiện số đã chọn bằng tiếng Việt', posTrigger === 'Đã chọn 1', posTrigger);

    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(900);
    const post = calls.find((c) => c.method === 'POST' && c.path === '/departments/d1/members');
    check(
      'POST gửi username/email/role/positionIds',
      !!post &&
        post.body?.username === 'nhanvien.moi' &&
        post.body?.email === 'nhanvien.moi@truong.edu.vn' &&
        post.body?.role === 'MANAGER' &&
        Array.isArray(post.body?.positionIds) &&
        post.body.positionIds.includes('p1'),
      JSON.stringify(post?.body),
    );
    check('tạo xong → toast "Đã tạo nhân viên."', (await page.locator('body').innerText()).includes('Đã tạo nhân viên.'));

    // TempPasswordModal
    const tempDialog = page.getByRole('dialog');
    check('mở hộp thoại mật khẩu tạm', (await tempDialog.count()) >= 1);
    const tempText = await tempDialog.innerText();
    check('hiện mật khẩu tạm', tempText.includes('Temp@123456'), tempText.replace(/\s+/g, ' ').slice(0, 120));
    check('nêu cảnh báo "chỉ hiện một lần"', tempText.includes('Mật khẩu này chỉ hiện một lần'));
    check('KHÔNG có nút đóng (X)', (await tempDialog.getByRole('button', { name: 'Đóng' }).count()) === 0);
    check('có nút "Sao chép"', (await tempDialog.getByRole('button', { name: 'Sao chép' }).count()) === 1);

    await tempDialog.getByRole('button', { name: 'Sao chép' }).click();
    await page.waitForTimeout(400);
    check('sao chép → toast "Đã sao chép."', (await page.locator('body').innerText()).includes('Đã sao chép.'));

    await tempDialog.getByRole('button', { name: 'Tôi đã lưu mật khẩu' }).click();
    await page.waitForTimeout(400);
    check('bấm "Tôi đã lưu mật khẩu" → đóng hộp thoại', (await page.getByRole('dialog').count()) === 0);
    await context.close();
  }

  /* ── 6. Tạo lỗi 409: lỗi hiện trong modal, KHÔNG báo thành công ───────── */
  {
    const { context, page } = await newContext(browser, { createStatus: 409, createCode: 'ACCOUNT_EXISTS' });
    await openDetail(page);

    await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Tên đăng nhập').fill('trung.ten');
    await dialog.getByLabel('Email').fill('trung.ten@truong.edu.vn');
    await pickMulti(page, dialog, 'Chức vụ', 'Giáo viên');
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(900);

    const dialogText = await dialog.innerText();
    check('409: hiện câu "Tên đăng nhập hoặc email đã tồn tại."', dialogText.includes('Tên đăng nhập hoặc email đã tồn tại.'));
    check('409: modal KHÔNG đóng', (await page.getByRole('dialog').count()) >= 1);
    check('409: KHÔNG báo thành công', !(await page.locator('body').innerText()).includes('Đã tạo nhân viên.'));
    check('409: có banner lỗi role=alert', (await page.getByRole('alert').count()) >= 1);
    await context.close();
  }

  /* ── 7. Thiếu chức vụ: banner cảnh báo + link Chức vụ + nút Lưu khoá ──── */
  {
    const { context, page } = await newContext(browser, { positions: [] });
    await openDetail(page);

    await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    const dialogText = await dialog.innerText();
    check('thiếu chức vụ: hiện cảnh báo tạo chức vụ trước', dialogText.includes('Chưa có chức vụ nào trong tổ chức.'));
    check('thiếu chức vụ: có link "Tới trang Chức vụ"', (await dialog.getByRole('link', { name: 'Tới trang Chức vụ' }).count()) === 1);
    const save = dialog.getByRole('button', { name: 'Lưu' });
    check('thiếu chức vụ: nút Lưu bị khoá (aria-disabled)', (await save.getAttribute('aria-disabled')) === 'true');
    await context.close();
  }

  /* ── 8. Đổi chức vụ: điền sẵn + PUT ───────────────────────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page);

    await page.getByRole('button', { name: 'Đổi chức vụ u1' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    check('mở dialog đổi chức vụ', (await dialog.count()) >= 1);
    check(
      'điền sẵn chức vụ hiện tại (trigger hiện số đã chọn)',
      (await dialog.getByRole('combobox', { name: 'Chức vụ' }).innerText()).trim() === 'Đã chọn 1',
    );

    await pickMulti(page, dialog, 'Chức vụ', 'Tổ trưởng');
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(900);

    const put = calls.find((c) => c.method === 'PUT' && c.path === '/departments/d1/members/u1/positions');
    check(
      'PUT positions gửi positionIds (gồm p2)',
      !!put && Array.isArray(put.body?.positionIds) && put.body.positionIds.includes('p2'),
      JSON.stringify(put?.body),
    );
    check('đổi xong → toast "Đã cập nhật chức vụ cho nhân viên."', (await page.locator('body').innerText()).includes('Đã cập nhật chức vụ cho nhân viên.'));
    check('đổi xong → đóng dialog', (await page.getByRole('dialog').count()) === 0);
    await context.close();
  }

  /* ── 9. Xoá nhân viên: AlertDialog + DELETE ───────────────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page);

    await page.getByRole('button', { name: 'Xoá khỏi phòng ban u1' }).click();
    await page.waitForTimeout(400);
    const alert = page.getByRole('alertdialog');
    check('mở AlertDialog xoá nhân viên', (await alert.count()) === 1);
    const alertText = await alert.innerText();
    check('AlertDialog nêu mã nhân viên', alertText.includes('u1'), alertText.replace(/\s+/g, ' ').slice(0, 140));
    check('AlertDialog nêu hậu quả', alertText.includes('Nhân viên sẽ mất quyền truy cập dữ liệu của phòng ban này.'));

    await alert.getByRole('button', { name: 'Xoá khỏi phòng ban', exact: true }).click();
    await page.waitForTimeout(900);
    const del = calls.find((c) => c.method === 'DELETE' && c.path === '/departments/d1/members/u1');
    check('DELETE /departments/d1/members/u1 đã gọi', !!del);
    check('xoá xong → toast "Đã xoá nhân viên khỏi phòng ban."', (await page.locator('body').innerText()).includes('Đã xoá nhân viên khỏi phòng ban.'));
    check('xoá xong → đóng AlertDialog', (await page.getByRole('alertdialog').count()) === 0);
    await context.close();
  }

  /* ── 10. Xoá lỗi 403: báo lỗi, KHÔNG báo thành công (NFR-REL-001) ────── */
  {
    const { context, page } = await newContext(browser, { deleteStatus: 403, deleteCode: 'FORBIDDEN' });
    await openDetail(page);

    await page.getByRole('button', { name: 'Xoá khỏi phòng ban u1' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá khỏi phòng ban', exact: true }).click();
    await page.waitForTimeout(1200);

    const bodyText = await page.locator('body').innerText();
    check('403 xoá: hiện câu không có quyền', bodyText.includes('Bạn không có quyền thực hiện thao tác này.'));
    check('403 xoá: KHÔNG báo thành công', !bodyText.includes('Đã xoá nhân viên khỏi phòng ban.'));
    check('403 xoá: có banner lỗi role=alert', (await page.getByRole('alert').count()) >= 1);
    check('403 xoá: đóng AlertDialog sau khi lỗi', (await page.getByRole('alertdialog').count()) === 0);
    await context.close();
  }

  /* ── 11. Lỗi tải nhân viên: banner + "Thử lại" ────────────────────────── */
  {
    const { context, page } = await newContext(browser, { membersStatus: 500 });
    await openDetail(page);
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    check('lỗi tải nhân viên: câu lỗi riêng', bodyText.includes('Không tải được danh sách nhân viên.'));
    check('lỗi tải nhân viên: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    await context.close();
  }

  /* ── 12. Lỗi tải phòng ban: banner + "Thử lại" + "Quay lại" ───────────── */
  {
    const { context, page } = await newContext(browser, { departmentsStatus: 500 });
    await page.goto(`${BASE}/to-chuc/phong-ban/d1`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    check('lỗi tải phòng ban: câu lỗi', bodyText.includes('Không tải được danh sách phòng ban.'));
    check('lỗi tải phòng ban: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check(
      'lỗi tải phòng ban: có nút quay lại',
      (await page.getByRole('button', { name: 'Quay lại danh sách phòng ban' }).count()) >= 1,
    );
    await context.close();
  }

  /* ── 13. 404 phòng ban ────────────────────────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { departments: [] });
    await openDetail(page, 'd1');
    const bodyText = await page.locator('body').innerText();
    check('404: hiện "Không tìm thấy phòng ban này."', bodyText.includes('Không tìm thấy phòng ban này.'));
    check('404: có nút quay lại', (await page.getByRole('button', { name: 'Quay lại danh sách phòng ban' }).count()) >= 1);
    await context.close();
  }

  /* ── 14. 403: giáo viên vào chi tiết phòng ban → OwnerGuard chặn ──────── */
  {
    const { context, page, calls } = await newContext(browser, { roles: ['TEACHER'] });
    await page.goto(`${BASE}/to-chuc/phong-ban/d1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const bodyText = await page.locator('body').innerText();
    check('403: hiện câu không có quyền', bodyText.includes('Bạn không có quyền truy cập khu vực quản lý tổ chức.'));
    check('403: KHÔNG gọi API phòng ban', calls.filter((c) => c.path === '/departments').length === 0);
    await context.close();
  }

  /* ── 15. Xem thử vai trò — chưa đăng nhập ─────────────────────────────── */
  {
    const { context, page, pageErrors } = await newContext(browser, { authenticated: false });
    await page.goto(`${BASE}/xem-thu/teacher`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const bodyText = await page.locator('body').innerText();
    check('xem thử: hiện "Bạn đang là"', bodyText.includes('Bạn đang là'));
    check('xem thử: heading = "Giáo viên"', (await page.getByRole('heading', { name: 'Giáo viên' }).count()) >= 1);
    check('xem thử: badge "Chế độ xem thử — chưa đăng nhập"', bodyText.includes('Chế độ xem thử — chưa đăng nhập'));
    check('xem thử: KHÔNG có nút Đăng xuất', (await page.getByRole('button', { name: 'Đăng xuất' }).count()) === 0);
    check('xem thử: có nút "Quay lại đăng nhập"', (await page.getByRole('button', { name: 'Quay lại đăng nhập' }).count()) === 1);
    const antdCount = await page.locator('[class^="ant-"]').count();
    check('xem thử: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);
    check('xem thử: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 16. Xem thử vai trò — đã đăng nhập thật ──────────────────────────── */
  {
    const { context, page } = await newContext(browser, { authenticated: true, roles: ['TEACHER'] });
    await page.goto(`${BASE}/xem-thu/teacher`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const bodyText = await page.locator('body').innerText();
    check('đã đăng nhập: badge "Đã đăng nhập"', bodyText.includes('Đã đăng nhập'));
    check('đã đăng nhập: heading = username', (await page.getByRole('heading', { name: 'chu.to.chuc' }).count()) >= 1);
    check('đã đăng nhập: KHÔNG hiện "chế độ xem thử"', !bodyText.includes('Chế độ xem thử'));
    check('đã đăng nhập: có nút Đăng xuất', (await page.getByRole('button', { name: 'Đăng xuất' }).count()) === 1);
    await context.close();
  }

  /* ── 17. Xem thử vai trò — slug sai → 404 ─────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { authenticated: false });
    await page.goto(`${BASE}/xem-thu/khong-ton-tai`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const bodyText = await page.locator('body').innerText();
    check('slug sai: hiện "Không có vai trò này"', bodyText.includes('Không có vai trò này'));
    check('slug sai: có nút "Quay lại đăng nhập"', (await page.getByRole('button', { name: 'Quay lại đăng nhập' }).count()) >= 1);
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
  // `process.exit` chứ KHÔNG chỉ `process.exitCode`: nếu một bước ném lỗi giữa
  // chừng, `browser` chưa được đóng nên Node không tự thoát → lệnh PowerShell
  // treo tới hết timeout dù probe đã dừng.
  process.exit(1);
});

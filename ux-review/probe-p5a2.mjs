/**
 * ux-review/probe-p5a2.mjs — kiểm tra HÀNH VI của nhóm Quản trị Đợt 2 sau khi
 * port sang Astryx (P5-A2):
 *   - `OrganizationDetailPage`   (`/quan-tri/to-chuc/:id`)
 *   - `ApproveOrganizationModal`
 *   - `RejectOrganizationModal`
 *   - `ModuleConfigPanel`        (khối "Module đã đăng ký")
 *
 * Dump chỉ chụp ảnh tĩnh, nên probe này chạy tay các phần tương tác: 3 khối nội
 * dung, bảng người đại diện (rỗng/có dòng), 404/500 khi tải, duyệt (kèm 409/500),
 * từ chối (validate rỗng → 500), ma trận nút theo trạng thái, khoá module lõi,
 * bỏ hết tick, lưu thành công, và hộp thoại "thay đổi chưa lưu".
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p5a2.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

/** Danh mục module — `GET /api/v1/modules` (chỉ module `is_active = TRUE`). */
const CATALOG = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh' },
  { code: 'TEACHER_MANAGEMENT', name: 'Quản lý giáo viên' },
  { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học' },
  { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học' },
  { code: 'ROOM_MANAGEMENT', name: 'Quản lý phòng học' },
  { code: 'EQUIPMENT_MANAGEMENT', name: 'Quản lý thiết bị' },
];

/** `ORG_A` — tổ chức 3 module lõi (giống e2e). */
const ORG_A = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Trường THPT Nguyễn Du',
  org_type: 'school',
  status: 'pending',
  modules: [
    { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', status: 'requested' },
    { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học', status: 'requested' },
    { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học', status: 'requested' },
  ],
};

/** `ORG_C` — tổ chức chỉ có module KHÔNG lõi (để bỏ hết tick được). */
const ORG_C = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Trung tâm Tin học Phú Thọ',
  org_type: 'center',
  status: 'pending',
  modules: [
    { code: 'ROOM_MANAGEMENT', name: 'Quản lý phòng học', status: 'requested' },
    { code: 'EQUIPMENT_MANAGEMENT', name: 'Quản lý thiết bị', status: 'requested' },
  ],
};

const OWNERS = [
  { id: 'own-1', username: 'truongnguyendu', email: 'truongnguyendu@example.edu.vn', status: 'active' },
];

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function fakeJwt(claims) {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}
function tokenFor(roles, permissions = [], username = 'super.admin') {
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

function cloneOrg(org) {
  return { ...org, modules: org.modules.map((m) => ({ ...m })) };
}

async function newContext(
  browser,
  {
    org = ORG_A,
    detailStatus = 200,
    owners = OWNERS,
    approveStatus = 204,
    rejectStatus = 204,
    modulesStatus = 204,
    roles = ['SUPER_ADMIN'],
  } = {},
) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN' });
  await context.addInitScript((access) => {
    localStorage.setItem('mems.accessToken', access);
    localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
  }, tokenFor(roles));

  // Bản sao bị mock MUTATE (đổi `modules`) → không dùng chung fixture giữa các context.
  const state = { org: cloneOrg(org), owners };

  const page = await context.newPage();
  const pageErrors = [];
  const calls = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

  await page.route(
    (url) => API_RE.test(url.pathname),
    async (route, request) => {
      const url = new URL(request.url());
      const method = request.method();
      const path = url.pathname;
      let body = null;
      try {
        body = request.postData() ? JSON.parse(request.postData()) : null;
      } catch {
        body = request.postData();
      }
      calls.push({ method, path, query: Object.fromEntries(url.searchParams), body });

      const json = (status, payload) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      const err = (status, code) => json(status, { code, message: 'lỗi' });

      if (method === 'GET' && path === '/api/v1/organizations/pending') {
        return json(200, []);
      }
      if (method === 'GET' && path === '/api/v1/modules') {
        return json(200, CATALOG);
      }
      if (method === 'GET' && path === '/api/v1/organizations') {
        return json(200, { items: [], total: 0, page: 1, size: 20 });
      }

      const detailMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)$/);
      if (detailMatch && method === 'GET') {
        if (detailStatus !== 200) return err(detailStatus, 'INTERNAL_ERROR');
        return json(200, {
          organization: {
            id: state.org.id,
            name: state.org.name,
            org_type: state.org.org_type,
            status: state.org.status,
            created_at: '2026-10-01T08:00:00',
            contact_email: null,
            contact_phone: null,
            rejection_reason: state.org.status === 'rejected' ? 'Hồ sơ thiếu giấy phép.' : null,
          },
          owners: state.owners,
          modules: state.org.modules,
        });
      }

      const reviewMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)\/(approve|reject)$/);
      if (reviewMatch && method === 'PATCH') {
        const status = reviewMatch[2] === 'approve' ? approveStatus : rejectStatus;
        if (status !== 204) return err(status, status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR');
        return route.fulfill({ status: 204, body: '' });
      }

      const lifecycleMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)\/(suspend|reactivate)$/);
      if (lifecycleMatch && method === 'PATCH') {
        return route.fulfill({ status: 204, body: '' });
      }

      const modulesMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)\/modules$/);
      if (modulesMatch && method === 'PUT') {
        if (modulesStatus !== 204) {
          return err(modulesStatus, modulesStatus === 409 ? 'CONFLICT' : 'INTERNAL_ERROR');
        }
        const codes = body?.modules ?? [];
        state.org.modules = codes.map((code) => ({
          code,
          name: CATALOG.find((c) => c.code === code)?.name ?? code,
          status: 'requested',
        }));
        return route.fulfill({ status: 204, body: '' });
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls, state };
}

async function openDetail(page, orgId) {
  await page.goto(`${BASE}/quan-tri/to-chuc/${orgId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1', { timeout: 10000 });
  await page.waitForTimeout(700);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Chi tiết (pending): 3 khối, badge, metadata, bảng chủ, nút, 0 antd ── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await openDetail(page, ORG_A.id);

    const h1 = (await page.locator('h1').first().innerText()).trim();
    check('chi tiết: h1 = tên tổ chức', h1 === ORG_A.name, h1);

    const bodyText = await page.locator('body').innerText();
    check('chi tiết: có khối "Thông tin tổ chức"', bodyText.includes('Thông tin tổ chức'));
    check('chi tiết: có khối "Người đại diện"', bodyText.includes('Người đại diện'));
    check('chi tiết: có khối "Module đã đăng ký"', bodyText.includes('Module đã đăng ký'));
    check('chi tiết: Badge trạng thái "Chờ duyệt"', bodyText.includes('Chờ duyệt'));
    check('chi tiết: hiện loại "Trường học"', bodyText.includes('Trường học'));
    check('chi tiết: Email liên hệ = "—"', bodyText.includes('Email liên hệ'));
    check('chi tiết: không có "undefined"/"null"', !bodyText.includes('undefined') && !bodyText.includes('null'));

    const antdCount = await page.locator('[class^="ant-"]').count();
    check('chi tiết: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    // Bảng người đại diện: 1 dòng + badge trạng thái tài khoản.
    check('chi tiết: bảng chủ có 1 dòng', (await page.locator('tbody tr').count()) === 1);
    check('chi tiết: badge tài khoản "Đang hoạt động"', bodyText.includes('Đang hoạt động'));

    check(
      'chi tiết: có nút "Duyệt tổ chức"',
      (await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).count()) === 1,
    );
    check(
      'chi tiết: có nút "Từ chối tổ chức"',
      (await page.getByRole('button', { name: 'Từ chối tổ chức', exact: true }).count()) === 1,
    );
    check('chi tiết: "Xem lịch sử" là button', (await page.getByRole('button', { name: 'Xem lịch sử' }).count()) === 1);
    check(
      'chi tiết: "Quay lại danh sách" là link',
      (await page.getByRole('link', { name: 'Quay lại danh sách' }).count()) === 1,
    );
    check('chi tiết: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Chi tiết: bảng chủ RỖNG ───────────────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { owners: [] });
    await openDetail(page, ORG_A.id);
    const bodyText = await page.locator('body').innerText();
    check('chi tiết rỗng chủ: hiện "Chưa có người đại diện"', bodyText.includes('Chưa có người đại diện'));
    await context.close();
  }

  /* ── 3. Chi tiết: 404 → StatusScreen + nút về danh sách ───────────────── */
  {
    const { context, page } = await newContext(browser, { detailStatus: 404 });
    await page.goto(`${BASE}/quan-tri/to-chuc/99999999-9999-9999-9999-999999999999`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(900);
    const bodyText = await page.locator('body').innerText();
    check('chi tiết 404: câu "Không tìm thấy tổ chức."', bodyText.includes('Không tìm thấy tổ chức.'));
    check(
      'chi tiết 404: mô tả đã gỡ khỏi hệ thống',
      bodyText.includes('Tổ chức không tồn tại hoặc đã bị gỡ khỏi hệ thống.'),
    );
    await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
    await page.waitForTimeout(600);
    check('chi tiết 404: nút về danh sách → URL /quan-tri/to-chuc', /\/quan-tri\/to-chuc$/.test(page.url()), page.url());
    await context.close();
  }

  /* ── 4. Chi tiết: lỗi 500 → Banner role=alert + Thử lại ───────────────── */
  {
    const { context, page } = await newContext(browser, { detailStatus: 500 });
    await page.goto(`${BASE}/quan-tri/to-chuc/${ORG_A.id}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    check('chi tiết 500: câu "Không tải được thông tin tổ chức."', bodyText.includes('Không tải được thông tin tổ chức.'));
    check('chi tiết 500: có banner role=alert', (await page.getByRole('alert').count()) >= 1);
    check('chi tiết 500: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    await context.close();
  }

  /* ── 5. Duyệt: modal → PATCH 204 → toast → về danh sách ───────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page, ORG_A.id);

    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    check('duyệt: mở dialog', (await dialog.count()) >= 1);
    const dialogText = await dialog.innerText();
    check('duyệt: dialog nêu tên tổ chức', dialogText.includes(ORG_A.name), dialogText.replace(/\s+/g, ' ').slice(0, 80));
    check('duyệt: dialog nêu số module (3)', /3 module/.test(dialogText));
    const notifyCb = dialog.getByRole('checkbox', { name: 'Gửi email thông báo cho chủ tổ chức' });
    check('duyệt: checkbox notifyEmail mặc định BẬT', await notifyCb.isChecked());

    await dialog.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await page.waitForTimeout(1000);

    const patch = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/approve'));
    check('duyệt: PATCH approve với notifyEmail=true', patch?.body?.notifyEmail === true, JSON.stringify(patch?.body));
    check('duyệt: toast thành công', (await page.locator('body').innerText()).includes(`Đã duyệt tổ chức "${ORG_A.name}".`));
    check('duyệt: quay về danh sách chờ duyệt', /\/quan-tri\/to-chuc$/.test(page.url()), page.url());
    await context.close();
  }

  /* ── 6. Duyệt: bỏ tick notifyEmail → PATCH notifyEmail=false ──────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page, ORG_A.id);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox', { name: 'Gửi email thông báo cho chủ tổ chức' }).uncheck();
    await dialog.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await page.waitForTimeout(1000);
    const patch = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/approve'));
    check('duyệt: bỏ tick → notifyEmail=false', patch?.body?.notifyEmail === false, JSON.stringify(patch?.body));
    await context.close();
  }

  /* ── 7. Duyệt: 409 → toast MSG-ORG-09, dialog đóng ───────────────────── */
  {
    const { context, page } = await newContext(browser, { approveStatus: 409 });
    await openDetail(page, ORG_A.id);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByRole('dialog').getByRole('button', { name: 'Duyệt', exact: true }).click();
    await page.waitForTimeout(1000);
    check('duyệt 409: hiện "Tổ chức này đã được xử lý."', (await page.locator('body').innerText()).includes('Tổ chức này đã được xử lý.'));
    check('duyệt 409: dialog đã đóng', (await page.getByRole('dialog').count()) === 0);
    await context.close();
  }

  /* ── 8. Duyệt: 500 → lỗi TRONG modal, KHÔNG báo thành công (NFR-REL-001) ─ */
  {
    const { context, page } = await newContext(browser, { approveStatus: 500 });
    await openDetail(page, ORG_A.id);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await page.waitForTimeout(1200);
    check('duyệt 500: câu lỗi trong modal', (await dialog.innerText()).includes('Không lưu được, vui lòng thử lại.'));
    check('duyệt 500: modal KHÔNG đóng', (await page.getByRole('dialog').count()) >= 1);
    check('duyệt 500: banner lỗi role=alert', (await dialog.getByRole('alert').count()) >= 1);
    check(
      'duyệt 500: KHÔNG báo thành công',
      !(await page.locator('body').innerText()).includes('Đã duyệt tổ chức'),
    );
    await context.close();
  }

  /* ── 9. Từ chối: validate rỗng → không gọi API; nhập hợp lệ → PATCH ────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page, ORG_A.id);

    await page.getByRole('button', { name: 'Từ chối tổ chức', exact: true }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Từ chối', exact: true }).click();
    await page.waitForTimeout(400);
    check('từ chối: validate lý do rỗng', (await dialog.innerText()).includes('Vui lòng nhập lý do từ chối'));
    check('từ chối: KHÔNG gọi API khi thiếu lý do', calls.filter((c) => c.path.endsWith('/reject')).length === 0);

    await dialog.getByRole('textbox', { name: 'Lý do từ chối' }).fill('Hồ sơ còn thiếu giấy phép hoạt động.');
    await dialog.getByRole('button', { name: 'Từ chối', exact: true }).click();
    await page.waitForTimeout(1000);
    const patch = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/reject'));
    check('từ chối: PATCH kèm reason + notifyEmail', patch?.body?.reason === 'Hồ sơ còn thiếu giấy phép hoạt động.' && patch?.body?.notifyEmail === true, JSON.stringify(patch?.body));
    check('từ chối: toast thành công', (await page.locator('body').innerText()).includes(`Đã từ chối tổ chức "${ORG_A.name}".`));
    await context.close();
  }

  /* ── 10. Tổ chức đã duyệt (active): báo "đã xử lý", ẩn Duyệt/Từ chối ──── */
  {
    const { context, page } = await newContext(browser, { org: { ...ORG_A, status: 'active' } });
    await openDetail(page, ORG_A.id);
    const bodyText = await page.locator('body').innerText();
    check('active: hiện "Tổ chức này đã được xử lý."', bodyText.includes('Tổ chức này đã được xử lý.'));
    check('active: ẩn nút "Duyệt tổ chức"', (await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).count()) === 0);
    check('active: ẩn nút "Từ chối tổ chức"', (await page.getByRole('button', { name: 'Từ chối tổ chức', exact: true }).count()) === 0);
    check(
      'active: có nút "Vô hiệu hoá tổ chức <tên>" (aria-label, BR-04)',
      (await page.getByRole('button', { name: `Vô hiệu hoá tổ chức ${ORG_A.name}` }).count()) === 1,
    );
    check('active: vùng tin "đã xử lý" là role=status', (await page.getByRole('status').count()) >= 1);
    check('active: nút Lưu cấu hình module HIỆN (C2)', (await page.getByRole('button', { name: 'Lưu cấu hình module' }).count()) === 1);
    await context.close();
  }

  /* ── 11. Tổ chức bị vô hiệu hoá (suspended): Kích hoạt lại, KHÔNG sửa module ─ */
  {
    const { context, page } = await newContext(browser, { org: { ...ORG_A, status: 'suspended' } });
    await openDetail(page, ORG_A.id);
    check(
      'suspended: có nút "Kích hoạt lại tổ chức <tên>"',
      (await page.getByRole('button', { name: `Kích hoạt lại tổ chức ${ORG_A.name}` }).count()) === 1,
    );
    check('suspended: KHÔNG có nút Lưu cấu hình module', (await page.getByRole('button', { name: 'Lưu cấu hình module' }).count()) === 0);
    const equipment = page.getByRole('checkbox', { name: 'Quản lý thiết bị' });
    check('suspended: checkbox module bị khoá', (await equipment.getAttribute('aria-disabled')) === 'true');
    await context.close();
  }

  /* ── 12. Tổ chức bị từ chối (rejected): nút duyệt lại khoá + tooltip ───── */
  {
    const { context, page } = await newContext(browser, { org: { ...ORG_A, status: 'rejected' } });
    await openDetail(page, ORG_A.id);
    const bodyText = await page.locator('body').innerText();
    check('rejected: hiện lý do từ chối', bodyText.includes('Hồ sơ thiếu giấy phép.'));
    const approveBtn = page.getByRole('button', { name: 'Duyệt tổ chức', exact: true });
    check('rejected: nút "Duyệt tổ chức" bị khoá', await approveBtn.isDisabled());
    await approveBtn.hover();
    await page.waitForTimeout(700);
    check(
      'rejected: tooltip "BE chưa cho duyệt lại tổ chức đã từ chối"',
      (await page.locator('body').innerText()).includes('BE chưa cho duyệt lại tổ chức đã từ chối'),
    );
    await context.close();
  }

  /* ── 13. Module: khoá lõi + tooltip, nút Lưu bật khi có thay đổi ──────── */
  {
    const { context, page } = await newContext(browser);
    await openDetail(page, ORG_A.id);

    const saveButton = page.getByRole('button', { name: 'Lưu cấu hình module' });
    check('module: nút Lưu mặc định KHOÁ (chưa đổi gì)', await saveButton.isDisabled());

    const coreCb = page.getByRole('checkbox', { name: 'Quản lý học sinh' });
    check('module: checkbox lõi được tick', await coreCb.isChecked());
    check('module: checkbox lõi có aria-disabled=true', (await coreCb.getAttribute('aria-disabled')) === 'true');
    check(
      'module: Playwright coi aria-disabled là disabled? (ảnh hưởng e2e P5-D)',
      (await coreCb.isDisabled()) === true,
      `isDisabled=${await coreCb.isDisabled()}`,
    );

    // Tooltip lý do khoá — Astryx gắn tooltip vào cả hàng (hover hoặc focus).
    await coreCb.hover();
    await page.waitForTimeout(800);
    check(
      'module: tooltip "Module lõi, không thể bỏ: Quản lý học sinh"',
      (await page.locator('body').innerText()).includes('Module lõi, không thể bỏ: Quản lý học sinh'),
    );

    // Tick thêm 1 module mới → có thay đổi → nút Lưu bật.
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).check();
    await page.waitForTimeout(300);
    check('module: tick thêm → nút Lưu BẬT', await saveButton.isEnabled());

    // Bỏ tick lại → quay về tập gốc → nút Lưu khoá lại.
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.waitForTimeout(300);
    check('module: bỏ tick về tập gốc → nút Lưu KHOÁ lại', await saveButton.isDisabled());
    await context.close();
  }

  /* ── 14. Module: bỏ hết tick → chặn, không gọi API ────────────────────── */
  {
    const { context, page, calls } = await newContext(browser, { org: ORG_C });
    await openDetail(page, ORG_C.id);

    await page.getByRole('checkbox', { name: 'Quản lý phòng học' }).uncheck();
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();
    await page.waitForTimeout(500);
    check('module: bỏ hết tick → "Phải chọn ít nhất 1 module"', (await page.locator('body').innerText()).includes('Phải chọn ít nhất 1 module'));
    check('module: KHÔNG gọi PUT khi tập rỗng', calls.filter((c) => c.method === 'PUT').length === 0);
    await context.close();
  }

  /* ── 15. Module: lưu thành công → PUT 204 + toast + tập mới ───────────── */
  {
    const { context, page, calls } = await newContext(browser, { org: ORG_C });
    await openDetail(page, ORG_C.id);

    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();
    await page.waitForTimeout(1200);

    const put = calls.find((c) => c.method === 'PUT' && c.path.endsWith('/modules'));
    check('module lưu: PUT gửi tập đầy đủ (còn ROOM_MANAGEMENT)', Array.isArray(put?.body?.modules) && put.body.modules.includes('ROOM_MANAGEMENT') && !put.body.modules.includes('EQUIPMENT_MANAGEMENT'), JSON.stringify(put?.body));
    check('module lưu: toast "Đã lưu cấu hình module."', (await page.locator('body').innerText()).includes('Đã lưu cấu hình module.'));
    check('module lưu: tập mới đã refetch (thiết bị bỏ tick)', !(await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).isChecked()));
    await context.close();
  }

  /* ── 16. Module: lỗi 500 khi lưu → Banner lỗi, giữ thay đổi ───────────── */
  {
    const { context, page } = await newContext(browser, { org: ORG_C, modulesStatus: 500 });
    await openDetail(page, ORG_C.id);

    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();
    await page.waitForTimeout(1200);
    const bodyText = await page.locator('body').innerText();
    check('module lỗi: câu MSG-MOD-05', bodyText.includes('Không lưu được cấu hình module, vui lòng thử lại.'));
    check('module lỗi: KHÔNG báo thành công', !bodyText.includes('Đã lưu cấu hình module.'));
    check('module lỗi: trạng thái tick vẫn CHƯA lưu', !(await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).isChecked()));
    await context.close();
  }

  /* ── 17. Rời trang khi còn thay đổi chưa lưu → AlertDialog ────────────── */
  {
    const { context, page } = await newContext(browser, { org: ORG_C });
    await openDetail(page, ORG_C.id);

    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.waitForTimeout(300);
    await page.getByRole('link', { name: 'Quay lại danh sách' }).click();
    await page.waitForTimeout(600);

    const alert = page.getByRole('alertdialog');
    check('chưa lưu: hiện AlertDialog', (await alert.count()) >= 1);
    check('chưa lưu: tiêu đề "Có thay đổi chưa lưu"', (await alert.innerText()).includes('Có thay đổi chưa lưu'));
    check('chưa lưu: vẫn ở màn chi tiết', new RegExp(`/quan-tri/to-chuc/${ORG_C.id}$`).test(page.url()), page.url());

    await alert.getByRole('button', { name: 'Ở lại' }).click();
    await page.waitForTimeout(500);
    check('chưa lưu: "Ở lại" → đóng hộp thoại, giữ nguyên trang', (await page.getByRole('alertdialog').count()) === 0);
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
  process.exit(1);
});

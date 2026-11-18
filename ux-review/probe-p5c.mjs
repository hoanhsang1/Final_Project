/**
 * ux-review/probe-p5c.mjs — kiểm tra HÀNH VI của nhóm Quản trị Đợt C sau khi port
 * sang Astryx (P5-C):
 *   - `AuditLogTable`            (bảng nhật ký dùng chung, `/quan-tri/nhat-ky`)
 *   - `AuditLogPage`             (`/quan-tri/nhat-ky`)
 *   - `OrganizationAuditPage`    (`/quan-tri/to-chuc/:id/lich-su`)
 *   - `ModuleCatalogPage`        (`/quan-tri/module`)
 *
 * Dump chỉ chụp ảnh tĩnh, nên probe này chạy tay các phần tương tác: đủ 5 cột +
 * Badge hành động kèm CHỮ (BR-08), link "Đối tượng" trỏ đúng đích, dòng "Tổng N
 * sự kiện", phân trang SERVER (total 25 → 2 trang), lọc theo từ khoá/hành động/
 * khoảng ngày, 404 (`D-22`) → "chờ backend" + Thử lại, lỗi 500 → Banner + Thử lại,
 * rỗng → Empty; và màn Danh mục module: 4 ca `TC-MDL`, sắp xếp cột, tìm kiếm
 * live, lỗi 500. Assert `0` phần tử antd trên cả 3 màn (P5-C gỡ antd khỏi nhóm này).
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p5c.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const ORG_NAME = 'Trường THPT Nguyễn Du';
const ACCOUNT_ID = 'acc-2';

/** Danh mục module — 4 lõi + 2 mở rộng (`CORE_MODULES`). */
const MODULE_CATALOG = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh' },
  { code: 'TEACHER_MANAGEMENT', name: 'Quản lý giáo viên' },
  { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học' },
  { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học' },
  { code: 'ROOM_MANAGEMENT', name: 'Quản lý phòng học' },
  { code: 'EQUIPMENT_MANAGEMENT', name: 'Quản lý thiết bị' },
];

/** 7 dòng nhật ký phủ đủ `AuditAction` (giống fixture e2e). */
const AUDIT_LOGS = [
  {
    id: 'log-1',
    created_at: '2026-10-21 08:10:00',
    action: 'ORG_APPROVED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '44444444-4444-4444-4444-444444444444',
    target_name: 'Trường THCS Lê Quý Đôn',
  },
  {
    id: 'log-2',
    created_at: '2026-10-21 08:12:00',
    action: 'ORG_REJECTED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '22222222-2222-2222-2222-222222222222',
    target_name: 'Trung tâm Ngoại khóa Minh Anh',
    description: 'Thiếu giấy phép hoạt động',
  },
  {
    id: 'log-3',
    created_at: '2026-10-20 17:40:00',
    action: 'ORG_SUSPENDED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '55555555-5555-5555-5555-555555555555',
    target_name: 'Trung tâm Anh ngữ Aurora',
  },
  {
    id: 'log-4',
    created_at: '2026-10-19 09:00:00',
    action: 'ACCOUNT_STATUS_CHANGED',
    actor_username: 'platform_admin',
    target_type: 'ACCOUNT',
    target_id: 'acc-3',
    target_name: 'aurora',
  },
  {
    id: 'log-5',
    created_at: '2026-10-18 15:25:00',
    action: 'ORG_MODULES_UPDATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '44444444-4444-4444-4444-444444444444',
    target_name: 'Trường THCS Lê Quý Đôn',
  },
  {
    id: 'log-6',
    created_at: '2026-10-17 11:05:00',
    action: 'ORG_REACTIVATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '66666666-6666-6666-6666-666666666666',
    target_name: 'Trường Tiểu học Nguyễn Trãi',
  },
  {
    id: 'log-7',
    created_at: '2026-01-05 09:20:00',
    action: 'ORG_MODULES_UPDATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: ORG_ID,
    target_name: ORG_NAME,
  },
];

/** Sinh `n` sự kiện để kiểm phân trang server (page 1-based, size 20). */
function makeAuditLogs(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `log-${i + 1}`,
    created_at: '2026-10-21 08:10:00',
    action: 'ORG_APPROVED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: ORG_ID,
    target_name: `Đối tượng ${i + 1}`,
  }));
}

/** Chi tiết tổ chức — chỉ `organization.name` được màn lịch sử dùng. */
const ORG_DETAIL = {
  organization: {
    id: ORG_ID,
    name: ORG_NAME,
    org_type: 'school',
    status: 'pending',
    owner_username: 'truongnguyendu',
    owner_email: 'truongnguyendu@example.edu.vn',
  },
  owners: [],
  modules: [],
};

const ACCOUNT = {
  id: ACCOUNT_ID,
  username: 'lequydon',
  email: 'lequydon@example.edu.vn',
  full_name: 'Lê Quý Đôn',
  organization_id: ORG_ID,
  organization_name: ORG_NAME,
  role: 'ORG_OWNER',
  status: 'active',
  created_at: '2026-10-01T08:00:00',
  last_login_at: '2026-11-01T09:00:00',
};

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function fakeJwt(claims) {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}
function tokenFor(roles) {
  return fakeJwt({
    userId: '11111111-1111-4111-8111-111111111111',
    username: 'super.admin',
    roles,
    permissions: [],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;

/** Lớp antd THẬT (bỏ qua `.ant-app` — wrapper của `<App>` trong `main.tsx`). */
async function countAntd(page) {
  return page.locator('[class*="ant-"]').evaluateAll((els) =>
    els.filter((el) =>
      Array.from(el.classList).some((c) => c.startsWith('ant-') && c !== 'ant-app'),
    ).length,
  );
}

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function newContext(
  browser,
  {
    auditStatus = 200,
    auditLogs = AUDIT_LOGS,
    auditPaged = false,
    modules = MODULE_CATALOG,
    modulesStatus = 200,
    orgDetail = ORG_DETAIL,
  } = {},
) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'vi-VN',
  });
  await context.addInitScript((access) => {
    localStorage.setItem('mems.accessToken', access);
    localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
  }, tokenFor(['SUPER_ADMIN']));
  const page = await context.newPage();
  const pageErrors = [];
  const calls = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

  await page.route(
    (url) => API_RE.test(url.pathname),
    async (route, request) => {
      const url = new URL(request.url());
      const method = request.method();
      const query = Object.fromEntries(url.searchParams);
      calls.push({ method, path: url.pathname, query });

      const json = (status, payload) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      const err = (status, code) => json(status, { code, message: 'lỗi' });

      if (method === 'GET' && url.pathname === '/api/v1/audit-logs') {
        if (auditStatus !== 200) {
          return err(auditStatus, auditStatus === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');
        }
        if (auditPaged) {
          const pageNo = Math.max(1, Number(query.page ?? '1') || 1);
          const size = Math.max(1, Number(query.size ?? '20') || 20);
          const start = (pageNo - 1) * size;
          return json(200, {
            items: auditLogs.slice(start, start + size),
            total: auditLogs.length,
            page: pageNo,
            size,
          });
        }
        return json(200, { items: auditLogs, total: auditLogs.length, page: 1, size: 20 });
      }

      if (method === 'GET' && url.pathname === '/api/v1/modules') {
        if (modulesStatus !== 200) return err(modulesStatus, 'INTERNAL_ERROR');
        return json(200, modules);
      }

      if (method === 'GET' && url.pathname === '/api/v1/organizations/options') {
        return json(200, [{ id: ORG_ID, name: ORG_NAME }]);
      }

      if (method === 'GET' && url.pathname === '/api/v1/organizations/pending') {
        return json(200, []);
      }

      if (method === 'GET' && url.pathname === `/api/v1/organizations/${ORG_ID}`) {
        return json(200, orgDetail);
      }

      if (method === 'GET' && url.pathname === `/api/v1/accounts/${ACCOUNT_ID}`) {
        return json(200, ACCOUNT);
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls };
}

/** Mở một màn trong console và chờ H1 ổn định. */
async function open(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
}

/**
 * Chọn 1 mục trong `Selector` của Astryx.
 *
 * `Selector` KHÔNG `hasSearch` → trigger là `<button role="combobox">`.
 */
async function pickSelect(page, label, optionName, scope = page, triggerRole = 'combobox') {
  await scope.getByRole(triggerRole, { name: label }).click();
  await page.getByRole('option', { name: optionName }).click();
  await page.waitForTimeout(500);
}

/** Số dòng đang hiện trong bảng. */
async function rowCount(page) {
  return page.locator('tbody tr').count();
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Nhật ký hệ thống: đủ 5 cột + Badge chữ + link + Tổng N ────────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await open(page, '/quan-tri/nhat-ky');

    const h1 = (await page.locator('h1').first().innerText()).trim();
    check('nhật ký: h1 = "Nhật ký hệ thống"', h1 === 'Nhật ký hệ thống', h1);

    const antdCount = await countAntd(page);
    check('nhật ký: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    for (const col of ['Thời điểm', 'Hành động', 'Đối tượng', 'Người thực hiện', 'Ghi chú']) {
      check(
        `nhật ký: có cột "${col}"`,
        (await page.getByRole('columnheader', { name: col }).count()) === 1,
      );
    }

    const body = await page.locator('body').innerText();
    check(
      'nhật ký: Badge hành động kèm CHỮ (BR-08)',
      body.includes('Duyệt tổ chức') && body.includes('Vô hiệu hoá tổ chức'),
    );
    check('nhật ký: thời điểm định dạng DD/MM/YYYY HH:mm', body.includes('21/10/2026 08:10'));
    check('nhật ký: người thực hiện', body.includes('platform_admin'));
    check('nhật ký: giá trị thiếu hiện "—"', body.includes('—'));
    check('nhật ký: dòng "Tổng 7 sự kiện"', body.includes('Tổng 7 sự kiện'));
    check('nhật ký: 7 dòng', (await rowCount(page)) === 7, `rows=${await rowCount(page)}`);

    // Phân trang TỰ ẨN khi chỉ 1 trang (total 7 < size 20).
    check(
      'nhật ký: ẩn phân trang khi chỉ 1 trang',
      (await page.getByRole('navigation', { name: 'Phân trang nhật ký hệ thống' }).count()) === 0,
    );

    // Link "Đối tượng" trỏ đúng màn chi tiết tương ứng (TC-AUD-03).
    const accLink = page.getByRole('link', { name: 'Xem chi tiết Tài khoản: aurora' });
    check('nhật ký: link tài khoản "aurora" tồn tại', (await accLink.count()) === 1);
    check(
      'nhật ký: link tài khoản trỏ /quan-tri/tai-khoan/acc-3',
      (await accLink.getAttribute('href')) === '/quan-tri/tai-khoan/acc-3',
      String(await accLink.getAttribute('href')),
    );
    const orgLink = page.getByRole('link', {
      name: 'Xem chi tiết Tổ chức: Trung tâm Anh ngữ Aurora',
    });
    check(
      'nhật ký: link tổ chức trỏ /quan-tri/to-chuc/<id>',
      (await orgLink.getAttribute('href')) ===
        '/quan-tri/to-chuc/55555555-5555-5555-5555-555555555555',
      String(await orgLink.getAttribute('href')),
    );

    check('nhật ký: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Phân trang SERVER: total 25 → 2 trang ─────────────────────────── */
  {
    const { context, page, calls } = await newContext(browser, {
      auditLogs: makeAuditLogs(25),
      auditPaged: true,
    });
    await open(page, '/quan-tri/nhat-ky');

    const body = await page.locator('body').innerText();
    check('phân trang: dòng "Tổng 25 sự kiện"', body.includes('Tổng 25 sự kiện'));
    check('phân trang: trang 1 có 20 dòng', (await rowCount(page)) === 20, `rows=${await rowCount(page)}`);

    const nav = page.getByRole('navigation', { name: 'Phân trang nhật ký hệ thống' });
    check('phân trang: có nav "Phân trang nhật ký hệ thống"', (await nav.count()) === 1);

    const page2 = nav.getByRole('button', { name: 'Đến trang 2' });
    check('phân trang: có nút "Đến trang 2"', (await page2.count()) === 1);
    await page2.click();
    await page.waitForTimeout(800);

    check('phân trang: URL có page=2', page.url().includes('page=2'), page.url());
    check('phân trang: trang 2 có 5 dòng', (await rowCount(page)) === 5, `rows=${await rowCount(page)}`);
    const last = calls.filter((c) => c.path === '/api/v1/audit-logs').at(-1);
    check('phân trang: request trang 2 gửi page=2', last?.query?.page === '2', JSON.stringify(last?.query));
    await context.close();
  }

  /* ── 3. Lọc: từ khoá (nút Tìm), hành động, khoảng ngày ────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await open(page, '/quan-tri/nhat-ky');

    await page.getByPlaceholder('Tìm theo tên đối tượng hoặc mô tả').fill('aurora');
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    await page.waitForTimeout(600);
    let last = calls.filter((c) => c.path === '/api/v1/audit-logs').at(-1);
    check('lọc: nút Tìm gửi keyword=aurora', last?.query?.keyword === 'aurora', JSON.stringify(last?.query));
    check('lọc: URL có q=aurora', page.url().includes('q=aurora'), page.url());

    await pickSelect(page, 'Hành động', 'Duyệt tổ chức');
    last = calls.filter((c) => c.path === '/api/v1/audit-logs').at(-1);
    check(
      'lọc: chọn hành động gửi action=ORG_APPROVED',
      last?.query?.action === 'ORG_APPROVED',
      JSON.stringify(last?.query),
    );

    // Nút clear của `Selector hasClear` có tên "Xóa <nhãn>".
    check(
      'lọc: Selector hành động có nút clear "Xóa Hành động"',
      (await page.getByRole('button', { name: 'Xóa Hành động' }).count()) === 1,
    );
    await page.getByRole('button', { name: 'Xóa Hành động' }).click();
    await page.waitForTimeout(500);
    check('lọc: xoá hành động khỏi URL', !page.url().includes('action='), page.url());

    // Khoảng ngày: chỉ dựng control khi CẢ from + to hợp lệ.
    check(
      'lọc: có nhãn "Khoảng thời gian"',
      (await page.getByText('Khoảng thời gian').count()) >= 1,
    );
    await context.close();
  }

  /* ── 4. Lọc theo khoảng ngày qua URL (DateRangeInput) ─────────────────── */
  {
    const { context, page, calls, pageErrors } = await newContext(browser);
    await open(page, '/quan-tri/nhat-ky?from=2026-10-01&to=2026-10-31');
    let last = calls.filter((c) => c.path === '/api/v1/audit-logs').at(-1);
    check(
      'ngày: gửi cả from + to khi đủ 2 đầu',
      last?.query?.from === '2026-10-01' && last?.query?.to === '2026-10-31',
      JSON.stringify(last?.query),
    );
    check('ngày: không pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }
  {
    const { context, page, calls, pageErrors } = await newContext(browser);
    await open(page, '/quan-tri/nhat-ky?from=2026-10-01');
    const last = calls.filter((c) => c.path === '/api/v1/audit-logs').at(-1);
    check(
      'ngày: chỉ gửi from khi thiếu to (không dựng khoảng nửa vời)',
      last?.query?.from === '2026-10-01' && last?.query?.to === undefined,
      JSON.stringify(last?.query),
    );
    check('ngày: thiếu `to` không gây pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 5. 404 (`D-22`) → "chờ backend" + Thử lại, GIỮ PageHeader ────────── */
  {
    const { context, page } = await newContext(browser, { auditStatus: 404 });
    await open(page, '/quan-tri/nhat-ky');
    const body = await page.locator('body').innerText();
    check('nhật ký 404: câu "Tính năng đang chờ backend (D-22)."', body.includes('Tính năng đang chờ backend (D-22).'));
    check('nhật ký 404: KHÔNG hiện "Chưa có sự kiện nào"', !body.includes('Chưa có sự kiện nào'));
    check('nhật ký 404: GIỮ tiêu đề "Nhật ký hệ thống"', (await page.getByRole('heading', { name: 'Nhật ký hệ thống' }).count()) === 1);
    check('nhật ký 404: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check('nhật ký 404: banner role=status', (await page.getByRole('status').count()) >= 1);
    await context.close();
  }

  /* ── 6. Lỗi 500 → Banner role=alert + Thử lại, KHÔNG hiện Empty ───────── */
  {
    const { context, page, pageErrors } = await newContext(browser, { auditStatus: 500 });
    await open(page, '/quan-tri/nhat-ky');
    const body = await page.locator('body').innerText();
    check('nhật ký lỗi: câu "Không tải được nhật ký hệ thống."', body.includes('Không tải được nhật ký hệ thống.'));
    check('nhật ký lỗi: banner role=alert', (await page.getByRole('alert').count()) >= 1);
    check('nhật ký lỗi: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check('nhật ký lỗi: KHÔNG hiện "Chưa có sự kiện nào" (NFR-REL-001)', !body.includes('Chưa có sự kiện nào'));
    check('nhật ký lỗi: không pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 7. Rỗng → Empty "Chưa có sự kiện nào" ────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { auditLogs: [] });
    await open(page, '/quan-tri/nhat-ky');
    const body = await page.locator('body').innerText();
    check('nhật ký rỗng: hiện "Chưa có sự kiện nào"', body.includes('Chưa có sự kiện nào'));
    check('nhật ký rỗng: dòng "Tổng 0 sự kiện"', body.includes('Tổng 0 sự kiện'));
    await context.close();
  }

  /* ── 8. Danh mục module: TC-MDL-01 ───────────────────────────────────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await open(page, '/quan-tri/module');

    const h1 = (await page.locator('h1').first().innerText()).trim();
    check('module: h1 = "Danh mục module"', h1 === 'Danh mục module', h1);

    const antdCount = await countAntd(page);
    check('module: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    check('module TC-MDL-01: cell "Quản lý phòng học"', (await page.getByRole('cell', { name: 'Quản lý phòng học' }).count()) === 1);
    check('module TC-MDL-01: có nhãn "Lõi"', (await page.getByText('Lõi').count()) >= 1);
    check('module TC-MDL-01: có nhãn "Mở rộng"', (await page.getByText('Mở rộng').count()) >= 1);
    check('module: có cột "Mã module"', (await page.getByRole('columnheader', { name: 'Mã module' }).count()) === 1);
    check('module: có cột "Tên module"', (await page.getByRole('columnheader', { name: 'Tên module' }).count()) === 1);
    check('module: có cột "Phân loại"', (await page.getByRole('columnheader', { name: 'Phân loại' }).count()) === 1);
    const body = await page.locator('body').innerText();
    check('module: KHÔNG hiện "undefined"', !body.includes('undefined'));
    check('module: mô tả thiếu hiện "—"', body.includes('—'));
    check('module: 6 dòng', (await rowCount(page)) === 6, `rows=${await rowCount(page)}`);
    check('module: không pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 9. Module: TC-MDL-02 lọc `?loi=core` ────────────────────────────── */
  {
    const { context, page } = await newContext(browser);
    await open(page, '/quan-tri/module?loi=core');
    check('module TC-MDL-02: hiện "Quản lý học sinh"', (await page.getByRole('cell', { name: 'Quản lý học sinh' }).count()) === 1);
    check('module TC-MDL-02: ẩn "Quản lý phòng học"', (await page.getByRole('cell', { name: 'Quản lý phòng học' }).count()) === 0);
    await context.close();
  }

  /* ── 10. Module: TC-MDL-03 `?q=` không khớp ──────────────────────────── */
  {
    const { context, page } = await newContext(browser);
    await open(page, '/quan-tri/module?q=khong-ton-tai');
    check('module TC-MDL-03: hiện "Không tìm thấy module phù hợp."', (await page.getByText('Không tìm thấy module phù hợp.').count()) >= 1);
    await context.close();
  }

  /* ── 11. Module: TC-MDL-04 danh mục rỗng ─────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { modules: [] });
    await open(page, '/quan-tri/module');
    const body = await page.locator('body').innerText();
    check('module TC-MDL-04: hiện "Danh mục module đang trống."', body.includes('Danh mục module đang trống.'));
    check('module TC-MDL-04: KHÔNG hiện "undefined"', !body.includes('undefined'));
    await context.close();
  }

  /* ── 12. Module: tìm kiếm live (không nút Tìm) + sắp xếp cột ─────────── */
  {
    const { context, page } = await newContext(browser);
    await open(page, '/quan-tri/module');

    await page.getByPlaceholder('Tìm theo mã hoặc tên module').fill('phòng');
    await page.waitForTimeout(500);
    check('module: tìm live cập nhật URL q=phòng', page.url().includes('q=ph'), page.url());
    check('module: lọc còn "Quản lý phòng học"', (await page.getByRole('cell', { name: 'Quản lý phòng học' }).count()) === 1);
    check('module: ẩn "Quản lý học sinh"', (await page.getByRole('cell', { name: 'Quản lý học sinh' }).count()) === 0);

    // Xoá từ khoá → về đủ 6 dòng.
    await page.getByRole('button', { name: 'Xóa Tìm module' }).click();
    await page.waitForTimeout(500);
    check('module: xoá từ khoá → 6 dòng', (await rowCount(page)) === 6, `rows=${await rowCount(page)}`);

    const firstCode = async () =>
      (await page.locator('tbody tr').first().locator('td').first().innerText()).trim();

    await page.getByRole('button', { name: 'Mã module' }).click();
    await page.waitForTimeout(400);
    check('module sort: tăng dần → dòng đầu CLASS_MANAGEMENT', (await firstCode()) === 'CLASS_MANAGEMENT', await firstCode());

    await page.getByRole('button', { name: 'Mã module' }).click();
    await page.waitForTimeout(400);
    check('module sort: giảm dần → dòng đầu TEACHER_MANAGEMENT', (await firstCode()) === 'TEACHER_MANAGEMENT', await firstCode());
    await context.close();
  }

  /* ── 13. Module: lỗi 500 → Banner + Thử lại, GIỮ PageHeader ──────────── */
  {
    const { context, page, pageErrors } = await newContext(browser, { modulesStatus: 500 });
    await open(page, '/quan-tri/module');
    // QueryClient retry: 1 + retryDelay mặc định (~1s) → chờ Banner lỗi xuất hiện
    // thay vì phụ thuộc vào `waitForTimeout` cố định trong `open()`.
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(150);
    const body = await page.locator('body').innerText();
    check('module lỗi: câu "Không tải được danh mục module."', body.includes('Không tải được danh mục module.'));
    check('module lỗi: banner role=alert', (await page.getByRole('alert').count()) >= 1);
    check('module lỗi: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check('module lỗi: GIỮ tiêu đề "Danh mục module"', (await page.getByRole('heading', { name: 'Danh mục module' }).count()) === 1);
    check('module lỗi: không pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 14. Lịch sử duyệt tổ chức: tên tổ chức, KHÔNG cột Đối tượng ─────── */
  {
    const { context, page, pageErrors } = await newContext(browser, { auditLogs: [AUDIT_LOGS[6]] });
    await open(page, `/quan-tri/to-chuc/${ORG_ID}/lich-su`);

    const body = await page.locator('body').innerText();
    check('lịch sử: h1 = "Lịch sử duyệt tổ chức"', (await page.getByRole('heading', { name: 'Lịch sử duyệt tổ chức' }).count()) === 1);
    check('lịch sử: hiện tên tổ chức', body.includes(ORG_NAME));
    check('lịch sử: hiện sự kiện "Đổi cấu hình module"', body.includes('Đổi cấu hình module'));
    check('lịch sử: KHÔNG có cột "Đối tượng"', (await page.getByRole('columnheader', { name: 'Đối tượng' }).count()) === 0);
    check('lịch sử: dòng "Tổng 1 sự kiện"', body.includes('Tổng 1 sự kiện'));
    check('lịch sử: có breadcrumb link "Tổ chức"', (await page.getByRole('link', { name: 'Tổ chức' }).count()) >= 1);

    const antdCount = await countAntd(page);
    check('lịch sử: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);
    check('lịch sử: không pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 15. Lịch sử: 404 (`D-22`) → "chờ backend" + Thử lại ─────────────── */
  {
    const { context, page } = await newContext(browser, { auditStatus: 404 });
    await open(page, `/quan-tri/to-chuc/${ORG_ID}/lich-su`);
    const body = await page.locator('body').innerText();
    check('lịch sử 404: câu "Tính năng đang chờ backend (D-22)."', body.includes('Tính năng đang chờ backend (D-22).'));
    check('lịch sử 404: GIỮ tiêu đề "Lịch sử duyệt tổ chức"', (await page.getByRole('heading', { name: 'Lịch sử duyệt tổ chức' }).count()) === 1);
    check('lịch sử 404: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    await context.close();
  }

  /* ── 16. Chi tiết tài khoản: khối nhật ký đã hết antd ────────────────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await open(page, `/quan-tri/tai-khoan/${ACCOUNT_ID}`);
    const antdCount = await countAntd(page);
    check('chi tiết tài khoản: 0 phần tử antd (AuditLogTable đã port)', antdCount === 0, `count=${antdCount}`);
    check('chi tiết tài khoản: không pageerror', pageErrors.length === 0, pageErrors.join(' | '));
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

/**
 * ux-review/probe-p3c3.mjs — kiểm tra HÀNH VI của `TeacherDetailPage` sau khi port
 * sang Astryx (P3c-3). Dump `32` chỉ chụp tab mặc định, nên probe này chạy tay
 * các phần tương tác: 3 tab, form sửa, validate, dialog 409 SPECIALTY_MISMATCH,
 * và 4 trạng thái loading/error/not-found/no-permission.
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p3c3.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function fakeJwt(claims) {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}
const TOKEN = fakeJwt({
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'giao.vu',
  roles: ['ACADEMIC_STAFF'],
  permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT', 'CLASS_VIEW'],
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const TEACHER_DETAIL = {
  userId: 't1',
  staffCode: 'GV001',
  fullName: 'Nguyễn Thị Mai',
  email: 'mai.nguyen@nguyendu.edu.vn',
  phone: '0901234567',
  departmentId: 'd1',
  positionIds: ['p1'],
  specialties: [{ id: 'sp1', name: 'Toán' }],
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  classes: [
    { id: 'c1', classCode: 'LH001', name: 'Toán 10A1', status: 'DANG_DIEN_RA', closeState: 'NONE' },
    { id: 'c2', classCode: 'LH002', name: 'Toán 10A2', status: 'CHUA_BAT_DAU', closeState: 'NONE' },
  ],
  history: [
    {
      action: 'UPDATE',
      actorName: 'Lê Thị B',
      createdAt: '2026-11-08T10:00:00',
      details: { specialtyIds: { before: ['sp1'], after: ['sp1', 'sp2'] } },
    },
  ],
  version: 3,
  createdAt: '2026-09-01T08:00:00',
  updatedAt: '2026-11-08T10:00:00',
};

const SPECIALTIES = [
  { id: 'sp1', name: 'Toán' },
  { id: 'sp2', name: 'Vật lý' },
];
const DEPARTMENTS = [{ id: 'd1', name: 'Tổ Toán', description: null, createdAt: '2026-09-01T08:00:00' }];
const POSITIONS = [{ id: 'p1', name: 'Giáo viên', description: 'Giảng dạy', createdAt: '2026-09-01T08:00:00', permissions: [] }];

const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function newContext(browser, { detailStatus = 200, detailPending = false, mismatchOnce = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN' });
  await context.addInitScript(
    ([access]) => {
      localStorage.setItem('mems.accessToken', access);
      localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
    },
    [TOKEN],
  );
  const page = await context.newPage();
  const pageErrors = [];
  const apiCalls = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));
  let putCount = 0;

  await page.route(
    (url) => API_RE.test(url.pathname),
    async (route, request) => {
      const url = new URL(request.url());
      const method = request.method();
      apiCalls.push(`${method} ${url.pathname}${url.search}`);

      if (method === 'GET' && url.pathname === '/api/teachers/t1') {
        if (detailPending) return; // treo → loading
        if (detailStatus !== 200) {
          return route.fulfill({
            status: detailStatus,
            contentType: 'application/json',
            body: JSON.stringify({ code: detailStatus === 404 ? 'TEACHER_NOT_FOUND' : 'INTERNAL_ERROR', message: 'lỗi' }),
          });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEACHER_DETAIL) });
      }
      if (method === 'PUT' && url.pathname === '/api/teachers/t1') {
        putCount += 1;
        const body = JSON.parse(request.postData() || '{}');
        if (mismatchOnce && putCount === 1 && !body.confirm) {
          return route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 'SPECIALTY_MISMATCH',
              message: 'Chuyên môn không khớp',
              classes: [{ id: 'c9', name: 'Lý 12C3' }],
            }),
          });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEACHER_DETAIL) });
      }
      if (method === 'GET' && url.pathname === '/api/specialties') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SPECIALTIES) });
      }
      if (method === 'GET' && url.pathname === '/departments') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEPARTMENTS) });
      }
      if (method === 'GET' && url.pathname === '/positions') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(POSITIONS) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    },
  );

  return { context, page, pageErrors, apiCalls, getPutCount: () => putCount };
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Tab mặc định + tab Lớp phụ trách + tab Lịch sử ─────────────────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await page.goto(`${BASE}/dao-tao/giao-vien/t1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(600);

    check('h1 = Nguyễn Thị Mai', (await page.locator('h1').first().innerText()).includes('Nguyễn Thị Mai'));
    // Cùng thước đo với dump (`[class^="ant-"]`) — không phải `[class*="ant-"]`,
    // vì selector sau khớp cả class có chuỗi con "ant-" ở giữa.
    const antdCount = await page.locator('[class^="ant-"]').count();
    check('0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const tabs = await page.getByRole('tab').allInnerTexts();
    check('3 tab đúng tên', tabs.length === 3 && tabs[0].includes('Thông tin') && tabs[1].includes('Lớp phụ trách') && tabs[2].includes('Lịch sử thay đổi'), JSON.stringify(tabs));
    check('nhãn tab không bị nhân đôi', tabs.every((t) => !/^(.+)\1$/.test(t.replace(/\s+/g, ''))), JSON.stringify(tabs));

    // Tab "Lớp phụ trách"
    await page.getByRole('tab', { name: /Lớp phụ trách/ }).click();
    await page.waitForTimeout(300);
    const bodyText = await page.locator('body').innerText();
    check('tab Lớp phụ trách: có LH001 + LH002', bodyText.includes('LH001') && bodyText.includes('LH002'));
    const classLink = page.locator('a[href="/dao-tao/lop-hoc/c1"]');
    check('mã lớp là liên kết thật tới /dao-tao/lop-hoc/c1', (await classLink.count()) >= 1);
    check('tab Lớp phụ trách: badge trạng thái có chữ (BR-08)', bodyText.includes('Đang diễn ra') && bodyText.includes('Chưa bắt đầu'));

    // Tab "Lịch sử thay đổi"
    await page.getByRole('tab', { name: /Lịch sử thay đổi/ }).click();
    await page.waitForTimeout(300);
    const histText = await page.locator('body').innerText();
    check('tab Lịch sử: có hành động + người + thay đổi', histText.includes('Cập nhật hồ sơ') && histText.includes('Lê Thị B') && histText.includes('Chuyên môn: Toán → Toán, Vật lý'), histText.replace(/\s+/g, ' ').slice(0, 200));

    check('không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Form sửa: validate chặn gửi + gửi hợp lệ ──────────────────────── */
  {
    const { context, page, pageErrors, apiCalls } = await newContext(browser);
    await page.goto(`${BASE}/dao-tao/giao-vien/t1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
    await page.waitForTimeout(300);
    const formText = await page.locator('body').innerText();
    check('form sửa hiện ra', formText.includes('Mã nhân sự') && formText.includes('Họ tên') && formText.includes('Chuyên môn'));
    check('Mã nhân sự chỉ đọc', await page.locator('input[value="GV001"]').first().isEditable().then((e) => !e));

    const before = apiCalls.filter((c) => c.startsWith('PUT')).length;
    const nameInput = page.getByLabel('Họ tên');
    await nameInput.fill('');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(300);
    const afterText = await page.locator('body').innerText();
    const putAfter = apiCalls.filter((c) => c.startsWith('PUT')).length;
    check('validate: hiện "Vui lòng nhập họ tên"', afterText.includes('Vui lòng nhập họ tên'));
    check('validate: KHÔNG gửi PUT', putAfter === before, `PUT trước=${before} sau=${putAfter}`);

    check('không có pageerror (form)', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 3. 409 SPECIALTY_MISMATCH → dialog → "Vẫn lưu" ───────────────────── */
  {
    const { context, page, pageErrors, getPutCount } = await newContext(browser, { mismatchOnce: true });
    await page.goto(`${BASE}/dao-tao/giao-vien/t1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForTimeout(600);

    const dialog = page.getByRole('dialog');
    check('409 mở dialog xác nhận', (await dialog.count()) >= 1);
    const dialogText = (await dialog.count()) ? await dialog.first().innerText() : '';
    check('dialog nêu tiêu đề + lớp lệch môn', dialogText.includes('Chuyên môn không còn phù hợp') && dialogText.includes('Lý 12C3'), dialogText.replace(/\s+/g, ' ').slice(0, 160));

    await page.getByRole('button', { name: 'Vẫn lưu' }).click();
    await page.waitForTimeout(700);
    const afterText = await page.locator('body').innerText();
    check('bấm "Vẫn lưu" → PUT lần 2 (confirm)', getPutCount() === 2, `putCount=${getPutCount()}`);
    check('thành công → toast "Đã cập nhật giáo viên."', afterText.includes('Đã cập nhật giáo viên.'));
    check('thành công → thoát form', !afterText.includes('Mã nhân sự chỉ đọc'));

    check('không có pageerror (mismatch)', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 4. Loading / error / not-found ───────────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { detailPending: true });
    await page.goto(`${BASE}/dao-tao/giao-vien/t1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    // Chữ "Đang tải…" nằm trong `VisuallyHidden` (bị cắt khỏi màn hình nhưng vẫn
    // ở trong cây trợ năng) → đọc `textContent`. Trang có 2 `role="status"`: một
    // vùng live thông báo dùng chung (rỗng) và `PageLoading` → phải tìm theo nội
    // dung, không lấy `.first()`.
    const statuses = await page.locator('[role="status"]').allTextContents();
    check(
      'loading: có role=status "Đang tải…"',
      statuses.some((t) => t.includes('Đang tải')),
      JSON.stringify(statuses),
    );
    await context.close();
  }
  {
    const { context, page } = await newContext(browser, { detailStatus: 500 });
    await page.goto(`${BASE}/dao-tao/giao-vien/t1`, { waitUntil: 'domcontentloaded' });
    // `main.tsx` đặt `queries: { retry: 1 }` → lần thử lại đầu chờ ~1s mới hiện lỗi.
    await page
      .getByRole('alert')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    const alert = page.getByRole('alert');
    const t = (await alert.count()) ? await alert.first().innerText() : '';
    check('error 500: role=alert + tiêu đề lỗi', t.includes('Không tải được thông tin giáo viên.'), t.replace(/\s+/g, ' ').slice(0, 160));
    check('error 500: có nút "Thử lại" + "Quay lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1 && (await page.getByRole('button', { name: 'Quay lại' }).count()) >= 1);
    await context.close();
  }
  {
    const { context, page } = await newContext(browser, { detailStatus: 404 });
    await page.goto(`${BASE}/dao-tao/giao-vien/t1`, { waitUntil: 'domcontentloaded' });
    await page
      .getByText('Không tìm thấy dữ liệu này.')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    const bodyText = await page.locator('body').innerText();
    check('404: banner "Không tìm thấy dữ liệu này."', bodyText.includes('Không tìm thấy dữ liệu này.'));
    check('404: có nút "Quay lại"', (await page.getByRole('button', { name: 'Quay lại' }).count()) >= 1);
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

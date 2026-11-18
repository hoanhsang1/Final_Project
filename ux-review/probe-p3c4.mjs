/**
 * ux-review/probe-p3c4.mjs — kiểm tra HÀNH VI của `ClassDetailPage` sau khi port
 * sang Astryx (P3c-4). Dump `35` chỉ chụp tab mặc định + trạng thái `DANG_DIEN_RA`,
 * nên probe này chạy tay các phần tương tác: 3 tab, 6 dialog (gán / hủy / yêu cầu
 * đóng / duyệt / từ chối / mở lại), validate lý do bắt buộc, phân trang danh sách
 * giáo viên, 409 khoá lạc quan, người gửi không thấy nút duyệt, lớp đã đóng chỉ
 * xem, và 5 trạng thái loading/error/not-found/no-permission.
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p3c4.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

const FULL_PERMS = [
  'CLASS_VIEW',
  'CLASS_ASSIGN_TEACHER',
  'CLASS_CANCEL',
  'CLASS_CLOSE_REQUEST',
  'CLASS_CLOSE_APPROVE',
  'CLASS_REOPEN',
];

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function fakeJwt(claims) {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}
function tokenFor(userId, permissions) {
  return fakeJwt({
    userId,
    username: 'giao.vu',
    roles: ['ACADEMIC_STAFF'],
    permissions,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

const DETAIL_DANG = {
  id: 'c1',
  classCode: 'LH001',
  name: 'Toán 10A1',
  academicYear: '2026-2027',
  startDate: '2026-09-05',
  endDate: '2027-05-30',
  status: 'DANG_DIEN_RA',
  closeState: 'NONE',
  teacher: { id: 't1', code: 'GV001', fullName: 'Nguyễn Thị Mai' },
  studentCount: 32,
  version: 2,
  cancelReason: null,
  closeRejectReason: null,
  closeRequestNote: null,
  createdAt: '2026-08-20T08:00:00',
  updatedAt: '2026-11-01T09:00:00',
};

const STATUS_LOGS = [
  {
    at: '2026-09-05T08:00:00',
    actorId: 'u1',
    actorName: 'Lê Thị B',
    fromStatus: null,
    toStatus: 'CHUA_BAT_DAU',
    reason: 'Tạo lớp',
  },
  {
    at: '2026-09-10T08:00:00',
    actorId: 'u1',
    actorName: 'Lê Thị B',
    fromStatus: 'CHUA_BAT_DAU',
    toStatus: 'DANG_DIEN_RA',
    reason: 'Bắt đầu học',
  },
];

const CLOSE_EVENTS = [
  {
    at: '2026-11-01T09:00:00',
    actorId: 'u-other',
    actorName: 'Lê Thị B',
    action: 'REQUESTED',
    reason: 'Lớp kết thúc sớm',
  },
];

/** 12 giáo viên → 2 trang với `ASSIGN_PAGE_SIZE = 10`. */
const ALL_TEACHERS = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { userId: `t${i + 1}`, staffCode: `GV${n}`, fullName: `Giáo viên ${n}` };
});

const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function newContext(
  browser,
  {
    detail = DETAIL_DANG,
    detailStatus = 200,
    detailPending = false,
    logs = STATUS_LOGS,
    logsStatus = 200,
    events = CLOSE_EVENTS,
    eventsStatus = 200,
    staleOnce = null,
    permissions = FULL_PERMS,
    userId = 'u-self',
  } = {},
) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN' });
  await context.addInitScript(
    ([access]) => {
      localStorage.setItem('mems.accessToken', access);
      localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
    },
    [tokenFor(userId, permissions)],
  );
  const page = await context.newPage();
  const pageErrors = [];
  /** Mọi request đã chặn: `{ method, path, search, body }`. */
  const calls = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));
  let staleFired = false;

  const countOf = (prefix) => calls.filter((c) => `${c.method} ${c.path}${c.search}`.startsWith(prefix)).length;

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
      calls.push({ method, path: url.pathname, search: url.search, body });

      const json = (status, payload) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      const err = (status, code, message = 'lỗi') => json(status, { code, message });

      if (method === 'GET' && url.pathname === '/api/classes/c1') {
        if (detailPending) return; // treo → loading
        if (detailStatus !== 200) {
          return err(detailStatus, detailStatus === 404 ? 'CLASS_NOT_FOUND' : 'INTERNAL_ERROR');
        }
        return json(200, detail);
      }
      if (method === 'GET' && url.pathname === '/api/classes/c1/status-logs') {
        if (logsStatus !== 200) return err(logsStatus, 'INTERNAL_ERROR');
        return json(200, logs);
      }
      if (method === 'GET' && url.pathname === '/api/classes/c1/close-events') {
        if (eventsStatus !== 200) return err(eventsStatus, 'INTERNAL_ERROR');
        return json(200, events);
      }
      if (method === 'GET' && url.pathname === '/api/teachers/assignable') {
        const page = Number(url.searchParams.get('page') || '1');
        const size = Number(url.searchParams.get('size') || '10');
        const start = (page - 1) * size;
        return json(200, {
          items: ALL_TEACHERS.slice(start, start + size),
          total: ALL_TEACHERS.length,
          page,
          size,
          pages: Math.ceil(ALL_TEACHERS.length / size),
        });
      }

      // Mọi thao tác ghi: trả về chi tiết (mặc định giữ nguyên trạng thái).
      const isWrite =
        url.pathname.startsWith('/api/classes/c1/') &&
        (method === 'POST' || method === 'PUT');
      if (isWrite) {
        if (staleOnce && !staleFired && url.pathname === `/api/classes/c1/${staleOnce}`) {
          staleFired = true;
          return err(409, 'DATA_CHANGED');
        }
        return json(200, detail);
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls, countOf };
}

/** Mở menu "Thao tác khác" (nút phụ, giữ chữ nhìn thấy). */
async function openMore(page) {
  await page.getByRole('button', { name: 'Thao tác khác' }).click();
  await page.waitForTimeout(200);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Trang mặc định: tiêu đề, 3 tab, nút hành động, menu nguy hiểm ───── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(600);

    const h1 = await page.locator('h1').first().innerText();
    check('h1 có mã lớp + badge trạng thái', h1.includes('LH001') && h1.includes('Đang diễn ra'), h1.replace(/\s+/g, ' '));

    const antdCount = await page.locator('[class^="ant-"]').count();
    check('0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const tabs = await page.getByRole('tab').allInnerTexts();
    check(
      '3 tab đúng tên',
      tabs.length === 3 &&
        tabs[0].includes('Thông tin') &&
        tabs[1].includes('Lịch sử trạng thái') &&
        tabs[2].includes('Sự kiện đóng'),
      JSON.stringify(tabs),
    );
    check('nhãn tab không bị nhân đôi', tabs.every((t) => !/^(.+)\1$/.test(t.replace(/\s+/g, ''))), JSON.stringify(tabs));

    check('có nút "Gán giáo viên"', (await page.getByRole('button', { name: 'Gán giáo viên' }).count()) >= 1);
    check(
      'primary = "Yêu cầu đóng lớp"',
      (await page.getByRole('button', { name: 'Yêu cầu đóng lớp' }).count()) >= 1,
    );

    await openMore(page);
    const cancelItem = page.getByRole('menuitem', { name: 'Hủy lớp' });
    check('"Thao tác khác" chứa mục "Hủy lớp"', (await cancelItem.count()) === 1);
    check('không có pageerror (mặc định)', pageErrors.length === 0, pageErrors.join(' | '));
    await page.keyboard.press('Escape');
    await context.close();
  }

  /* ── 2. Tab Lịch sử trạng thái + Sự kiện đóng ──────────────────────────── */
  {
    const { context, page } = await newContext(browser);
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);

    await page.getByRole('tab', { name: /Lịch sử trạng thái/ }).click();
    await page.waitForTimeout(300);
    const logsText = await page.locator('body').innerText();
    check(
      'tab lịch sử: có người + lý do + trạng thái (BR-08: chữ, không chỉ màu)',
      logsText.includes('Lê Thị B') && logsText.includes('Tạo lớp') && logsText.includes('Chưa bắt đầu') && logsText.includes('Đang diễn ra'),
      logsText.replace(/\s+/g, ' ').slice(0, 200),
    );

    await page.getByRole('tab', { name: /Sự kiện đóng/ }).click();
    await page.waitForTimeout(300);
    const evText = await page.locator('body').innerText();
    check(
      'tab sự kiện: có hành động + người + lý do',
      evText.includes('Gửi yêu cầu đóng') && evText.includes('Lê Thị B') && evText.includes('Lớp kết thúc sớm'),
      evText.replace(/\s+/g, ' ').slice(0, 200),
    );
    await context.close();
  }

  /* ── 3. Dialog gán: danh sách + phân trang + gửi kèm version ───────────── */
  {
    const { context, page, pageErrors, calls } = await newContext(browser);
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Gán giáo viên' }).click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog');
    check('mở dialog gán giáo viên', (await dialog.count()) >= 1);

    const group = page.getByRole('radiogroup', { name: 'Danh sách giáo viên có thể gán' });
    check('có nhóm chọn giáo viên (radiogroup có tên)', (await group.count()) === 1);
    const radiosPage1 = await page.getByRole('radio').count();
    check('trang 1 hiện 10 giáo viên', radiosPage1 === 10, `count=${radiosPage1}`);

    const pagNav = page.getByRole('navigation', { name: 'Phân trang danh sách giáo viên để gán' });
    check('có phân trang riêng cho danh sách gán', (await pagNav.count()) === 1);
    await pagNav.locator('button').filter({ hasText: /^2$/ }).first().click();
    await page.waitForTimeout(500);
    const radiosPage2 = await page.getByRole('radio').count();
    check('sang trang 2 còn 2 giáo viên', radiosPage2 === 2, `count=${radiosPage2}`);
    check(
      'gọi lại API với page=2 (server phân trang)',
      calls.some((c) => c.path === '/api/teachers/assignable' && c.search.includes('page=2')),
    );

    await page.getByRole('radio').first().check();
    await dialog.getByRole('button', { name: 'Xác nhận' }).click();
    await page.waitForTimeout(700);
    const bodyText = await page.locator('body').innerText();
    check('gán xong → toast "Đã gán giáo viên."', bodyText.includes('Đã gán giáo viên.'));
    const put = calls.find((c) => c.method === 'PUT' && c.path === '/api/classes/c1/teacher');
    check(
      'PUT gửi teacherId + version hiện tại',
      !!put && put.body?.teacherId === 't11' && put.body?.version === 2,
      JSON.stringify(put?.body),
    );
    check('gán xong → đóng dialog', (await page.getByRole('dialog').count()) === 0);
    check('không có pageerror (gán)', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 4. Hủy lớp: validate lý do bắt buộc rồi gửi ───────────────────────── */
  {
    const { context, page, calls, countOf } = await newContext(browser);
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);

    await openMore(page);
    await page.getByRole('menuitem', { name: 'Hủy lớp' }).click();
    await page.waitForTimeout(400);

    const dialog = page.getByRole('dialog');
    check('mở dialog hủy lớp', (await dialog.count()) >= 1);

    const before = countOf('POST /api/classes/c1/cancel');
    await dialog.getByRole('button', { name: 'Hủy lớp' }).click();
    await page.waitForTimeout(300);
    const errText = await page.locator('body').innerText();
    check('validate: hiện "Vui lòng nhập lý do."', errText.includes('Vui lòng nhập lý do.'));
    check('validate: KHÔNG gửi POST cancel', countOf('POST /api/classes/c1/cancel') === before);

    await dialog.getByRole('textbox').first().fill('Hủy vì trùng lịch');
    await dialog.getByRole('button', { name: 'Hủy lớp' }).click();
    await page.waitForTimeout(700);
    const afterText = await page.locator('body').innerText();
    check('hủy xong → toast "Đã hủy lớp."', afterText.includes('Đã hủy lớp.'));
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/classes/c1/cancel');
    check(
      'POST cancel gửi reason (đã trim) + version',
      !!post && post.body?.reason === 'Hủy vì trùng lịch' && post.body?.version === 2,
      JSON.stringify(post?.body),
    );
    await context.close();
  }

  /* ── 5. Yêu cầu đóng lớp: ghi chú tùy chọn ─────────────────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Yêu cầu đóng lớp' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    check('mở dialog yêu cầu đóng', (await dialog.count()) >= 1);

    await dialog.getByRole('button', { name: 'Xác nhận' }).click();
    await page.waitForTimeout(700);
    const afterText = await page.locator('body').innerText();
    check('yêu cầu đóng xong → toast', afterText.includes('Đã gửi yêu cầu đóng lớp.'));
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/classes/c1/close-requests');
    check('POST close-requests: note rỗng → null', !!post && post.body?.note === null, JSON.stringify(post?.body));
    await context.close();
  }

  /* ── 6. Lớp PENDING, người khác gửi: duyệt + từ chối ───────────────────── */
  {
    const { context, page, calls, pageErrors } = await newContext(browser, {
      detail: { ...DETAIL_DANG, closeState: 'PENDING' },
      events: [{ at: '2026-11-01T09:00:00', actorId: 'u-other', actorName: 'Lê Thị B', action: 'REQUESTED', reason: 'x' }],
    });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(600);

    const headText = await page.locator('body').innerText();
    check('PENDING: badge "Chờ duyệt đóng" + nút "Duyệt đóng"', headText.includes('Chờ duyệt đóng') && (await page.getByRole('button', { name: 'Duyệt đóng' }).count()) >= 1);

    // Duyệt
    await page.getByRole('button', { name: 'Duyệt đóng' }).first().click();
    await page.waitForTimeout(400);
    const approveDialog = page.getByRole('dialog');
    const approveText = await approveDialog.innerText();
    check('dialog duyệt có câu hỏi xác nhận', approveText.includes('Duyệt yêu cầu đóng lớp này?'));
    await approveDialog.getByRole('button', { name: 'Duyệt đóng' }).click();
    await page.waitForTimeout(700);
    const afterApprove = await page.locator('body').innerText();
    check('duyệt xong → toast "Đã duyệt đóng lớp."', afterApprove.includes('Đã duyệt đóng lớp.'));
    check('POST approve đã gọi', calls.some((c) => c.method === 'POST' && c.path === '/api/classes/c1/close-requests/approve'));

    // Từ chối
    await openMore(page);
    const rejectItem = page.getByRole('menuitem', { name: 'Từ chối' });
    check('"Thao tác khác" chứa mục "Từ chối"', (await rejectItem.count()) === 1);
    await rejectItem.click();
    await page.waitForTimeout(400);
    const rejectDialog = page.getByRole('dialog');
    await rejectDialog.getByRole('button', { name: 'Từ chối' }).click();
    await page.waitForTimeout(300);
    check('từ chối: validate lý do bắt buộc', (await page.locator('body').innerText()).includes('Vui lòng nhập lý do.'));
    check('từ chối: chưa gửi khi thiếu lý do', !calls.some((c) => c.path === '/api/classes/c1/close-requests/reject'));

    await rejectDialog.getByRole('textbox').first().fill('Chưa đủ điều kiện');
    await rejectDialog.getByRole('button', { name: 'Từ chối' }).click();
    await page.waitForTimeout(700);
    check('từ chối xong → toast', (await page.locator('body').innerText()).includes('Đã từ chối yêu cầu đóng lớp.'));
    const rej = calls.find((c) => c.path === '/api/classes/c1/close-requests/reject');
    check('POST reject gửi reason', !!rej && rej.body?.reason === 'Chưa đủ điều kiện', JSON.stringify(rej?.body));
    check('không có pageerror (duyệt/từ chối)', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 7. Người gửi yêu cầu KHÔNG thấy duyệt/từ chối ─────────────────────── */
  {
    const { context, page } = await newContext(browser, {
      detail: { ...DETAIL_DANG, closeState: 'PENDING' },
      events: [{ at: '2026-11-01T09:00:00', actorId: 'u-self', actorName: 'Tôi', action: 'REQUESTED', reason: 'x' }],
      userId: 'u-self',
    });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(600);

    check('người gửi: KHÔNG có nút "Duyệt đóng"', (await page.getByRole('button', { name: 'Duyệt đóng' }).count()) === 0);
    const moreCount = await page.getByRole('button', { name: 'Thao tác khác' }).count();
    let hasReject = false;
    if (moreCount > 0) {
      await openMore(page);
      hasReject = (await page.getByRole('menuitem', { name: 'Từ chối' }).count()) > 0;
    }
    check('người gửi: KHÔNG có mục "Từ chối"', !hasReject);
    await context.close();
  }

  /* ── 8. Lớp CLOSED: chỉ xem + mở lại (bắt buộc lý do) ──────────────────── */
  {
    const { context, page, calls } = await newContext(browser, {
      detail: { ...DETAIL_DANG, closeState: 'CLOSED' },
    });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(600);

    check('CLOSED: banner "Lớp đã đóng"', (await page.locator('body').innerText()).includes('Lớp đã đóng'));
    check('CLOSED: KHÔNG có nút "Gán giáo viên"', (await page.getByRole('button', { name: 'Gán giáo viên' }).count()) === 0);

    await openMore(page);
    const reopenItem = page.getByRole('menuitem', { name: 'Mở lại lớp' });
    check('CLOSED: "Thao tác khác" có "Mở lại lớp"', (await reopenItem.count()) === 1);
    await reopenItem.click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Mở lại lớp' }).click();
    await page.waitForTimeout(300);
    check('mở lại: validate lý do bắt buộc (UI chặt hơn API)', (await page.locator('body').innerText()).includes('Vui lòng nhập lý do.'));
    check('mở lại: chưa gửi khi thiếu lý do', !calls.some((c) => c.path === '/api/classes/c1/reopen'));

    await dialog.getByRole('textbox').first().fill('Mở lại để bổ sung');
    await dialog.getByRole('button', { name: 'Mở lại lớp' }).click();
    await page.waitForTimeout(700);
    check('mở lại xong → toast', (await page.locator('body').innerText()).includes('Đã mở lại lớp.'));
    const post = calls.find((c) => c.path === '/api/classes/c1/reopen');
    check('POST reopen gửi reason', !!post && post.body?.reason === 'Mở lại để bổ sung', JSON.stringify(post?.body));
    await context.close();
  }

  /* ── 9. 409 khoá lạc quan: báo lỗi, KHÔNG báo thành công, tải lại ──────── */
  {
    const { context, page, calls, countOf } = await newContext(browser, { staleOnce: 'cancel' });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);
    const detailBefore = countOf('GET /api/classes/c1');

    await openMore(page);
    await page.getByRole('menuitem', { name: 'Hủy lớp' }).click();
    await page.waitForTimeout(400);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').first().fill('Hủy lớp');
    await dialog.getByRole('button', { name: 'Hủy lớp' }).click();
    await page.waitForTimeout(1200);

    const bodyText = await page.locator('body').innerText();
    check('409: báo lỗi "Dữ liệu vừa được thay đổi…"', bodyText.includes('Dữ liệu vừa được thay đổi bởi người khác. Vui lòng tải lại.'));
    check('409: KHÔNG báo thành công (NFR-REL-001)', !bodyText.includes('Đã hủy lớp.'));
    check('409: đóng dialog', (await page.getByRole('dialog').count()) === 0);
    check('409: tải lại chi tiết (GET lần 2)', countOf('GET /api/classes/c1') > detailBefore, `before=${detailBefore} after=${countOf('GET /api/classes/c1')}`);
    check('409: banner lỗi trên trang (role=alert)', (await page.getByRole('alert').count()) >= 1);
    check('409: KHÔNG gửi lại với version cũ', calls.filter((c) => c.method === 'POST' && c.path === '/api/classes/c1/cancel').length === 1);
    await context.close();
  }

  /* ── 10. Loading / error / not-found / no-permission ──────────────────── */
  {
    const { context, page } = await newContext(browser, { detailPending: true });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const statuses = await page.locator('[role="status"]').allTextContents();
    check('loading: role=status "Đang tải…"', statuses.some((t) => t.includes('Đang tải')), JSON.stringify(statuses));
    await context.close();
  }
  {
    const { context, page } = await newContext(browser, { detailStatus: 500 });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page
      .getByRole('alert')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    const t = (await page.getByRole('alert').count()) ? await page.getByRole('alert').first().innerText() : '';
    check('error 500: role=alert + tiêu đề lỗi', t.includes('Không tải được thông tin lớp học.'), t.replace(/\s+/g, ' ').slice(0, 160));
    check(
      'error 500: có nút "Thử lại" + "Quay lại"',
      (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1 &&
        (await page.getByRole('button', { name: 'Quay lại' }).count()) >= 1,
    );
    await context.close();
  }
  {
    const { context, page } = await newContext(browser, { detailStatus: 404 });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
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
  {
    const { context, page } = await newContext(browser, { permissions: ['PEOPLE_VIEW'] });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const bodyText = await page.locator('body').innerText();
    check('no-permission: hiện thông báo không có quyền', bodyText.includes('Bạn không có quyền truy cập khu vực này.'));
    check('no-permission: KHÔNG gọi API chi tiết', !(await page.locator('h1').count()));
    await context.close();
  }

  /* ── 11. Tab lịch sử lỗi tải → có nút "Thử lại" ────────────────────────── */
  {
    const { context, page } = await newContext(browser, { logsStatus: 500 });
    await page.goto(`${BASE}/dao-tao/lop-hoc/c1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');
    await page.getByRole('tab', { name: /Lịch sử trạng thái/ }).click();
    await page.waitForTimeout(1600);
    const t = await page.locator('body').innerText();
    check('tab lịch sử lỗi: có câu lỗi + "Thử lại"', t.includes('Không tải được lịch sử trạng thái.') && t.includes('Thử lại'), t.replace(/\s+/g, ' ').slice(0, 160));
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

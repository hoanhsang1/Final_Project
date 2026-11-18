/**
 * ux-review/probe-p5a1.mjs — kiểm tra HÀNH VI của nhóm Quản trị Đợt 1 sau khi
 * port sang Astryx (P5-A1):
 *   - `PendingOrganizationsPage` (`/quan-tri/to-chuc`)
 *   - `AllOrganizationsPage`     (`/quan-tri/to-chuc/tat-ca`)
 *   - `SuspendOrganizationModal` (dùng trong `AllOrganizationsPage`)
 *
 * Dump chỉ chụp ảnh tĩnh, nên probe này chạy tay các phần tương tác: sắp xếp
 * client (mũi tên phải nói thật), phân trang client (không gọi lại API), phân
 * trang server (có gọi lại), tìm kiếm + 2 bộ lọc + sắp xếp server (đi qua URL),
 * 404 endpoint chờ backend (D-20), lỗi tải, rỗng, và luồng Vô hiệu hoá / Kích
 * hoạt lại kèm validate lý do (BR-04: "Vô hiệu hoá", KHÔNG "Xoá").
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p5a1.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

/** 12 tổ chức chờ duyệt, trả theo thứ tự NGƯỢC (12→01) để thấy rõ khi sắp xếp. */
const PENDING = Array.from({ length: 12 }, (_, i) => {
  const n = String(12 - i).padStart(2, '0');
  return {
    id: `org-p-${n}`,
    name: `Tổ chức ${n}`,
    org_type: i % 2 === 0 ? 'school' : 'center',
    status: 'pending',
    owner_username: `chu.so.${n}`,
    owner_email: `owner${n}@truong.edu.vn`,
  };
});

/** 30 tổ chức cho màn "tất cả" → 2 trang với `size=20`. */
const ALL = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1;
  const status = n === 1 ? 'active' : n === 2 ? 'suspended' : n === 3 ? 'pending' : 'active';
  return {
    id: `org-a-${n}`,
    name: `Tổ chức Alpha ${String(n).padStart(2, '0')}`,
    org_type: n % 2 === 0 ? 'center' : 'school',
    status,
    owner_username: `owner.alpha.${n}`,
    owner_email: `alpha${n}@truong.edu.vn`,
    created_at: `2026-10-${String((n % 28) + 1).padStart(2, '0')}T08:00:00`,
  };
});

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

async function newContext(
  browser,
  {
    pending = PENDING,
    pendingStatus = 200,
    all = ALL,
    allStatus = 200,
    suspendStatus = 204,
    suspendCode = null,
    roles = ['SUPER_ADMIN'],
  } = {},
) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN' });
  await context.addInitScript((access) => {
    localStorage.setItem('mems.accessToken', access);
    localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
  }, tokenFor(roles));
  const page = await context.newPage();
  const pageErrors = [];
  const calls = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

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
      calls.push({ method, path: url.pathname, query: Object.fromEntries(url.searchParams), body });

      const json = (status, payload) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      const err = (status, code) => json(status, { code, message: 'lỗi' });

      if (method === 'GET' && url.pathname === '/api/v1/organizations/pending') {
        if (pendingStatus !== 200) return err(pendingStatus, 'INTERNAL_ERROR');
        return json(200, pending);
      }

      if (method === 'GET' && url.pathname === '/api/v1/organizations') {
        if (allStatus !== 200) return err(allStatus, 'INTERNAL_ERROR');
        const p = Number(url.searchParams.get('page') ?? '1') || 1;
        const size = Number(url.searchParams.get('size') ?? '20') || 20;
        const status = url.searchParams.get('status');
        const orgType = url.searchParams.get('orgType');
        const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase();
        let filtered = all;
        if (status) filtered = filtered.filter((o) => status.split(',').includes(o.status));
        if (orgType) filtered = filtered.filter((o) => o.org_type === orgType);
        if (keyword) filtered = filtered.filter((o) => o.name.toLowerCase().includes(keyword));
        return json(200, {
          items: filtered.slice((p - 1) * size, p * size),
          total: filtered.length,
          page: p,
          size,
        });
      }

      if (method === 'PATCH' && /^\/api\/v1\/organizations\/[^/]+\/(suspend|reactivate)$/.test(url.pathname)) {
        if (suspendStatus !== 204) return err(suspendStatus, suspendCode || 'INTERNAL_ERROR');
        return route.fulfill({ status: 204, body: '' });
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls };
}

async function openPending(page) {
  await page.goto(`${BASE}/quan-tri/to-chuc`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(600);
}

async function openAll(page) {
  await page.goto(`${BASE}/quan-tri/to-chuc/tat-ca`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(600);
}

/** Chọn một mục trong `Selector` (trigger `role=combobox`, mục `role=option`). */
async function pickSelect(page, label, optionName) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: optionName }).click();
  await page.waitForTimeout(400);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Chờ duyệt: header, bảng, badge, 0 antd ────────────────────────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await openPending(page);

    const h1 = (await page.locator('h1').first().innerText()).trim();
    check('chờ duyệt: h1 = "Tổ chức chờ duyệt"', h1 === 'Tổ chức chờ duyệt', h1);

    const antdCount = await page.locator('[class^="ant-"]').count();
    check('chờ duyệt: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const bodyText = await page.locator('body').innerText();
    check('chờ duyệt: có Badge "Chờ duyệt"', bodyText.includes('Chờ duyệt'));
    check('chờ duyệt: hiện loại tổ chức', bodyText.includes('Trường học') || bodyText.includes('Trung tâm'));

    const rows = await page.locator('tbody tr').count();
    check('chờ duyệt: trang 1 hiện 10 dòng (client, PAGE_SIZE=10)', rows === 10, `count=${rows}`);

    const firstUnsorted = (await page.locator('tbody tr').first().innerText()).trim();
    check('chờ duyệt: chưa sắp xếp → giữ thứ tự API (12 trước)', firstUnsorted.includes('Tổ chức 12'), firstUnsorted.replace(/\s+/g, ' ').slice(0, 60));

    check(
      'chờ duyệt: link "Xem" có aria-label riêng + href đúng',
      (await page.getByRole('link', { name: 'Xem chi tiết tổ chức Tổ chức 12' }).count()) === 1,
    );
    const href = await page.getByRole('link', { name: 'Xem chi tiết tổ chức Tổ chức 12' }).getAttribute('href');
    check('chờ duyệt: href = /quan-tri/to-chuc/org-p-12', href === '/quan-tri/to-chuc/org-p-12', String(href));

    check('chờ duyệt: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Chờ duyệt: sắp xếp client theo tên ────────────────────────────── */
  {
    const { context, page } = await newContext(browser);
    await openPending(page);

    await page.getByRole('button', { name: 'Tên tổ chức' }).click();
    await page.waitForTimeout(400);
    const afterAsc = (await page.locator('tbody tr').first().innerText()).trim();
    check('chờ duyệt: bấm sắp xếp → tăng dần, dòng đầu "Tổ chức 01"', afterAsc.includes('Tổ chức 01'), afterAsc.replace(/\s+/g, ' ').slice(0, 60));

    const ariaSort = await page.locator('th').filter({ hasText: 'Tên tổ chức' }).first().getAttribute('aria-sort');
    check('chờ duyệt: header có aria-sort="ascending"', ariaSort === 'ascending', String(ariaSort));

    await page.getByRole('button', { name: 'Tên tổ chức' }).click();
    await page.waitForTimeout(400);
    const afterDesc = (await page.locator('tbody tr').first().innerText()).trim();
    check('chờ duyệt: bấm lần 2 → giảm dần, dòng đầu "Tổ chức 12"', afterDesc.includes('Tổ chức 12'), afterDesc.replace(/\s+/g, ' ').slice(0, 60));
    await context.close();
  }

  /* ── 3. Chờ duyệt: phân trang client KHÔNG gọi lại API ────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openPending(page);

    const before = calls.filter((c) => c.path === '/api/v1/organizations/pending').length;
    const pagNav = page.getByRole('navigation', { name: 'Phân trang danh sách tổ chức chờ duyệt' });
    check('chờ duyệt: có thanh phân trang (nhãn tiếng Việt)', (await pagNav.count()) === 1);

    await pagNav.locator('button').filter({ hasText: /^2$/ }).first().click();
    await page.waitForTimeout(400);
    const page2Rows = await page.locator('tbody tr').count();
    check('chờ duyệt: trang 2 còn 2 dòng', page2Rows === 2, `count=${page2Rows}`);

    const after = calls.filter((c) => c.path === '/api/v1/organizations/pending').length;
    check('chờ duyệt: đổi trang KHÔNG gọi lại API (phân trang client)', before === after, `before=${before} after=${after}`);
    await context.close();
  }

  /* ── 4. Chờ duyệt: rỗng ───────────────────────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { pending: [] });
    await openPending(page);
    const bodyText = await page.locator('body').innerText();
    check('chờ duyệt rỗng: hiện câu rỗng', bodyText.includes('Không có tổ chức nào đang chờ duyệt'));
    check('chờ duyệt rỗng: vẫn còn tiêu đề cột', bodyText.includes('Tên tổ chức'));
    await context.close();
  }

  /* ── 5. Chờ duyệt: lỗi tải → Banner + Thử lại + giữ header ────────────── */
  {
    const { context, page } = await newContext(browser, { pendingStatus: 500 });
    await openPending(page);
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    check('chờ duyệt lỗi: câu lỗi', bodyText.includes('Không tải được danh sách tổ chức.'));
    check('chờ duyệt lỗi: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check('chờ duyệt lỗi: vẫn giữ h1', (await page.locator('h1').count()) >= 1);
    check('chờ duyệt lỗi: có banner role=alert', (await page.getByRole('alert').count()) >= 1);
    await context.close();
  }

  /* ── 6. Tất cả: header, tổng số, phân trang server ────────────────────── */
  {
    const { context, page, calls, pageErrors } = await newContext(browser);
    await openAll(page);

    const h1 = (await page.locator('h1').first().innerText()).trim();
    check('tất cả: h1 = "Tất cả tổ chức"', h1 === 'Tất cả tổ chức', h1);

    const antdCount = await page.locator('[class^="ant-"]').count();
    check('tất cả: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const bodyText = await page.locator('body').innerText();
    check('tất cả: hiện "Tổng 30 tổ chức" (số BE trả)', bodyText.includes('Tổng 30 tổ chức'));

    const pagNav = page.getByRole('navigation', { name: 'Phân trang danh sách tổ chức' });
    check('tất cả: có thanh phân trang (nhãn tiếng Việt)', (await pagNav.count()) === 1);

    const rows = await page.locator('tbody tr').count();
    check('tất cả: trang 1 hiện 20 dòng', rows === 20, `count=${rows}`);

    await pagNav.locator('button').filter({ hasText: /^2$/ }).first().click();
    await page.waitForTimeout(700);
    const page2 = calls.filter((c) => c.path === '/api/v1/organizations').at(-1);
    check('tất cả: đổi trang gọi lại API với page=2', page2?.query?.page === '2', JSON.stringify(page2?.query));

    check('tất cả: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 7. Tất cả: tìm kiếm + bộ lọc + sắp xếp đều đi qua URL ────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openAll(page);
    const lastQuery = () => calls.filter((c) => c.path === '/api/v1/organizations').at(-1)?.query ?? {};

    const search = page.getByRole('searchbox', { name: 'Tìm kiếm' });
    await search.fill('Alpha 05');
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    await page.waitForTimeout(700);
    check('tất cả: tìm kiếm gửi keyword', lastQuery().keyword === 'Alpha 05', JSON.stringify(lastQuery()));

    await pickSelect(page, 'Trạng thái', 'Đã duyệt');
    check('tất cả: lọc trạng thái gửi status=active', lastQuery().status === 'active', JSON.stringify(lastQuery()));

    await pickSelect(page, 'Loại', 'Trung tâm');
    check('tất cả: lọc loại gửi orgType=center', lastQuery().orgType === 'center', JSON.stringify(lastQuery()));

    await page.getByRole('button', { name: 'Ngày gửi' }).click();
    await page.waitForTimeout(700);
    check('tất cả: sắp xếp cột "Ngày gửi" gửi sort=created_at,asc', lastQuery().sort === 'created_at,asc', JSON.stringify(lastQuery()));
    check('tất cả: URL giữ tham số sắp xếp', page.url().includes('sort=created_at%2Casc') || page.url().includes('sort=created_at,asc'), page.url());
    await context.close();
  }

  /* ── 8. Tất cả: rỗng ──────────────────────────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { all: [] });
    await openAll(page);
    const bodyText = await page.locator('body').innerText();
    check('tất cả rỗng: hiện câu rỗng', bodyText.includes('Không có tổ chức nào'));
    check('tất cả rỗng: tổng = 0', bodyText.includes('Tổng 0 tổ chức'));
    await context.close();
  }

  /* ── 9. Tất cả: 404 endpoint chờ backend (D-20) ───────────────────────── */
  {
    const { context, page } = await newContext(browser, { allStatus: 404 });
    await openAll(page);
    await page.waitForTimeout(400);
    const bodyText = await page.locator('body').innerText();
    check('tất cả 404: hiện "Tính năng đang chờ backend (D-20)."', bodyText.includes('Tính năng đang chờ backend (D-20).'));
    check('tất cả 404: vùng tin là role=status (không phải alert)', (await page.getByRole('status').count()) >= 1);
    check('tất cả 404: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check('tất cả 404: KHÔNG hiện bảng rỗng', !bodyText.includes('Không có tổ chức nào'));
    await context.close();
  }

  /* ── 10. Tất cả: lỗi 500 → Banner role=alert ──────────────────────────── */
  {
    const { context, page } = await newContext(browser, { allStatus: 500 });
    await openAll(page);
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    check('tất cả lỗi: câu lỗi', bodyText.includes('Không tải được danh sách tổ chức.'));
    check('tất cả lỗi: có banner role=alert', (await page.getByRole('alert').count()) >= 1);
    check('tất cả lỗi: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    await context.close();
  }

  /* ── 11. Vô hiệu hoá: validate lý do bắt buộc → PATCH → toast ─────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openAll(page);

    await page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Tổ chức Alpha 01' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    check('vô hiệu hoá: mở dialog', (await dialog.count()) >= 1);
    check('vô hiệu hoá: tiêu đề "Vô hiệu hoá tổ chức"', (await dialog.innerText()).includes('Vô hiệu hoá tổ chức'));

    await dialog.getByRole('button', { name: 'Vô hiệu hoá', exact: true }).click();
    await page.waitForTimeout(300);
    check('vô hiệu hoá: validate lý do bắt buộc', (await dialog.innerText()).includes('Vui lòng nhập lý do vô hiệu hoá'));
    check('vô hiệu hoá: KHÔNG gửi PATCH khi thiếu lý do', calls.filter((c) => c.path.includes('/suspend')).length === 0);

    await dialog.getByLabel('Lý do vô hiệu hoá').fill('Chưa nộp hồ sơ');
    await dialog.getByRole('button', { name: 'Vô hiệu hoá', exact: true }).click();
    await page.waitForTimeout(900);

    const patch = calls.find((c) => c.method === 'PATCH' && c.path === '/api/v1/organizations/org-a-1/suspend');
    check('vô hiệu hoá: PATCH suspend kèm reason', patch?.body?.reason === 'Chưa nộp hồ sơ', JSON.stringify(patch?.body));
    check('vô hiệu hoá: toast thành công', (await page.locator('body').innerText()).includes('Đã vô hiệu hoá tổ chức'));
    check('vô hiệu hoá: đóng dialog', (await page.getByRole('dialog').count()) === 0);
    await context.close();
  }

  /* ── 12. Kích hoạt lại: lý do tuỳ chọn → PATCH ────────────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openAll(page);

    await page.getByRole('button', { name: 'Kích hoạt lại tổ chức Tổ chức Alpha 02' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    check('kích hoạt lại: mở dialog', (await dialog.count()) >= 1);

    await dialog.getByRole('button', { name: 'Kích hoạt lại', exact: true }).click();
    await page.waitForTimeout(900);
    const patch = calls.find((c) => c.method === 'PATCH' && c.path === '/api/v1/organizations/org-a-2/reactivate');
    check('kích hoạt lại: PATCH reactivate không cần lý do', !!patch && patch.body?.reason === undefined, JSON.stringify(patch?.body));
    check('kích hoạt lại: toast thành công', (await page.locator('body').innerText()).includes('Đã kích hoạt lại tổ chức'));
    await context.close();
  }

  /* ── 13. Lỗi 500 khi vô hiệu hoá: lỗi hiện TRONG modal, KHÔNG báo thành công ── */
  {
    const { context, page } = await newContext(browser, { suspendStatus: 500 });
    await openAll(page);

    await page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Tổ chức Alpha 01' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Lý do vô hiệu hoá').fill('Thử lỗi máy chủ');
    await dialog.getByRole('button', { name: 'Vô hiệu hoá', exact: true }).click();
    await page.waitForTimeout(1500);

    const dialogText = await dialog.innerText();
    check('vô hiệu hoá lỗi: câu lỗi trong modal', dialogText.includes('Không lưu được, vui lòng thử lại.'));
    check('vô hiệu hoá lỗi: modal KHÔNG đóng', (await page.getByRole('dialog').count()) >= 1);
    check('vô hiệu hoá lỗi: KHÔNG báo thành công (NFR-REL-001)', !(await page.locator('body').innerText()).includes('Đã vô hiệu hoá tổ chức'));
    await context.close();
  }

  /* ── 14. 403 khi vô hiệu hoá: câu không có quyền ──────────────────────── */
  {
    const { context, page } = await newContext(browser, { suspendStatus: 403, suspendCode: 'FORBIDDEN' });
    await openAll(page);

    await page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Tổ chức Alpha 01' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Lý do vô hiệu hoá').fill('Thử 403');
    await dialog.getByRole('button', { name: 'Vô hiệu hoá', exact: true }).click();
    await page.waitForTimeout(1500);
    check('vô hiệu hoá 403: câu không có quyền', (await dialog.innerText()).includes('Bạn không có quyền thực hiện thao tác này.'));
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

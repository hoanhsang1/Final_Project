/**
 * ux-review/probe-p5b1.mjs — kiểm tra HÀNH VI của nhóm Quản trị Đợt B1 sau khi
 * port sang Astryx (P5-B1):
 *   - `AccountsPage`       (`/quan-tri/tai-khoan`)
 *   - `AccountCreateModal` (dùng trong `AccountsPage`)
 *
 * Dump chỉ chụp ảnh tĩnh, nên probe này chạy tay các phần tương tác: tìm kiếm +
 * 3 bộ lọc + sắp xếp đều đi qua URL, phân trang SERVER (có gọi lại API), rỗng,
 * 404 endpoint chờ backend (D-24), lỗi tải, và luồng Tạo tài khoản (validate tại
 * chỗ, POST đúng payload, 409 hiện TRONG modal — NFR-REL-001).
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p5b1.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const ORG_NAME = 'Trường THPT Nguyễn Du';

const ROLES = ['SUPER_ADMIN', 'ORG_OWNER', 'TEACHER', 'ORG_ADMIN'];
const STATUSES = ['active', 'locked', 'disabled', 'pending'];

/** 25 tài khoản → 2 trang với `size=20` (phân trang SERVER). */
const ACCOUNTS = Array.from({ length: 25 }, (_, i) => {
  const n = i + 1;
  return {
    id: `acc-${n}`,
    username: n === 2 ? 'lequydon' : `nguoidung${String(n).padStart(2, '0')}`,
    email: `user${n}@example.edu.vn`,
    full_name: `Người dùng ${n}`,
    organization_id: ORG_ID,
    organization_name: ORG_NAME,
    role: ROLES[i % ROLES.length],
    status: STATUSES[i % STATUSES.length],
    created_at: `2026-10-${String((n % 28) + 1).padStart(2, '0')}T08:00:00`,
    last_login_at: n % 3 === 0 ? null : '2026-11-01T09:00:00',
  };
});

/** Danh sách nhỏ cho luồng tạo tài khoản — dòng mới phải nằm ngay trang 1. */
const SMALL_ACCOUNTS = ACCOUNTS.slice(0, 3);

const ORG_OPTIONS = [{ id: ORG_ID, name: ORG_NAME }];

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
    accounts = ACCOUNTS,
    accountsStatus = 200,
    createStatus = 201,
    roles = ['SUPER_ADMIN'],
  } = {},
) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'vi-VN',
  });
  await context.addInitScript((access) => {
    localStorage.setItem('mems.accessToken', access);
    localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
  }, tokenFor(roles));
  const page = await context.newPage();
  const pageErrors = [];
  const calls = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

  // Bản sao để POST thêm dòng không đụng bản gốc dùng chung giữa các ca.
  const store = accounts.map((a) => ({ ...a }));

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

      if (method === 'GET' && url.pathname === '/api/v1/organizations/options') {
        return json(200, ORG_OPTIONS);
      }

      if (method === 'GET' && url.pathname === '/api/v1/accounts') {
        if (accountsStatus !== 200) return err(accountsStatus, 'INTERNAL_ERROR');
        const p = Number(url.searchParams.get('page') ?? '1') || 1;
        const size = Number(url.searchParams.get('size') ?? '20') || 20;
        const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase();
        const status = url.searchParams.get('status');
        const role = url.searchParams.get('role');
        const organizationId = url.searchParams.get('organizationId');
        let filtered = store;
        if (status) filtered = filtered.filter((a) => status.split(',').includes(a.status));
        if (role) filtered = filtered.filter((a) => a.role === role);
        if (organizationId) filtered = filtered.filter((a) => a.organization_id === organizationId);
        if (keyword) {
          filtered = filtered.filter(
            (a) =>
              a.username.toLowerCase().includes(keyword) ||
              a.email.toLowerCase().includes(keyword) ||
              (a.full_name ?? '').toLowerCase().includes(keyword),
          );
        }
        return json(200, {
          items: filtered.slice((p - 1) * size, p * size),
          total: filtered.length,
          page: p,
          size,
        });
      }

      if (method === 'POST' && url.pathname === '/api/v1/accounts') {
        if (createStatus !== 201) {
          return err(
            createStatus,
            createStatus === 409 ? 'EMAIL_EXISTS' : 'INTERNAL_ERROR',
          );
        }
        const org = ORG_OPTIONS.find((o) => o.id === body?.organization_id);
        const created = {
          id: `acc-new-${store.length}`,
          username: (body?.email ?? '').split('@')[0] || 'nguoidungmoi',
          email: body?.email ?? '',
          full_name: body?.full_name ?? '',
          organization_id: body?.organization_id ?? null,
          organization_name: org?.name ?? null,
          role: body?.role ?? 'TEACHER',
          status: 'pending',
          created_at: '2026-11-18T08:00:00',
          last_login_at: null,
        };
        store.push(created);
        return json(201, created);
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls };
}

async function openAccounts(page) {
  await page.goto(`${BASE}/quan-tri/tai-khoan`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(700);
}

/**
 * Chọn một mục trong `Selector`.
 *
 * `triggerRole`: `Selector` thường để trigger là `<button role="combobox">`, nhưng
 * khi bật `hasSearch` thì Astryx đặt `role="combobox"` lên **ô tìm kiếm trong
 * popup** còn trigger chỉ là `<button>` (không role) — tên đọc được là
 * "<nhãn> <giá trị|placeholder>". Vì vậy phải chỉ định đúng role của trigger.
 */
async function pickSelect(page, label, optionName, scope = page, triggerRole = 'combobox') {
  await scope.getByRole(triggerRole, { name: label }).click();
  await page.getByRole('option', { name: optionName }).click();
  await page.waitForTimeout(400);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Danh sách: header, bảng, badge, link, 0 antd ─────────────────── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await openAccounts(page);

    const h1 = (await page.locator('h1').first().innerText()).trim();
    check('danh sách: h1 = "Quản lý tài khoản"', h1 === 'Quản lý tài khoản', h1);

    const antdCount = await countAntd(page);
    check('danh sách: 0 phần tử antd', antdCount === 0, `count=${antdCount}`);

    const bodyText = await page.locator('body').innerText();
    check('danh sách: nhãn vai trò tiếng Việt', bodyText.includes('Admin hệ thống') && bodyText.includes('Chủ tổ chức') && bodyText.includes('Giáo viên'));
    check('danh sách: badge trạng thái kèm chữ', bodyText.includes('Đang hoạt động') && bodyText.includes('Đang khoá'));

    const rows = await page.locator('tbody tr').count();
    check('danh sách: trang 1 hiện 20 dòng (server, size=20)', rows === 20, `count=${rows}`);

    const link = page.getByRole('link', { name: 'Xem chi tiết tài khoản lequydon' });
    check('danh sách: link "Xem" có aria-label riêng', (await link.count()) === 1);
    check(
      'danh sách: href = /quan-tri/tai-khoan/acc-2?from=tai-khoan',
      (await link.getAttribute('href')) === '/quan-tri/tai-khoan/acc-2?from=tai-khoan',
      String(await link.getAttribute('href')),
    );

    check('danh sách: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Danh sách: tìm kiếm + 3 bộ lọc + sắp xếp đều đi qua URL ──────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openAccounts(page);
    const lastQuery = () =>
      calls.filter((c) => c.path === '/api/v1/accounts' && c.method === 'GET').at(-1)?.query ?? {};

    const search = page.getByRole('searchbox', { name: 'Tìm kiếm' });
    await search.fill('lequydon');
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    await page.waitForTimeout(700);
    check('danh sách: tìm kiếm gửi keyword', lastQuery().keyword === 'lequydon', JSON.stringify(lastQuery()));

    await pickSelect(page, 'Tổ chức', ORG_NAME);
    check('danh sách: lọc tổ chức gửi organizationId', lastQuery().organizationId === ORG_ID, JSON.stringify(lastQuery()));

    await pickSelect(page, 'Vai trò', 'Giáo viên');
    check('danh sách: lọc vai trò gửi role=TEACHER', lastQuery().role === 'TEACHER', JSON.stringify(lastQuery()));

    await pickSelect(page, 'Trạng thái', 'Đang khoá');
    check('danh sách: lọc trạng thái gửi status=locked', lastQuery().status === 'locked', JSON.stringify(lastQuery()));

    // Xoá bộ lọc trạng thái bằng nút "x" của `hasClear` → bỏ tham số. Nút clear
    // tự đặt tên đọc được là "Xóa <nhãn>" (WCAG 2.5.3) nên chọn theo tên, tránh
    // bắt nhầm nút clear của ô tìm kiếm ("Xóa Tìm kiếm").
    await page.getByRole('combobox', { name: 'Trạng thái' }).hover();
    await page.getByRole('button', { name: 'Xóa Trạng thái' }).click();
    await page.waitForTimeout(600);
    check('danh sách: xoá nhanh bộ lọc trạng thái → bỏ status', lastQuery().status === undefined, JSON.stringify(lastQuery()));

    await page.getByRole('button', { name: 'Ngày tạo' }).click();
    await page.waitForTimeout(700);
    check('danh sách: sắp xếp cột "Ngày tạo" gửi sort=created_at,asc', lastQuery().sort === 'created_at,asc', JSON.stringify(lastQuery()));
    check(
      'danh sách: URL giữ tham số sắp xếp',
      page.url().includes('sort=created_at%2Casc') || page.url().includes('sort=created_at,asc'),
      page.url(),
    );
    await context.close();
  }

  /* ── 3. Danh sách: phân trang SERVER (có gọi lại API page=2) ──────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openAccounts(page);

    const pagNav = page.getByRole('navigation', { name: 'Phân trang danh sách tài khoản' });
    check('danh sách: có thanh phân trang (nhãn tiếng Việt)', (await pagNav.count()) === 1);

    await pagNav.locator('button').filter({ hasText: /^2$/ }).first().click();
    await page.waitForTimeout(700);
    const last = calls.filter((c) => c.path === '/api/v1/accounts' && c.method === 'GET').at(-1);
    check('danh sách: đổi trang gọi lại API với page=2', last?.query?.page === '2', JSON.stringify(last?.query));
    await context.close();
  }

  /* ── 4. Danh sách: rỗng ───────────────────────────────────────────────── */
  {
    const { context, page } = await newContext(browser, { accounts: [] });
    await openAccounts(page);
    const bodyText = await page.locator('body').innerText();
    check('danh sách rỗng: hiện câu rỗng', bodyText.includes('Không có tài khoản nào'));
    check('danh sách rỗng: vẫn còn tiêu đề cột', bodyText.includes('Tên đăng nhập'));
    await context.close();
  }

  /* ── 5. Danh sách: 404 endpoint chờ backend (D-24) ────────────────────── */
  {
    const { context, page } = await newContext(browser, { accountsStatus: 404 });
    await openAccounts(page);
    await page.waitForTimeout(400);
    const bodyText = await page.locator('body').innerText();
    check('danh sách 404: hiện "Tính năng đang chờ backend (D-24)."', bodyText.includes('Tính năng đang chờ backend (D-24).'));
    check('danh sách 404: vùng tin là role=status (không phải alert)', (await page.getByRole('status').count()) >= 1);
    check('danh sách 404: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check('danh sách 404: KHÔNG hiện bảng rỗng', !bodyText.includes('Không có tài khoản nào'));
    check('danh sách 404: vẫn giữ h1', (await page.locator('h1').count()) >= 1);
    await context.close();
  }

  /* ── 6. Danh sách: lỗi 500 → Banner role=alert + giữ header ───────────── */
  {
    const { context, page } = await newContext(browser, { accountsStatus: 500 });
    await openAccounts(page);
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    check('danh sách lỗi: câu lỗi', bodyText.includes('Không tải được danh sách tài khoản.'));
    check('danh sách lỗi: có banner role=alert', (await page.getByRole('alert').count()) >= 1);
    check('danh sách lỗi: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    check('danh sách lỗi: VẪN giữ h1 (khác bản antd cũ)', (await page.locator('h1').count()) >= 1);
    await context.close();
  }

  /* ── 7. Tạo tài khoản: modal 4 trường, POST đúng payload, toast + dòng mới ── */
  {
    const { context, page, calls } = await newContext(browser, { accounts: SMALL_ACCOUNTS });
    await openAccounts(page);

    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const dialog = page.getByRole('dialog');
    check('tạo: mở dialog', (await dialog.count()) >= 1);
    check('tạo: tiêu đề "Tạo tài khoản"', (await dialog.innerText()).includes('Tạo tài khoản'));
    check('tạo: có gợi ý CREATE_HINT', (await dialog.innerText()).includes('Tên đăng nhập và mật khẩu tạm sẽ do hệ thống sinh'));

    await dialog.getByLabel('Email').fill('giaovienmoi@example.edu.vn');
    await dialog.getByLabel('Họ tên').fill('Giáo viên mới');
    await pickSelect(page, 'Vai trò', 'Quản trị tổ chức', dialog);
    await pickSelect(page, 'Tổ chức', ORG_NAME, dialog, 'button');
    await dialog.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await page.waitForTimeout(900);

    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/v1/accounts');
    check('tạo: POST payload đủ 4 trường', post?.body?.email === 'giaovienmoi@example.edu.vn' && post?.body?.full_name === 'Giáo viên mới' && post?.body?.role === 'ORG_ADMIN' && post?.body?.organization_id === ORG_ID, JSON.stringify(post?.body));
    check('tạo: toast "Đã tạo tài khoản."', (await page.locator('body').innerText()).includes('Đã tạo tài khoản.'));
    check('tạo: dialog đóng', (await page.getByRole('dialog').count()) === 0);
    check('tạo: dòng mới xuất hiện (username sinh từ email)', (await page.locator('body').innerText()).includes('giaovienmoi'));
    await context.close();
  }

  /* ── 8. Tạo tài khoản: bỏ trống → lỗi tại chỗ, KHÔNG gửi POST ─────────── */
  {
    const { context, page, calls } = await newContext(browser, { accounts: SMALL_ACCOUNTS });
    await openAccounts(page);

    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await page.waitForTimeout(400);

    check('tạo lỗi validate: hiện "Vui lòng nhập email"', (await dialog.innerText()).includes('Vui lòng nhập email'));
    check('tạo lỗi validate: KHÔNG gửi POST', calls.filter((c) => c.method === 'POST').length === 0);
    check('tạo lỗi validate: KHÔNG có toast thành công', !(await page.locator('body').innerText()).includes('Đã tạo tài khoản.'));
    check('tạo lỗi validate: dialog vẫn mở', (await page.getByRole('dialog').count()) >= 1);
    await context.close();
  }

  /* ── 9. Tạo tài khoản: 409 → lỗi TRONG modal, không toast (NFR-REL-001) ── */
  {
    const { context, page } = await newContext(browser, {
      accounts: SMALL_ACCOUNTS,
      createStatus: 409,
    });
    await openAccounts(page);

    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Email').fill('trung@example.edu.vn');
    await dialog.getByLabel('Họ tên').fill('Trùng Email');
    await pickSelect(page, 'Vai trò', 'Quản trị tổ chức', dialog);
    await pickSelect(page, 'Tổ chức', ORG_NAME, dialog, 'button');
    await dialog.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await page.waitForTimeout(900);

    check('tạo 409: câu lỗi trong modal', (await dialog.innerText()).includes('Email hoặc tên đăng nhập đã tồn tại.'));
    check('tạo 409: KHÔNG toast thành công', !(await page.locator('body').innerText()).includes('Đã tạo tài khoản.'));
    check('tạo 409: dialog vẫn mở', (await page.getByRole('dialog').count()) >= 1);
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

/**
 * ux-review/probe-p5b2.mjs — kiểm tra HÀNH VI của nhóm Quản trị Đợt B2 sau khi
 * port sang Astryx (P5-B2):
 *   - `AccountDetailPage`              (`/quan-tri/tai-khoan/:id`)
 *   - `AccountStatusModal`             (đổi trạng thái)
 *   - `AccountRoleModal`               (đổi vai trò)
 *   - `AccountResetPasswordModal`      (đặt lại mật khẩu)
 *
 * Dump chỉ chụp ảnh tĩnh, nên probe này chạy tay các phần tương tác: ma trận nút
 * theo 4 trạng thái tài khoản, đổi trạng thái thành công (toast + refetch đổi
 * nút), lỗi 500 hiện TRONG modal (NFR-REL-001, KHÔNG hiện thành công), 404 →
 * `StatusScreen`, lỗi tải chi tiết → `Banner` + Thử lại, validate đổi vai trò
 * trùng, 2 chế độ đặt lại mật khẩu + validate < 8 ký tự, và nhật ký lỗi không
 * kéo sập màn.
 *
 * KHÔNG assert "0 phần tử antd": khối nhật ký dùng `AuditLogTable` — còn antd
 * tới P5-C (xem kế hoạch). Vì vậy probe này bỏ hẳn check `.ant-*`.
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 * Không cài thêm thư viện (dùng `playwright` trong frontend/node_modules).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-p5b2.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const ORG_NAME = 'Trường THPT Nguyễn Du';
const ACCOUNT_ID = 'acc-2';

/** Tài khoản mặc định: `active`, vai trò `ORG_OWNER` (Chủ tổ chức). */
const BASE_ACCOUNT = {
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

const ORG_OPTIONS = [{ id: ORG_ID, name: ORG_NAME }];

const AUDIT_ITEMS = [
  {
    id: 'log-1',
    action: 'ACCOUNT_STATUS_UPDATE',
    target_type: 'account',
    target_id: ACCOUNT_ID,
    target_name: 'lequydon',
    description: 'Đổi trạng thái tài khoản',
    created_at: '2026-11-01T09:00:00',
  },
];

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

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Bối cảnh mới. `account` là bản sao ĐỘC LẬP để PATCH cập nhật rồi refetch thấy
 * giá trị mới (giống BE thật).
 */
async function newContext(
  browser,
  {
    account = BASE_ACCOUNT,
    detailStatus = 200,
    auditMissing = false,
    statusPatchStatus = 204,
    rolePatchStatus = 204,
    resetStatus = 204,
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

  const store = { ...account };

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
      const noContent = () => route.fulfill({ status: 204 });

      if (method === 'GET' && url.pathname === '/api/v1/organizations/options') {
        return json(200, ORG_OPTIONS);
      }

      if (method === 'GET' && url.pathname === `/api/v1/accounts/${ACCOUNT_ID}`) {
        if (detailStatus !== 200) {
          return err(detailStatus, detailStatus === 404 ? 'ACCOUNT_NOT_FOUND' : 'INTERNAL_ERROR');
        }
        return json(200, store);
      }

      if (method === 'GET' && url.pathname === '/api/v1/audit-logs') {
        if (auditMissing) return err(404, 'NOT_FOUND');
        return json(200, { items: AUDIT_ITEMS, total: AUDIT_ITEMS.length, page: 1, size: 20 });
      }

      if (method === 'PATCH' && url.pathname === `/api/v1/accounts/${ACCOUNT_ID}/status`) {
        if (statusPatchStatus !== 204) return err(statusPatchStatus, 'INTERNAL_ERROR');
        store.status = body?.status ?? store.status;
        return noContent();
      }

      if (method === 'PATCH' && url.pathname === `/api/v1/accounts/${ACCOUNT_ID}/role`) {
        if (rolePatchStatus !== 204) return err(rolePatchStatus, 'INTERNAL_ERROR');
        store.role = body?.role ?? store.role;
        return noContent();
      }

      if (method === 'POST' && url.pathname === `/api/v1/accounts/${ACCOUNT_ID}/reset-password`) {
        if (resetStatus !== 204) return err(resetStatus, 'INTERNAL_ERROR');
        return noContent();
      }

      return json(200, {});
    },
  );

  return { context, page, pageErrors, calls };
}

async function openDetail(page) {
  await page.goto(`${BASE}/quan-tri/tai-khoan/${ACCOUNT_ID}`, { waitUntil: 'domcontentloaded' });
  // Nhánh lỗi tải chi tiết trả `Banner` trần (KHÔNG có `h1`) — giống
  // `OrganizationDetailPage`. Nên chỉ chờ h1 nếu có, không bắt buộc.
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
}

/** Mở modal, điền lý do, xác nhận — dùng chung cho các ca đổi trạng thái. */
async function changeStatus(page, buttonName, confirmLabel, reason) {
  await page.getByRole('button', { name: buttonName }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  if (reason != null) {
    await dialog.locator('textarea').fill(reason);
  }
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click();
  await page.waitForTimeout(900);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });

  /* ── 1. Chi tiết: header, 8 dòng metadata, Badge trạng thái, nhật ký ──── */
  {
    const { context, page, pageErrors } = await newContext(browser);
    await openDetail(page);

    const h1 = (await page.locator('h1').first().innerText()).trim();
    check('chi tiết: h1 = "lequydon"', h1 === 'lequydon', h1);

    const headings = await page.locator('h2').allInnerTexts();
    check('chi tiết: có heading "Thông tin tài khoản"', headings.some((h) => h.includes('Thông tin tài khoản')));
    check('chi tiết: có heading "Nhật ký của tài khoản"', headings.some((h) => h.includes('Nhật ký của tài khoản')));

    const body = await page.locator('body').innerText();
    const labels = [
      'Tên đăng nhập',
      'Email',
      'Họ tên',
      'Tổ chức',
      'Vai trò',
      'Trạng thái',
      'Ngày tạo',
      'Đăng nhập gần nhất',
    ];
    const missing = labels.filter((l) => !body.includes(l));
    check('chi tiết: đủ 8 nhãn metadata', missing.length === 0, missing.join(', '));

    check('chi tiết: giá trị vai trò tiếng Việt "Chủ tổ chức"', body.includes('Chủ tổ chức'));
    check('chi tiết: Badge trạng thái kèm chữ "Đang hoạt động"', body.includes('Đang hoạt động'));
    check('chi tiết: ngày định dạng DD/MM/YYYY', body.includes('01/10/2026') && body.includes('01/11/2026'));
    check('chi tiết: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  }

  /* ── 2. Chi tiết: 404 → StatusScreen (nút là BUTTON, không phải link) ──── */
  {
    const { context, page } = await newContext(browser, { detailStatus: 404 });
    await openDetail(page);
    check('chi tiết 404: câu "Không tìm thấy tài khoản."', (await page.locator('body').innerText()).includes('Không tìm thấy tài khoản.'));
    const back = page.getByRole('button', { name: 'Quản lý tài khoản' });
    check('chi tiết 404: nút về danh sách là role=button (StatusScreen)', (await back.count()) === 1);
    await back.click();
    await page.waitForTimeout(500);
    check('chi tiết 404: bấm nút về /quan-tri/tai-khoan', page.url().includes('/quan-tri/tai-khoan'), page.url());
    await context.close();
  }

  /* ── 3. Chi tiết: lỗi 500 → Banner role=alert + Thử lại ───────────────── */
  {
    const { context, page } = await newContext(browser, { detailStatus: 500 });
    await openDetail(page);
    await page.getByRole('alert').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const body = await page.locator('body').innerText();
    check('chi tiết lỗi: câu "Không tải được thông tin tài khoản."', body.includes('Không tải được thông tin tài khoản.'));
    check('chi tiết lỗi: có banner role=alert', (await page.getByRole('alert').count()) >= 1);
    check('chi tiết lỗi: có nút "Thử lại"', (await page.getByRole('button', { name: 'Thử lại' }).count()) >= 1);
    await context.close();
  }

  /* ── 4. Ma trận nút theo 4 trạng thái ─────────────────────────────────── */
  {
    const cases = [
      { status: 'pending', yes: ['Kích hoạt tài khoản lequydon'], no: ['Khoá tài khoản lequydon', 'Vô hiệu hoá tài khoản lequydon'] },
      { status: 'active', yes: ['Khoá tài khoản lequydon', 'Vô hiệu hoá tài khoản lequydon'], no: ['Kích hoạt tài khoản lequydon'] },
      { status: 'locked', yes: ['Mở khoá tài khoản lequydon', 'Vô hiệu hoá tài khoản lequydon'], no: ['Kích hoạt tài khoản lequydon'] },
      { status: 'disabled', yes: ['Kích hoạt lại tài khoản lequydon'], no: ['Vô hiệu hoá tài khoản lequydon', 'Khoá tài khoản lequydon'] },
    ];
    for (const c of cases) {
      const { context, page } = await newContext(browser, { account: { ...BASE_ACCOUNT, status: c.status } });
      await openDetail(page);
      for (const name of c.yes) {
        check(`ma trận ${c.status}: CÓ nút "${name}"`, (await page.getByRole('button', { name }).count()) === 1);
      }
      for (const name of c.no) {
        check(`ma trận ${c.status}: KHÔNG có nút "${name}"`, (await page.getByRole('button', { name }).count()) === 0);
      }
      await context.close();
    }
  }

  /* ── 5. Đổi trạng thái thành công (active → disabled): toast + refetch ── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page);
    await changeStatus(page, 'Vô hiệu hoá tài khoản lequydon', 'Vô hiệu hoá');

    const patch = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/status'));
    check('đổi trạng thái: PATCH status=disabled', patch?.body?.status === 'disabled', JSON.stringify(patch?.body));
    check('đổi trạng thái: bỏ trống lý do → KHÔNG gửi reason', patch?.body?.reason === undefined, JSON.stringify(patch?.body));
    check('đổi trạng thái: toast "Đã cập nhật trạng thái tài khoản \\"lequydon\\"."', (await page.locator('body').innerText()).includes('Đã cập nhật trạng thái tài khoản "lequydon".'));
    check('đổi trạng thái: refetch → nút "Kích hoạt lại tài khoản lequydon"', (await page.getByRole('button', { name: 'Kích hoạt lại tài khoản lequydon' }).count()) === 1);
    check('đổi trạng thái: dialog đã đóng', (await page.getByRole('dialog').count()) === 0);
    await context.close();
  }

  /* ── 6. Đổi trạng thái: lý do được trim rồi gửi kèm ───────────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page);
    await changeStatus(page, 'Khoá tài khoản lequydon', 'Đang khoá', '  vi phạm nội quy  ');
    const patch = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/status'));
    check('đổi trạng thái: gửi status=locked', patch?.body?.status === 'locked', JSON.stringify(patch?.body));
    check('đổi trạng thái: reason đã trim', patch?.body?.reason === 'vi phạm nội quy', JSON.stringify(patch?.body));
    await context.close();
  }

  /* ── 7. Đổi trạng thái: BE lỗi 500 → lỗi TRONG modal, KHÔNG thành công ── */
  {
    const { context, page } = await newContext(browser, { statusPatchStatus: 500 });
    await openDetail(page);
    await changeStatus(page, 'Vô hiệu hoá tài khoản lequydon', 'Vô hiệu hoá');
    const dialog = page.getByRole('dialog');
    check('đổi trạng thái lỗi: câu lỗi TRONG modal', (await dialog.innerText()).includes('Không cập nhật được trạng thái tài khoản, vui lòng thử lại.'));
    check('đổi trạng thái lỗi: KHÔNG có toast thành công', !(await page.locator('body').innerText()).includes('Đã cập nhật trạng thái tài khoản'));
    check('đổi trạng thái lỗi: dialog vẫn mở', (await page.getByRole('dialog').count()) >= 1);
    await context.close();
  }

  /* ── 8. Modal trạng thái: ô lý do chặn cứng 500 ký tự ─────────────────── */
  {
    const { context, page } = await newContext(browser);
    await openDetail(page);
    await page.getByRole('button', { name: 'Vô hiệu hoá tài khoản lequydon' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    const maxLength = await dialog.locator('textarea').getAttribute('maxlength');
    check('modal trạng thái: textarea có maxlength=500', maxLength === '500', String(maxLength));
    await context.close();
  }

  /* ── 9. Đổi vai trò: trùng vai trò bị chặn; đổi khác thì qua + refetch ── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page);

    await page.getByRole('button', { name: 'Đổi vai trò' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    check('đổi vai trò: modal hiện "Vai trò hiện tại" + "Chủ tổ chức"', (await dialog.innerText()).includes('Vai trò hiện tại') && (await dialog.innerText()).includes('Chủ tổ chức'));

    // Chọn ĐÚNG vai trò hiện tại → validate FE chặn, KHÔNG gửi PATCH.
    // Lưu ý: `ORG_OWNER` và `OWNER` cùng nhãn "Chủ tổ chức" → `.first()` (chọn ORG_OWNER).
    await dialog.getByRole('combobox', { name: 'Vai trò' }).click();
    await page.getByRole('option', { name: 'Chủ tổ chức' }).first().click();
    await dialog.getByRole('button', { name: 'Đổi vai trò' }).click();
    await page.waitForTimeout(400);
    check('đổi vai trò trùng: hiện "Vai trò mới phải khác vai trò hiện tại."', (await dialog.innerText()).includes('Vai trò mới phải khác vai trò hiện tại.'));
    check('đổi vai trò trùng: KHÔNG gửi PATCH', calls.filter((c) => c.method === 'PATCH' && c.path.endsWith('/role')).length === 0);

    // Đổi sang vai trò khác → lưu, refetch, màn chi tiết hiện nhãn mới.
    await dialog.getByRole('combobox', { name: 'Vai trò' }).click();
    await page.getByRole('option', { name: 'Quản trị tổ chức' }).first().click();
    await dialog.getByRole('button', { name: 'Đổi vai trò' }).click();
    await page.waitForTimeout(900);
    const patch = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/role'));
    check('đổi vai trò: PATCH role=ORG_ADMIN', patch?.body?.role === 'ORG_ADMIN', JSON.stringify(patch?.body));
    check('đổi vai trò: toast "Đã đổi vai trò tài khoản."', (await page.locator('body').innerText()).includes('Đã đổi vai trò tài khoản.'));
    check('đổi vai trò: refetch → chi tiết hiện "Quản trị tổ chức"', (await page.locator('#noi-dung-chinh').innerText()).includes('Quản trị tổ chức'));
    await context.close();
  }

  /* ── 10. Đặt lại mật khẩu: 2 chế độ + validate < 8 ký tự ─────────────── */
  {
    const { context, page, calls } = await newContext(browser);
    await openDetail(page);

    // Mặc định: gửi email → KHÔNG có ô mật khẩu, POST không kèm new_password.
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    check('đặt lại email: hiện câu "Mật khẩu tạm sẽ được gửi tới email của tài khoản này."', (await dialog.innerText()).includes('Mật khẩu tạm sẽ được gửi tới email của tài khoản này.'));
    check('đặt lại email: KHÔNG hiện ô "Mật khẩu mới"', (await dialog.getByLabel('Mật khẩu mới', { exact: true }).count()) === 0);
    check('đặt lại email: radio "Gửi mật khẩu tạm qua email" mặc định chọn', await dialog.getByRole('radio', { name: 'Gửi mật khẩu tạm qua email' }).isChecked());

    await dialog.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await page.waitForTimeout(900);
    const emailPost = calls.find((c) => c.method === 'POST' && c.path.endsWith('/reset-password'));
    check('đặt lại email: POST KHÔNG kèm new_password', emailPost?.body?.new_password === undefined, JSON.stringify(emailPost?.body));
    check('đặt lại email: toast "Đã gửi mật khẩu tạm tới email của tài khoản."', (await page.locator('body').innerText()).includes('Đã gửi mật khẩu tạm tới email của tài khoản.'));

    // Chế độ thủ công: mật khẩu < 8 ký tự bị chặn tại trường, KHÔNG gửi POST.
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByRole('radio', { name: 'Đặt mật khẩu mới thủ công' }).check();
    await page.waitForTimeout(300);
    check('đặt lại thủ công: hiện ô "Mật khẩu mới"', (await dialog.getByLabel('Mật khẩu mới', { exact: true }).count()) === 1);
    await dialog.getByLabel('Mật khẩu mới', { exact: true }).fill('ngan');
    await dialog.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await page.waitForTimeout(400);
    check('đặt lại thủ công: hiện "Mật khẩu tối thiểu 8 ký tự"', (await dialog.innerText()).includes('Mật khẩu tối thiểu 8 ký tự'));
    check('đặt lại thủ công <8: KHÔNG có toast thành công', !(await page.locator('body').innerText()).includes('Đã đặt lại mật khẩu tài khoản.'));

    // Mật khẩu hợp lệ → gửi new_password, toast.
    await dialog.getByLabel('Mật khẩu mới', { exact: true }).fill('matkhau123');
    await dialog.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await page.waitForTimeout(900);
    const manualPost = calls.filter((c) => c.method === 'POST' && c.path.endsWith('/reset-password')).at(-1);
    check('đặt lại thủ công: POST kèm new_password', manualPost?.body?.new_password === 'matkhau123', JSON.stringify(manualPost?.body));
    check('đặt lại thủ công: toast "Đã đặt lại mật khẩu tài khoản."', (await page.locator('body').innerText()).includes('Đã đặt lại mật khẩu tài khoản.'));
    await context.close();
  }

  /* ── 11. Nhật ký lỗi (D-22) không kéo sập màn chi tiết ────────────────── */
  {
    const { context, page, pageErrors } = await newContext(browser, { auditMissing: true });
    await openDetail(page);
    const body = await page.locator('body').innerText();
    check('nhật ký lỗi: chi tiết vẫn đọc được (heading + username)', (await page.getByRole('heading', { name: 'Thông tin tài khoản' }).count()) === 1 && body.includes('lequydon'));
    check('nhật ký lỗi: chỉ khối nhật ký báo lỗi', body.includes('Không tải được nhật ký của tài khoản.'));
    check('nhật ký lỗi: không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));
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

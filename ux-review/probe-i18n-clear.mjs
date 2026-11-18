/**
 * ux-review/probe-i18n-clear.mjs — kiểm chứng khoá i18n
 * `@astryx.inputClearButton.tooltip` (bản gốc tiếng Anh "Clear") đã được bù ở
 * `frontend/src/main.tsx` (`astryxViOverrides`) và thật sự hiện ra màn hình.
 *
 * Vì sao cần probe riêng: dump chỉ chụp innerText/cấu trúc ở trạng thái tĩnh;
 * nút xoá nhanh CHỈ hiện khi field `hasClear` có giá trị, và tooltip chỉ hiện
 * khi hover/focus → không dump nào bắt được. Phải gõ chữ rồi hover thật.
 *
 * RÀNG BUỘC: chỉ ĐỌC app; mọi API bị chặn bằng `page.route` (BE không chạy).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\probe-i18n-clear.mjs"
 */

import { createRequire } from 'node:module';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

const SEARCH_LABEL = 'Tìm theo mã nhân sự hoặc họ tên';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function tokenFor() {
  const claims = {
    userId: 'u-self',
    username: 'giao.vu',
    roles: ['ACADEMIC_STAFF'],
    permissions: ['PEOPLE_VIEW'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}

const TEACHERS = [
  {
    userId: 't1',
    staffCode: 'GV001',
    fullName: 'Nguyễn Thị Mai',
    email: 'mai@truong.edu.vn',
    specialty: { id: 's1', name: 'Toán' },
    teachingStatus: 'DANG_DAY',
  },
];

const API_RE = /^\/api\//;

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'vi-VN',
  });
  await context.addInitScript(
    ([access]) => {
      localStorage.setItem('mems.accessToken', access);
      localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
    },
    [tokenFor()],
  );

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

  await page.route(
    (url) => API_RE.test(url.pathname),
    async (route, request) => {
      const url = new URL(request.url());
      const json = (status, payload) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });

      if (url.pathname === '/api/teachers') {
        return json(200, { items: TEACHERS, total: TEACHERS.length, page: 1, size: 20, pages: 1 });
      }
      if (url.pathname === '/api/specialties') {
        return json(200, [{ id: 's1', name: 'Toán' }]);
      }
      if (url.pathname === '/api/positions' || url.pathname === '/api/departments') {
        return json(200, []);
      }
      return json(200, {});
    },
  );

  await page.goto(`${BASE}/dao-tao/giao-vien`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.fonts.ready);

  check('trang Giáo viên tải được', (await page.getByRole('heading', { level: 1 }).count()) >= 1);
  check('danh sách giáo viên hiện', (await page.getByText('Nguyễn Thị Mai').count()) >= 1);

  // Truy field bằng ROLE (không `getByLabel`): sau khi gõ, `getByLabel(<nhãn>)`
  // khớp cả input LẪN nút xoá (aria-label của nút = "Xóa <nhãn>") → strict mode đỏ.
  //
  // LƯU Ý CHÍNH TẢ: tên đọc được của nút do Astryx dịch là "Xóa" (dấu ở `o`,
  // `@astryx.textInput.clearLabel`); chữ do app tự viết lại là "Xoá" (dấu ở `a`).
  // Khoá bù ở `main.tsx` cố ý chọn "Xóa" cho khớp tên đọc được của CHÍNH nút này.
  const CLEAR_NAME = `Xóa ${SEARCH_LABEL}`;
  const searchInput = page.getByRole('searchbox', { name: SEARCH_LABEL });

  // Nút xoá nhanh CHƯA hiện khi field rỗng.
  const clearBefore = await page.getByRole('button', { name: CLEAR_NAME }).count();
  check('field rỗng: chưa có nút xoá nhanh', clearBefore === 0, `count=${clearBefore}`);

  // Gõ phím THẬT (không `fill()`): Astryx `TextInput` dùng `useOptimistic`, và
  // `fill()` chỉ đặt value + bắn một `input` event nên giá trị KHÔNG vào state
  // React → `hasClear && value !== ''` vẫn false, nút xoá không render.
  await searchInput.click();
  await page.keyboard.type('GV', { delay: 30 });
  await page.waitForTimeout(400);
  const clearButton = page.getByRole('button', { name: CLEAR_NAME });
  const clearAfter = await clearButton.count();
  check('có giá trị: nút xoá nhanh xuất hiện', clearAfter === 1, `count=${clearAfter}`);
  check('tên đọc được của nút xoá là tiếng Việt', clearAfter === 1, `aria-label="${CLEAR_NAME}"`);

  // Hover → tooltip hiện ra. Đây là chỗ khoá thiếu `vi-VN` từng rơi về "Clear".
  let tooltipText = '(không thấy tooltip)';
  if (clearAfter === 1) {
    await clearButton.hover();
    await page.waitForTimeout(700);
    const tooltips = page.getByRole('tooltip');
    const n = await tooltips.count();
    if (n > 0) {
      tooltipText = (await tooltips.first().innerText()).trim();
    } else {
      // Dự phòng: nội dung tooltip nằm sau `aria-describedby` của nút.
      const id = await clearButton.getAttribute('aria-describedby');
      if (id) {
        const el = page.locator(`#${id}`);
        if ((await el.count()) > 0) tooltipText = (await el.first().innerText()).trim();
      }
    }
  }
  check('hover: tooltip hiện', tooltipText !== '(không thấy tooltip)', tooltipText);
  check('tooltip bằng tiếng Việt "Xóa"', tooltipText === 'Xóa', tooltipText);
  check('tooltip KHÔNG phải "Clear"', tooltipText !== 'Clear', tooltipText);

  // Hành vi xoá vẫn đúng: bấm nút → field trống.
  if (clearAfter === 1) {
    await clearButton.click();
    await page.waitForTimeout(300);
    const value = await searchInput.inputValue();
    check('bấm nút xoá: field trở về rỗng', value === '', `value="${value}"`);
  }

  check('không có pageerror', pageErrors.length === 0, pageErrors.join(' | '));

  await context.close();
  await browser.close();

  const pass = results.filter((r) => r.pass).length;
  console.log(`\n== TỔNG: ${pass}/${results.length} PASS ==`);
  if (pass !== results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error('LỖI CHẠY PROBE:', e);
  process.exit(1);
});

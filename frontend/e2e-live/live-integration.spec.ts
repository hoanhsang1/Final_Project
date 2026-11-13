import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * E2E "sống" cho toàn bộ màn hình FE hiện có: FE → Gateway → service → MySQL.
 *
 * Chạy: `npm run dev` (5173) + Docker stack, rồi
 *   npx playwright test -c playwright.live.config.ts
 *
 * Dữ liệu tạo ra có hậu tố thời gian; phần tạo được thì dọn ở cuối spec.
 * Các luồng chỉ đọc chạy trên dữ liệu seed của tổ chức `11111111-…`.
 */

const OWNER = { username: 'sample_owner', password: 'Sample@123456' };
const HEAD = { username: 'sample_head', password: 'Sample@123456' };
const ADMIN = { username: 'platform_admin', password: '123456' };

const TS = Date.now().toString().slice(-6);
const DEPT = `PBe2e ${TS}`;
const DEPT_EDITED = `${DEPT} sửa`;
const POSITION = `CVe2e ${TS}`;
const MEMBER = `e2e_staff_${TS}`;
const MEMBER_EMAIL = `e2e_staff_${TS}@example.com`;
const SPECIALTY = `Chuyên môn E2E ${TS}`;
const ORG = `Trường E2E ${TS}`;
const ORG_USER = `e2e_owner_${TS}`;
const ORG_EMAIL = `e2e_owner_${TS}@example.com`;
const ORG_PASS = 'E2e@12345678';

test.describe.configure({ mode: 'serial' });

async function login(
  page: Page,
  username: string,
  password: string,
  opts: { expectSuccess?: boolean } = {},
) {
  await page.goto('/dang-nhap');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  if (opts.expectSuccess !== false) {
    await page.waitForURL((url) => !url.pathname.startsWith('/dang-nhap'));
  }
}

function modal(page: Page): Locator {
  return page.locator('.ant-modal:visible');
}

function formItem(scope: Locator, label: string): Locator {
  return scope.locator('.ant-form-item').filter({ hasText: label }).first();
}

async function pickSelect(page: Page, scope: Locator, label: string, option: string) {
  await formItem(scope, label).locator('.ant-select').click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: option })
    .first()
    .click();
}

async function confirmPopover(page: Page, buttonText: string) {
  await page
    .locator('.ant-popover:visible')
    .getByRole('button', { name: buttonText, exact: true })
    .click();
}

test('01 — đăng nhập sai bị chặn, đăng nhập đúng vào console chủ tổ chức', async ({ page }) => {
  await login(page, OWNER.username, 'SaiMatKhau@123456', { expectSuccess: false });
  await expect(page.getByText('Sai tên đăng nhập hoặc mật khẩu.')).toBeVisible();
  await expect(page).toHaveURL(/\/dang-nhap/);

  await page.getByLabel('Mật khẩu').fill(OWNER.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/to-chuc$/);
  await expect(page.getByRole('heading', { name: 'Phòng ban', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tổ Toán – Tin' })).toBeVisible();
});

test('02 — đăng xuất xoá phiên và quay về trang đăng nhập', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await expect(page).toHaveURL(/\/to-chuc$/);
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/dang-nhap/);
  await page.goto('/to-chuc');
  await expect(page).toHaveURL(/\/dang-nhap/);
});

test('03 — phòng ban: tạo kèm module, sửa, xoá từ UI', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await expect(page).toHaveURL(/\/to-chuc$/);

  await page.getByRole('button', { name: 'Thêm phòng ban' }).click();
  let dialog = modal(page);
  await formItem(dialog, 'Tên phòng ban').locator('input').fill(DEPT);
  await formItem(dialog, 'Mô tả').locator('textarea').fill('Tạo bởi E2E live');
  await formItem(dialog, 'Module phụ trách').locator('.ant-select').click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: 'STUDENT_MANAGEMENT' })
    .first()
    .click();
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('link', { name: DEPT })).toBeVisible();

  await page.getByRole('button', { name: `Sửa phòng ban ${DEPT}` }).click();
  dialog = modal(page);
  await formItem(dialog, 'Tên phòng ban').locator('input').fill(DEPT_EDITED);
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('link', { name: DEPT_EDITED })).toBeVisible();

  await page.getByRole('button', { name: `Xoá phòng ban ${DEPT_EDITED}` }).click();
  await confirmPopover(page, 'Xoá');
  await expect(page.getByRole('link', { name: DEPT_EDITED })).toHaveCount(0);
});

test('04 — chức vụ: tạo kèm quyền, sửa, xoá', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await page.goto('/to-chuc/chuc-vu');
  await expect(page.getByRole('heading', { name: 'Chức vụ', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Thêm chức vụ' }).click();
  let dialog = modal(page);
  await formItem(dialog, 'Tên chức vụ').locator('input').fill(POSITION);
  await formItem(dialog, 'Mô tả').locator('textarea').fill('Tạo bởi E2E live');
  await dialog.getByRole('checkbox', { name: 'Xem nhân viên phòng ban' }).check();
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã tạo chức vụ.')).toBeVisible();
  await expect(page.getByRole('cell', { name: POSITION })).toBeVisible();

  const row = page.getByRole('row').filter({ hasText: POSITION });
  await row.getByRole('button', { name: 'Sửa chức vụ', exact: true }).click();
  dialog = modal(page);
  await formItem(dialog, 'Tên chức vụ').locator('input').fill(`${POSITION} sửa`);
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã cập nhật chức vụ.')).toBeVisible();

  const editedRow = page.getByRole('row').filter({ hasText: `${POSITION} sửa` });
  await editedRow.getByRole('button', { name: 'Xoá', exact: true }).click();
  await confirmPopover(page, 'Xoá');
  await expect(page.getByText('Đã xoá chức vụ.')).toBeVisible();
  await expect(page.getByRole('cell', { name: `${POSITION} sửa` })).toHaveCount(0);
});

test('05 — nhân viên phòng ban: thêm (có mật khẩu tạm), đổi chức vụ, xoá + khoá tài khoản', async ({
  page,
  request,
}) => {
  await login(page, OWNER.username, OWNER.password);
  await page.getByRole('link', { name: 'Tổ Toán – Tin' }).click();
  await expect(page.getByRole('heading', { name: 'Tổ Toán – Tin', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
  const dialog = modal(page);
  await formItem(dialog, 'Tên đăng nhập').locator('input').fill(MEMBER);
  await formItem(dialog, 'Email').locator('input').fill(MEMBER_EMAIL);
  await formItem(dialog, 'Chức vụ').locator('.ant-select').click();
  const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  // Chức vụ TEACHER cần hồ sơ giáo viên → không được chào trong form này.
  await expect(options.filter({ hasText: 'Giáo viên' })).toHaveCount(0);
  await options.filter({ hasText: 'Giáo vụ' }).first().click();
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();

  const tempDialog = page.locator('.ant-modal:visible').filter({ hasText: 'Mật khẩu tạm của nhân viên' });
  await expect(tempDialog).toBeVisible();
  await expect(tempDialog.getByText(MEMBER, { exact: true })).toBeVisible();
  const temporaryPassword = (await tempDialog.locator('code').nth(1).innerText()).trim();
  await tempDialog.getByRole('button', { name: 'Tôi đã lưu mật khẩu' }).click();

  const row = page.getByRole('row').filter({ hasText: MEMBER });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Đổi chức vụ' }).click();
  const posDialog = page.locator('.ant-modal:visible').filter({ hasText: 'Đổi chức vụ' });
  await posDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(posDialog).toBeHidden();

  const rowAfter = page.getByRole('row').filter({ hasText: MEMBER });
  await rowAfter.getByRole('button', { name: 'Xoá khỏi phòng ban' }).click();
  await confirmPopover(page, 'Xoá khỏi phòng ban');
  await expect(page.getByRole('row').filter({ hasText: MEMBER })).toHaveCount(0);

  // D-04: tài khoản bị vô hiệu hoá nên không đăng nhập được nữa.
  const loginRes = await request.post('http://127.0.0.1:8080/api/v1/auth/login', {
    data: { username: MEMBER, password: temporaryPassword },
  });
  expect(loginRes.status()).toBe(403);
  expect((await loginRes.json()).code).toBe('ACCOUNT_NOT_ACTIVE');
});

test('06 — đào tạo: danh sách giáo viên + tìm kiếm + chi tiết + sửa SĐT', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await page.goto('/dao-tao/giao-vien');
  await expect(page.getByRole('heading', { name: 'Giáo viên', level: 1 })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'GV001' })).toBeVisible();

  await page.getByLabel('Tìm theo mã nhân sự hoặc họ tên').fill('Nguyễn Văn An');
  await page.getByLabel('Tìm theo mã nhân sự hoặc họ tên').press('Enter');
  await expect(page.getByRole('cell', { name: 'Nguyễn Văn An' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'GV002' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Nguyễn Văn An' }).click();
  await expect(page).toHaveURL(/\/dao-tao\/giao-vien\//);
  await expect(page.getByRole('tab', { name: 'Lớp phụ trách' })).toBeVisible();

  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  const phone = formItem(page, 'Số điện thoại').locator('input');
  await phone.fill('0912345678');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã cập nhật giáo viên.').first()).toBeVisible();

  // Trả lại dữ liệu seed.
  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await formItem(page, 'Số điện thoại').locator('input').fill('0900000005');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã cập nhật giáo viên.').first()).toBeVisible();

  await page.getByRole('tab', { name: 'Lịch sử thay đổi' }).click();
  await expect(
    page.locator('.ant-tabs-tabpane-active').getByText('Số điện thoại', { exact: false }).first(),
  ).toBeVisible();
});

test('07 — chuyên môn: tạo mới từ màn giáo viên', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await page.goto('/dao-tao/giao-vien');
  await page.getByRole('button', { name: 'Quản lý chuyên môn' }).click();
  const dialog = page.locator('.ant-modal:visible').filter({ hasText: 'Quản lý chuyên môn' });
  await dialog.getByLabel('Tên chuyên môn mới').fill(SPECIALTY);
  await dialog.getByRole('button', { name: 'Thêm', exact: true }).click();
  await expect(dialog.getByText(SPECIALTY)).toBeVisible();
});

test('08 — lớp học: danh sách, lọc trạng thái, chi tiết + 2 tab lịch sử', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await page.goto('/dao-tao/lop-hoc');
  await expect(page.getByRole('heading', { name: 'Lớp học', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'C002' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Tất cả trạng thái' }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Đang diễn ra' }).click();
  await expect(page.getByRole('link', { name: 'C002' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'C001' })).toHaveCount(0);

  await page.getByRole('link', { name: 'C002' }).click();
  await expect(page.getByRole('tab', { name: 'Lịch sử trạng thái' })).toBeVisible();
  await page.getByRole('tab', { name: 'Lịch sử trạng thái' }).click();
  await expect(page.locator('.ant-tabs-tabpane-active').getByRole('columnheader', { name: 'Từ trạng thái' })).toBeVisible();
  await page.getByRole('tab', { name: 'Sự kiện đóng' }).click();
  await expect(page.locator('.ant-tabs-tabpane-active').getByRole('columnheader', { name: 'Hành động' })).toBeVisible();
});

test('09 — vòng đời lớp: yêu cầu đóng → tự duyệt bị chặn → trưởng bộ phận duyệt → mở lại', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await page.goto('/dao-tao/lop-hoc');
  await page.getByRole('link', { name: 'C002' }).click();

  await page.getByRole('button', { name: 'Yêu cầu đóng lớp' }).click();
  const dialog = modal(page);
  await formItem(dialog, 'Ghi chú').locator('textarea').fill('E2E đóng lớp');
  await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Chờ duyệt đóng')).toBeVisible();
  await expect(page.getByText('E2E đóng lớp')).toBeVisible();

  // FE ẩn nút duyệt với chính người gửi yêu cầu.
  await expect(page.getByRole('button', { name: 'Duyệt đóng' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Từ chối', exact: true })).toHaveCount(0);

  // Gọi thẳng BE để chắc chắn chặn tự duyệt (403 SELF_APPROVAL_NOT_ALLOWED).
  const token = await page.evaluate(() => localStorage.getItem('mems.accessToken'));
  const classId = new URL(page.url()).pathname.split('/').pop();
  const res = await page.request.post(`/api/classes/${classId}/close-requests/approve`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(403);
  expect((await res.json()).code).toBe('SELF_APPROVAL_NOT_ALLOWED');
});

test('10 — trưởng bộ phận duyệt đóng rồi mở lại lớp (trả về NONE)', async ({ page }) => {
  await login(page, HEAD.username, HEAD.password);
  await page.goto('/dao-tao/lop-hoc');
  await page.getByRole('link', { name: 'C002' }).click();

  await page.getByRole('button', { name: 'Duyệt đóng' }).click();
  const dialog = modal(page);
  await dialog.getByRole('button', { name: 'Duyệt đóng', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Đã đóng', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Mở lại lớp' }).click();
  const reopenDialog = modal(page);
  await formItem(reopenDialog, 'Lý do mở lại').locator('textarea').fill('E2E mở lại');
  await reopenDialog.getByRole('button', { name: 'Mở lại lớp', exact: true }).click();
  await expect(reopenDialog).toBeHidden();
  await expect(page.getByText('Đã đóng', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Chờ duyệt đóng')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Duyệt đóng' })).toHaveCount(0);
});

test('11 — super admin: tổng quan, module, tài khoản, nhật ký', async ({ page }) => {
  await login(page, ADMIN.username, ADMIN.password);
  await expect(page).toHaveURL(/\/quan-tri$/);
  await expect(page.getByRole('heading', { name: 'Tổng quan', level: 1 })).toBeVisible();

  await page.goto('/quan-tri/module');
  await expect(page.getByRole('heading', { name: 'Danh mục module', level: 1 })).toBeVisible();
  await expect(page.getByText('STUDENT_MANAGEMENT').first()).toBeVisible();

  await page.goto('/quan-tri/tai-khoan');
  await expect(page.getByRole('heading', { name: 'Quản lý tài khoản', level: 1 })).toBeVisible();
  await expect(page.getByText('sample_owner').first()).toBeVisible();

  await page.goto('/quan-tri/nhat-ky');
  await expect(page.getByRole('heading', { name: 'Nhật ký hệ thống', level: 1 })).toBeVisible();

  await page.goto('/quan-tri/to-chuc/tat-ca');
  await expect(page.getByRole('heading', { name: 'Tất cả tổ chức', level: 1 })).toBeVisible();
});

test('12 — đăng ký tổ chức mới → admin duyệt → chủ mới đăng nhập', async ({ page }) => {
  await page.goto('/dang-ky');
  await expect(page.getByRole('heading', { name: 'Đăng ký tổ chức', level: 1 })).toBeVisible();
  await page.getByLabel('Tên tổ chức').fill(ORG);
  await pickSelect(page, page, 'Loại tổ chức', 'Trường học');
  await page.getByRole('checkbox', { name: 'Quản lý học sinh' }).check();
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(ORG_USER);
  await page.getByLabel('Email', { exact: true }).fill(ORG_EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(ORG_PASS);
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(ORG_PASS);
  await page.getByRole('button', { name: 'Gửi đăng ký' }).click();
  await expect(page.getByText('Gửi đăng ký thành công!')).toBeVisible();

  // Admin duyệt.
  await page.goto('/dang-nhap');
  await page.getByLabel('Tên đăng nhập').fill(ADMIN.username);
  await page.getByLabel('Mật khẩu').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/quan-tri$/);
  await page.goto('/quan-tri/to-chuc');
  await expect(page.getByText(ORG).first()).toBeVisible();
  await page.getByRole('button', { name: `Xem chi tiết tổ chức ${ORG}` }).click();
  await page.getByRole('button', { name: 'Duyệt tổ chức' }).click();
  const dialog = modal(page);
  await expect(dialog).toContainText(ORG);
  await dialog.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
  await expect(page.getByText(ORG)).toHaveCount(0);

  // Chủ tổ chức mới đăng nhập được.
  await page.goto('/dang-nhap');
  await page.getByLabel('Tên đăng nhập').fill(ORG_USER);
  await page.getByLabel('Mật khẩu').fill(ORG_PASS);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/to-chuc$/);
  await expect(page.getByText('Chưa có phòng ban nào. Tạo phòng ban đầu tiên để bắt đầu.')).toBeVisible();
});

test('13 — chặn truy cập trái quyền (guard FE)', async ({ page }) => {
  await login(page, OWNER.username, OWNER.password);
  await page.goto('/quan-tri');
  await expect(page.getByText('403')).toBeVisible();
  await page.goto('/quan-tri/to-chuc');
  await expect(page.getByText('403')).toBeVisible();
});

test.afterAll(async () => {
  console.log(`E2E data: dept=${DEPT} position=${POSITION} member=${MEMBER} specialty=${SPECIALTY} org=${ORG} orgUser=${ORG_USER}`);
});

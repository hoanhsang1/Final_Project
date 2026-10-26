import { expect, test } from '@playwright/test';
import { loginAs, mockAdminApi, ORG_A, ORG_C } from './helpers';

/**
 * Cấu hình module cho tổ chức — Đặc tả Sprint 2 §5.6 (`TC-MOD-*`).
 *
 * ⚠️ Endpoint `PUT /organizations/{id}/modules` CHƯA có ở BE (`D-16`) → các ca
 * tầng BE của nhóm này vẫn **BLOCKED** (Vy ghi BLOCKED, không ghi FAIL).
 * File này chỉ kiểm chứng phần **FE**: hiển thị, khoá module lõi, chặn tick rỗng,
 * và cách FE xử lý mã lỗi của BE.
 */
test.describe('Cấu hình module', () => {
  test('TC-MOD-01 — nhóm module hiện đủ module đã đăng ký, kèm Tag trạng thái', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    await expect(page.getByText('Module đã đăng ký')).toBeVisible();
    await expect(page.getByText('Quản lý học sinh')).toBeVisible();
    await expect(page.getByText('Quản lý lớp học')).toBeVisible();
    await expect(page.getByText('Quản lý lịch học')).toBeVisible();
    // Tag trạng thái `requested` → "Chờ duyệt".
    await expect(page.getByText('Chờ duyệt').first()).toBeVisible();
  });

  test('TC-MOD-02 — module lõi đang bật thì ô tick bị khoá + có Tooltip MSG-MOD-03', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    const coreCheckbox = page.getByRole('checkbox', { name: 'Quản lý học sinh' });
    await expect(coreCheckbox).toBeDisabled();
    await expect(coreCheckbox).toBeChecked();

    // Tooltip chỉ hiện khi rê chuột vào ô đã khoá.
    await page.locator('label.ant-checkbox-wrapper', { hasText: 'Quản lý học sinh' }).hover();
    await expect(page.getByText('Module lõi, không thể bỏ: Quản lý học sinh')).toBeVisible();
  });

  test('TC-MOD-03 — bỏ hết tick thì chặn, báo MSG-MOD-02, không gọi API', async ({ page }) => {
    await loginAs(page);
    const log = await mockAdminApi(page, {
      pending: [ORG_C],
      details: { [ORG_C.id]: ORG_C },
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);

    // Bỏ tick cả 2 module không lõi.
    await page.getByRole('checkbox', { name: 'Quản lý phòng học' }).uncheck();
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();

    await expect(page.getByText('Phải chọn ít nhất 1 module')).toBeVisible();
    expect(log.urls.some((u) => u.endsWith(`/organizations/${ORG_C.id}/modules`))).toBe(false);
  });

  test('TC-MOD-04 — bỏ 1 module không lõi thì nút Lưu bật lên', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, {
      pending: [ORG_C],
      details: { [ORG_C.id]: ORG_C },
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);

    const saveButton = page.getByRole('button', { name: 'Lưu cấu hình module' });
    await expect(saveButton).toBeDisabled();

    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();

    await expect(saveButton).toBeEnabled();
  });

  test('TC-MOD-05 — bấm Lưu thì PUT 204, báo MSG-MOD-04, chi tiết refetch tập mới', async ({
    page,
  }) => {
    await loginAs(page);
    const log = await mockAdminApi(page, {
      pending: [ORG_C],
      details: { [ORG_C.id]: ORG_C },
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();

    await expect(page.getByText('Đã lưu cấu hình module.')).toBeVisible();
    expect(log.urls.some((u) => u.endsWith(`/organizations/${ORG_C.id}/modules`))).toBe(true);
    // Tập mới đã refetch: module vừa bỏ không còn tick.
    await expect(page.getByRole('checkbox', { name: 'Quản lý thiết bị' })).not.toBeChecked();
  });

  // §3.3 C2 (mở rộng): `suspended` mới là trạng thái không sửa được — thay cho
  // quy tắc cũ "chỉ khi còn pending" của Sprint 2 gốc (Q-16).
  test('TC-MOD-08 — tổ chức bị vô hiệu hoá thì không có nút Lưu', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, {
      pending: [],
      details: { [ORG_A.id]: { ...ORG_A, status: 'suspended' } },
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    await expect(page.getByRole('button', { name: 'Lưu cấu hình module' })).toBeHidden();
    await expect(page.getByRole('checkbox', { name: 'Quản lý thiết bị' })).toBeDisabled();
  });

  test('TC-MOD-15 — C2: tổ chức đã duyệt vẫn cấu hình được module', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, {
      pending: [],
      details: { [ORG_A.id]: { ...ORG_A, status: 'active' } },
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    await expect(page.getByRole('button', { name: 'Lưu cấu hình module' })).toBeVisible();
    // ORG_A chưa có module này → tick vào là có thay đổi để lưu.
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).check();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();

    await expect(page.getByText('Đã lưu cấu hình module.')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Quản lý thiết bị' })).toBeChecked();
  });

  test('TC-MOD-11 — BE trả 400 (module không hợp lệ) thì FE hiện MSG-MOD-06', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, {
      pending: [ORG_C],
      details: { [ORG_C.id]: ORG_C },
      modulesStatus: 400,
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();

    await expect(page.getByText('Module không hợp lệ hoặc chưa được kích hoạt.')).toBeVisible();
    await expect(page.getByText('Đã lưu cấu hình module.')).toBeHidden();
  });

  test('TC-MOD-14 — BE lỗi thì báo MSG-MOD-05, trạng thái tick không bị coi là đã lưu', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, {
      pending: [ORG_C],
      details: { [ORG_C.id]: ORG_C },
      modulesStatus: 500,
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();
    await page.getByRole('button', { name: 'Lưu cấu hình module' }).click();

    await expect(page.getByText('Không lưu được cấu hình module, vui lòng thử lại.')).toBeVisible();
    await expect(page.getByText('Đã lưu cấu hình module.')).toBeHidden();
    // Ô vừa bỏ tick vẫn là trạng thái CHƯA LƯU → nút Lưu vẫn bật để thử lại.
    await expect(page.getByRole('checkbox', { name: 'Quản lý thiết bị' })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Lưu cấu hình module' })).toBeEnabled();
  });
});

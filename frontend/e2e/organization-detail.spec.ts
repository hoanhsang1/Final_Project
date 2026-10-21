import { expect, test } from '@playwright/test';
import { loginAs, mockAdminApi, ORG_A } from './helpers';

/**
 * Màn chi tiết tổ chức — Đặc tả Sprint 2 §5.4 (`TC-ORG-21…25`).
 */
test.describe('Chi tiết tổ chức', () => {
  test('TC-ORG-21 — đủ 3 nhóm, không ô nào hiện undefined', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    await expect(page.getByText('Thông tin tổ chức')).toBeVisible();
    await expect(page.getByText('Người đại diện')).toBeVisible();
    await expect(page.getByText('Module đã đăng ký')).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('null');
  });

  test('TC-ORG-22 — 3 module đăng ký thì ra đủ 3 dòng, mỗi dòng có tên + mã + Tag', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    await expect(page.getByText('Quản lý học sinh').first()).toBeVisible();
    await expect(page.getByText('(STUDENT_MANAGEMENT)')).toBeVisible();
    await expect(page.getByText('(CLASS_MANAGEMENT)')).toBeVisible();
    await expect(page.getByText('(SCHEDULE_MANAGEMENT)')).toBeVisible();
    // Tag trạng thái của organization_module (`requested` → "Chờ duyệt").
    await expect(page.getByText('Chờ duyệt').first()).toBeVisible();
  });

  test('TC-ORG-23 — id không tồn tại thì báo MSG-ORG-10, có nút quay lại danh sách', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { notFoundDetail: true });

    await page.goto('/quan-tri/to-chuc/99999999-9999-9999-9999-999999999999');

    // antd `Result status="404"` hiện ICON 404 (không có chữ), nên kiểm tra câu chữ.
    await expect(page.getByText('Không tìm thấy tổ chức.')).toBeVisible();
    await expect(
      page.getByText('Tổ chức không tồn tại hoặc đã bị gỡ khỏi hệ thống.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
  });

  test('TC-ORG-24 — tổ chức đã duyệt thì ẩn Duyệt/Từ chối, hiện MSG-ORG-09', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, {
      pending: [{ ...ORG_A, status: 'active' }],
      details: { [ORG_A.id]: { ...ORG_A, status: 'active' } },
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    await expect(page.getByText('Tổ chức này đã được xử lý.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duyệt tổ chức' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Từ chối tổ chức' })).toBeHidden();
  });

  test('TC-ORG-25 — ô contact chưa có dữ liệu thì hiện "—" (không trống, không undefined)', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    // Descriptions bordered gộp nhiều cặp label/td vào CÙNG một <tr> →
    // phải chọn đúng ô <td> ngay sau <th> tương ứng.
    const emailCell = page
      .locator('th.ant-descriptions-item-label', { hasText: 'Email liên hệ' })
      .locator('xpath=following-sibling::td[1]');
    await expect(emailCell).toHaveText('—');

    const phoneCell = page
      .locator('th.ant-descriptions-item-label', { hasText: 'Số điện thoại' })
      .locator('xpath=following-sibling::td[1]');
    await expect(phoneCell).toHaveText('—');
  });
});

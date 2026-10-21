import { expect, test } from '@playwright/test';
import { loginAs, mockAdminApi, ORG_A } from './helpers';

/**
 * Duyệt / từ chối tổ chức — Đặc tả Sprint 2 §5.5 (`TC-APPR-01…04`, `TC-ORG-26…36`).
 *
 * Các ca tầng BE (`TC-APPR-04`, `TC-ORG-31…33`) cần DB thật → BLOCKED, không
 * viết ở đây.
 */

/** Mở màn chi tiết của `ORG_A` (đã đăng nhập + mock API). */
async function openDetail(page: import('@playwright/test').Page) {
  await loginAs(page);
  await mockAdminApi(page);
  await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
  await expect(page.getByRole('heading', { name: ORG_A.name })).toBeVisible();
}

test.describe('Duyệt tổ chức', () => {
  test('TC-APPR-01 — bấm Duyệt tổ chức thì modal hiện tên tổ chức + số module', async ({
    page,
  }) => {
    await openDetail(page);

    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Duyệt tổ chức')).toBeVisible();
    await expect(dialog.getByText(ORG_A.name)).toBeVisible();
    await expect(dialog.getByText(/3 module/)).toBeVisible();
  });

  test('TC-APPR-02 — bấm Duyệt thì PATCH 204, báo thành công, về danh sách, dòng biến mất', async ({
    page,
  }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Duyệt', exact: true }).click();

    await expect(page.getByText(`Đã duyệt tổ chức "${ORG_A.name}".`)).toBeVisible();
    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
    // Dòng của tổ chức vừa duyệt biến mất khỏi danh sách (còn lại 1 dòng + header).
    await expect(page.getByRole('row')).toHaveCount(2);

    const approveCall = log.urls.find((u) => u.includes(`/organizations/${ORG_A.id}/approve`));
    expect(approveCall).toBeTruthy();
  });

  test('TC-APPR-03 — trong lúc gửi thì nút Duyệt có loading, không bấm lần hai được', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { pendingDelayMs: 0 });
    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();

    // Nút OK của modal (dùng selector theo dialog ĐANG MỞ: lúc loading antd thay
    // chữ bằng icon nên không tìm được theo tên).
    const okButton = page.getByRole('dialog').locator('button.ant-btn-primary');
    // Chặn request approve để giữ trạng thái "đang gửi" quan sát được.
    await page.route(`**/api/v1/organizations/${ORG_A.id}/approve`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({ status: 204, body: '' });
    });

    await okButton.click();
    await expect(okButton).toBeDisabled();
    await expect(okButton).toHaveClass(/ant-btn-loading/);
  });

  test('TC-ORG-26 — duyệt tổ chức đã xử lý thì 409 → MSG-ORG-09, tải lại danh sách', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { approveStatus: 409 });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Duyệt', exact: true }).click();

    await expect(page.getByText('Tổ chức này đã được xử lý.')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('TC-ORG-34 — BE lỗi thì báo MSG-ORG-11, modal vẫn mở, không điều hướng', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { approveStatus: 500 });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Duyệt', exact: true }).click();

    await expect(page.getByText('Không lưu được, vui lòng thử lại.')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/quan-tri/to-chuc/${ORG_A.id}$`));
  });
});

test.describe('Từ chối tổ chức', () => {
  test('TC-ORG-27 — để trống lý do thì báo MSG-ORG-05 tại ô, không gọi API', async ({ page }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Từ chối tổ chức', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Từ chối', exact: true }).click();

    await expect(page.getByText('Vui lòng nhập lý do từ chối')).toBeVisible();
    expect(log.urls.some((u) => u.includes('/reject'))).toBe(false);
  });

  test('TC-ORG-28 — nhập toàn dấu cách thì vẫn tính là trống, không gọi API', async ({ page }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Từ chối tổ chức', exact: true }).click();
    await page.getByRole('textbox', { name: 'Lý do từ chối' }).fill('   ');
    await page.getByRole('dialog').getByRole('button', { name: 'Từ chối', exact: true }).click();

    await expect(page.getByText('Vui lòng nhập lý do từ chối')).toBeVisible();
    expect(log.urls.some((u) => u.includes('/reject'))).toBe(false);
  });

  test('TC-ORG-29 — dán 501 ký tự thì ô chặn ở 500, bộ đếm hiện 500/500', async ({ page }) => {
    await openDetail(page);

    await page.getByRole('button', { name: 'Từ chối tổ chức', exact: true }).click();
    const textarea = page.getByRole('textbox', { name: 'Lý do từ chối' });
    const counter = page.locator('.ant-input-data-count');

    // Đã đủ 500 ký tự → bộ đếm hiện 500 / 500.
    await textarea.fill('a'.repeat(500));
    await expect(counter).toHaveText('500 / 500');

    // Gõ thêm 1 ký tự → `maxLength` của trình duyệt chặn cứng, giá trị không đổi.
    await textarea.press('b');
    await expect(textarea).toHaveValue('a'.repeat(500));
    await expect(counter).toHaveText('500 / 500');
  });

  test('TC-ORG-30 — nhập lý do hợp lệ thì PATCH 204, báo thành công, về danh sách', async ({
    page,
  }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Từ chối tổ chức', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Lý do từ chối' })
      .fill('Hồ sơ còn thiếu giấy phép hoạt động.');
    await page.getByRole('dialog').getByRole('button', { name: 'Từ chối', exact: true }).click();

    await expect(page.getByText(`Đã từ chối tổ chức "${ORG_A.name}".`)).toBeVisible();
    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
    // Dòng của tổ chức vừa từ chối biến mất khỏi danh sách.
    await expect(page.getByRole('row')).toHaveCount(2);

    const rejectCall = log.urls.find((u) => u.includes(`/organizations/${ORG_A.id}/reject`));
    expect(rejectCall).toBeTruthy();
  });

  test('TC-ORG-35 — BE chậm quá 10s thì timeout, báo lỗi, không báo thành công', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    // Treo request approve tới sau timeout của axios (10s) rồi trả 504.
    await page.route(`**/api/v1/organizations/${ORG_A.id}/approve`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 12_000));
      await route.fulfill({ status: 504, body: '' });
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Duyệt', exact: true }).click();

    await expect(page.getByText('Không lưu được, vui lòng thử lại.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Đã duyệt tổ chức/)).toBeHidden();
  });

  test('TC-ORG-36 — lý do chứa <script> thì hiển thị nguyên văn dạng chữ, không chạy script', async ({
    page,
  }) => {
    const payload = '<script>alert(1)</script>';
    await loginAs(page);
    await mockAdminApi(page, {
      pending: [{ ...ORG_A, status: 'rejected', rejection_reason: payload }],
      details: { [ORG_A.id]: { ...ORG_A, status: 'rejected', rejection_reason: payload } },
    });

    let alerted = false;
    page.on('dialog', async (dialog) => {
      alerted = true;
      await dialog.dismiss();
    });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);

    // Lý do hiển thị nguyên văn, chỉ là TEXT — không phải HTML.
    await expect(page.getByText(payload)).toBeVisible();
    const html = await page.locator('body').innerHTML();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(alerted).toBe(false);
  });
});

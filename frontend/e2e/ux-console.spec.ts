import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ORG_C, loginAs, mockAdminApi } from './helpers';

/**
 * Kiểm thử trải nghiệm người dùng của console mở rộng — 4 việc rà review UX:
 *
 * 1. `document.title` theo màn hình (mở 9 tab không còn trùng tên).
 * 2. Skip link nhảy tới nội dung chính (WCAG 2.4.1).
 * 3. Lỗi thao tác hiện bằng `Alert` **tại chỗ**, không còn toast tự biến mất.
 * 4. Cảnh báo + bản nháp khi rời biểu mẫu còn thay đổi chưa lưu.
 *
 * Tất cả chạy trên mock (`D-16`, `D-21` chưa có ở BE) — tầng BE vẫn do ca
 * `TC-MOD-*` / `TC-ALL-*` ghi BLOCKED.
 */

/** Modal antd đang hiện — trang có nhiều modal mount sẵn (`forceRender`). */
function visibleModal(page: Page) {
  return page.locator('.ant-modal-content:visible').first();
}

test.describe('Trải nghiệm người dùng cốt lõi', () => {
  test('TC-UX-01 — document.title đổi theo màn hình, không còn 9 tab trùng tên', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri');
    await expect(page).toHaveTitle('Tổng quan — MEMS');

    await page.goto('/quan-tri/tai-khoan');
    await expect(page).toHaveTitle('Quản lý tài khoản — MEMS');

    // Route không có title riêng vẫn phải về tiêu đề gốc, không dính title cũ.
    await page.goto('/khong-ton-tai');
    await expect(page).toHaveTitle('Không tìm thấy trang — MEMS');
  });

  test('TC-UX-02 — skip link chỉ hiện khi focus và nhảy tới nội dung chính', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);
    await page.goto('/quan-tri');

    const skipLink = page.getByRole('link', { name: 'Tới nội dung chính' });
    // Chưa focus → ẩn thị giác (position absolute, kích thước 1px).
    await expect(skipLink).toHaveCSS('position', 'absolute');

    await skipLink.focus();
    await expect(skipLink).toHaveCSS('position', 'fixed');
    await expect(skipLink).toBeVisible();

    await skipLink.press('Enter');
    await expect(page).toHaveURL(/#noi-dung-chinh$/);
    await expect(page.locator('#noi-dung-chinh')).toBeFocused();
  });

  test('TC-UX-03 — lỗi khi vô hiệu hoá hiện bằng Alert TRONG modal, không còn là toast', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { suspendStatus: 500 });

    await page.goto('/quan-tri/to-chuc/tat-ca');
    await page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Trường THCS Lê Quý Đôn' }).click();

    const modal = visibleModal(page);
    await modal.getByRole('button', { name: 'Vô hiệu hoá' }).click();
    await page.getByLabel('Lý do vô hiệu hoá').fill('Lý do kiểm thử');
    await modal.getByRole('button', { name: 'Vô hiệu hoá' }).click();

    // `role="alert"` nằm trong modal, đúng 1 chỗ trong cả trang.
    await expect(modal.getByRole('alert')).toHaveText('Không lưu được, vui lòng thử lại.');
    await expect(page.getByText('Không lưu được, vui lòng thử lại.')).toHaveCount(1);
    await expect(page.getByText('Đã vô hiệu hoá tổ chức')).toHaveCount(0);
  });

  test('TC-UX-04 — còn thay đổi chưa lưu thì bấm menu hỏi lại; "Ở lại" giữ nguyên', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { pending: [ORG_C], details: { [ORG_C.id]: ORG_C } });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();

    await page.getByRole('menuitem', { name: 'Nhật ký hệ thống' }).click();

    // `Modal.confirm` của antd render title ở 2 chỗ (`.ant-modal-title` +
    // `.ant-modal-confirm-title`) → phải scope theo hộp thoại.
    const confirmDialog = page.locator('.ant-modal-confirm:visible');
    await expect(confirmDialog).toContainText('Có thay đổi chưa lưu');
    await page.getByRole('button', { name: 'Ở lại' }).click();

    // Vẫn ở màn cấu hình, lựa chọn chưa lưu còn nguyên.
    await expect(page).toHaveURL(`/quan-tri/to-chuc/${ORG_C.id}`);
    await expect(page.getByRole('checkbox', { name: 'Quản lý thiết bị' })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Lưu cấu hình module' })).toBeEnabled();
  });

  test('TC-UX-05 — "Rời trang" thì bản nháp được giữ, quay lại áp dụng được', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { pending: [ORG_C], details: { [ORG_C.id]: ORG_C } });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();

    await page.getByRole('menuitem', { name: 'Nhật ký hệ thống' }).click();
    await page.getByRole('button', { name: 'Rời trang' }).click();
    await expect(page).toHaveURL('/quan-tri/nhat-ky');

    // Quay lại: bản nháp còn đó và khôi phục đúng lựa chọn cũ.
    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);
    await expect(page.getByText('Bạn có bản nháp cấu hình module chưa lưu.')).toBeVisible();

    await page.getByRole('button', { name: 'Áp dụng nháp' }).click();
    await expect(page.getByRole('checkbox', { name: 'Quản lý thiết bị' })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Lưu cấu hình module' })).toBeEnabled();
    await expect(page.getByText('Bạn có bản nháp cấu hình module chưa lưu.')).toBeHidden();
  });

  test('TC-UX-06 — tải lại trang khi còn thay đổi thì trình duyệt hỏi trước khi mất', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { pending: [ORG_C], details: { [ORG_C.id]: ORG_C } });

    await page.goto(`/quan-tri/to-chuc/${ORG_C.id}`);
    await page.getByRole('checkbox', { name: 'Quản lý thiết bị' }).uncheck();

    const dialogTypes: string[] = [];
    page.on('dialog', (dialog) => {
      dialogTypes.push(dialog.type());
      // `accept` để việc tải lại hoàn tất — đã ghi nhận được loại hộp thoại.
      void dialog.accept();
    });

    await page.reload();

    expect(dialogTypes).toContain('beforeunload');
  });

  test('TC-UX-07 — trang 404 có lối thoát: khách về đăng nhập, admin về tổng quan', async ({
    page,
  }) => {
    // Khách: chưa có phiên.
    await page.goto('/khong-ton-tai?khong-co=1');
    await expect(page.getByText('Không tìm thấy trang', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Về trang đăng nhập' }).click();
    await expect(page).toHaveURL(/\/dang-nhap$/);

    // Admin đã đăng nhập: không đá về màn đăng nhập nữa.
    await loginAs(page);
    await mockAdminApi(page);
    await page.goto('/khong-ton-tai');
    await page.getByRole('button', { name: 'Về trang tổng quan' }).click();
    await expect(page).toHaveURL(/\/quan-tri$/);
  });
});

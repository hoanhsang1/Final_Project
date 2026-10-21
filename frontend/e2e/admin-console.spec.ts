import { expect, test } from '@playwright/test';
import { loginAs, mockAdminApi, ORG_A } from './helpers';

/**
 * Khung console quản trị & phân quyền — Đặc tả Sprint 2 §5.2 (`TC-ADM-*`).
 *
 * Mỗi `it` tương ứng 1 mã `TC-*` trong đặc tả để reviewer đối chiếu.
 */
test.describe('Khung console quản trị', () => {
  test('TC-ADM-01 — chưa đăng nhập thì bị đá về /dang-nhap, không gọi API nào', async ({
    page,
  }) => {
    const log = await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');

    await expect(page).toHaveURL(/\/dang-nhap$/);
    expect(log.urls.filter((u) => u.includes('/organizations'))).toHaveLength(0);
  });

  test('TC-ADM-02 — ORG_OWNER thấy 403, không gọi /organizations/pending', async ({ page }) => {
    await loginAs(page, ['ORG_OWNER']);
    const log = await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');

    await expect(page.getByText('403')).toBeVisible();
    await expect(
      page.getByText('Bạn không có quyền truy cập khu vực quản trị.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Về trang đăng nhập' })).toBeVisible();
    expect(log.urls.filter((u) => u.includes('/organizations/pending'))).toHaveLength(0);
  });

  test('TC-ADM-03 — SUPER_ADMIN mở /quan-tri thì tự chuyển sang /quan-tri/to-chuc', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri');

    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
  });

  test('TC-ADM-04 — mở /quan-tri/to-chuc thì ra bảng danh sách, có tiêu đề', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');

    await expect(page.getByRole('heading', { name: 'Tổ chức chờ duyệt' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Tên tổ chức' })).toBeVisible();
    await expect(page.getByText(ORG_A.name)).toBeVisible();
  });

  test('TC-ADM-05 — BE lỗi thì hiện Alert + nút Thử lại, không hiện "không có dữ liệu"', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { failPending: true });

    await page.goto('/quan-tri/to-chuc');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert.getByText('Không tải được danh sách tổ chức.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    await expect(page.getByText('Không có tổ chức nào đang chờ duyệt')).toBeHidden();
  });

  test('TC-ADM-05b — bấm Thử lại thì ra dữ liệu, Alert biến mất', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { failPendingTimes: 2 });

    await page.goto('/quan-tri/to-chuc');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();

    await page.getByRole('button', { name: 'Thử lại' }).click();

    await expect(page.getByText(ORG_A.name)).toBeVisible();
    await expect(alert).toBeHidden();
  });

  test('TC-ADM-06 — access token hết hạn thì refresh → retry → vẫn ra danh sách', async ({
    page,
  }) => {
    await loginAs(page);
    const log = await mockAdminApi(page, { refreshMode: 'ok' });

    await page.goto('/quan-tri/to-chuc');

    await expect(page.getByText(ORG_A.name)).toBeVisible();
    expect(log.urls.some((u) => u.includes('/api/v1/auth/refresh'))).toBe(true);
    // Không bị đá về trang đăng nhập.
    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
  });

  test('TC-ADM-07 — refresh token bị thu hồi thì xoá token và về /dang-nhap', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { refreshMode: 'fail' });

    await page.goto('/quan-tri/to-chuc');

    await expect(page).toHaveURL(/\/dang-nhap$/);
    const token = await page.evaluate(() => window.localStorage.getItem('mems.accessToken'));
    expect(token).toBeNull();
  });

  test('TC-ADM-08 — bấm Đăng xuất thì gọi API logout, xoá token, về /dang-nhap', async ({
    page,
  }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');
    await page.getByRole('button', { name: 'Đăng xuất' }).click();

    await expect(page).toHaveURL(/\/dang-nhap$/);
    expect(log.urls.some((u) => u.includes('/api/v1/auth/logout'))).toBe(true);
    const token = await page.evaluate(() => window.localStorage.getItem('mems.accessToken'));
    expect(token).toBeNull();
  });

  test('TC-ADM-08b — logout phải gửi body { refreshToken } (BE @NotBlank)', async ({ page }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');
    await page.getByRole('button', { name: 'Đăng xuất' }).click();

    await expect(page).toHaveURL(/\/dang-nhap$/);
    const logoutBody = log.bodies.find((b) => b.url.includes('/api/v1/auth/logout'));
    expect(logoutBody).toBeDefined();
    // Body phải có `refreshToken` KHÔNG rỗng (BE `@NotBlank` → thiếu là 400).
    // Giá trị cụ thể có thể là token mới sau khi đã refresh ('r-2' trong mock).
    const body = logoutBody!.body as { refreshToken?: unknown };
    expect(typeof body.refreshToken).toBe('string');
    expect((body.refreshToken as string).length).toBeGreaterThan(0);
  });

  test('TC-ADM-09 — logout lỗi 500 thì vẫn xoá phiên và về /dang-nhap', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { logoutStatus: 500 });

    await page.goto('/quan-tri/to-chuc');
    await page.getByRole('button', { name: 'Đăng xuất' }).click();

    await expect(page).toHaveURL(/\/dang-nhap$/);
    const token = await page.evaluate(() => window.localStorage.getItem('mems.accessToken'));
    expect(token).toBeNull();
  });

  test('TC-ADM-10 — màn hình 320px thì bảng cuộn ngang, không vỡ layout', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');

    await expect(page.getByRole('table')).toBeVisible();
    const overflowX = await page.evaluate(() => {
      const el = document.querySelector('.ant-table-content') as HTMLElement | null;
      return el ? getComputedStyle(el).overflowX : null;
    });
    expect(overflowX).toBe('auto');
    // Nút hành động vẫn bấm được ở màn hình hẹp.
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  });

  test('TC-ADM-11 — bàn phím: Tab tới nút Xem, bấm Enter thì mở được chi tiết', async ({
    page,
  }) => {    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');

    const viewButton = page.getByRole('button', {
      name: `Xem chi tiết tổ chức ${ORG_A.name}`,
    });

    // Tab tới nút "Xem" bằng bàn phím (không dùng chuột).
    let focused = false;
    for (let i = 0; i < 40 && !focused; i += 1) {
      await page.keyboard.press('Tab');
      focused = await viewButton.evaluate((el) => el === document.activeElement).catch(() => false);
    }
    expect(focused).toBe(true);

    // Vòng focus phải nhìn thấy được (không phải `outline: none` trần).
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth) || 0,
        boxShadow: cs.boxShadow,
      };
    });
    expect(ring).not.toBeNull();
    const hasRing =
      (ring!.outlineStyle !== 'none' && ring!.outlineWidth > 0) || ring!.boxShadow !== 'none';
    expect(hasRing).toBe(true);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/quan-tri/to-chuc/${ORG_A.id}$`));
  });

  test('TC-ADM-12 — đăng nhập bằng SUPER_ADMIN thì vào thẳng console quản trị', async ({ page }) => {
    await mockAdminApi(page, { loginRoles: ['SUPER_ADMIN'] });

    await page.goto('/dang-nhap');
    await page.getByLabel('Tên đăng nhập').fill('platform_admin');
    await page.getByLabel('Mật khẩu').fill('MatKhau@123456');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
    await expect(page.getByRole('heading', { name: 'Tổ chức chờ duyệt' })).toBeVisible();
  });

  test('TC-ADM-13 — tài khoản nhiều role thì ưu tiên role quyền cao, không vào màn xem thử', async ({
    page,
  }) => {
    // Thứ tự role trong JWT do BE quyết định — FE phải ưu tiên `SUPER_ADMIN`.
    await mockAdminApi(page, { loginRoles: ['TEACHER', 'SUPER_ADMIN'] });

    await page.goto('/dang-nhap');
    await page.getByLabel('Tên đăng nhập').fill('multi_role');
    await page.getByLabel('Mật khẩu').fill('MatKhau@123456');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
  });
});

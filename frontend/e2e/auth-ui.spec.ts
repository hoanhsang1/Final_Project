import { expect, test } from '@playwright/test';

/**
 * Design system áp lên 2 màn auth — phần **hình thức**.
 *
 * Luồng đăng nhập/đăng ký và validate đã do `LoginPage.test.tsx` /
 * `RegisterPage.test.tsx` phủ ở mức jsdom; ở đây kiểm những thứ chỉ trình duyệt
 * thật mới nói được:
 *
 * 1. `≥1024px` — panel thương hiệu bên trái + nội dung bên phải.
 * 2. `<1024px` — panel không được render (`useMediaQuery`), 320px không tràn ngang.
 * 3. Token thật của Astryx: chữ chính `#101828`, cỡ H1 24px, font Inter,
 *    control `lg` cao 36px (`--size-element-lg`).
 * 4. Điều hướng Đăng nhập ↔ Đăng ký là hai liên kết thật, mục đang mở đánh
 *    `aria-current="page"` — không còn `role="tablist"` giả.
 */

/** `--color-text-primary` của theme MEMS: `#101828`. */
const TEXT_PRIMARY = 'rgb(16, 24, 40)';

/** `--size-element-lg` — control `lg` của Astryx. */
const CONTROL_LG = 36;

/** Panel thương hiệu chỉ tồn tại từ breakpoint `lg` của Astryx. */
const BRAND_PANEL = { name: 'Giới thiệu MEMS' } as const;

test.describe('Design system — màn đăng nhập / đăng ký', () => {
  test('TC-AUTH-UI-01 — desktop hiện panel thương hiệu, H1 đúng token', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dang-nhap');

    await expect(page.getByRole('complementary', BRAND_PANEL)).toBeVisible();

    const heading = page.getByRole('heading', { level: 1, name: 'Đăng nhập' });
    await expect(heading).toBeVisible();

    // Token chữ: một mực `#101828`, cỡ 24px của thang 12/14/17/20/24, font Inter.
    await expect(heading).toHaveCSS('color', TEXT_PRIMARY);
    await expect(heading).toHaveCSS('font-size', '24px');
    await expect(heading).toHaveCSS('font-family', /Inter/);

    // Không được có thanh cuộn ngang ở bất kỳ breakpoint nào.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('TC-AUTH-UI-02 — mobile 320px: không render panel, control 36px, không tràn ngang', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/dang-nhap');

    // Panel dành cho desktop — dưới 1024px không được render vào DOM.
    await expect(page.getByRole('complementary', BRAND_PANEL)).toHaveCount(0);

    const password = page.getByLabel('Mật khẩu', { exact: true });
    await expect(password).toBeVisible();

    // Astryx bọc `<input>` trong một khối mang chiều cao của size `lg`; đo khối
    // đó chứ không đo thẻ input (thẻ input chỉ cao bằng dòng chữ bên trong).
    const fieldHeight = await password.evaluate((el) => {
      const box = el.parentElement ?? el;
      return box.getBoundingClientRect().height;
    });
    expect(fieldHeight).toBe(CONTROL_LG);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('TC-AUTH-UI-03 — cặp Đăng nhập/Đăng ký là liên kết thật, có aria-current', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dang-nhap');

    const nav = page.getByRole('navigation', {
      name: 'Chuyển giữa đăng nhập và đăng ký',
    });
    await expect(nav).toBeVisible();

    // Sai kiểu cũ: `role="tablist"` + `aria-selected` trên hai thứ dẫn tới hai URL.
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(nav.getByRole('link')).toHaveCount(2);

    await expect(nav.getByRole('link', { name: 'Đăng nhập', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.getByRole('link', { name: 'Đăng ký', exact: true })).not.toHaveAttribute(
      'aria-current',
      /.*/,
    );

    await nav.getByRole('link', { name: 'Đăng ký', exact: true }).click();
    await expect(page).toHaveURL(/\/dang-ky$/);
  });

  test('TC-AUTH-UI-04 — trang đăng ký có H1 riêng và lối quay lại đăng nhập', async ({ page }) => {
    // Không có BE khi chạy e2e: chặn danh mục module để trang ở trạng thái xác
    // định thay vì phụ thuộc vào lỗi mạng.
    await page.route('**/api/v1/modules', (route) =>
      route.fulfill({ json: [{ code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh' }] }),
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dang-ky');

    await expect(page.getByRole('heading', { level: 1, name: 'Đăng ký tổ chức' })).toBeVisible();

    await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  });
});

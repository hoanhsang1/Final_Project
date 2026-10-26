import { expect, test } from '@playwright/test';

/**
 * Design system (Figma `MEMS — Registration UI & Design System`) áp lên 2 màn auth.
 *
 * Chỉ kiểm phần **hình thức** — luồng đăng nhập/đăng ký và validate vẫn do
 * `LoginPage.test.tsx` / `RegisterPage.test.tsx` phủ:
 *
 * 1. `≥1024px`: panel thương hiệu bên trái + card bên phải (`03 · Login UI`).
 * 2. `<1024px`: ẩn panel, card chiếm hết chiều rộng — 320px không tràn ngang.
 * 3. Token: font Inter, chữ chính `#142447`, control cao 44px.
 * 4. Điều hướng giữa 2 màn bằng liên kết thật ở chân card (không còn cặp tab
 *    trên đầu card — đã bỏ để khỏi lặp với dòng "Chưa có tổ chức?").
 */

/** Chữ chính của design system — Text/Primary `#142447`. */
const TEXT_PRIMARY = 'rgb(20, 36, 71)';

test.describe('Design system — màn đăng nhập / đăng ký', () => {
  test('TC-AUTH-UI-01 — desktop hiện panel thương hiệu, không tràn ngang', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dang-nhap');

    await expect(
      page.getByRole('complementary', { name: 'Giới thiệu MEMS' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Đăng nhập để tiếp tục' }),
    ).toBeVisible();

    // Token: màu chữ chính + font Inter của design system.
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', TEXT_PRIMARY);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS(
      'font-family',
      /Inter/,
    );

    // Không được có thanh cuộn ngang ở bất kỳ breakpoint nào.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('TC-AUTH-UI-02 — mobile 320px: ẩn panel, card full width, control 44px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/dang-nhap');

    // Panel chỉ dành cho desktop — mobile phải ẩn hẳn khỏi layout.
    await expect(page.getByRole('complementary', { name: 'Giới thiệu MEMS' })).toHaveCount(0);

    const password = page.getByLabel('Mật khẩu', { exact: true });
    await expect(password).toBeVisible();
    // Figma: field cao 44px, đủ vùng chạm trên mobile (WCAG 2.5.5).
    // `Input.Password` bọc `<input>` trong `.ant-input-affix-wrapper` — đo cả khung,
    // không đo mỗi thẻ input (thẻ input cao đúng bằng dòng chữ).
    const fieldHeight = await password.evaluate((el) => {
      const box = el.closest('.ant-input-affix-wrapper') ?? el.parentElement ?? el;
      return box.getBoundingClientRect().height;
    });
    expect(fieldHeight).toBeGreaterThanOrEqual(44);
    expect(fieldHeight).toBeLessThan(45);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('TC-AUTH-UI-03 — điều hướng đăng nhập ↔ đăng ký bằng liên kết ở chân card', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dang-nhap');

    // Không còn tab trên đầu card.
    await expect(
      page.getByRole('navigation', { name: 'Chuyển giữa đăng nhập và đăng ký' }),
    ).toHaveCount(0);

    await page.getByRole('link', { name: 'Đăng ký tổ chức' }).click();
    await expect(page).toHaveURL(/\/dang-ky$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Đăng ký tổ chức' }),
    ).toBeVisible();

    // Chân card trang đăng ký phải có lối quay lại đăng nhập (trước đây là tab).
    await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  });
});

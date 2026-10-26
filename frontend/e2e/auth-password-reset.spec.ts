import { expect, test } from '@playwright/test';

/**
 * Luồng Quên mật khẩu (`/quen-mat-khau`) và Đặt lại mật khẩu
 * (`/dat-lai-mat-khau?token=…`).
 *
 * BE **chưa có** 2 endpoint `D-32`/`D-33`, nên e2e mock đúng contract đề xuất:
 * - `POST /api/v1/auth/forgot-password` body `{ email }` → 202 (luôn 202, chống dò tài khoản)
 * - `POST /api/v1/auth/reset-password` body `{ token, new_password }` → 204, token sai → 400
 *
 * Trọng tâm: validate tại chỗ, thông báo trung tính (không lộ email tồn tại) và
 * `NFR-REL-001` — lỗi/timeout KHÔNG bao giờ hiện thành công.
 */

const FORGOT_API = '**/api/v1/auth/forgot-password';
const RESET_API = '**/api/v1/auth/reset-password';

const NEW_PASSWORD = 'matkhau123';

test.describe('Quên / đặt lại mật khẩu', () => {
  test('TC-PWD-01 — từ màn đăng nhập mở được màn quên mật khẩu', async ({ page }) => {
    await page.goto('/dang-nhap');

    await page.getByRole('link', { name: 'Quên mật khẩu?' }).click();

    await expect(page).toHaveURL(/\/quen-mat-khau$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Quên mật khẩu' })).toBeVisible();
    // Trang công khai: không cần đăng nhập, không bị guard đá đi.
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('TC-PWD-02 — email trống / sai định dạng bị chặn tại chỗ, không gọi API', async ({
    page,
  }) => {
    let calls = 0;
    await page.route(FORGOT_API, (route) => {
      calls += 1;
      return route.fulfill({ status: 202 });
    });

    await page.goto('/quen-mat-khau');
    await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
    await expect(page.getByText('Vui lòng nhập email')).toBeVisible();

    await page.getByLabel('Email').fill('khong-phai-email');
    await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
    await expect(page.getByText('Email không đúng định dạng')).toBeVisible();

    expect(calls).toBe(0);
  });

  test('TC-PWD-03 — gửi thành công hiện thông báo trung tính, không khẳng định email tồn tại', async ({
    page,
  }) => {
    await page.route(FORGOT_API, (route) => route.fulfill({ status: 202 }));

    await page.goto('/quen-mat-khau');
    await page.getByLabel('Email').fill('gv@truong.edu.vn');
    await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Kiểm tra email của bạn' }),
    ).toBeVisible();
    await expect(page.getByText('Đã gửi yêu cầu đặt lại mật khẩu')).toBeVisible();
    // Câu "Nếu … đã đăng ký tài khoản" — không xác nhận email có trong hệ thống.
    await expect(page.getByText(/Nếu .* đã đăng ký tài khoản/)).toBeVisible();

    await page.getByRole('link', { name: 'Về trang đăng nhập' }).click();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  });

  test('TC-PWD-04 — BE chưa có endpoint (404): báo chưa sẵn sàng, KHÔNG hiện thành công', async ({
    page,
  }) => {
    await page.route(FORGOT_API, (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Not Found', data: null }),
      }),
    );

    await page.goto('/quen-mat-khau');
    await page.getByLabel('Email').fill('gv@truong.edu.vn');
    await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();

    await expect(page.getByRole('alert')).toContainText('chưa sẵn sàng');
    await expect(page.getByText('Đã gửi yêu cầu đặt lại mật khẩu')).toHaveCount(0);
    // Vẫn ở lại form để người dùng biết chưa gửi được.
    await expect(page.getByRole('heading', { level: 1, name: 'Quên mật khẩu' })).toBeVisible();
  });

  test('TC-PWD-05 — mở màn đặt lại mà thiếu token → nhắc xin liên kết mới', async ({ page }) => {
    await page.goto('/dat-lai-mat-khau');

    await expect(page.getByText('Thiếu liên kết đặt lại mật khẩu')).toBeVisible();
    await expect(page.getByLabel('Mật khẩu mới')).toHaveCount(0);

    await page.getByRole('link', { name: 'Yêu cầu liên kết mới' }).click();
    await expect(page).toHaveURL(/\/quen-mat-khau$/);
  });

  test('TC-PWD-06 — chặn mật khẩu ngắn / nhập lại lệch; khớp thì lưu và báo thành công', async ({
    page,
  }) => {
    let body: unknown = null;
    await page.route(RESET_API, async (route) => {
      body = route.request().postDataJSON();
      return route.fulfill({ status: 204 });
    });

    await page.goto('/dat-lai-mat-khau?token=token-that');

    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
    await expect(page.getByText('Vui lòng nhập mật khẩu mới')).toBeVisible();

    await page.getByLabel('Mật khẩu mới').fill('123');
    // antd giữ 2 node cùng nội dung trong lúc animation (appear + item) → lấy node đầu.
    await expect(
      page
        .locator('.ant-form-item-explain-error')
        .filter({ hasText: 'Mật khẩu cần ít nhất 8 ký tự' })
        .first(),
    ).toBeVisible();

    await page.getByLabel('Mật khẩu mới').fill(NEW_PASSWORD);
    await page.getByLabel('Nhập lại mật khẩu').fill('khac-hoan-toan');
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
    await expect(page.getByText('Mật khẩu nhập lại không khớp')).toBeVisible();

    await page.getByLabel('Nhập lại mật khẩu').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Đặt lại mật khẩu thành công' }),
    ).toBeVisible();
    // Gửi đúng contract: token từ URL + mật khẩu mới, không gửi mật khẩu nhập lại.
    expect(body).toEqual({ token: 'token-that', new_password: NEW_PASSWORD });
  });

  test('TC-PWD-07 — token hết hạn (400): lỗi rõ ràng + lối yêu cầu liên kết mới', async ({
    page,
  }) => {    await page.route(RESET_API, (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid reset token', data: null }),
      }),
    );

    await page.goto('/dat-lai-mat-khau?token=token-het-han');
    await page.getByLabel('Mật khẩu mới').fill(NEW_PASSWORD);
    await page.getByLabel('Nhập lại mật khẩu').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();

    await expect(page.getByRole('alert')).toContainText('không hợp lệ hoặc đã hết hạn');
    await expect(page.getByText('Đặt lại mật khẩu thành công')).toHaveCount(0);

    await page.getByRole('link', { name: 'Yêu cầu liên kết mới' }).click();
    await expect(page).toHaveURL(/\/quen-mat-khau$/);
  });

  test('TC-PWD-08 — 320px: cả 2 màn không tràn ngang, panel thương hiệu ẩn', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });

    for (const url of ['/quen-mat-khau', '/dat-lai-mat-khau?token=token-that']) {
      await page.goto(url);
      await expect(page.getByRole('complementary', { name: 'Giới thiệu MEMS' })).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `tràn ngang ở ${url}`).toBeLessThanOrEqual(0);
    }
  });
});

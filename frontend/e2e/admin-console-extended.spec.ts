import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ORG_A, loginAs, mockAdminApi } from './helpers';
import type { FakeOrg } from './helpers';

/**
 * Mở rộng console Super Admin — Đặc tả "Sprint 2 — Mở rộng console" mục 3 + 5.
 *
 * Mỗi `it` tương ứng 1 mã `TC-*` để reviewer đối chiếu. Mock API thay vì BE thật
 * vì toàn bộ endpoint mới (`D-20`, `D-20b`, `D-21`, `D-22`, `D-24`) chưa có ở BE.
 */

/** Tổ chức đã duyệt — dùng cho ca kiểm C1 (vô hiệu hoá / kích hoạt lại). */
const ORG_ACTIVE: FakeOrg = {
  id: '44444444-4444-4444-4444-444444444444',
  name: 'Trường THCS Lê Quý Đôn',
  org_type: 'school',
  status: 'active',
  owner_username: 'lequydon',
  owner_email: 'lequydon@example.edu.vn',
  modules: [
    { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', status: 'active' },
    { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học', status: 'active' },
  ],
};

/** Modal antd đang hiện — trang có nhiều modal mount sẵn (`forceRender`) nên phải scope. */
function visibleModal(page: Page) {
  return page.locator('.ant-modal-content:visible').first();
}

/**
 * Chọn 1 mục trong dropdown `Select` của antd đang mở.
 *
 * KHÔNG dùng `getByRole('option')`: rc-select render node ARIA riêng (chỉ để đọc
 * bằng screen reader), bấm vào đó không đổi giá trị. Phần tử bấm được là
 * `.ant-select-item-option`.
 */
async function selectAntdOption(page: Page, label: string) {
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
    .filter({ hasText: label })
    .first()
    .click();
}

test.describe('Khung menu mở rộng (Q-28)', () => {
  test('TC-ADM-14 — màn ≥1024px hiện Sider 6 mục, không có nút hamburger', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/quan-tri');

    await expect(page.locator('.ant-layout-sider').getByRole('menuitem')).toHaveCount(6);
    await expect(page.getByRole('menuitem', { name: 'Tổng quan' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Nhật ký hệ thống' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mở menu quản trị' })).toHaveCount(0);
  });

  test('TC-ADM-15 — màn 375px ẩn Sider, hamburger mở Drawer và chọn được mục', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/quan-tri');

    // Sider tự ẩn ở breakpoint lg (1024px) — chỉ còn hamburger trong Header.
    await expect(page.getByRole('button', { name: 'Mở menu quản trị' })).toBeVisible();

    await page.getByRole('button', { name: 'Mở menu quản trị' }).click();
    // Phải click trong `.ant-drawer-open` — menu của Sider vẫn nằm trong DOM dù bị ẩn.
    await page.locator('.ant-drawer-open').getByText('Nhật ký hệ thống').click();

    await expect(page).toHaveURL(/\/quan-tri\/nhat-ky$/);
    await expect(page.getByRole('heading', { name: 'Nhật ký hệ thống' })).toBeVisible();
  });
});

test.describe('Màn Tổng quan', () => {
  test('TC-OVW-01 — đủ 4 thẻ số liệu, số đúng với dữ liệu mock', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri');

    await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();
    // Assert qua `aria-label` của thẻ — vừa kiểm con số, vừa kiểm tên cho trình đọc màn hình.
    // Danh mục mock có 6 module (4 lõi + 2 mở rộng), 2 tổ chức chờ duyệt.
    await expect(
      page.getByRole('link', { name: 'Tổ chức chờ duyệt: 2. Tất cả tổ chức' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Module trong danh mục: 6. Danh mục module' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Module lõi: 4. Danh mục module' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Module mở rộng: 2. Danh mục module' }),
    ).toBeVisible();
  });

  test('TC-OVW-02 — thẻ "Tổ chức chờ duyệt" bấm được, chuyển sang màn danh sách', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri');
    await page.getByRole('link', { name: /Tổ chức chờ duyệt: 2/ }).click();

    await expect(page).toHaveURL(/\/quan-tri\/to-chuc$/);
    await expect(page.getByRole('heading', { name: 'Tổ chức chờ duyệt' })).toBeVisible();
  });

  test('TC-OVW-03 — BE lỗi thì hiện Alert + Thử lại, không hiện số 0 giả', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { failPending: true });

    await page.goto('/quan-tri');

    await expect(page.getByText('Không tải được số liệu tổng quan.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    // Không được ngầm hiện số 0 như thể "chờ duyệt = 0" — đó là dữ liệu sai.
    await expect(page.getByRole('link', { name: /Tổ chức chờ duyệt: / })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Module trong danh mục: / })).toHaveCount(0);
  });
});

test.describe('Màn Danh mục module', () => {
  test('TC-MDL-01 — bảng hiện đủ module, Tag phân loại kèm chữ (BR-08)', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/module');

    await expect(page.getByRole('heading', { name: 'Danh mục module' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Quản lý phòng học' })).toBeVisible();
    await expect(page.getByText('Lõi').first()).toBeVisible();
    await expect(page.getByText('Mở rộng').first()).toBeVisible();
  });

  test('TC-MDL-02 — bộ lọc `?loi=` trong URL chỉ giữ module lõi', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/module?loi=core');

    await expect(page.getByRole('cell', { name: 'Quản lý học sinh' })).toBeVisible();
    // Module không lõi đã bị loại khỏi bảng.
    await expect(page.getByRole('cell', { name: 'Quản lý phòng học' })).toHaveCount(0);
  });

  test('TC-MDL-03 — tìm `?q=` không khớp thì hiện "Không tìm thấy", không hiện bảng trắng', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/module?q=khong-ton-tai');

    await expect(page.getByText('Không tìm thấy module phù hợp.')).toBeVisible();
  });

  test('TC-MDL-04 — danh mục rỗng thì hiện Empty, không hiện "undefined"', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { modules: [] });

    await page.goto('/quan-tri/module');

    await expect(page.getByText('Danh mục module đang trống.')).toBeVisible();
    await expect(page.getByText('undefined')).toHaveCount(0);
  });
});

test.describe('Màn Tất cả tổ chức', () => {
  test('TC-ALL-01 — endpoint `D-20` chưa có thì hiện "chờ backend" + Thử lại, không hiện Empty', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { organizationsMissing: true });

    await page.goto('/quan-tri/to-chuc/tat-ca');

    await expect(page.getByText('Tính năng đang chờ backend (D-20).')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    await expect(page.getByText('Không có tổ chức nào')).toHaveCount(0);
  });

  test('TC-ALL-02 — đủ 4 trạng thái, Tag nào cũng kèm chữ (BR-08)', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc/tat-ca');

    await expect(
      page.getByRole('cell', { name: 'Trường THPT Nguyễn Du', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Chờ duyệt').first()).toBeVisible();
    await expect(page.getByText('Đã duyệt').first()).toBeVisible();
    await expect(page.getByText('Vô hiệu hoá').first()).toBeVisible();
    await expect(page.getByText('Đã từ chối').first()).toBeVisible();
  });

  test('TC-ALL-03 — BR-04: nút là "Vô hiệu hoá"/"Kích hoạt lại", không có chữ "Xoá"', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc/tat-ca');

    // `active` → Vô hiệu hoá · `suspended` → Kích hoạt lại · `pending` → không nút.
    await expect(
      page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Trường THCS Lê Quý Đôn' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Kích hoạt lại tổ chức Trung tâm Anh ngữ Aurora' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Trường THPT Nguyễn Du' }),
    ).toHaveCount(0);
    // Tuyệt đối không dùng chữ "Xoá".
    await expect(page.getByText('Xoá', { exact: true })).toHaveCount(0);
  });

  test('TC-ALL-04 — vô hiệu hoá: lý do bắt buộc, đúng thì PATCH 204 và dòng đổi trạng thái', async ({
    page,
  }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc/tat-ca');
    await page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Trường THCS Lê Quý Đôn' }).click();

    const modal = visibleModal(page);
    await expect(modal.getByText('Vô hiệu hoá tổ chức')).toBeVisible();

    // Lý do bắt buộc (cần audit) → để trống thì không được gửi request.
    await modal.getByRole('button', { name: 'Vô hiệu hoá' }).click();
    await expect(page.getByText('Vui lòng nhập lý do vô hiệu hoá')).toBeVisible();
    expect(log.urls.filter((u) => u.includes('/suspend'))).toHaveLength(0);

    await page.getByLabel('Lý do vô hiệu hoá').fill('Vi phạm hợp đồng hoạt động');
    await modal.getByRole('button', { name: 'Vô hiệu hoá' }).click();

    await expect(page.getByText('Đã vô hiệu hoá tổ chức "Trường THCS Lê Quý Đôn".')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Kích hoạt lại tổ chức Trường THCS Lê Quý Đôn' }),
    ).toBeVisible();
  });

  test('TC-ALL-05 — BE lỗi 500 khi vô hiệu hoá thì báo lỗi, KHÔNG hiện thành công (NFR-REL-001)', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { suspendStatus: 500 });

    await page.goto('/quan-tri/to-chuc/tat-ca');
    await page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Trường THCS Lê Quý Đôn' }).click();

    await visibleModal(page).getByRole('button', { name: 'Vô hiệu hoá' }).click();
    await page.getByLabel('Lý do vô hiệu hoá').fill('Lý do kiểm thử');
    await visibleModal(page).getByRole('button', { name: 'Vô hiệu hoá' }).click();

    await expect(page.getByText('Không lưu được, vui lòng thử lại.')).toBeVisible();
    await expect(page.getByText('Đã vô hiệu hoá tổ chức')).toHaveCount(0);
    // Dòng vẫn giữ trạng thái cũ — KHÔNG được optimistically đổi.
    await expect(
      page.getByRole('button', { name: 'Vô hiệu hoá tổ chức Trường THCS Lê Quý Đôn' }),
    ).toBeVisible();
  });

  test('TC-ALL-06 — bộ lọc lưu trong URL, giữ nguyên sau khi reload', async ({ page }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc/tat-ca?status=active');

    // Chờ bảng tải xong trước khi đối chiếu request.
    await expect(
      page.getByRole('cell', { name: 'Trường THCS Lê Quý Đôn', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: /Trung tâm Anh ngữ Aurora/ })).toHaveCount(0);

    // Bộ lọc phải được đẩy lên query string (không lọc phía client).
    const listRequests = log.urls.filter((u) => u.includes('/api/v1/organizations?'));
    expect(listRequests.length).toBeGreaterThan(0);
    expect(listRequests[0]).toContain('status=active');

    await page.reload();
    await expect(page).toHaveURL(/status=active/);
    await expect(page.getByRole('cell', { name: /Trung tâm Anh ngữ Aurora/ })).toHaveCount(0);
  });
});

test.describe('Màn Quản lý tài khoản', () => {
  test('TC-ACC-01 — endpoint `D-24` chưa có thì hiện "chờ backend"', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { accountsMissing: true });

    await page.goto('/quan-tri/tai-khoan');

    await expect(page.getByText('Tính năng đang chờ backend (D-24).')).toBeVisible();
    await expect(page.getByText('Không có tài khoản nào')).toHaveCount(0);
  });

  test('TC-ACC-02 — vai trò hiện nhãn Việt, trạng thái có Tag kèm chữ', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan');

    await expect(page.getByRole('heading', { name: 'Quản lý tài khoản' })).toBeVisible();
    await expect(page.getByText('Admin hệ thống')).toBeVisible();
    await expect(page.getByText('Chủ tổ chức').first()).toBeVisible();
    await expect(page.getByText('Giáo viên')).toBeVisible();
    await expect(page.getByText('Đang hoạt động').first()).toBeVisible();
    await expect(page.getByText('Đang khoá').first()).toBeVisible();
  });

  test('TC-ACC-03 — bấm "Xem" thì sang màn chi tiết đúng tài khoản', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan');
    await page.getByRole('button', { name: 'Xem chi tiết tài khoản lequydon' }).click();

    await expect(page).toHaveURL(/\/quan-tri\/tai-khoan\/acc-2\?from=tai-khoan$/);
    await expect(page.getByText('lequydon').first()).toBeVisible();
  });
});

test.describe('Màn Chi tiết tài khoản', () => {
  test('TC-ACC-04 — id không tồn tại thì Result 404, có nút về danh sách', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan/acc-khong-ton-tai');

    await expect(page.getByText('Không tìm thấy tài khoản.')).toBeVisible();
    // Nút ở màn 404 mang nhãn "Quản lý tài khoản" → quay về đúng danh sách.
    // Scope `main` vì mục menu cũng có link tên "Quản lý tài khoản".
    await expect(page.getByRole('main').getByRole('link', { name: 'Quản lý tài khoản' })).toBeVisible();
  });

  test('TC-ACC-05 — tài khoản active có Khoá + Vô hiệu hoá; vô hiệu hoá thành công', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan/acc-2');

    // Ma trận trạng thái: `active` → chỉ Khoá / Vô hiệu hoá, KHÔNG có "Kích hoạt".
    await expect(page.getByRole('button', { name: 'Khoá tài khoản lequydon' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Vô hiệu hoá tài khoản lequydon' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kích hoạt tài khoản lequydon' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Vô hiệu hoá tài khoản lequydon' }).click();
    const modal = visibleModal(page);
    await expect(modal.getByText('Chuyển tài khoản')).toBeVisible();
    // Lý do TUỲ CHỌN ở màn này — bỏ trống vẫn gửi được.
    await modal.getByRole('button', { name: 'Vô hiệu hoá' }).click();

    await expect(page.getByText('Đã cập nhật trạng thái tài khoản "lequydon".')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Kích hoạt lại tài khoản lequydon' }),
    ).toBeVisible();
  });

  test('TC-ACC-06 — BE lỗi khi đổi trạng thái thì báo lỗi, không hiện thành công', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { accountStatusResult: 500 });

    await page.goto('/quan-tri/tai-khoan/acc-2');
    await page.getByRole('button', { name: 'Vô hiệu hoá tài khoản lequydon' }).click();
    await visibleModal(page).getByRole('button', { name: 'Vô hiệu hoá' }).click();

    await expect(
      page.getByText('Không cập nhật được trạng thái tài khoản, vui lòng thử lại.'),
    ).toBeVisible();
    await expect(page.getByText('Đã cập nhật trạng thái tài khoản')).toHaveCount(0);
  });

  test('TC-ACC-07 — khối nhật ký lỗi không kéo sập màn chi tiết', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { auditLogsMissing: true });

    await page.goto('/quan-tri/tai-khoan/acc-2');

    // Thông tin tài khoản vẫn đọc được.
    await expect(page.getByRole('heading', { name: 'Thông tin tài khoản' })).toBeVisible();
    await expect(page.getByText('lequydon').first()).toBeVisible();
    // Chỉ khối nhật ký báo lỗi.
    await expect(page.getByText('Không tải được nhật ký của tài khoản.')).toBeVisible();
  });

  // --- UC-19 mở rộng: tạo tài khoản · đổi vai trò · đặt lại mật khẩu (D-29/30/31) ---

  test('TC-ACC-08 — tạo tài khoản: modal đủ 4 trường, lưu thành công hiện toast + thêm dòng', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const modal = visibleModal(page);

    await modal.getByLabel('Email').fill('giaovienmoi@example.edu.vn');
    await modal.getByLabel('Họ tên').fill('Giáo viên mới');
    await modal.getByRole('combobox', { name: 'Vai trò' }).click();
    await selectAntdOption(page, 'Quản trị tổ chức');
    await modal.getByRole('combobox', { name: 'Tổ chức' }).click();
    await selectAntdOption(page, 'Trường THPT Nguyễn Du');
    await modal.getByRole('button', { name: 'Tạo tài khoản' }).click();

    await expect(page.getByText('Đã tạo tài khoản.')).toBeVisible();
    // Mock POST đã thêm dòng → refetch danh sách phải thấy username sinh từ email.
    await expect(page.getByText('giaovienmoi').first()).toBeVisible();
  });

  test('TC-ACC-09 — bỏ trống các trường bắt buộc thì lỗi hiện tại chỗ, không gửi request', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await visibleModal(page).getByRole('button', { name: 'Tạo tài khoản' }).click();

    // Lỗi hiển thị NGAY tại trường (không gửi request → không có toast).
    await expect(page.getByText('Vui lòng nhập email')).toBeVisible();
    await expect(page.getByText('Đã tạo tài khoản.')).toHaveCount(0);
    // Modal vẫn mở để người dùng sửa.
    await expect(visibleModal(page).getByLabel('Email')).toBeVisible();
  });

  test('TC-ACC-10 — BE trả 409 (trùng email) thì lỗi hiện trong modal, không hiện thành công', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { accountCreateResult: 409 });

    await page.goto('/quan-tri/tai-khoan');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const modal = visibleModal(page);
    await modal.getByLabel('Email').fill('trung@example.edu.vn');
    await modal.getByLabel('Họ tên').fill('Trùng Email');
    await modal.getByRole('combobox', { name: 'Vai trò' }).click();
    await selectAntdOption(page, 'Quản trị tổ chức');
    await modal.getByRole('combobox', { name: 'Tổ chức' }).click();
    await selectAntdOption(page, 'Trường THPT Nguyễn Du');
    await modal.getByRole('button', { name: 'Tạo tài khoản' }).click();

    await expect(modal.getByText('Email hoặc tên đăng nhập đã tồn tại.')).toBeVisible();
    await expect(page.getByText('Đã tạo tài khoản.')).toHaveCount(0);
  });

  test('TC-ACC-11 — đổi vai trò: chọn đúng vai trò hiện tại thì chặn, đổi sang vai trò khác thì qua', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan/acc-2');
    await page.getByRole('button', { name: 'Đổi vai trò' }).click();
    const modal = visibleModal(page);
    await expect(modal.getByText('Vai trò hiện tại')).toBeVisible();

    // Đúng vai trò hiện tại (Chủ tổ chức) → validate FE chặn tại chỗ.
    await modal.getByRole('combobox', { name: 'Vai trò' }).click();
    await selectAntdOption(page, 'Chủ tổ chức');
    await modal.getByRole('button', { name: 'Đổi vai trò' }).click();
    await expect(modal.getByText('Vai trò mới phải khác vai trò hiện tại.')).toBeVisible();

    // Đổi sang vai trò khác thì lưu được, màn chi tiết refetch theo.
    // Bấm vào `.ant-select-selector` (không phải combobox) — khi đã có giá trị,
    // span `ant-select-selection-item` phủ lên và chặn click vào combobox.
    await modal.locator('.ant-select-selector').click();
    await selectAntdOption(page, 'Quản trị tổ chức');
    await modal.getByRole('button', { name: 'Đổi vai trò' }).click();

    await expect(page.getByText('Đã đổi vai trò tài khoản.')).toBeVisible();
    // Scope vào nội dung trang — modal đã đóng nhưng antd vẫn giữ DOM (cùng chuỗi).
    await expect(
      page.locator('#noi-dung-chinh').getByText('Quản trị tổ chức'),
    ).toBeVisible();
  });

  test('TC-ACC-12 — đặt lại mật khẩu: mặc định gửi email; chế độ thủ công < 8 ký tự bị chặn', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/tai-khoan/acc-2');
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    let modal = visibleModal(page);

    // Mặc định: gửi mật khẩu tạm qua email → không hiện ô nhập mật khẩu.
    await expect(
      modal.getByText('Mật khẩu tạm sẽ được gửi tới email của tài khoản này.'),
    ).toBeVisible();
    await expect(modal.getByLabel('Mật khẩu mới', { exact: true })).toHaveCount(0);
    await modal.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await expect(page.getByText('Đã gửi mật khẩu tạm tới email của tài khoản.')).toBeVisible();
    // Chờ modal đóng hẳn — nếu không, nút OK của modal còn trong cây a11y → 2 kết quả trùng tên.
    await expect(modal).toBeHidden();

    // Chế độ thủ công: mật khẩu < 8 ký tự bị chặn ngay tại trường.
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    modal = visibleModal(page);
    await modal.getByRole('radio', { name: 'Đặt mật khẩu mới thủ công' }).check();
    await modal.getByLabel('Mật khẩu mới', { exact: true }).fill('ngan');
    await modal.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await expect(modal.getByText('Mật khẩu tối thiểu 8 ký tự')).toBeVisible();
    await expect(page.getByText('Đã đặt lại mật khẩu tài khoản.')).toHaveCount(0);
  });
});

test.describe('Màn Nhật ký hệ thống', () => {
  test('TC-AUD-01 — bảng hiện đủ cột, Tag hành động kèm chữ', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/nhat-ky');

    await expect(page.getByRole('heading', { name: 'Nhật ký hệ thống' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Thời điểm' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Đối tượng' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Người thực hiện' })).toBeVisible();
    await expect(page.getByText('Duyệt tổ chức').first()).toBeVisible();
    await expect(page.getByText('Vô hiệu hoá tổ chức').first()).toBeVisible();
  });

  test('TC-AUD-02 — endpoint `D-22` chưa có thì hiện "chờ backend"', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { auditLogsMissing: true });

    await page.goto('/quan-tri/nhat-ky');

    await expect(page.getByText('Tính năng đang chờ backend (D-22).')).toBeVisible();
    await expect(page.getByText('Chưa có sự kiện nào')).toHaveCount(0);
  });

  test('TC-AUD-03 — link "Đối tượng" trỏ đúng màn chi tiết tương ứng', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/nhat-ky');
    await page.getByRole('link', { name: /Tài khoản: aurora/ }).click();

    await expect(page).toHaveURL(/\/quan-tri\/tai-khoan\/acc-3$/);
  });
});

test.describe('Lịch sử duyệt tổ chức', () => {
  test('TC-HIS-01 — tới từ màn chi tiết thì hiện đúng tên tổ chức + sự kiện của nó', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Xem lịch sử' }).click();

    await expect(page).toHaveURL(/\/lich-su\?from=to-chuc$/);
    await expect(page.getByRole('heading', { name: 'Lịch sử duyệt tổ chức' })).toBeVisible();
    await expect(page.getByText(ORG_A.name).first()).toBeVisible();
    // Chỉ sự kiện của CHÍNH tổ chức này (log-7).
    await expect(page.getByText('Đổi cấu hình module')).toBeVisible();
    await expect(page.getByText('Từ chối tổ chức')).toHaveCount(0);
  });

  test('TC-HIS-02 — endpoint `D-22` chưa có thì hiện "chờ backend"', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { auditLogsMissing: true });

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}/lich-su`);

    await expect(page.getByText('Tính năng đang chờ backend (D-22).')).toBeVisible();
  });
});

test.describe('C1 + C3 trên màn Chi tiết tổ chức', () => {
  test('TC-ORG-37 — tổ chức đã duyệt có nút Vô hiệu hoá + Xem lịch sử, vô hiệu hoá được', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { details: { [ORG_ACTIVE.id]: ORG_ACTIVE } });

    await page.goto(`/quan-tri/to-chuc/${ORG_ACTIVE.id}`);

    await expect(page.getByText('Tổ chức này đã được xử lý.')).toBeVisible();
    await page.getByRole('button', { name: `Vô hiệu hoá tổ chức ${ORG_ACTIVE.name}` }).click();

    const modal = visibleModal(page);
    await page.getByLabel('Lý do vô hiệu hoá').fill('Chờ thanh tra');
    await modal.getByRole('button', { name: 'Vô hiệu hoá' }).click();

    await expect(
      page.getByText(`Đã vô hiệu hoá tổ chức "${ORG_ACTIVE.name}".`),
    ).toBeVisible();
    // Sau khi đổi trạng thái → nút chuyển sang "Kích hoạt lại".
    await expect(
      page.getByRole('button', { name: `Kích hoạt lại tổ chức ${ORG_ACTIVE.name}` }),
    ).toBeVisible();
  });

  test('TC-ORG-38 — modal duyệt có checkbox notifyEmail tick sẵn; bỏ tick thì gửi false (C3)', async ({
    page,
  }) => {
    await loginAs(page);
    const log = await mockAdminApi(page);

    await page.goto(`/quan-tri/to-chuc/${ORG_A.id}`);
    await page.getByRole('button', { name: 'Duyệt tổ chức', exact: true }).click();

    const modal = visibleModal(page);
    const checkbox = modal.getByRole('checkbox', { name: 'Gửi email thông báo cho chủ tổ chức' });
    // Mặc định BẬT — người dùng phải chủ động bỏ tick.
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await modal.getByRole('button', { name: 'Duyệt' }).click();

    const approveCall = log.bodies.find((entry) => entry.url.includes('/approve'));
    expect(approveCall?.body).toEqual({ notifyEmail: false });
  });

  test('TC-ORG-39 — tới từ "Tất cả tổ chức" thì nút quay lại về đúng chỗ đó', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc/tat-ca');
    await page.getByRole('button', { name: `Xem chi tiết tổ chức ${ORG_A.name}` }).click();

    await expect(page).toHaveURL(/from=to-chuc-tat-ca/);
    await page.getByRole('link', { name: 'Quay lại danh sách' }).click();

    await expect(page).toHaveURL(/\/quan-tri\/to-chuc\/tat-ca$/);
  });
});

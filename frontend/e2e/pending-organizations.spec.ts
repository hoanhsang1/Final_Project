import { expect, test } from '@playwright/test';
import { loginAs, makeOrgs, mockAdminApi, ORG_A, ORG_B } from './helpers';

/**
 * Màn danh sách tổ chức chờ duyệt — Đặc tả Sprint 2 §5.3 (`TC-ORG-11…20`).
 *
 * Các ca tầng BE (`TC-ORG-19`, `TC-ORG-20`) không nằm trong file này vì cần
 * gọi API thật — xem `docs/api.md` và phần "BLOCKED" trong đặc tả.
 */
test.describe('Danh sách tổ chức chờ duyệt', () => {
  test('TC-ORG-11 — có 2 tổ chức thì ra đủ dòng, loại tổ chức hiện tiếng Việt', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');

    const rows = page.getByRole('row');
    // 1 dòng header + 2 dòng dữ liệu.
    await expect(rows).toHaveCount(3);
    await expect(page.getByText(ORG_A.name)).toBeVisible();
    await expect(page.getByText(ORG_B.name)).toBeVisible();
    await expect(page.getByText('Trường học', { exact: true })).toBeVisible();
    await expect(page.getByText('Trung tâm', { exact: true })).toBeVisible();
    await expect(page.getByText(ORG_A.owner_email)).toBeVisible();
  });

  test('TC-ORG-12 — không có tổ chức pending thì hiện Empty, không hiện bảng trắng', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { pending: [] });

    await page.goto('/quan-tri/to-chuc');

    await expect(page.getByText('Không có tổ chức nào đang chờ duyệt')).toBeVisible();
  });

  test('TC-ORG-13 — BE lỗi thì hiện MSG-ORG-03 + nút Thử lại, không hiện "không có dữ liệu"', async ({
    page,
  }) => {
    await loginAs(page);
    await mockAdminApi(page, { failPending: true });

    await page.goto('/quan-tri/to-chuc');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('Không tải được danh sách tổ chức.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    await expect(page.getByText('Không có tổ chức nào đang chờ duyệt')).toBeHidden();
  });

  test('TC-ORG-14 — lúc đang tải thì có Skeleton, không nhấp nháy Empty', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page, { pendingDelayMs: 2500 });

    await page.goto('/quan-tri/to-chuc');

    // Đang tải: có Skeleton, KHÔNG hiện Empty.
    await expect(page.locator('.ant-skeleton').first()).toBeVisible();
    await expect(page.getByText('Không có tổ chức nào đang chờ duyệt')).toBeHidden();

    // Tải xong: dữ liệu hiện, Skeleton biến mất.
    await expect(page.getByText(ORG_A.name)).toBeVisible();
    await expect(page.locator('.ant-skeleton')).toHaveCount(0);
  });

  test('TC-ORG-15 — mọi dòng có Tag trạng thái kèm chữ "Chờ duyệt" (BR-08)', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');

    const tags = page.getByRole('cell', { name: 'Chờ duyệt' });
    await expect(tags).toHaveCount(2);
  });

  test('TC-ORG-16 — bấm Xem thì điều hướng đúng id tổ chức', async ({ page }) => {
    await loginAs(page);
    await mockAdminApi(page);

    await page.goto('/quan-tri/to-chuc');
    await page.getByRole('button', { name: `Xem chi tiết tổ chức ${ORG_B.name}` }).click();

    await expect(page).toHaveURL(new RegExp(`/quan-tri/to-chuc/${ORG_B.id}$`));
    await expect(page.getByRole('heading', { name: ORG_B.name })).toBeVisible();
  });

  test('TC-ORG-18 — phân trang hiện showTotal tiếng Việt, số trang đúng', async ({ page }) => {
    const orgs = makeOrgs(12);
    await loginAs(page);
    await mockAdminApi(page, { pending: orgs });

    await page.goto('/quan-tri/to-chuc');

    await expect(page.getByText('Tổng 12 tổ chức')).toBeVisible();
    // Trang 1 hiện 10 dòng, trang 2 hiện 2 dòng còn lại.
    await expect(page.getByRole('row')).toHaveCount(11); // 1 header + 10 dòng
    await page.getByTitle('2').click();
    await expect(page.getByRole('row')).toHaveCount(3); // 1 header + 2 dòng
    await expect(page.getByText('Tổ chức số 12')).toBeVisible();
  });
});

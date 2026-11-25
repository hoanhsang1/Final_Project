import { expect, test, type Page } from '@playwright/test';
import {
  CLASS_C1_ID,
  CLASS_C2_ID,
  MOCK_CLASS_DETAILS,
  MOCK_CLOSE_EVENTS,
  OTHER_ACTOR_ID,
  SPRINT4_ALL_PERMISSIONS,
  loginAsSprint4,
  mockSprint4Api,
  type Sprint4JwtOptions,
  type Sprint4MockOptions,
} from './sprint4Helpers';

/**
 * E2E mock cho slice LỚP HỌC / GIÁO VIÊN (Sprint 4) — `§6.1…§6.5`, `§7`, `§8`, `§9`.
 *
 * Mọi request đều đi qua `page.route` trong `sprint4Helpers.ts`: KHÔNG gọi BE
 * thật, KHÔNG ghi dữ liệu. Dữ liệu giả bám sát `sprint4Api.ts` (endpoint, shape,
 * mã lỗi) để test bắt lệch contract giữa FE và BE sau này.
 *
 * Nhãn assert lấy thẳng từ `sprint4Messages.ts`/`labels.ts` dưới dạng literal —
 * cố tình không import runtime từ `src` để spec độc lập với bundle của app.
 */

async function openClasses(
  page: Page,
  options: Sprint4MockOptions = {},
  jwt: Sprint4JwtOptions = {},
) {
  await loginAsSprint4(page, { permissions: [...SPRINT4_ALL_PERMISSIONS], ...jwt });
  const log = await mockSprint4Api(page, options);
  await page.goto('/dao-tao/lop-hoc');
  return log;
}

async function openDetail(
  page: Page,
  classId: string,
  options: Sprint4MockOptions = {},
  jwt: Sprint4JwtOptions = {},
) {
  await loginAsSprint4(page, { permissions: [...SPRINT4_ALL_PERMISSIONS], ...jwt });
  const log = await mockSprint4Api(page, options);
  await page.goto(`/dao-tao/lop-hoc/${classId}`);
  return log;
}

test.describe('Danh sách lớp học (§6.1)', () => {
  test('CL-01 — hiện 3 lớp, tổng số lấy từ BE, badge trạng thái có CHỮ (BR-08)', async ({ page }) => {
    const log = await openClasses(page);

    await expect(page.getByText('3 lớp')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LOP10A1' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LOP11B2' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LOP12C3' })).toBeVisible();

    const pendingRow = page.getByRole('row').filter({ hasText: 'LOP11B2' });
    await expect(pendingRow.getByText('Đang diễn ra', { exact: true })).toBeVisible();
    await expect(pendingRow.getByText('Chờ duyệt đóng', { exact: true })).toBeVisible();

    const unassignedRow = page.getByRole('row').filter({ hasText: 'LOP10A1' });
    await expect(unassignedRow.getByText('Chưa phân công', { exact: true })).toBeVisible();
    await expect(unassignedRow.getByText('35', { exact: true })).toBeVisible();
    expect(log.urls.some((url) => url.includes('/api/classes?'))).toBe(true);
  });

  test('CL-02 — ô tìm kiếm gửi `q` lên server, quay về trang 1', async ({ page }) => {
    const log = await openClasses(page);

    await page.getByPlaceholder('Tìm theo mã lớp hoặc tên lớp').fill('Toán');
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();

    await expect(page.getByText('1 lớp')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LOP10A1' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LOP11B2' })).toHaveCount(0);
    const query = log.urls
      .map((url) => new URL(url))
      .find((url) => url.pathname === '/api/classes' && url.searchParams.get('q'));
    expect(query?.searchParams.get('q')).toBe('Toán');
    expect(query?.searchParams.get('page')).toBe('1');
  });

  test('CL-03 — lọc trạng thái gửi `status` đúng enum', async ({ page }) => {
    const log = await openClasses(page);

    await page.getByRole('combobox', { name: 'Tất cả trạng thái' }).click();
    await page.getByRole('option', { name: 'Đã kết thúc' }).click();

    await expect(page.getByText('1 lớp')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LOP12C3' })).toBeVisible();
    const query = log.urls
      .map((url) => new URL(url))
      .find((url) => url.pathname === '/api/classes' && !!url.searchParams.get('status'));
    expect(query?.searchParams.get('status')).toBe('DA_KET_THUC');
  });

  test('CL-04 — danh sách rỗng hiện thông báo, không hiện bảng dữ liệu', async ({ page }) => {
    await openClasses(page, { classes: [] });

    await expect(page.getByText('0 lớp')).toBeVisible();
    // Astryx hiện cùng lúc đưa text vào heading VÀ live-region → scope theo role.
    await expect(page.getByRole('heading', { name: 'Chưa có lớp học nào.' })).toBeVisible();
  });

  test('CL-05 — BE lỗi: banner tiếng Việt; bấm Thử lại thì có dữ liệu', async ({ page }) => {
    await openClasses(page, {
      // TanStack Query retry: 1 → 2 lần đầu lỗi; lần bấm Thử lại là lần 3.
      classesError: { status: 500, code: 'INTERNAL_ERROR', times: 2 },
    });

    await expect(page.getByText('Không tải được danh sách lớp học.')).toBeVisible();
    await expect(
      page.locator('[role="alert"]').filter({ hasText: 'Có lỗi xảy ra, vui lòng thử lại.' }).first(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.getByText('3 lớp')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LOP10A1' })).toBeVisible();
  });

  test('CL-06 — không có quyền Sprint 4 thì chặn route, KHÔNG gọi /api/classes', async ({
    page,
  }) => {
    const log = await openClasses(page, {}, { roles: ['STAFF'], permissions: [] });

    await expect(page.getByText('Bạn không có quyền truy cập khu vực này.')).toBeVisible();
    expect(log.urls.some((url) => url.includes('/api/classes'))).toBe(false);
  });

  test('CL-07 — có quyền vào khu vực nhưng thiếu CLASS_VIEW thì hiện ForbiddenNotice', async ({
    page,
  }) => {
    const log = await openClasses(
      page,
      {},
      { roles: ['STAFF'], permissions: ['CLASS_ASSIGN_TEACHER'] },
    );

    await expect(page.getByText('Bạn không có quyền truy cập khu vực này.')).toBeVisible();
    expect(log.urls.some((url) => url.includes('/api/classes'))).toBe(false);
  });
});

test.describe('Chi tiết lớp học (§6.2)', () => {
  test('CL-08 — thông tin lớp + 2 tab lịch sử chuẩn hoá field của BE', async ({ page }) => {
    const log = await openDetail(page, CLASS_C1_ID, { closeEvents: [] });

    await expect(page.getByText('Toán 10A1')).toBeVisible();
    await expect(page.getByText('GV001', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Chưa phân công', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Lịch sử trạng thái' }).click();
    // BE trả changedAt/changedBy → FE phải hiện được at/actorName.
    await expect(page.getByText('Nguyễn Văn A', { exact: true })).toBeVisible();
    await expect(page.getByText('08:00 01/09/2026', { exact: true })).toBeVisible();
    expect(log.urls.some((url) => url.includes('/status-logs'))).toBe(true);

    await page.getByRole('tab', { name: 'Sự kiện đóng' }).click();
    await expect(
      page.getByRole('heading', { name: 'Chưa có sự kiện đóng lớp.' }),
    ).toBeVisible();
    expect(log.urls.some((url) => url.includes('/close-events'))).toBe(true);
  });

  test('CL-09 — 404 thì hiện "Không tìm thấy dữ liệu này." + nút Quay lại', async ({ page }) => {
    await openDetail(page, CLASS_C1_ID, {
      detailError: { status: 404, code: 'CLASS_NOT_FOUND' },
    });

    await expect(page.getByText('Không tìm thấy dữ liệu này.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quay lại', exact: true })).toBeVisible();
  });

  test('CL-10 — 500 thì hiện banner lỗi, bấm Thử lại tải được dữ liệu', async ({ page }) => {
    await openDetail(page, CLASS_C1_ID, {
      detailError: { status: 500, code: 'INTERNAL_ERROR', times: 2 },
    });

    await expect(page.getByText('Không tải được thông tin lớp học.')).toBeVisible();
    await expect(
      page.locator('[role="alert"]').filter({ hasText: 'Có lỗi xảy ra, vui lòng thử lại.' }).first(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.getByText('Toán 10A1')).toBeVisible();
  });

  test('CL-11 — 403 thì chi tiết hiện ForbiddenNotice, không hiện nút hành động', async ({
    page,
  }) => {
    await openDetail(page, CLASS_C1_ID, {
      detailError: { status: 403, code: 'FORBIDDEN' },
    });

    await expect(page.getByText('Bạn không có quyền truy cập khu vực này.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gán giáo viên' })).toHaveCount(0);
  });

  test('CL-12 — 2 tab lỗi thì mỗi tab hiện đúng banner riêng', async ({ page }) => {
    await openDetail(page, CLASS_C1_ID, {
      statusLogsError: { status: 500 },
      closeEventsError: { status: 500 },
    });

    await page.getByRole('tab', { name: 'Lịch sử trạng thái' }).click();
    await expect(page.getByText('Không tải được lịch sử trạng thái.')).toBeVisible();

    await page.getByRole('tab', { name: 'Sự kiện đóng' }).click();
    await expect(page.getByText('Không tải được sự kiện đóng lớp.')).toBeVisible();
  });

  test('CL-13 — chỉ có CLASS_VIEW thì xem được chi tiết nhưng không có nút thao tác', async ({
    page,
  }) => {
    await openDetail(
      page,
      CLASS_C1_ID,
      {},
      { roles: ['STAFF'], permissions: ['CLASS_VIEW'] },
    );

    await expect(page.getByText('Toán 10A1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gán giáo viên' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Yêu cầu đóng lớp' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Thao tác khác' })).toHaveCount(0);
  });
});

test.describe('Gán giáo viên (§6.3)', () => {
  test('CL-14 — tìm GV theo q, chọn 1 radio, PUT kèm version đang đọc', async ({ page }) => {
    const log = await openDetail(page, CLASS_C1_ID);

    await page.getByRole('button', { name: 'Gán giáo viên', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Gán/đổi giáo viên phụ trách')).toBeVisible();

    await dialog.getByPlaceholder('Tìm giáo viên theo mã hoặc họ tên').fill('Nguyễn');
    await dialog.getByRole('button', { name: 'Tìm', exact: true }).click();
    const teacher = dialog.getByRole('radio', { name: /Nguyễn Văn A/ });
    await expect(teacher).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /Trần Thị B/ })).toHaveCount(0);
    await teacher.click();

    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dialog).toBeHidden();
    // Dialog vẫn nằm trong DOM dù ẩn → scope đúng ô "Giáo viên phụ trách".
    const teacherValue = page
      .getByRole('main')
      .getByRole('definition')
      .filter({ hasText: 'Nguyễn Văn A' });
    await expect(teacherValue).toBeVisible();
    await expect(teacherValue).toContainText('GV001');

    const query = log.urls
      .map((url) => new URL(url))
      .find((url) => url.pathname === '/api/teachers/assignable' && !!url.searchParams.get('q'));
    expect(query?.searchParams.get('q')).toBe('Nguyễn');
    const put = log.bodies.find(
      (entry) => entry.method === 'PUT' && entry.url.includes('/api/classes/c1/teacher'),
    );
    expect(put?.body).toEqual({ teacherId: 't-1', version: 3 });
  });

  test('CL-15 — chưa chọn GV thì nút Xác nhận bị khoá, KHÔNG gọi API', async ({ page }) => {
    const log = await openDetail(page, CLASS_C1_ID);

    await page.getByRole('button', { name: 'Gán giáo viên', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: /Nguyễn Văn A/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
    expect(log.urls.some((url) => url.includes('/api/classes/c1/teacher'))).toBe(false);
  });

  test('CL-16 — 409 DATA_CHANGED: đóng modal, báo "tải lại", refetch bản ghi mới', async ({
    page,
  }) => {
    const log = await openDetail(page, CLASS_C1_ID, {
      mutation: {
        teacher: {
          status: 409,
          body: { code: 'DATA_CHANGED', message: 'Dữ liệu vừa thay đổi.' },
        },
      },
    });

    await page.getByRole('button', { name: 'Gán giáo viên', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: /Nguyễn Văn A/ }).click();
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page
        .locator('[role="alert"]')
        .filter({ hasText: 'Dữ liệu vừa được thay đổi bởi người khác. Vui lòng tải lại.' })
        .first(),
    ).toBeVisible();
    const detailGets = log.urls.filter((url) => /\/api\/classes\/c1(\?|$)/.test(url));
    expect(detailGets.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByText('Chưa phân công', { exact: true })).toBeVisible();
  });
});

test.describe('Huỷ / đóng / mở lại lớp (§6.4–§6.5)', () => {
  test('CL-17 — hủy lớp: lý do bắt buộc, POST kèm version, badge chuyển "Đã hủy"', async ({
    page,
  }) => {
    const log = await openDetail(page, CLASS_C1_ID);

    await page.getByRole('button', { name: 'Thao tác khác' }).click();
    await page.getByRole('menuitem', { name: 'Hủy lớp' }).press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Hủy lớp', exact: true }).click();
    // Astryx nhân đôi thông báo lỗi sang modal live-region → lấy field status.
    await expect(dialog.getByText('Vui lòng nhập lý do.').first()).toBeVisible();
    expect(log.urls.some((url) => url.includes('/cancel'))).toBe(false);

    await dialog.getByRole('textbox', { name: 'Lý do hủy' }).fill('Lớp mở nhầm năm học');
    await dialog.getByRole('button', { name: 'Hủy lớp', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Đã hủy', { exact: true }).first()).toBeVisible();
    const post = log.bodies.find(
      (entry) => entry.method === 'POST' && entry.url.includes('/api/classes/c1/cancel'),
    );
    expect(post?.body).toEqual({ reason: 'Lớp mở nhầm năm học', version: 3 });
  });

  test('CL-18 — yêu cầu đóng: note tuỳ chọn, badge PENDING + sự kiện REQUESTED', async ({
    page,
  }) => {
    const log = await openDetail(page, CLASS_C1_ID, { closeEvents: [] });

    await page.getByRole('button', { name: 'Yêu cầu đóng lớp', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Ghi chú (tùy chọn)' }).fill('Chuyển sang lớp mới');
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Chờ duyệt đóng', { exact: true }).first()).toBeVisible();
    await page.getByRole('tab', { name: 'Sự kiện đóng' }).click();
    await expect(page.getByRole('cell', { name: 'Gửi yêu cầu đóng' })).toHaveCount(1);

    const post = log.bodies.find(
      (entry) => entry.method === 'POST' && entry.url.includes('/close-requests'),
    );
    expect(post?.body).toEqual({ note: 'Chuyển sang lớp mới' });
  });

  test('CL-19 — duyệt đóng: chỉ người KHÔNG gửi yêu cầu mới thấy nút Duyệt', async ({ page }) => {
    const log = await openDetail(page, CLASS_C2_ID, { closeEvents: MOCK_CLOSE_EVENTS });

    await expect(page.getByRole('button', { name: 'Duyệt đóng', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Duyệt đóng', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Duyệt yêu cầu đóng lớp này?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Duyệt đóng', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Lớp đã đóng', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Đã đóng', { exact: true }).first()).toBeVisible();
    expect(log.urls.some((url) => url.includes('/api/classes/c2/close-requests/approve'))).toBe(true);
  });

  test('CL-20 — tự duyệt yêu cầu của mình thì ẩn cả Duyệt lẫn Từ chối', async ({ page }) => {
    await openDetail(page, CLASS_C2_ID, {
      closeEvents: [{ ...MOCK_CLOSE_EVENTS[0], actorId: 'u-1' }],
    });

    await expect(page.getByRole('button', { name: 'Duyệt đóng', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Thao tác khác' })).toHaveCount(0);
  });

  test('CL-21 — từ chối đóng: lý do bắt buộc, body gửi reason', async ({ page }) => {
    const log = await openDetail(page, CLASS_C2_ID, {
      closeEvents: MOCK_CLOSE_EVENTS,
    });

    await page.getByRole('button', { name: 'Thao tác khác' }).click();
    await page.getByRole('menuitem', { name: 'Từ chối' }).press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Từ chối', exact: true }).click();
    await expect(dialog.getByText('Vui lòng nhập lý do.').first()).toBeVisible();

    await dialog.getByRole('textbox', { name: 'Lý do từ chối' }).fill('Lý do chưa rõ');
    await dialog.getByRole('button', { name: 'Từ chối', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Chờ duyệt đóng', { exact: true })).toHaveCount(0);
    const post = log.bodies.find((entry) => entry.url.includes('/close-requests/reject'));
    expect(post?.body).toEqual({ reason: 'Lý do chưa rõ' });
  });

  test('CL-22 — lớp CLOSED chỉ xem; mở lại cần lý do rồi hết banner "Lớp đã đóng"', async ({
    page,
  }) => {
    const log = await openDetail(page, CLASS_C1_ID, {
      details: { ...MOCK_CLASS_DETAILS, c1: { ...MOCK_CLASS_DETAILS.c1, closeState: 'CLOSED' } },
    });

    await expect(page.getByText('Lớp đã đóng', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gán giáo viên' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Yêu cầu đóng lớp' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Thao tác khác' }).click();
    // ⚠️ Khi có banner "Lớp đã đóng", item menu bị banner chắn pointer (xem
    // docs/e2e-sprint4-classes.md). Dùng bàn phím để vẫn kiểm được hành động.
    await page.getByRole('menuitem', { name: 'Mở lại lớp' }).press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Mở lại lớp', exact: true }).click();
    await expect(dialog.getByText('Vui lòng nhập lý do.').first()).toBeVisible();

    await dialog.getByRole('textbox', { name: 'Lý do mở lại' }).fill('Cần mở để bổ sung dữ liệu');
    await dialog.getByRole('button', { name: 'Mở lại lớp', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Lớp đã đóng', { exact: true })).toHaveCount(0);
    const post = log.bodies.find((entry) => entry.url.includes('/reopen'));
    expect(post?.body).toEqual({ reason: 'Cần mở để bổ sung dữ liệu' });
  });

  test('CL-23 — 409 CLOSE_STATE_CHANGED: báo lỗi, đóng dialog, tải lại trạng thái mới', async ({
    page,
  }) => {
    const log = await openDetail(page, CLASS_C1_ID, {
      mutation: {
        'close-requests': {
          status: 409,
          body: { code: 'CLOSE_STATE_CHANGED', message: 'Trạng thái đóng lớp vừa thay đổi.' },
        },
      },
    });

    await page.getByRole('button', { name: 'Yêu cầu đóng lớp', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(
      page
        .locator('[role="alert"]')
        .filter({ hasText: 'Trạng thái đóng lớp vừa được thay đổi bởi người khác. Vui lòng tải lại.' })
        .first(),
    ).toBeVisible();
    const detailGets = log.urls.filter((url) => /\/api\/classes\/c1(\?|$)/.test(url));
    expect(detailGets.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByText('Chờ duyệt đóng', { exact: true })).toHaveCount(0);
  });

  test('CL-24 — actorId người gửi được chuẩn hoá từ close-event của BE', async ({ page }) => {
    await openDetail(page, CLASS_C2_ID, { closeEvents: MOCK_CLOSE_EVENTS });

    await page.getByRole('tab', { name: 'Sự kiện đóng' }).click();
    await expect(page.getByText('Trần Thị B', { exact: true })).toBeVisible();
    await expect(page.getByText('Gửi yêu cầu đóng', { exact: true })).toBeVisible();
    await expect(page.getByText(OTHER_ACTOR_ID, { exact: true })).toHaveCount(0);
  });
});

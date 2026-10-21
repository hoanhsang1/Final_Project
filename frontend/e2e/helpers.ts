import type { Page, Route } from '@playwright/test';

/**
 * Helper cho e2e màn quản trị Admin hệ thống (Sprint 2).
 *
 * ⚠️ Mock API thay vì gọi BE thật: BE chưa sẵn sàng (`D-05` chưa nhận `reason`,
 * `D-16` chưa có `PUT …/modules`). E2E chạy được, kiểm đúng hành vi FE.
 * Khi BE xong → đổi `mockAdminApi` thành gọi thật (contract đã kiểm chứng).
 */

/** Danh sách module trả về từ `GET /api/v1/modules` (chỉ module `is_active = TRUE`). */
export const MODULE_CATALOG = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh' },
  { code: 'TEACHER_MANAGEMENT', name: 'Quản lý giáo viên' },
  { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học' },
  { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học' },
  { code: 'ROOM_MANAGEMENT', name: 'Quản lý phòng học' },
  { code: 'EQUIPMENT_MANAGEMENT', name: 'Quản lý thiết bị' },
];

/** Một tổ chức đang chờ duyệt — shape đúng `GET /organizations/pending`. */
export interface FakeOrg {
  id: string;
  name: string;
  org_type: 'school' | 'center';
  status: 'pending' | 'active' | 'rejected';
  owner_username: string;
  owner_email: string;
  modules?: Array<{ code: string; name: string; status: string }>;
  /** BE chưa trả (`D-11`, `D-19`) → mặc định `null` ⇒ FE hiện "—". */
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at?: string | null;
  /** BE chưa lưu (`D-05`) — mô phỏng lý do từ chối đã có trong DB. */
  rejection_reason?: string | null;
}

/** Tổ chức pending dùng chung cho các ca không cần dữ liệu riêng. */
export const ORG_A: FakeOrg = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Trường THPT Nguyễn Du',
  org_type: 'school',
  status: 'pending',
  owner_username: 'truongnguyendu',
  owner_email: 'truongnguyendu@example.edu.vn',
  modules: [
    { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', status: 'requested' },
    { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học', status: 'requested' },
    { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học', status: 'requested' },
  ],
};

/** Tổ chức thứ hai — kiểm danh sách nhiều dòng + kiểu tổ chức khác. */
export const ORG_B: FakeOrg = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Trung tâm Ngoại khóa Minh Anh',
  org_type: 'center',
  status: 'pending',
  owner_username: 'minhanh',
  owner_email: 'minhanh@example.com',
  modules: [{ code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', status: 'requested' }],
};

/** Tổ chức chỉ có module KHÔNG lõi — dùng cho `TC-MOD-03` (bỏ hết tick) và `TC-MOD-04`. */
export const ORG_C: FakeOrg = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Trung tâm Tin học Phú Thọ',
  org_type: 'center',
  status: 'pending',
  owner_username: 'phutho',
  owner_email: 'phutho@example.com',
  modules: [
    { code: 'ROOM_MANAGEMENT', name: 'Quản lý phòng học', status: 'requested' },
    { code: 'EQUIPMENT_MANAGEMENT', name: 'Quản lý thiết bị', status: 'requested' },
  ],
};

/** Sinh N tổ chức giả (dùng cho ca kiểm phân trang). */
export function makeOrgs(count: number): FakeOrg[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
    name: `Tổ chức số ${String(index + 1).padStart(2, '0')}`,
    org_type: index % 2 === 0 ? ('school' as const) : ('center' as const),
    status: 'pending' as const,
    owner_username: `user${index + 1}`,
    owner_email: `user${index + 1}@example.com`,
    modules: [{ code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', status: 'requested' }],
  }));
}

/** Tạo JWT giả (chỉ decode, không verify) — payload chứa `roles` cho store đọc. */
export function fakeJwt(roles: string[], username = 'platform_admin'): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ userId: 'u-1', username, roles })}.sig`;
}

/**
 * Đăng nhập giả bằng cách ghi token thẳng vào `localStorage` TRƯỚC khi app load
 * (store đọc token lúc khởi tạo — xem `stores/authStore.ts`).
 */
export async function loginAs(page: Page, roles: string[] = ['SUPER_ADMIN']): Promise<void> {
  const token = fakeJwt(roles);
  await page.addInitScript(
    ([t, r]: string[]) => {
      window.localStorage.setItem('mems.accessToken', t as string);
      window.localStorage.setItem('mems.refreshToken', r as string);
    },
    [token, 'refresh-token-gia'],
  );
}

/** Các endpoint mà e2e theo dõi để assert "không gọi API nào" (TC-ADM-01/02). */
export interface RequestLog {
  urls: string[];
}

/** Bắt đầu ghi lại mọi request API đi ra. */
export function trackApiRequests(page: Page): RequestLog {
  const log: RequestLog = { urls: [] };
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/v1/')) {
      log.urls.push(url);
    }
  });
  return log;
}

/** Tuỳ chọn cấu hình BE giả cho `mockAdminApi`. */
export interface MockAdminOptions {
  /** Danh sách tổ chức pending. Mặc định `[ORG_A, ORG_B]`. */
  pending?: FakeOrg[];
  /** Chi tiết tổ chức theo id. Mặc định suy ra từ `pending`. */
  details?: Record<string, FakeOrg>;
  /** Danh mục module. Mặc định `MODULE_CATALOG`. */
  modules?: Array<{ code: string; name: string }>;
  /** Ép `GET /organizations/pending` trả lỗi (mô phỏng BE tắt). */
  failPending?: boolean;
  /** Chỉ lần gọi ĐẦU TIÊN tới `pending` thất bại, sau đó thành công (để test "Thử lại"). */
  failPendingOnce?: boolean;
  /** Số lần gọi `pending` đầu thất bại (2 = đủ gọi + 1 lần retry của TanStack Query). */
  failPendingTimes?: number;
  /** Trễ (ms) trước khi trả `pending` — để quan sát trạng thái đang tải. */
  pendingDelayMs?: number;
  /** Ép `GET /organizations/{id}` trả 404. */
  notFoundDetail?: boolean;
  /** Ép `GET /organizations/{id}` trả lỗi chung. */
  failDetail?: boolean;
  /** Kết quả `PATCH …/approve`: 204 | 409 | 500. */
  approveStatus?: 204 | 409 | 500;
  /** Kết quả `PATCH …/reject`: 204 | 409 | 500. */
  rejectStatus?: 204 | 409 | 500;
  /** Kết quả `POST /auth/logout`: 204 | 500. */
  logoutStatus?: 204 | 500;
  /** Kết quả `PUT …/modules`: 204 | 400 | 409 | 500. */
  modulesStatus?: 204 | 400 | 409 | 500;
  /** Cơ chế 401 → refresh: 'ok' | 'fail' | 'none' (không trả 401 lần nào). */
  refreshMode?: 'ok' | 'fail' | 'none';
}

/** Clone 1 tổ chức — mock sẽ MUTATE (`status`, `modules`) nên phải copy trước. */
function cloneOrg(org: FakeOrg): FakeOrg {
  return { ...org, modules: org.modules?.map((m) => ({ ...m })) };
}

/**
 * Cài mock cho toàn bộ endpoint màn quản trị.
 *
 * Trả về `RequestLog` để test assert "không gọi API nào" (TC-ADM-01/02).
 */
export async function mockAdminApi(
  page: Page,
  options: MockAdminOptions = {},
): Promise<RequestLog> {
  const log = trackApiRequests(page);

  // ⚠️ Clone sâu: các fixture `ORG_A/B/C` ở module scope dùng chung cho MỌI ca
  // trong worker. Nếu mock mutate trực tiếp chúng (đổi `status`, `modules`) thì
  // ca sau bị "rò" trạng thái của ca trước → ca đỏ giả, khó chẩn đoán.
  const pending = (options.pending ?? [ORG_A, ORG_B]).map(cloneOrg);
  const details: Record<string, FakeOrg> = {};
  for (const [id, org] of Object.entries(options.details ?? {})) {
    details[id] = cloneOrg(org);
  }
  for (const org of pending) {
    details[org.id] ??= org;
  }

  /** Đã duyệt/từ chối → biến mất khỏi danh sách chờ duyệt. */
  const reviewed = new Set<string>();

  /** Số request đã bị 401 (để mô phỏng refresh). */
  let unauthorizedSent = false;

  /** Lần gọi `pending` đầu tiên đã thất bại (dùng cho `failPendingOnce`). */
  let pendingFailedOnce = false;

  /** Số lần gọi `pending` đã thất bại (dùng cho `failPendingTimes`). */
  let pendingFailures = 0;

  await page.route('**/api/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    const empty = (status: number) => route.fulfill({ status, body: '' });

    // --- Auth ---
    if (path === '/api/v1/auth/logout') {
      return empty(options.logoutStatus ?? 204);
    }

    if (path === '/api/v1/auth/refresh') {
      if (options.refreshMode === 'fail') {
        return json(401, {
          success: false,
          message: 'Invalid or expired refresh token',
          data: null,
        });
      }
      if (options.refreshMode === 'none') {
        return json(500, { success: false, message: 'Không dùng', data: null });
      }
      return json(200, { accessToken: fakeJwt(['SUPER_ADMIN']), refreshToken: 'r-2' });
    }

    // --- Danh mục module ---
    if (path === '/api/v1/modules' && method === 'GET') {
      return json(200, options.modules ?? MODULE_CATALOG);
    }

    // --- Danh sách tổ chức chờ duyệt ---
    if (path === '/api/v1/organizations/pending' && method === 'GET') {
      if (options.pendingDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.pendingDelayMs));
      }
      if (options.failPending) {
        return json(500, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      if (options.failPendingOnce && !pendingFailedOnce) {
        pendingFailedOnce = true;
        return json(500, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      if (options.failPendingTimes && pendingFailures < options.failPendingTimes) {
        pendingFailures += 1;
        return json(500, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      if (options.refreshMode !== 'none' && !unauthorizedSent) {
        unauthorizedSent = true;
        return json(401, { success: false, message: 'Unauthorized', data: null });
      }
      return json(
        200,
        pending.filter((org) => !reviewed.has(org.id)),
      );
    }

    // --- Cấu hình module của tổ chức ---
    const modulesMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)\/modules$/);
    if (modulesMatch && method === 'PUT') {
      const status = options.modulesStatus ?? 204;
      if (status === 400) {
        return json(400, {
          success: false,
          message: 'Invalid module: FACILITY_MANAGEMENT',
          data: null,
        });
      }
      if (status === 409) {
        return json(409, {
          success: false,
          message: 'Organization has already been reviewed',
          data: null,
        });
      }
      if (status === 500) {
        return json(500, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      const body = JSON.parse(request.postData() ?? '{}') as { modules?: string[] };
      const org = details[modulesMatch[1]];
      if (org) {
        org.modules = (body.modules ?? []).map((code) => ({
          code,
          name: MODULE_CATALOG.find((m) => m.code === code)?.name ?? code,
          status: 'requested',
        }));
      }
      return empty(204);
    }

    // --- Duyệt / từ chối ---
    const reviewMatch = path.match(
      /^\/api\/v1\/organizations\/([^/]+)\/(approve|reject)$/,
    );
    if (reviewMatch && method === 'PATCH') {
      const action = reviewMatch[2];
      const status =
        action === 'approve'
          ? (options.approveStatus ?? 204)
          : (options.rejectStatus ?? 204);
      if (status === 409) {
        return json(409, {
          success: false,
          message: 'Organization has already been reviewed',
          data: null,
        });
      }
      if (status === 500) {
        return json(500, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      const org = details[reviewMatch[1]];
      if (org) {
        org.status = action === 'approve' ? 'active' : 'rejected';
      }
      reviewed.add(reviewMatch[1]);
      return empty(204);
    }

    // --- Chi tiết tổ chức ---
    const detailMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)$/);
    if (detailMatch && method === 'GET') {
      if (options.notFoundDetail) {
        return json(404, {
          success: false,
          message: 'Organization not found',
          data: null,
        });
      }
      if (options.failDetail) {
        return json(500, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      const org = details[detailMatch[1]];
      if (!org) {
        return json(404, {
          success: false,
          message: 'Organization not found',
          data: null,
        });
      }
      return json(200, {
        organization: {
          id: org.id,
          name: org.name,
          org_type: org.org_type,
          status: org.status,
          contact_email: org.contact_email ?? null,
          contact_phone: org.contact_phone ?? null,
          created_at: org.created_at ?? null,
          rejection_reason: org.rejection_reason ?? null,
        },
        owners: [
          {
            id: 'o-1',
            username: org.owner_username,
            email: org.owner_email,
            status: 'pending',
          },
        ],
        modules: org.modules ?? [],
      });
    }

    // Không biết endpoint → trả 404 để lộ chỗ FE gọi sai.
    return json(404, {
      success: false,
      message: `Endpoint chưa mock: ${method} ${path}`,
      data: null,
    });
  });

  return log;
}

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
  status: 'pending' | 'active' | 'rejected' | 'suspended';
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

/* -------------------------------------------------------------------------- */
/*  Mở rộng console Super Admin (Đặc tả "Sprint 2 — Mở rộng console")          */
/* -------------------------------------------------------------------------- */

/** Một dòng trong danh sách TẤT CẢ tổ chức — `GET /organizations` (`D-20`). */
export interface FakeOrgListRow {
  id: string;
  name: string;
  org_type: 'school' | 'center';
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  owner_username: string;
  owner_email: string;
  created_at?: string | null;
}

/** Một dòng tài khoản — `GET /accounts` (`D-24`). */
export interface FakeAccount {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  role: string;
  status: 'pending' | 'active' | 'locked' | 'disabled';
  created_at?: string | null;
  last_login_at?: string | null;
}

/** Một dòng nhật ký — `GET /audit-logs` (`D-22`). */
export interface FakeAuditLog {
  id: string;
  created_at: string;
  action: string;
  actor_username: string;
  target_type: 'ORGANIZATION' | 'ACCOUNT';
  target_id: string;
  target_name: string;
  description?: string | null;
}

/** Tổ chức trong danh sách "Tất cả tổ chức" — đủ 4 trạng thái để kiểm Tag (BR-08). */
export const ORG_ALL_ROWS: FakeOrgListRow[] = [
  {
    id: ORG_A.id,
    name: ORG_A.name,
    org_type: 'school',
    status: 'pending',
    owner_username: ORG_A.owner_username,
    owner_email: ORG_A.owner_email,
    created_at: '2026-01-05 09:15:00',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Trường THCS Lê Quý Đôn',
    org_type: 'school',
    status: 'active',
    owner_username: 'lequydon',
    owner_email: 'lequydon@example.edu.vn',
    created_at: '2025-11-20 08:00:00',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Trung tâm Anh ngữ Aurora',
    org_type: 'center',
    status: 'suspended',
    owner_username: 'aurora',
    owner_email: 'aurora@example.com',
    created_at: '2025-09-01 07:30:00',
  },
  {
    id: ORG_B.id,
    name: ORG_B.name,
    org_type: 'center',
    status: 'rejected',
    owner_username: ORG_B.owner_username,
    owner_email: ORG_B.owner_email,
    created_at: '2025-12-12 14:45:00',
  },
];

/** Danh sách tài khoản — đủ 4 trạng thái + 2 role khác nhau. */
export const ACCOUNTS: FakeAccount[] = [
  {
    id: 'acc-1',
    username: 'platform_admin',
    email: 'admin@example.com',
    full_name: 'Quản trị viên hệ thống',
    organization_id: null,
    organization_name: null,
    role: 'SUPER_ADMIN',
    status: 'active',
    created_at: '2025-08-01 07:00:00',
    last_login_at: '2026-10-21 08:05:00',
  },
  {
    id: 'acc-2',
    username: 'lequydon',
    email: 'lequydon@example.edu.vn',
    full_name: 'Ngô Thị Hoa',
    organization_id: '44444444-4444-4444-4444-444444444444',
    organization_name: 'Trường THCS Lê Quý Đôn',
    role: 'ORG_OWNER',
    status: 'active',
    created_at: '2025-11-20 08:05:00',
    last_login_at: null,
  },
  {
    id: 'acc-3',
    username: 'aurora',
    email: 'aurora@example.com',
    full_name: 'Trần Văn Bình',
    organization_id: '55555555-5555-5555-5555-555555555555',
    organization_name: 'Trung tâm Anh ngữ Aurora',
    role: 'ORG_OWNER',
    status: 'disabled',
    created_at: '2025-09-01 07:35:00',
    last_login_at: '2026-02-14 10:00:00',
  },
  {
    id: 'acc-4',
    username: 'giao_vien_01',
    email: 'gv01@example.edu.vn',
    full_name: 'Lê Văn Cường',
    organization_id: '44444444-4444-4444-4444-444444444444',
    organization_name: 'Trường THCS Lê Quý Đôn',
    role: 'TEACHER',
    status: 'locked',
    created_at: '2025-12-01 09:00:00',
    last_login_at: '2026-05-03 11:20:00',
  },
];

/** Nhật ký hệ thống — 7 dòng phủ đủ `AuditAction`. */
export const AUDIT_LOGS: FakeAuditLog[] = [
  {
    id: 'log-1',
    created_at: '2026-10-21 08:10:00',
    action: 'ORG_APPROVED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '44444444-4444-4444-4444-444444444444',
    target_name: 'Trường THCS Lê Quý Đôn',
  },
  {
    id: 'log-2',
    created_at: '2026-10-21 08:12:00',
    action: 'ORG_REJECTED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: ORG_B.id,
    target_name: ORG_B.name,
    description: 'Thiếu giấy phép hoạt động',
  },
  {
    id: 'log-3',
    created_at: '2026-10-20 17:40:00',
    action: 'ORG_SUSPENDED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '55555555-5555-5555-5555-555555555555',
    target_name: 'Trung tâm Anh ngữ Aurora',
  },
  {
    id: 'log-4',
    created_at: '2026-10-19 09:00:00',
    action: 'ACCOUNT_STATUS_CHANGED',
    actor_username: 'platform_admin',
    target_type: 'ACCOUNT',
    target_id: 'acc-3',
    target_name: 'aurora',
  },
  {
    id: 'log-5',
    created_at: '2026-10-18 15:25:00',
    action: 'ORG_MODULES_UPDATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '44444444-4444-4444-4444-444444444444',
    target_name: 'Trường THCS Lê Quý Đôn',
  },
  {
    id: 'log-6',
    created_at: '2026-10-17 11:05:00',
    action: 'ORG_REACTIVATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: '66666666-6666-6666-6666-666666666666',
    target_name: 'Trường Tiểu học Nguyễn Trãi',
  },
  {
    id: 'log-7',
    created_at: '2026-01-05 09:20:00',
    action: 'ORG_MODULES_UPDATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: ORG_A.id,
    target_name: ORG_A.name,
  },
];

/**
 * Gói mảng thành envelope phân trang (`D-20`, `D-22`, `D-24`).
 *
 * `page` là **1-based** — slice tương ứng để bảng chỉ hiện `size` dòng/trang.
 */
export function pageResponse<T>(
  items: T[],
  pageParam: string | null,
  sizeParam: string | null,
): { items: T[]; total: number; page: number; size: number } {
  const page = Math.max(1, Number(pageParam ?? '1') || 1);
  const size = Math.max(1, Number(sizeParam ?? '20') || 20);
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), total: items.length, page, size };
}

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
  /** Body của các request có body — assert contract (vd `logout` phải có `refreshToken`). */
  bodies: Array<{ url: string; body: unknown }>;
}

/** Bắt đầu ghi lại mọi request API đi ra. */
export function trackApiRequests(page: Page): RequestLog {
  const log: RequestLog = { urls: [], bodies: [] };
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/v1/')) {
      log.urls.push(url);
      const data = request.postData();
      if (data) {
        try {
          log.bodies.push({ url, body: JSON.parse(data) });
        } catch {
          log.bodies.push({ url, body: data });
        }
      }
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
  /**
   * Nếu có, `POST /auth/login` trả token chứa đúng các role này.
   * Không có ⇒ endpoint login KHÔNG được mock (test phải tự đăng nhập giả qua `loginAs`).
   */
  loginRoles?: string[];
  /** Kết quả `PUT …/modules`: 204 | 400 | 409 | 500. */
  modulesStatus?: 204 | 400 | 409 | 500;
  /** Cơ chế 401 → refresh: 'ok' | 'fail' | 'none' (không trả 401 lần nào). */
  refreshMode?: 'ok' | 'fail' | 'none';
  /* --- Mở rộng console (Đặc tả Sprint 2 — Mở rộng) --- */
  /** Dữ liệu `GET /organizations` (`D-20`). Mặc định `ORG_ALL_ROWS`. */
  organizations?: FakeOrgListRow[];
  /** `false` → `GET /organizations` trả 404 (BE chưa làm endpoint `D-20`). */
  organizationsMissing?: boolean;
  /** Kết quả `PATCH …/suspend`: 204 | 404 | 409 | 500. */
  suspendStatus?: 204 | 404 | 409 | 500;
  /** Kết quả `PATCH …/reactivate`: 204 | 404 | 500. */
  reactivateStatus?: 204 | 404 | 500;
  /** Dữ liệu `GET /accounts` (`D-24`). Mặc định `ACCOUNTS`. */
  accounts?: FakeAccount[];
  /** `false` → `GET /accounts` trả 404 (BE chưa làm endpoint `D-24`). */
  accountsMissing?: boolean;
  /** Kết quả `PATCH …/accounts/{id}/status`: 204 | 404 | 409 | 500. */
  accountStatusResult?: 204 | 404 | 409 | 500;
  /** Kết quả `POST /accounts` (`D-29`): 201 | 400 | 403 | 409 | 404. */
  accountCreateResult?: 201 | 400 | 403 | 404 | 409;
  /** Kết quả `PATCH …/accounts/{id}/role` (`D-30`): 204 | 403 | 404 | 409 | 500. */
  accountRoleResult?: 204 | 403 | 404 | 409 | 500;
  /** Kết quả `POST …/accounts/{id}/reset-password` (`D-31`): 204 | 400 | 403 | 404 | 500. */
  accountResetResult?: 204 | 400 | 403 | 404 | 500;
  /** Dữ liệu `GET /audit-logs` (`D-22`). Mặc định `AUDIT_LOGS`. */
  auditLogs?: FakeAuditLog[];
  /** `false` → `GET /audit-logs` trả 404 (BE chưa làm endpoint `D-22`). */
  auditLogsMissing?: boolean;
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

  // ⚠️ Clone sâu như `pending`: fixture ở module scope phải giữ nguyên giữa các ca.
  const orgRows: FakeOrgListRow[] = (options.organizations ?? ORG_ALL_ROWS).map((o) => ({
    ...o,
  }));
  const accounts: FakeAccount[] = (options.accounts ?? ACCOUNTS).map((a) => ({ ...a }));
  const auditLogs: FakeAuditLog[] = options.auditLogs ?? AUDIT_LOGS;

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
    if (path === '/api/v1/auth/login' && method === 'POST') {
      if (!options.loginRoles) {
        return json(404, { success: false, message: 'Login chưa được mock', data: null });
      }
      // Contract: BE trả thẳng 4 field (KHÔNG bọc ApiResponse) — xem `authApi.ts`.
      return json(200, {
        accessToken: fakeJwt(options.loginRoles),
        refreshToken: 'refresh-token-gia',
        tokenType: 'Bearer',
        expiresIn: 900,
      });
    }

    if (path === '/api/v1/auth/logout') {
      if (options.logoutStatus === 500) {
        return empty(500);
      }
      // BE dùng `@Valid @RequestBody LogoutRequest` với `@NotBlank String refreshToken`
      // → thiếu body là 400 và refresh token KHÔNG bị thu hồi.
      // Mock kiểm tra đúng contract để e2e bắt được lỗi FE gửi thiếu body.
      let body: { refreshToken?: unknown } | null = null;
      try {
        body = request.postDataJSON() as { refreshToken?: unknown };
      } catch {
        body = null;
      }
      if (typeof body?.refreshToken !== 'string' || body.refreshToken.trim() === '') {
        return json(400, {
          success: false,
          message: 'refreshToken: must not be blank',
          data: null,
        });
      }
      return empty(204);
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

    /* --- Mở rộng console Super Admin (Đặc tả "Sprint 2 — Mở rộng") --- */

    // Nhật ký hệ thống (`D-22`) — 1 endpoint duy nhất, FE lọc bằng query param.
    if (path === '/api/v1/audit-logs' && method === 'GET') {
      if (options.auditLogsMissing) {
        return json(404, { success: false, message: 'Endpoint chưa được cài đặt', data: null });
      }
      let logs = auditLogs;
      const organizationId = url.searchParams.get('organizationId');
      const accountId = url.searchParams.get('accountId');
      if (organizationId) {
        logs = logs.filter((log) => log.target_type === 'ORGANIZATION' && log.target_id === organizationId);
      }
      if (accountId) {
        logs = logs.filter((log) => log.target_type === 'ACCOUNT' && log.target_id === accountId);
      }
      return json(200, pageResponse(logs, url.searchParams.get('page'), url.searchParams.get('size')));
    }

    // Danh sách TẤT CẢ tổ chức (`D-20`) — phải check TRƯỚC regex `/organizations/{id}`.
    if (path === '/api/v1/organizations' && method === 'GET') {
      if (options.organizationsMissing) {
        return json(404, { success: false, message: 'Endpoint chưa được cài đặt', data: null });
      }
      // FE gửi `status` (csv), `orgType`, `keyword` — mock phải lọc THẬT thì
      // test bộ lọc mới có ý nghĩa (nếu lọc phía client thì test sẽ luôn "pass").
      const statusFilter = (url.searchParams.get('status') ?? '').split(',').filter(Boolean);
      const orgTypeFilter = url.searchParams.get('orgType') ?? '';
      const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase();
      const filtered = orgRows.filter((org) => {
        if (statusFilter.length > 0 && !statusFilter.includes(org.status)) return false;
        if (orgTypeFilter && org.org_type !== orgTypeFilter) return false;
        if (keyword && !org.name.toLowerCase().includes(keyword)) return false;
        return true;
      });
      return json(
        200,
        pageResponse(filtered, url.searchParams.get('page'), url.searchParams.get('size')),
      );
    }

    // Dropdown tổ chức (`D-20b`) — mảng phẳng, không phân trang.
    if (path === '/api/v1/organizations/options' && method === 'GET') {
      return json(
        200,
        orgRows.map((org) => ({ id: org.id, name: org.name })),
      );
    }

    // Danh sách tài khoản (`D-24`) — check TRƯỚC regex `/accounts/{id}`.
    if (path === '/api/v1/accounts' && method === 'GET') {
      if (options.accountsMissing) {
        return json(404, { success: false, message: 'Endpoint chưa được cài đặt', data: null });
      }
      return json(
        200,
        pageResponse(accounts, url.searchParams.get('page'), url.searchParams.get('size')),
      );
    }

    // Tạo tài khoản (`D-29`) — check TRƯỚC regex `/accounts/{id}`.
    if (path === '/api/v1/accounts' && method === 'POST') {
      const result = options.accountCreateResult ?? 201;
      if (result !== 201) {
        const message =
          result === 409 ? 'Email hoặc tên đăng nhập đã tồn tại' : 'Lỗi hệ thống';
        return json(result, { success: false, message, data: null });
      }
      const body = request.postDataJSON() as {
        email?: string;
        full_name?: string;
        role?: string;
        organization_id?: string;
      };
      const org = orgRows.find((o) => o.id === body?.organization_id);
      const created: FakeAccount = {
        id: `acc-new-${accounts.length}`,
        username: (body?.email ?? '').split('@')[0] || 'nguoidungmoi',
        email: body?.email ?? '',
        full_name: body?.full_name ?? '',
        organization_id: body?.organization_id ?? null,
        organization_name: org?.name ?? null,
        role: body?.role ?? 'TEACHER',
        status: 'pending',
        created_at: '2026-10-22 08:00:00',
        last_login_at: null,
      };
      accounts.push(created);
      return json(201, created);
    }

    // Đổi vai trò tài khoản (`D-30`).
    const accountRoleMatch = path.match(/^\/api\/v1\/accounts\/([^/]+)\/role$/);
    if (accountRoleMatch && method === 'PATCH') {
      const result = options.accountRoleResult ?? 204;
      if (result !== 204) {
        return json(result, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      const account = accounts.find((a) => a.id === accountRoleMatch[1]);
      const body = request.postDataJSON() as { role?: string };
      if (account && body?.role) {
        account.role = body.role;
      }
      return empty(204);
    }

    // Đặt lại mật khẩu (`D-31`).
    const accountResetMatch = path.match(/^\/api\/v1\/accounts\/([^/]+)\/reset-password$/);
    if (accountResetMatch && method === 'POST') {
      const result = options.accountResetResult ?? 204;
      if (result !== 204) {
        return json(result, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      // Validate như BE: mật khẩu thủ công < 8 ký tự → 400.
      const body = request.postDataJSON() as { new_password?: string } | null;
      if (body?.new_password && body.new_password.length < 8) {
        return json(400, { success: false, message: 'Mật khẩu tối thiểu 8 ký tự', data: null });
      }
      return empty(204);
    }

    // Đổi trạng thái tài khoản (`D-24c`).
    const accountStatusMatch = path.match(/^\/api\/v1\/accounts\/([^/]+)\/status$/);
    if (accountStatusMatch && method === 'PATCH') {
      const status = options.accountStatusResult ?? 204;
      if (status !== 204) {
        return json(status, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      const account = accounts.find((a) => a.id === accountStatusMatch[1]);
      const body = request.postDataJSON() as { status?: string };
      if (account && body?.status) {
        account.status = body.status as FakeAccount['status'];
      }
      return empty(204);
    }

    // Chi tiết tài khoản (`D-24b`).
    const accountMatch = path.match(/^\/api\/v1\/accounts\/([^/]+)$/);
    if (accountMatch && method === 'GET') {
      const account = accounts.find((a) => a.id === accountMatch[1]);
      if (!account) {
        return json(404, { success: false, message: 'Account not found', data: null });
      }
      return json(200, account);
    }

    // Vô hiệu hoá / kích hoạt lại tổ chức (`D-21`, `D-21b`).
    const lifecycleMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)\/(suspend|reactivate)$/);
    if (lifecycleMatch && method === 'PATCH') {
      const status =
        lifecycleMatch[2] === 'suspend'
          ? (options.suspendStatus ?? 204)
          : (options.reactivateStatus ?? 204);
      if (status !== 204) {
        return json(status, { success: false, message: 'Lỗi hệ thống', data: null });
      }
      const nextStatus = lifecycleMatch[2] === 'suspend' ? 'suspended' : 'active';
      const org = orgRows.find((o) => o.id === lifecycleMatch[1]);
      if (org) {
        org.status = nextStatus;
      }
      const detail = details[lifecycleMatch[1]];
      if (detail) {
        detail.status = nextStatus;
      }
      return empty(204);
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

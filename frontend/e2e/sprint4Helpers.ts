import type { Page, Route } from '@playwright/test';
import type {
  AssignableTeacher,
  ClassDetail,
  ClassListItem,
  CloseEventItem,
  StatusLogItem,
} from '../src/features/sprint4/types';

/**
 * Helper e2e cho khu vực Đào tạo (Sprint 4) — luôn mock API bằng `page.route`.
 *
 * Khác `helpers.ts` (Admin Sprint 2) ở chỗ endpoint Sprint 4 KHÔNG có prefix
 * `/api/v1`: `/api/classes`, `/api/teachers`, `/positions`, `/departments`,
 * `/api/specialties`. Vì vậy không dùng chung `mockAdminApi`.
 *
 * ⚠️ Chỉ kiểm hành vi FE theo contract `sprint4Api.ts`. Không gọi BE thật,
 * không ghi dữ liệu. Các lỗi nghiệp vụ/phân quyền đều do mock trả về theo đúng
 * `code` mà `sprint4Api.ts` đã ánh xạ sang tiếng Việt.
 */

/** Toàn bộ quyền Sprint 4 — đủ để xem và thao tác lớp/giáo viên. */
export const SPRINT4_ALL_PERMISSIONS = [
  'PEOPLE_VIEW',
  'PEOPLE_EDIT',
  'CLASS_VIEW',
  'CLASS_CREATE',
  'CLASS_EDIT',
  'CLASS_ASSIGN_TEACHER',
  'CLASS_CANCEL',
  'CLASS_CLOSE_REQUEST',
  'CLASS_CLOSE_APPROVE',
  'CLASS_REOPEN',
] as const;

export interface Sprint4JwtOptions {
  /** Role backend gốc; `OWNER` mở khoá mọi thao tác. Mặc định `['OWNER']`. */
  roles?: string[];
  /** Claim `permissions` — FE chỉ đọc để ẩn/hiện UI. Mặc định đủ quyền. */
  permissions?: string[];
  /** `userId` trong JWT — dùng để thử luật "không tự duyệt yêu cầu của mình". */
  userId?: string;
  username?: string;
}

/** JWT giả: FE chỉ decode claim, KHÔNG verify chữ ký (xem `features/auth/jwt.ts`). */
export function fakeSprint4Jwt(options: Sprint4JwtOptions = {}): string {
  const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({
    userId: options.userId ?? 'u-1',
    username: options.username ?? 'sprint4_user',
    roles: options.roles ?? ['OWNER'],
    permissions: options.permissions ?? [...SPRINT4_ALL_PERMISSIONS],
  })}.sig`;
}

/** Ghi token vào localStorage TRƯỚC khi app load (authStore đọc lúc khởi tạo). */
export async function loginAsSprint4(page: Page, options: Sprint4JwtOptions = {}): Promise<void> {
  const token = fakeSprint4Jwt(options);
  await page.addInitScript(
    ([t, r]: string[]) => {
      window.localStorage.setItem('mems.accessToken', t as string);
      window.localStorage.setItem('mems.refreshToken', r as string);
    },
    [token, 'refresh-token-gia'],
  );
}

/** Lỗi giả theo đúng shape `sprint4Api.extractError` đọc (`code` + `message`). */
export interface Sprint4MockError {
  status: number;
  code?: string;
  message?: string;
  /** Số lần trả lỗi rồi mới trả thành công. Mặc định `Infinity` (luôn lỗi). */
  times?: number;
}

export interface Sprint4MockResponse {
  status: number;
  body?: unknown;
}

/** Khoá cho `mutation` — đúng đoạn path sau `/api/classes/{id}/`. */
export type Sprint4MutationKey =
  | 'teacher'
  | 'cancel'
  | 'close-requests'
  | 'close-requests/approve'
  | 'close-requests/reject'
  | 'reopen';

export interface Sprint4MockOptions {
  classes?: ClassListItem[];
  classesError?: Sprint4MockError;
  details?: Record<string, ClassDetail>;
  detailError?: Sprint4MockError;
  statusLogs?: StatusLogItem[];
  statusLogsError?: Sprint4MockError;
  closeEvents?: CloseEventItem[];
  closeEventsError?: Sprint4MockError;
  assignable?: AssignableTeacher[];
  mutation?: Partial<Record<Sprint4MutationKey, Sprint4MockResponse>>;
}

export interface Sprint4RequestLog {
  urls: string[];
  bodies: Array<{ method: string; url: string; body: unknown }>;
}

export const CLASS_C1_ID = 'c1';
export const CLASS_C2_ID = 'c2';
export const CLASS_C3_ID = 'c3';
export const TEACHER_T1_ID = 't-1';
export const TEACHER_T2_ID = 't-2';
/** Người gửi yêu cầu đóng "khác user hiện tại" (JWT mặc định là `u-1`). */
export const OTHER_ACTOR_ID = 'u-9';

export const MOCK_CLASSES: ClassListItem[] = [
  {
    id: CLASS_C1_ID,
    classCode: 'LOP10A1',
    name: 'Toán 10A1',
    academicYear: '2026-2027',
    startDate: '2026-09-05',
    endDate: '2027-05-20',
    status: 'CHUA_BAT_DAU',
    closeState: 'NONE',
    teacher: null,
    studentCount: 35,
    version: 3,
  },
  {
    id: CLASS_C2_ID,
    classCode: 'LOP11B2',
    name: 'Lý 11B2',
    academicYear: '2026-2027',
    startDate: '2026-09-05',
    endDate: '2027-05-20',
    status: 'DANG_DIEN_RA',
    closeState: 'PENDING',
    teacher: { id: TEACHER_T2_ID, code: 'GV002', fullName: 'Trần Thị B' },
    studentCount: 40,
    version: 7,
  },
  {
    id: CLASS_C3_ID,
    classCode: 'LOP12C3',
    name: 'Văn 12C3',
    academicYear: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-05-25',
    status: 'DA_KET_THUC',
    closeState: 'NONE',
    teacher: { id: TEACHER_T1_ID, code: 'GV001', fullName: 'Nguyễn Văn A' },
    studentCount: 32,
    version: 2,
  },
];

export const MOCK_CLASS_DETAILS: Record<string, ClassDetail> = {
  c1: {
    ...MOCK_CLASSES[0],
    createdAt: '2026-08-20T09:00:00',
    updatedAt: '2026-09-01T08:30:00',
  },
  c2: {
    ...MOCK_CLASSES[1],
    closeRequestNote: 'Xin đóng để chuyển sang lớp mới.',
    createdAt: '2026-08-20T09:10:00',
    updatedAt: '2026-09-10T10:00:00',
  },
  c3: { ...MOCK_CLASSES[2] },
};

/** BE trả `changedAt`/`changedBy` — FE phải chuẩn hoá sang `at`/`actorId`. */
export const MOCK_STATUS_LOGS: StatusLogItem[] = [
  {
    changedAt: '2026-09-01T08:00:00',
    changedBy: OTHER_ACTOR_ID,
    actorName: 'Nguyễn Văn A',
    fromStatus: null,
    toStatus: 'CHUA_BAT_DAU',
    reason: 'Tạo lớp học',
  },
];

/** Một sự kiện `REQUESTED` từ người khác để test duyệt/từ chối. */
export const MOCK_CLOSE_EVENTS: CloseEventItem[] = [
  {
    createdAt: '2026-09-10T10:00:00',
    actorId: OTHER_ACTOR_ID,
    actorName: 'Trần Thị B',
    action: 'REQUESTED',
    reason: 'Xin đóng để chuyển sang lớp mới.',
  },
];

export const MOCK_ASSIGNABLE: AssignableTeacher[] = [
  { userId: TEACHER_T1_ID, staffCode: 'GV001', fullName: 'Nguyễn Văn A', teachingStatus: 'DANG_DAY' },
  { userId: TEACHER_T2_ID, staffCode: 'GV002', fullName: 'Trần Thị B', teachingStatus: 'DANG_DAY' },
];

/**
 * Cài mock cho mọi endpoint Sprint 4. Trả request log để assert payload/contract.
 *
 * State (danh sách + chi tiết + sự kiện) là bản SAO CHÉP — fixture module scope
 * không bị mutate giữa các ca.
 */
export async function mockSprint4Api(
  page: Page,
  options: Sprint4MockOptions = {},
): Promise<Sprint4RequestLog> {
  const log: Sprint4RequestLog = { urls: [], bodies: [] };

  const classes = structuredClone(options.classes ?? MOCK_CLASSES);
  const details = structuredClone(options.details ?? MOCK_CLASS_DETAILS);
  const assignable = structuredClone(options.assignable ?? MOCK_ASSIGNABLE);
  const statusLogs = structuredClone(options.statusLogs ?? MOCK_STATUS_LOGS);
  const closeEvents = structuredClone(options.closeEvents ?? MOCK_CLOSE_EVENTS);

  const failures: Record<string, number> = {};
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  /** `POST …/approve` không có body — `postDataJSON()` có thể ném lỗi. */
  const readBody = (route: Route): unknown => {
    try {
      return route.request().postDataJSON() as unknown;
    } catch {
      return null;
    }
  };

  const record = (route: Route) => {
    const request = route.request();
    log.urls.push(request.url());
    const raw = request.postData();
    if (raw) {
      try {
        log.bodies.push({
          method: request.method(),
          url: request.url(),
          body: JSON.parse(raw) as unknown,
        });
      } catch {
        log.bodies.push({ method: request.method(), url: request.url(), body: raw });
      }
    }
  };

  const errorResponse = (key: string, error?: Sprint4MockError) => {
    if (!error) return null;
    const seen = failures[key] ?? 0;
    if (seen >= (error.times ?? Number.POSITIVE_INFINITY)) return null;
    failures[key] = seen + 1;
    return {
      status: error.status,
      body: {
        code: error.code ?? (error.status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR'),
        message: error.message ?? 'Lỗi giả cho e2e',
        ...(error.status === 404 ? { code: error.code ?? 'CLASS_NOT_FOUND' } : {}),
      },
    };
  };

  /** Cập nhật cache giả sau mutation để refetch/invalidate trả bản ghi mới nhất. */
  const applyUpdate = (id: string, body: unknown, key: Sprint4MutationKey) => {
    const detail = details[id];
    if (!detail) return;
    const payload = (body ?? {}) as Record<string, unknown>;
    if (key === 'teacher') {
      const teacherId = String(payload.teacherId ?? '');
      const picked = assignable.find((item) => item.userId === teacherId);
      detail.teacher = {
        id: teacherId,
        code: picked?.staffCode ?? null,
        fullName: picked?.fullName ?? null,
      };
    }
    if (key === 'cancel') {
      detail.status = 'DA_HUY';
      detail.cancelReason = String(payload.reason ?? '');
    }
    if (key === 'close-requests') {
      detail.closeState = 'PENDING';
      detail.closeRequestNote = payload.note ? String(payload.note) : null;
      closeEvents.unshift({
        createdAt: new Date().toISOString(),
        actorId: 'u-1',
        action: 'REQUESTED',
        reason: payload.note ? String(payload.note) : null,
      });
    }
    if (key === 'close-requests/approve') detail.closeState = 'CLOSED';
    if (key === 'close-requests/reject') {
      detail.closeState = 'NONE';
      detail.closeRejectReason = String(payload.reason ?? '');
    }
    if (key === 'reopen') detail.closeState = 'NONE';
    detail.version = (detail.version ?? 0) + 1;
    detail.updatedAt = new Date().toISOString();

    const row = classes.find((item) => item.id === id);
    if (row) {
      row.status = detail.status;
      row.closeState = detail.closeState;
      row.teacher = detail.teacher;
      row.version = detail.version;
    }
  };

  await page.route('**/api/classes**', async (route: Route) => {
    record(route);
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const parts = url.pathname.split('/').filter(Boolean); // ['api','classes',id,action...]
    const id = parts[2];
    const action = parts.slice(3).join('/');

    if (parts.length === 2 && method === 'GET') {
      const failed = errorResponse('classes', options.classesError);
      if (failed) return json(route, failed.status, failed.body);
      const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
      const status = url.searchParams.get('status') ?? '';
      const filtered = classes.filter((item) => {
        const matchQ =
          !q ||
          item.classCode?.toLowerCase().includes(q) ||
          item.name?.toLowerCase().includes(q);
        return !!matchQ && (!status || item.status === status);
      });
      const pageNo = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
      const size = Math.max(1, Number(url.searchParams.get('size') ?? '20') || 20);
      return json(route, 200, {
        items: filtered.slice((pageNo - 1) * size, pageNo * size),
        total: filtered.length,
        page: pageNo,
        size,
        pages: Math.max(1, Math.ceil(filtered.length / size)),
      });
    }

    if (!id) return json(route, 404, { code: 'CLASS_NOT_FOUND', message: 'Không tìm thấy lớp học.' });

    if (action === '' && method === 'GET') {
      const failed = errorResponse('detail', options.detailError);
      if (failed) return json(route, failed.status, failed.body);
      const detail = details[id];
      if (!detail) return json(route, 404, { code: 'CLASS_NOT_FOUND', message: 'Không tìm thấy lớp học.' });
      return json(route, 200, detail);
    }
    if (action === 'status-logs' && method === 'GET') {
      const failed = errorResponse('status-logs', options.statusLogsError);
      if (failed) return json(route, failed.status, failed.body);
      return json(route, 200, statusLogs);
    }
    if (action === 'close-events' && method === 'GET') {
      const failed = errorResponse('close-events', options.closeEventsError);
      if (failed) return json(route, failed.status, failed.body);
      return json(route, 200, closeEvents);
    }

    const mutationKey = (method === 'PUT' || method === 'POST' ? action : '') as Sprint4MutationKey;
    const configured = options.mutation?.[mutationKey];
    if (configured) {
      if (configured.status < 400) {
        applyUpdate(id, readBody(route), mutationKey);
        const detail = details[id];
        return json(route, configured.status, configured.body ?? detail ?? {});
      }
      return json(route, configured.status, configured.body ?? { code: 'INTERNAL_ERROR' });
    }

    // Mặc định: mọi mutation đều thành công và trả bản ghi mới nhất.
    applyUpdate(id, readBody(route), mutationKey);
    return json(route, 200, details[id] ?? {});
  });

  await page.route('**/api/teachers**', async (route: Route) => {
    record(route);
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/api/teachers/assignable')) {
      const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
      const pageNo = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
      const size = Math.max(1, Number(url.searchParams.get('size') ?? '10') || 10);
      const filtered = assignable.filter(
        (item) =>
          !q ||
          item.staffCode?.toLowerCase().includes(q) ||
          item.fullName?.toLowerCase().includes(q),
      );
      return json(route, 200, {
        items: filtered.slice((pageNo - 1) * size, pageNo * size),
        total: filtered.length,
        page: pageNo,
        size,
        pages: Math.max(1, Math.ceil(filtered.length / size)),
      });
    }
    return json(route, 200, { items: [], total: 0, page: 1, size: 20, pages: 1 });
  });

  await page.route('**/positions**', async (route: Route) => {
    record(route);
    return json(route, 200, [
      { id: 'p-1', name: 'Giáo viên', profileType: 'TEACHER' },
      { id: 'p-2', name: 'Nhân viên', profileType: 'GENERAL' },
    ]);
  });

  await page.route('**/departments**', async (route: Route) => {
    record(route);
    return json(route, 200, [
      { id: 'd-1', name: 'Ban Toán' },
      { id: 'd-2', name: 'Ban Lý' },
    ]);
  });

  await page.route('**/api/specialties**', async (route: Route) => {
    record(route);
    return json(route, 200, [
      { id: 's-1', name: 'Toán' },
      { id: 's-2', name: 'Lý' },
    ]);
  });

  return log;
}

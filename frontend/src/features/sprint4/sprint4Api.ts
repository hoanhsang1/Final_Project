import { isAxiosError } from 'axios';
import { apiClient } from '../../lib/api';
import { MSG_CLASS, MSG_S4, MSG_TEACHER } from './sprint4Messages';
import type {
  AssignableTeacher,
  AssignableTeacherQuery,
  AssignTeacherPayload,
  ClassCancelPayload,
  ClassDetail,
  ClassListItem,
  CloseEventItem,
  CloseRejectPayload,
  CloseRequestPayload,
  DepartmentOption,
  PagedResponse,
  PositionOption,
  ReopenPayload,
  Specialty,
  SpecialtyMismatchClass,
  SpecialtyMismatchPayload,
  StatusLogItem,
  TeacherCreatePayload,
  TeacherCreatedResponse,
  TeacherDetail,
  TeacherListItem,
  TeacherUpdatePayload,
} from './types';

/** Lỗi Sprint 4 đã chuẩn hoá: có `status`, `code` và `classes` cho 409 mismatch. */
export class Sprint4ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly mismatchClasses: SpecialtyMismatchClass[];

  constructor(
    status: number | null,
    code: string | null,
    message: string,
    mismatchClasses: SpecialtyMismatchClass[] = [],
  ) {
    super(message);
    this.name = 'Sprint4ApiError';
    this.status = status;
    this.code = code;
    this.mismatchClasses = mismatchClasses;
  }
}

function extractError(error: unknown): {
  status: number | null;
  code: string | null;
  message?: string;
} {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const data = error.response?.data as { code?: string; message?: string } | undefined;
    return { status, code: data?.code ?? null, message: data?.message };
  }
  if (error instanceof Sprint4ApiError) {
    return { status: error.status, code: error.code, message: error.message };
  }
  return { status: null, code: null };
}

/**
 * Bảng lỗi §8.2 — mỗi `code` một câu tiếng Việt đúng nghiệp vụ.
 * Lỗi validate (400, mã theo trường) xử lý riêng: ưu tiên `message` của BE.
 */
const CODE_MESSAGES: Record<string, string> = {
  MODULE_NOT_ENABLED: 'Tổ chức chưa bật module Quản lý sinh viên/lớp.',
  INVALID_POSITION: 'Chức vụ đã chọn không phải Giáo viên.',
  INVALID_SPECIALTY: 'Chuyên môn không hợp lệ hoặc không thuộc tổ chức.',
  UNAUTHENTICATED: MSG_S4.SESSION_EXPIRED,
  FORBIDDEN: MSG_S4.FORBIDDEN,
  SELF_APPROVAL_NOT_ALLOWED: 'Bạn không thể tự duyệt yêu cầu của mình.',
  TEACHER_NOT_FOUND: 'Không tìm thấy giáo viên.',
  CLASS_NOT_FOUND: 'Không tìm thấy lớp học.',
  DEPARTMENT_NOT_FOUND: 'Không tìm thấy phòng ban.',
  POSITION_NOT_FOUND: 'Không tìm thấy chức vụ.',
  EMAIL_EXISTS: 'Email đã được dùng bởi nhân sự khác.',
  SPECIALTY_EXISTS: 'Chuyên môn đã tồn tại.',
  CONFLICT: 'Mã đã tồn tại.',
  DATA_CHANGED: MSG_S4.DATA_CHANGED,
  STATUS_CHANGED: MSG_S4.STATUS_CHANGED,
  CLOSE_STATE_CHANGED: MSG_S4.CLOSE_STATE_CHANGED,
  SPECIALTY_MISMATCH: MSG_TEACHER.MISMATCH_DESC,
  TEACHER_NOT_AVAILABLE: 'Giáo viên không còn đang dạy.',
  CLASS_NOT_ASSIGNABLE: 'Lớp đã kết thúc/hủy/đóng, không thể gán giáo viên.',
  CLASS_NOT_EDITABLE: 'Lớp đang ở trạng thái chỉ xem.',
  CLASS_NOT_CANCELLABLE: 'Không thể hủy lớp ở trạng thái này.',
  CLASS_NOT_CLOSABLE: 'Không thể yêu cầu đóng lớp đã hủy.',
  TEACHER_ASSIGNMENT_MODULE_ACTIVE: MSG_CLASS.ASSIGNMENT_BLOCKED,
  UNCATEGORIZED_EXCEPTION: MSG_S4.INTERNAL_ERROR,
  IDENTITY_UNAVAILABLE: MSG_S4.IDENTITY_UNAVAILABLE,
};

function viMessage(info: { status: number | null; code: string | null; message?: string }): string {
  const { status, code, message } = info;

  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }
  // Lỗi validate: BE gửi mã theo trường (NAME_REQUIRED, …) kèm câu cụ thể.
  if (status === 400) {
    return message?.trim() || MSG_S4.SAVE_FAILED;
  }

  if (status === null) return MSG_S4.NETWORK_ERROR;
  if (status === 401) return MSG_S4.SESSION_EXPIRED;
  if (status === 403) return MSG_S4.FORBIDDEN;
  if (status === 404) return MSG_S4.NOT_FOUND;
  if (status === 409) return MSG_S4.DATA_CHANGED;
  if (status === 503) return MSG_S4.IDENTITY_UNAVAILABLE;
  return MSG_S4.SAVE_FAILED;
}

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    const info = extractError(error);
    const payload = (error as {
      response?: { data?: SpecialtyMismatchPayload & { data?: SpecialtyMismatchPayload } };
    })?.response?.data;
    // BE bọc lỗi trong { success, code, message, data } nên `classes` nằm trong data.
    const mismatch =
      info.status === 409 && info.code === 'SPECIALTY_MISMATCH'
        ? (payload?.classes ?? payload?.data?.classes ?? [])
        : [];
    throw new Sprint4ApiError(info.status, info.code, viMessage(info), mismatch);
  }
}

/** Câu lỗi hiển thị cho người dùng cuối (đã là tiếng Việt). */
export function sprint4ErrorMessage(error: unknown): string {
  if (error instanceof Sprint4ApiError) return error.message;
  return viMessage(extractError(error));
}

export function isMismatchError(error: unknown): error is Sprint4ApiError {
  return error instanceof Sprint4ApiError && error.code === 'SPECIALTY_MISMATCH';
}

/** 409 do version/trạng thái cũ → nhắc tải lại, KHÔNG gửi lại với version cũ (§8.1). */
export function isStaleConflict(error: unknown): boolean {
  if (!(error instanceof Sprint4ApiError)) return false;
  return (
    error.status === 409 &&
    (error.code === 'DATA_CHANGED' ||
      error.code === 'STATUS_CHANGED' ||
      error.code === 'CLOSE_STATE_CHANGED')
  );
}

export function isForbiddenError(error: unknown): boolean {
  if (!(error instanceof Sprint4ApiError)) return false;
  return error.status === 403 || error.code === 'FORBIDDEN';
}

export function isSelfApprovalError(error: unknown): boolean {
  return error instanceof Sprint4ApiError && error.code === 'SELF_APPROVAL_NOT_ALLOWED';
}

export function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Sprint4ApiError)) return false;
  return (
    error.status === 404 ||
    error.code === 'TEACHER_NOT_FOUND' ||
    error.code === 'CLASS_NOT_FOUND'
  );
}

/** Shape phân trang "mềm" — BE có thể trả `total` hoặc `totalItems`, thiếu vài field. */
interface PagedLike<T> {
  items?: T[];
  total?: number;
  totalItems?: number;
  page?: number;
  size?: number;
  pages?: number;
}

/**
 * BE có thể trả mảng thuần (endpoint cũ) hoặc object phân trang.
 * Chuẩn hoá về `{ items, total, page, size, pages }` để UI chỉ xử lý một shape.
 *
 * Nhận `unknown` vì đây là dữ liệu từ network: không tin type của axios và
 * không muốn mỗi endpoint phải khai báo generic riêng.
 */
function normalizePaged<T>(input: unknown): PagedResponse<T> {
  if (Array.isArray(input)) {
    const items = input as T[];
    return { items, total: items.length, page: 1, size: items.length || 1, pages: 1 };
  }
  const data = (input ?? {}) as PagedLike<T>;
  const items = data.items ?? [];
  return {
    items,
    total: data.total ?? data.totalItems ?? items.length,
    page: data.page ?? 1,
    size: data.size ?? items.length,
    pages: data.pages ?? 1,
  };
}

/**
 * Chuẩn hoá 2 tab lịch sử về đúng shape đặc tả (`at`, `actorId`).
 *
 * BE đang trả tên field khác: status log dùng `changedAt`/`changedBy`, close
 * event dùng `createdAt`. Nếu chỉ đọc một phía thì tab sẽ trắng cột thời gian
 * và cột người thực hiện. Nhận cả hai nên FE chạy được trước và sau khi BE
 * đổi sang `at`/`actorId`.
 */
function normalizeStatusLog(item: StatusLogItem): StatusLogItem {
  return {
    ...item,
    at: item.at ?? item.changedAt ?? item.createdAt ?? null,
    actorId: item.actorId ?? item.changedBy ?? null,
  };
}

function normalizeCloseEvent(item: CloseEventItem): CloseEventItem {
  return {
    ...item,
    at: item.at ?? item.createdAt ?? null,
    actorId: item.actorId ?? item.changedBy ?? null,
  };
}

/**
 * `TeacherDetailResponse` của BE không có `classCount`/`noClass`/`classLabel`
 * (chỉ danh sách mới có). Tính lại từ `classes` để UI chi tiết không hiện 0.
 */
function normalizeTeacherDetail(detail: TeacherDetail): TeacherDetail {
  const classCount = detail.classCount ?? detail.classes?.length ?? 0;
  return {
    ...detail,
    classCount,
    noClass: detail.noClass ?? classCount === 0,
    classLabel: detail.classLabel ?? (classCount === 0 ? MSG_TEACHER.NO_CLASS : null),
  };
}

/* ── Giáo viên ─────────────────────────────────────────────────────────── */

export interface TeacherListQuery {
  page?: number;
  size?: number;
  /** Mã nhân sự hoặc họ tên (không dấu/hoa thường — server xử lý). */
  q?: string;
  specialtyId?: string;
  teachingStatus?: string;
}

export const fetchTeachers = (query: TeacherListQuery = {}) =>
  request(() => apiClient.get('/api/teachers', { params: query })).then(normalizePaged<TeacherListItem>);

export const fetchTeacherDetail = (userId: string) =>
  request(() => apiClient.get<TeacherDetail>(`/api/teachers/${userId}`)).then(normalizeTeacherDetail);

export const createTeacher = (payload: TeacherCreatePayload) =>
  request(() => apiClient.post<TeacherCreatedResponse>('/api/teachers', payload));

export const updateTeacher = (userId: string, payload: TeacherUpdatePayload) =>
  request(() => apiClient.put<TeacherDetail>(`/api/teachers/${userId}`, payload)).then(
    normalizeTeacherDetail,
  );

/**
 * `TeacherAssignableItem` của BE chưa có `teachingStatus`. Theo đúng luật
 * §6.3/§7 "chỉ `DANG_DAY` mới được gán", danh sách này *chỉ* chứa `DANG_DAY`,
 * nên điền mặc định để cột trạng thái không trống. Nếu BE trả field thật thì
 * giá trị của BE thắng.
 */
export const fetchAssignableTeachers = (query: AssignableTeacherQuery = {}) =>
  request(() => apiClient.get('/api/teachers/assignable', { params: query }))
    .then(normalizePaged<AssignableTeacher>)
    .then((paged) => ({
      ...paged,
      items: paged.items.map((item) => ({
        ...item,
        teachingStatus: item.teachingStatus ?? 'DANG_DAY',
      })),
    }));

/* ── Danh mục dùng cho form tạo giáo viên ──────────────────────────────── */

export const fetchPositions = () =>
  request(() => apiClient.get<PositionOption[]>('/positions'));

export const fetchDepartments = () =>
  request(() => apiClient.get<DepartmentOption[]>('/departments'));

/* ── Chuyên môn ────────────────────────────────────────────────────────── */

export const fetchSpecialties = () =>
  request(() => apiClient.get<Specialty[]>('/api/specialties'));

export const createSpecialty = (name: string) =>
  request(() => apiClient.post<Specialty>('/api/specialties', { name }));

/* ── Lớp học ───────────────────────────────────────────────────────────── */

export interface ClassListQuery {
  page?: number;
  size?: number;
  q?: string;
  status?: string;
  /** `true` cho dropdown chọn lớp — server loại lớp kết thúc/hủy/đóng (§6.1). */
  selectable?: boolean;
}

export const fetchClasses = (query: ClassListQuery = {}) =>
  request(() => apiClient.get('/api/classes', { params: query })).then(normalizePaged<ClassListItem>);

export const fetchClassDetail = (classId: string) =>
  request(() => apiClient.get<ClassDetail>(`/api/classes/${classId}`));

export const assignTeacher = (classId: string, payload: AssignTeacherPayload) =>
  request(() => apiClient.put<ClassDetail>(`/api/classes/${classId}/teacher`, payload));

export const cancelClass = (classId: string, payload: ClassCancelPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/cancel`, payload));

export const requestClose = (classId: string, payload: CloseRequestPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/close-requests`, payload));

export const approveClose = (classId: string) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/close-requests/approve`));

export const rejectClose = (classId: string, payload: CloseRejectPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/close-requests/reject`, payload));

export const reopenClass = (classId: string, payload: ReopenPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/reopen`, payload));

export const fetchStatusLogs = (classId: string) =>
  request(() => apiClient.get<StatusLogItem[]>(`/api/classes/${classId}/status-logs`)).then(
    (items) => (items ?? []).map(normalizeStatusLog),
  );

export const fetchCloseEvents = (classId: string) =>
  request(() => apiClient.get<CloseEventItem[]>(`/api/classes/${classId}/close-events`)).then(
    (items) => (items ?? []).map(normalizeCloseEvent),
  );

import { isAxiosError } from 'axios';
import { apiClient, unwrapList } from '../../lib/api';
import { MSG_CLASS, MSG_S4, MSG_TEACHER } from './sprint4Messages';
import type {
  AssignableTeacher,
  AssignableTeacherQuery,
  AssignTeacherPayload,
  ClassCancelPayload,
  ClassCreatePayload,
  ClassDetail,
  ClassListItem,
  CloseEventItem,
  CloseRejectPayload,
  CloseRequestPayload,
  DepartmentMemberItem,
  DepartmentOption,
  PagedResponse,
  PositionOption,
  ReopenPayload,
  Specialty,
  SpecialtyMismatchClass,
  SpecialtyMismatchPayload,
  StatusLogItem,
  StudentAccountResponse,
  StudentClass,
  StudentCreatePayload,
  StudentListItem,
  StudentUpdatePayload,
  Subject,
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
  STUDENT_NOT_FOUND: 'Không tìm thấy sinh viên.',
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
  STUDENT_ACCOUNT_EXISTS: 'Sinh viên đã có tài khoản đăng nhập.',
  STUDENT_EMAIL_REQUIRED: 'Cần nhập email sinh viên trước khi tạo tài khoản.',
  SUBJECT_NOT_FOUND: 'Không tìm thấy môn học.',
  SUBJECT_MISMATCH: 'Giáo viên không dạy môn học của lớp này.',
  CANCEL_STATE_CHANGED: 'Yêu cầu hủy lớp đã được xử lý hoặc không còn chờ duyệt.',
  CLASS_APPROVER_NOT_ALLOWED:
    'Chỉ trưởng phòng phụ trách đào tạo mới được duyệt yêu cầu của lớp.',
  TEACHER_ASSIGNMENT_MODULE_ACTIVE: MSG_CLASS.ASSIGNMENT_BLOCKED,
  TRANSFER_NOT_FOUND: 'Không tìm thấy yêu cầu chuyển phòng ban.',
  TRANSFER_ALREADY_PENDING: 'Nhân sự đã có một yêu cầu chuyển phòng ban đang chờ duyệt.',
  TRANSFER_NOT_PENDING: 'Yêu cầu chuyển phòng ban đã được xử lý bởi người khác.',
  TRANSFER_STEP_ALREADY_DECIDED: 'Bước này đã được người khác quyết định.',
  TRANSFER_STEP_NOT_ALLOWED: 'Bạn không phải người duyệt bước này.',
  TRANSFER_HEAD_MISSING: 'Mỗi phòng ban phải có Trưởng phòng đang hoạt động trước khi chuyển.',
  TRANSFER_SAME_DEPARTMENT: 'Phòng ban đích phải khác phòng ban hiện tại.',
  TRANSFER_OWNER_NOT_ALLOWED: 'Không thể chuyển chủ tổ chức bằng quy trình này.',
  TRANSFER_CANCEL_NOT_ALLOWED: 'Chỉ người tạo yêu cầu mới được huỷ yêu cầu.',
  INVALID_TRANSFER_STEP: 'Bước duyệt không hợp lệ.',
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

/** Bọc lời gọi trả danh sách — mọi shape lạ đều thành mảng. */
function requestList<T>(fn: () => Promise<{ data: unknown }>): Promise<T[]> {
  return request(fn).then((raw) => unwrapList<T>(raw));
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
      error.code === 'CLOSE_STATE_CHANGED' ||
      error.code === 'CANCEL_STATE_CHANGED')
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
  // BE có thể bọc thêm `{ data: [] }` / `{ content: [] }` — unwrapList xử lý cả hai.
  const items = Array.isArray(data.items) ? data.items : unwrapList<T>(input);
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
  requestList<PositionOption>(() => apiClient.get('/positions'));

export const fetchDepartments = () =>
  requestList<DepartmentOption>(() => apiClient.get('/departments'));

/** BE tự giới hạn phòng ban của người gọi; OWNER xem được mọi phòng ban. */
export const fetchDepartmentMembers = (departmentId: string) =>
  requestList<DepartmentMemberItem>(() => apiClient.get(`/departments/${departmentId}/members`));

/* ── Chuyên môn ────────────────────────────────────────────────────────── */

export const fetchSpecialties = () =>
  requestList<Specialty>(() => apiClient.get('/api/specialties'));

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
  /** Quy tắc 17 — chỉ lấy lớp đang gắn nhãn cần phân công lại. */
  needsReassignment?: boolean;
}

export const fetchClasses = (query: ClassListQuery = {}) =>
  request(() => apiClient.get('/api/classes', { params: query })).then(normalizePaged<ClassListItem>);

export const fetchClassDetail = (classId: string) =>
  request(() => apiClient.get<ClassDetail>(`/api/classes/${classId}`));

export const createClass = (payload: ClassCreatePayload) =>
  request(() => apiClient.post<ClassDetail>('/api/classes', payload));

export const assignTeacher = (classId: string, payload: AssignTeacherPayload) =>
  request(() => apiClient.put<ClassDetail>(`/api/classes/${classId}/teacher`, payload));

/** Quy tắc 17 — gán lại giáo viên, BE xoá nhãn "cần phân công lại". */
export const reassignTeacher = (classId: string, payload: AssignTeacherPayload) =>
  request(() => apiClient.put<ClassDetail>(`/api/classes/${classId}/teacher/reassign`, payload));

export const cancelClass = (classId: string, payload: ClassCancelPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/cancel`, payload));

/** Quy tắc 14 — lớp còn sinh viên: yêu cầu hủy chờ trưởng phòng duyệt. */
export const approveCancel = (classId: string) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/cancel-requests/approve`));

export const rejectCancel = (classId: string, payload: CloseRejectPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/cancel-requests/reject`, payload));

export const fetchClassStudents = (classId: string) =>
  requestList<StudentListItem>(() => apiClient.get(`/api/classes/${classId}/students`));

export const requestClose = (classId: string, payload: CloseRequestPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/close-requests`, payload));

export const approveClose = (classId: string) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/close-requests/approve`));

export const rejectClose = (classId: string, payload: CloseRejectPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/close-requests/reject`, payload));

export const reopenClass = (classId: string, payload: ReopenPayload) =>
  request(() => apiClient.post<ClassDetail>(`/api/classes/${classId}/reopen`, payload));

export const fetchStatusLogs = (classId: string) =>
  requestList<StatusLogItem>(() => apiClient.get(`/api/classes/${classId}/status-logs`)).then(
    (items) => items.map(normalizeStatusLog),
  );

export const fetchCloseEvents = (classId: string) =>
  requestList<CloseEventItem>(() => apiClient.get(`/api/classes/${classId}/close-events`)).then(
    (items) => items.map(normalizeCloseEvent),
  );

/* ── Sinh viên ─────────────────────────────────────────────────────────── */

export interface StudentListQuery {
  page?: number;
  size?: number;
  q?: string;
  status?: string;
  classId?: string;
}

/** BE phục vụ controller ở gốc `/students`; Vite proxy và Vercel rewrite đã có sẵn. */
export const fetchStudents = (query: StudentListQuery = {}) =>
  request(() => apiClient.get('/students', { params: query })).then(
    normalizePaged<StudentListItem>,
  );

export const createStudent = (payload: StudentCreatePayload) =>
  request(() => apiClient.post<StudentListItem>('/students', payload));

export const updateStudent = (studentId: string, payload: StudentUpdatePayload) =>
  request(() => apiClient.put<StudentListItem>(`/students/${studentId}`, payload));

export const deleteStudent = (studentId: string) =>
  request(() => apiClient.delete<void>(`/students/${studentId}`));

/** Quy tắc 12 — cấp tài khoản STUDENT từ hồ sơ đã có, trả mật khẩu tạm một lần. */
export const createStudentAccount = (studentId: string) =>
  request(() => apiClient.post<StudentAccountResponse>(`/students/${studentId}/account`));

/* ── Môn học ───────────────────────────────────────────────────────────── */

/** Quy tắc 13 — danh mục môn học để gán cho lớp và đối chiếu chuyên môn giáo viên. */
export const fetchSubjects = (q?: string) =>
  requestList<Subject>(() => apiClient.get('/api/subjects', { params: { q } }));

/* ── Sinh viên tự xem (quyền SELF) ─────────────────────────────────────── */

export const fetchMyStudentProfile = () =>
  request(() => apiClient.get<StudentListItem>('/students/me'));

export const fetchMyStudentClasses = () =>
  requestList<StudentClass>(() => apiClient.get('/students/me/classes'));

/**
 * Kiểu dữ liệu Sprint 4 — bám handoff `sprint4-fe-handoff.md` (§3–§7).
 *
 * Quy ước: trường nào đặc tả không nêu thì **không** thêm vào đây; nếu cần
 * thêm, cập nhật `docs/bao-cao-be-sprint4-giao-vien-lop.md` trước để BE và FE
 * cùng đổi một lượt.
 */

/* ── Giáo viên ─────────────────────────────────────────────────────────── */

/** §7 — trạng thái dạy. */
export type TeachingStatus = 'DANG_DAY' | 'TAM_NGHI' | 'NGHI_VIEC';

/** §7 — loại hợp đồng (null = để trống). */
export type ContractType = 'CO_HUU' | 'THINH_GIANG';

/** §4.1 — `Position.profileType` quyết định có hiện khối giáo viên hay không. */
export type PositionProfileType = 'GENERAL' | 'TEACHER';

/** §4.1 — chức vụ khi tạo nhân sự. */
export interface PositionOption {
  id: string;
  name: string;
  /** BE cũ chưa trả field này → FE coi như chưa phân loại (xem báo cáo BE). */
  profileType?: PositionProfileType | null;
}

/** §3 — phòng ban để chọn `departmentId` khi tạo giáo viên. */
export interface DepartmentOption {
  id: string;
  name: string;
}

/** §3 — `specialties[].id` + `name`. */
export interface Specialty {
  id: string;
  name: string;
}

/** §5 — lớp đang phụ trách trong hồ sơ giáo viên. */
export interface TeacherClass {
  id: string;
  classCode?: string | null;
  name?: string | null;
  status?: ClassStatus | null;
  closeState?: ClassCloseState | null;
  closeLabel?: string | null;
}

/** §5.2 — một dòng lịch sử thay đổi hồ sơ. */
export interface TeacherHistoryItem {
  action: string;
  actorUserId?: string | null;
  actorName?: string | null;
  createdAt?: string | null;
  /** `{ field: { before, after } }` — vd `specialtyIds`. */
  details?: Record<string, { before?: unknown; after?: unknown }> | null;
}

/** §3 — một dòng danh sách giáo viên. */
export interface TeacherListItem {
  userId: string;
  staffCode?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  departmentId?: string | null;
  specialties?: Specialty[] | null;
  contractType?: ContractType | null;
  teachingStatus?: TeachingStatus | null;
  /** Server tính — FE không tự đếm lại (§3). */
  classCount?: number | null;
  noClass?: boolean;
  classLabel?: string | null;
}

/** §5 — chi tiết giáo viên. */
export interface TeacherDetail extends TeacherListItem {
  positionIds?: string[] | null;
  classes?: TeacherClass[] | null;
  history?: TeacherHistoryItem[] | null;
  version: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** §4.2 cách B — `POST /api/teachers`. */
export interface TeacherCreatePayload {
  departmentId: string;
  username: string;
  email: string;
  role: 'STAFF' | 'MANAGER';
  positionIds: string[];
  staffCode: string;
  fullName: string;
  phone: string;
  teacherProfile: {
    specialtyIds: string[];
    contractType?: ContractType | null;
  };
}

/** §4.3 — response 201, đủ để hiện modal mật khẩu tạm. */
export interface TeacherCreatedResponse {
  userId: string;
  staffCode?: string | null;
  fullName?: string | null;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

/** §5 — `PUT /api/teachers/{userId}`. `staffCode` chỉ đọc, không gửi lên. */
export interface TeacherUpdatePayload {
  fullName: string;
  email: string;
  phone: string;
  specialtyIds: string[];
  contractType?: ContractType | null;
  version: number;
  confirm?: boolean;
}

/* ── Lớp học ───────────────────────────────────────────────────────────── */

/** §7 — trạng thái lớp. */
export type ClassStatus = 'CHUA_BAT_DAU' | 'DANG_DIEN_RA' | 'DA_KET_THUC' | 'DA_HUY';

/** §7 — trạng thái đóng (độc lập với `status`). */
export type ClassCloseState = 'NONE' | 'PENDING' | 'CLOSED';

/** §6.2 — khối "Giáo viên phụ trách". */
export interface ClassTeacher {
  id: string;
  code?: string | null;
  fullName?: string | null;
}

/** §6.1 — một dòng danh sách lớp. */
export interface ClassListItem {
  id: string;
  classCode?: string | null;
  name?: string | null;
  academicYear?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: ClassStatus | null;
  closeState?: ClassCloseState | null;
  teacher?: ClassTeacher | null;
  studentCount?: number | null;
  /** §6.1 — gửi kèm khi sửa/hủy/gán. */
  version: number;
}

/** §6.2 — chi tiết lớp. */
export interface ClassDetail extends ClassListItem {
  cancelReason?: string | null;
  closeRejectReason?: string | null;
  closeRequestNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** §6.3 — giáo viên có thể gán (chỉ `DANG_DAY`). */
export interface AssignableTeacher {
  userId: string;
  staffCode?: string | null;
  fullName?: string | null;
  teachingStatus?: TeachingStatus | null;
}

/** §6.3 — `GET /api/teachers/assignable?q=&page=&size=`. */
export interface AssignableTeacherQuery {
  q?: string;
  page?: number;
  size?: number;
}

/** §6.3 — body `PUT /api/classes/{id}/teacher`. */
export interface AssignTeacherPayload {
  teacherId: string;
  version: number;
}

/** §6.4 — body `POST /api/classes/{id}/cancel`. */
export interface ClassCancelPayload {
  reason: string;
  version: number;
}

/** §6.5 — body `POST /api/classes/{id}/close-requests` (note tùy chọn). */
export interface CloseRequestPayload {
  note?: string | null;
}

/** §6.5 — body `POST /api/classes/{id}/close-requests/reject`. */
export interface CloseRejectPayload {
  reason: string;
}

/** §6.5 — body `POST /api/classes/{id}/reopen`. */
export interface ReopenPayload {
  reason: string;
}

/**
 * §6.2 / §6.5 — một dòng tab "Lịch sử trạng thái".
 *
 * BE hiện trả `changedAt`/`changedBy` (xem `ClassStatusLogResponse`), còn đặc tả
 * dùng `at`/`actorId`. Giữ cả hai để UI không phụ thuộc một phía; `sprint4Api`
 * chuẩn hoá về `at`/`actorId` trước khi trả cho trang.
 */
export interface StatusLogItem {
  at?: string | null;
  changedAt?: string | null;
  createdAt?: string | null;
  actorId?: string | null;
  changedBy?: string | null;
  actorName?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
}

/**
 * §6.2 / §6.5 — một dòng tab "Sự kiện đóng".
 *
 * BE hiện trả `createdAt` (không có `at`), `actorId`, `reason` và **chưa có**
 * `actorName`/`note`. UI vẫn đọc được cả hai shape nhờ bước chuẩn hoá.
 */
export interface CloseEventItem {
  at?: string | null;
  createdAt?: string | null;
  actorId?: string | null;
  changedBy?: string | null;
  actorName?: string | null;
  /** `REQUESTED` | `APPROVED` | `REJECTED` | `REOPENED` (BE có thể trả thêm). */
  action?: string | null;
  note?: string | null;
  reason?: string | null;
}

/* ── Dùng chung ────────────────────────────────────────────────────────── */

/** §1 — mọi danh sách phân trang: `page` từ 1, `size` 1–100. */
export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/** §5.1 — `classes` trong body 409 `SPECIALTY_MISMATCH`. */
export interface SpecialtyMismatchClass {
  id?: string;
  name?: string | null;
}

/** §5.1 — body 409 `SPECIALTY_MISMATCH`. */
export interface SpecialtyMismatchPayload {
  code?: string;
  message?: string;
  classes?: SpecialtyMismatchClass[];
}

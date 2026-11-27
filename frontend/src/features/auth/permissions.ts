/**
 * Helper kiểm quyền phía client — CHỈ để ẩn/hiện UI và chặn route (UX).
 * Quyền thật do backend chặn (401/403). Không dùng để bảo mật.
 */

export function isOwnerRole(backendRoles: string[]): boolean {
  return backendRoles.includes('OWNER') || backendRoles.includes('ORG_OWNER');
}

export function hasPermission(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

export function hasAnyPermission(permissions: string[], perms: readonly string[]): boolean {
  return perms.some((p) => permissions.includes(p));
}

/**
 * Quyền nghiệp vụ Sprint 4 (giáo viên/lớp) — dùng để vào khu vực `/dao-tao`.
 * §9: duyệt và từ chối đóng cùng dùng `CLASS_CLOSE_APPROVE` (không có
 * `CLASS_CLOSE_REJECT`).
 */
export const SPRINT4_PERMISSIONS = [
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
  'STUDENT_VIEW',
  'STUDENT_CREATE',
  'STUDENT_EDIT',
  'STUDENT_DELETE',
] as const;

/**
 * Alias giữa mã dotted (JWT mới từ PeopleService) và mã UPPERCASE (FE dùng từ trước).
 *
 * Map được dựng 2 chiều để tiện tra cứu; `normalizePermissionCode` luôn chuẩn hoá
 * về UPPERCASE (dạng FE dùng nội bộ) nên không bao giờ đổi chiều ngược ở đây.
 */
const DOTTED_TO_UPPERCASE: Readonly<Record<string, string>> = {
  'employee.view': 'PEOPLE_VIEW',
  'employee.edit': 'PEOPLE_EDIT',
  'student.view': 'STUDENT_VIEW',
  'student.self_view': 'STUDENT_SELF_VIEW',
  'student.create': 'STUDENT_CREATE',
  'student.edit': 'STUDENT_EDIT',
  'student.delete': 'STUDENT_DELETE',
  'class.view': 'CLASS_VIEW',
  'class.self_view': 'CLASS_SELF_VIEW',
  'class.create': 'CLASS_CREATE',
  'class.edit': 'CLASS_EDIT',
  'class.assign_teacher': 'CLASS_ASSIGN_TEACHER',
  'class.cancel': 'CLASS_CANCEL',
  'class.close_request': 'CLASS_CLOSE_REQUEST',
  'class.close_approve': 'CLASS_CLOSE_APPROVE',
  'class.reopen': 'CLASS_REOPEN',
  'schedule.view': 'SCHEDULE_VIEW',
  'schedule.create': 'SCHEDULE_CREATE',
  // `schedule.edit` là mã legacy; chuẩn mới là `schedule.update`.
  'schedule.update': 'SCHEDULE_UPDATE',
  'schedule.edit': 'SCHEDULE_EDIT',
  'schedule.cancel_session': 'SCHEDULE_CANCEL_SESSION',
  'schedule.delete': 'SCHEDULE_DELETE',
  'schedule.self_view': 'SCHEDULE_SELF_VIEW',
  'facility.view': 'FACILITY_VIEW',
  'facility.manage': 'FACILITY_MANAGE',
  'facility.room.view': 'FACILITY_ROOM_VIEW',
  'facility.room.create': 'FACILITY_ROOM_CREATE',
  'facility.room.update': 'FACILITY_ROOM_UPDATE',
  'facility.room.delete': 'FACILITY_ROOM_DELETE',
  'facility.equipment.view': 'FACILITY_EQUIPMENT_VIEW',
  'facility.equipment.create': 'FACILITY_EQUIPMENT_CREATE',
  'facility.equipment.update': 'FACILITY_EQUIPMENT_UPDATE',
  'facility.equipment.delete': 'FACILITY_EQUIPMENT_DELETE',
  'facility.issue.report': 'FACILITY_ISSUE_REPORT',
  'facility.issue.resolve': 'FACILITY_ISSUE_RESOLVE',
};

export const PERMISSION_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  ...DOTTED_TO_UPPERCASE,
  ...Object.fromEntries(
    Object.entries(DOTTED_TO_UPPERCASE).map(([dotted, uppercase]) => [uppercase, dotted]),
  ),
});

/**
 * Mã UPPERCASE legacy từ JWT cũ → mã UPPERCASE chuẩn FE dùng nội bộ.
 *
 * Tách riêng khỏi `PERMISSION_ALIASES` (map 2 chiều) để không ghi đè các entry
 * chiều ngược UPPERCASE → dotted.
 */
export const LEGACY_PERMISSION_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  PEOPLE_READ: 'PEOPLE_VIEW',
  PEOPLE_WRITE: 'PEOPLE_EDIT',
  CLASS_READ: 'CLASS_VIEW',
  CLASS_WRITE: 'CLASS_EDIT',
  SCHEDULE_READ: 'SCHEDULE_VIEW',
  SCHEDULE_WRITE: 'SCHEDULE_UPDATE',
  FACILITY_READ: 'FACILITY_VIEW',
  FACILITY_WRITE: 'FACILITY_MANAGE',
  INCIDENT_CREATE: 'FACILITY_ISSUE_REPORT',
  INCIDENT_MANAGE: 'FACILITY_ISSUE_RESOLVE',
});

const UPPERCASE_CODE = /^[A-Z0-9_]+$/;

/** Chuẩn hoá một mã quyền về UPPERCASE; mã không có alias được giữ nguyên. */
export function normalizePermissionCode(code: string): string {
  return UPPERCASE_CODE.test(code)
    ? LEGACY_PERMISSION_ALIASES[code] ?? code
    : PERMISSION_ALIASES[code] ?? code;
}

/**
 * `hasAnyPermission` nhưng hiểu cả 2 dạng mã (UPPERCASE và dotted).
 * Không làm thay đổi mảng truyền vào.
 */
export function hasAnyPermissionWithAliases(
  permissions: string[],
  perms: readonly string[],
): boolean {
  const normalized = new Set(permissions.map(normalizePermissionCode));
  return perms.some((perm) => normalized.has(normalizePermissionCode(perm)));
}

/**
 * Quyền nghiệp vụ học sinh — FE dùng `STUDENT_*`, BE chặn bằng `student.view`.
 *
 * `canViewStudents` nhận cả trạng thái đăng nhập (không chỉ `isOwner` boolean)
 * để màn hình và menu dùng chung một nguồn quyết định.
 */
export const STUDENT_PERMISSIONS = [
  'STUDENT_VIEW',
  'STUDENT_CREATE',
  'STUDENT_EDIT',
  'STUDENT_DELETE',
] as const;

const STUDENT_EDIT_PERMISSIONS = ['STUDENT_CREATE', 'STUDENT_EDIT', 'STUDENT_DELETE'] as const;

/** Các mã quyền cho phép vào khu vực `/dao-tao` (cả dạng UPPERCASE lẫn dotted). */
export const ACADEMIC_AREA_PERMISSIONS = [
  ...SPRINT4_PERMISSIONS,
  'employee.view',
  'employee.edit',
  'schedule.view',
  'schedule.create',
  'schedule.update',
  // Legacy — chuẩn là `schedule.update`, nhưng token cũ vẫn có mã này.
  'schedule.edit',
  'schedule.cancel_session',
  'schedule.delete',
  'schedule.self_view',
  // Trang self-service của giáo viên / học sinh.
  'class.self_view',
  'student.self_view',
  'facility.view',
  'facility.manage',
  'facility.room.view',
  'facility.room.create',
  'facility.room.update',
  'facility.room.delete',
  'facility.equipment.view',
  'facility.equipment.create',
  'facility.equipment.update',
  'facility.equipment.delete',
  'facility.issue.report',
  'facility.issue.resolve',
] as const;

/** §9 — xem danh sách/chi tiết giáo viên: OWNER, PEOPLE_VIEW hoặc PEOPLE_EDIT. */
export function canViewTeachers(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermissionWithAliases(permissions, ['PEOPLE_VIEW', 'PEOPLE_EDIT']);
}

/** §9 — tạo/sửa giáo viên, tạo chuyên môn: PEOPLE_EDIT (OWNER luôn được). */
export function canEditTeachers(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermissionWithAliases(permissions, ['PEOPLE_EDIT']);
}

/** §9 — xem danh sách/chi tiết lớp: CLASS_VIEW (OWNER luôn được). */
export function canViewClasses(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermissionWithAliases(permissions, ['CLASS_VIEW']);
}

/**
 * Xem danh sách/hồ sơ học sinh: OWNER hoặc bất kỳ quyền `STUDENT_*` nào.
 *
 * Nhận cả `backendRoles` để dùng trực tiếp trong page/menu, thay vì mỗi nơi
 * phải tự gọi `isOwnerRole` rồi truyền boolean.
 */
export function canViewStudents(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  return (
    isOwnerRole(state.backendRoles) ||
    hasAnyPermissionWithAliases(state.permissions, STUDENT_PERMISSIONS)
  );
}

/** Tạo/sửa/xoá học sinh: OWNER hoặc `STUDENT_CREATE`/`EDIT`/`DELETE`. */
export function canEditStudents(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  return (
    isOwnerRole(state.backendRoles) ||
    hasAnyPermissionWithAliases(state.permissions, STUDENT_EDIT_PERMISSIONS)
  );
}

export function canAccessAcademicArea(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  if (isOwnerRole(state.backendRoles)) return true;
  return hasAnyPermissionWithAliases(state.permissions, ACADEMIC_AREA_PERMISSIONS);
}

/** Gate UX cho khu vực cơ sở vật chất: OWNER hoặc một quyền facility/issue. */
export function canAccessFacilityArea(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  return (
    isOwnerRole(state.backendRoles) ||
    hasAnyPermissionWithAliases(state.permissions, [
      'FACILITY_VIEW',
      'FACILITY_MANAGE',
      'FACILITY_ISSUE_REPORT',
      'FACILITY_ISSUE_RESOLVE',
    ])
  );
}

/**
 * Gate UX cho các trang self-service (§ self pages): JWT của TEACHER và STUDENT
 * đều mang cả 2 self-permission nên phải phân biệt bằng `backendRoles`, KHÔNG
 * suy vai trò từ permission. Backend vẫn là nguồn quyền thật.
 */
export function canViewTeacherSelf(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  return state.backendRoles.includes('TEACHER');
}

export function canViewTeacherClasses(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  return (
    state.backendRoles.includes('TEACHER') &&
    hasAnyPermissionWithAliases(state.permissions, ['class.self_view'])
  );
}

export function canViewStudentSelf(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  return state.backendRoles.includes('STUDENT');
}

export function canViewStudentClasses(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  return (
    state.backendRoles.includes('STUDENT') &&
    hasAnyPermissionWithAliases(state.permissions, ['student.self_view'])
  );
}

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
] as const;

/** §9 — xem danh sách/chi tiết giáo viên: OWNER, PEOPLE_VIEW hoặc PEOPLE_EDIT. */
export function canViewTeachers(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermission(permissions, ['PEOPLE_VIEW', 'PEOPLE_EDIT']);
}

/** §9 — tạo/sửa giáo viên, tạo chuyên môn: PEOPLE_EDIT (OWNER luôn được). */
export function canEditTeachers(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'PEOPLE_EDIT');
}

/** §9 — xem danh sách/chi tiết lớp: CLASS_VIEW (OWNER luôn được). */
export function canViewClasses(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'CLASS_VIEW');
}

export function canAccessAcademicArea(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  if (isOwnerRole(state.backendRoles)) return true;
  return hasAnyPermission(state.permissions, SPRINT4_PERMISSIONS);
}

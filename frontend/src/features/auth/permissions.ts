/**
 * Helper kiểm quyền phía client — CHỈ để ẩn/hiện UI và chặn route (UX).
 * Quyền thật do backend chặn (401/403). Không dùng để bảo mật.
 *
 * Mã quyền dạng `<module>.<resource>.<action>` (Phần 1). Mã cũ UPPER_SNAKE
 * vẫn nằm trong `role_permission` đã được migration ánh xạ sang dạng mới.
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
 * Quyền nghiệp vụ khu vực `/dao-tao` (giáo viên/lớp/sinh viên/chức vụ).
 * Gồm cả quyền quản lý nhân sự vì nhân sự dùng chung khu vực đào tạo.
 */
export const SPRINT4_PERMISSIONS = [
  'employee.view',
  'employee.create',
  'employee.edit',
  'employee.delete',
  'employee.reset_password',
  'employee.assign_position',
  'employee.view_detail',
  'employee.resign',
  'employee.approve_resignation',
  'employee.transfer',
  'employee.approve_transfer',
  'position.view',
  'position.manage',
  'department.view',
  'class.view',
  'class.create',
  'class.edit',
  'class.delete',
  'class.assign_teacher',
  'class.teacher.reassign',
  'class.cancel',
  'class.request_close',
  'class.approve_close',
  'class.reopen',
  'student.view',
  'student.create',
  'student.create_account',
  'student.edit',
  'student.delete',
  // Phần 7 — lịch học & cơ sở vật chất dùng chung khu vực `/dao-tao`.
  'schedule.view',
  'schedule.create',
  'schedule.edit',
  'schedule.update',
  'schedule.cancel_session',
  'schedule.delete',
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

/** Xem danh sách/chi tiết giáo viên: `employee.view` hoặc `employee.edit`. */
export function canViewTeachers(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermission(permissions, ['employee.view', 'employee.edit']);
}

/** Xem quy trình chuyển phòng ban: người khởi tạo, người duyệt HR, hoặc quản lý nhân sự. */
export function canViewTransfers(isOwner: boolean, permissions: string[]): boolean {
  return (
    isOwner ||
    hasAnyPermission(permissions, [
      'employee.transfer',
      'employee.approve_transfer',
      'employee.view',
    ])
  );
}

/** Xem toàn bộ nhân sự (mọi chức vụ) của phòng ban: `employee.view`. */
export function canViewStaff(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'employee.view');
}

/** Quản lý nhân sự phòng ban (thêm/xoá, gán chức vụ): một trong các quyền `employee.*`. */
export function canEditStaff(isOwner: boolean, permissions: string[]): boolean {
  return (
    isOwner ||
    hasAnyPermission(permissions, [
      'employee.create',
      'employee.edit',
      'employee.delete',
      'employee.assign_position',
      'employee.reset_password',
    ])
  );
}

/** Quản lý chức vụ (tạo/sửa/xoá): `position.manage` (OWNER luôn được). */
export function canManagePositions(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'position.manage');
}

/** Tạo/sửa giáo viên, tạo chuyên môn: `employee.create` hoặc `employee.edit`. */
export function canEditTeachers(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermission(permissions, ['employee.create', 'employee.edit']);
}

/** Xem danh sách/chi tiết lớp: `class.view` (OWNER luôn được). */
export function canViewClasses(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'class.view');
}

/** Tạo lớp: `class.create` (OWNER luôn được). */
export function canCreateClasses(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'class.create');
}

/** Xem danh sách sinh viên: `student.view` (OWNER luôn được). */
export function canViewStudents(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'student.view');
}

/** Thêm sinh viên: `student.create` (OWNER luôn được). */
export function canCreateStudents(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'student.create');
}

/** Sửa hồ sơ sinh viên: `student.edit` (OWNER luôn được). */
export function canEditStudents(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'student.edit');
}

/** Xoá sinh viên: `student.delete` (OWNER luôn được). */
export function canDeleteStudents(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'student.delete');
}

/** Quy tắc 12 — cấp tài khoản đăng nhập cho sinh viên: `student.create_account`. */
export function canCreateStudentAccount(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'student.create_account');
}

/** Quy tắc 17 — phân công lại giáo viên cho lớp bị gắn nhãn: `class.teacher.reassign`. */
export function canReassignTeacher(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'class.teacher.reassign');
}

/** Quy tắc 12 — cổng sinh viên: chỉ tài khoản có quyền SELF. */
export function canAccessStudentPortal(permissions: string[]): boolean {
  return hasPermission(permissions, 'student.self_view');
}

// --------------------------------------------------- Phần 7: lịch & cơ sở vật chất

/** Xem lịch của phòng ban: `schedule.view` (OWNER luôn được). */
export function canViewSchedule(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'schedule.view');
}

/** Tạo buổi học: `schedule.create`. */
export function canCreateSchedule(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'schedule.create');
}

/** Sửa buổi học: `schedule.update` hoặc mã cũ `schedule.edit`. */
export function canUpdateSchedule(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermission(permissions, ['schedule.update', 'schedule.edit']);
}

/** Hủy một buổi: mã riêng hoặc quyền sửa buổi. */
export function canCancelSchedule(isOwner: boolean, permissions: string[]): boolean {
  return (
    isOwner ||
    hasAnyPermission(permissions, ['schedule.cancel_session', 'schedule.update', 'schedule.edit'])
  );
}

/** Xóa mềm buổi học: `schedule.delete`. */
export function canDeleteSchedule(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasPermission(permissions, 'schedule.delete');
}

/** Xem lịch của chính mình / lớp mình: `schedule.self_view`. */
export function canViewOwnSchedule(permissions: string[]): boolean {
  return hasPermission(permissions, 'schedule.self_view');
}

/** Xem phòng: `facility.room.view` hoặc quyền quản lý cũ. */
export function canViewRooms(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermission(permissions, ['facility.room.view', 'facility.view', 'facility.manage']);
}

/** Thêm/sửa/xóa phòng: quyền cụ thể hoặc `facility.manage` cũ. */
export function canManageRooms(isOwner: boolean, permissions: string[]): boolean {
  return (
    isOwner ||
    hasAnyPermission(permissions, [
      'facility.room.create',
      'facility.room.update',
      'facility.room.delete',
      'facility.manage',
    ])
  );
}

/** Xem thiết bị: `facility.equipment.view` hoặc quyền quản lý cũ. */
export function canViewEquipment(isOwner: boolean, permissions: string[]): boolean {
  return (
    isOwner ||
    hasAnyPermission(permissions, ['facility.equipment.view', 'facility.view', 'facility.manage'])
  );
}

/** Thêm/sửa/xóa thiết bị. */
export function canManageEquipment(isOwner: boolean, permissions: string[]): boolean {
  return (
    isOwner ||
    hasAnyPermission(permissions, [
      'facility.equipment.create',
      'facility.equipment.update',
      'facility.equipment.delete',
      'facility.manage',
    ])
  );
}

/** Báo sự cố: `facility.issue.report` hoặc `facility.manage`. */
export function canReportIssues(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermission(permissions, ['facility.issue.report', 'facility.manage']);
}

/** Xử lý sự cố: `facility.issue.resolve` hoặc `facility.manage`. */
export function canResolveIssues(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || hasAnyPermission(permissions, ['facility.issue.resolve', 'facility.manage']);
}

/** Xem sự cố: quyền báo/xử lý hoặc xem thiết bị. */
export function canViewIssues(isOwner: boolean, permissions: string[]): boolean {
  return (
    isOwner ||
    hasAnyPermission(permissions, [
      'facility.issue.report',
      'facility.issue.resolve',
      'facility.equipment.view',
      'facility.manage',
    ])
  );
}

/** Xem màn cơ sở vật chất: bất kỳ quyền facility.* nào. */
export function canViewFacility(isOwner: boolean, permissions: string[]): boolean {
  return isOwner || permissions.some((code) => code.startsWith('facility.'));
}

export function canAccessAcademicArea(state: {
  backendRoles: string[];
  permissions: string[];
}): boolean {
  if (isOwnerRole(state.backendRoles)) return true;
  return hasAnyPermission(state.permissions, SPRINT4_PERMISSIONS);
}

/**
 * Chọn chế độ xem lịch tuần. Quyết định dựa trên `backendRoles` (không dùng
 * permission quản lý): giáo viên thấy lưới giờ, học sinh thấy lịch gọn,
 * các vai trò khác mặc định lịch gọn và được chuyển đổi.
 */
export type ScheduleMode = 'hourly' | 'compact';

const hasRole = (backendRoles: string[], role: string): boolean =>
  backendRoles.some((value) => value.toUpperCase() === role);

export function initialScheduleMode(backendRoles: string[]): ScheduleMode {
  if (hasRole(backendRoles, 'TEACHER')) return 'hourly';
  return 'compact';
}

/** Chỉ vai trò không phải TEACHER/STUDENT mới được chuyển đổi chế độ xem. */
export function canToggleScheduleMode(backendRoles: string[]): boolean {
  return !hasRole(backendRoles, 'TEACHER') && !hasRole(backendRoles, 'STUDENT');
}

import { getAcademicMenu } from '../sprint4/academicMenu';
import { canAccessFacilityArea, isOwnerRole } from './permissions';
import { rolePreviewPath } from './roles';
import type { RoleId } from './roles';

export type LandingTarget = string | null;

/**
 * Đích sau đăng nhập / khi resolve index của `/dao-tao`.
 *
 * File riêng (không gộp vào `permissions.ts`) vì `getAcademicMenu` đã import
 * `permissions.ts` — gộp lại sẽ tạo vòng import.
 *
 * Thứ tự ưu tiên: console quản trị → console tổ chức → xem thử (khi không có
 * permission nghiệp vụ nào) → khu vực có menu thực tế → CSVC → xem thử.
 */
export function landingPathFor(state: {
  backendRoles: string[];
  permissions: string[];
  role: RoleId | null;
}): LandingTarget {
  if (state.backendRoles.includes('SUPER_ADMIN')) return '/quan-tri';
  if (isOwnerRole(state.backendRoles)) return '/to-chuc';

  const preview = state.role ? rolePreviewPath(state.role) : null;
  if (state.permissions.length === 0) return preview;

  const hasAcademicMenu =
    getAcademicMenu(state.permissions, false, state.backendRoles).length > 0;
  if (hasAcademicMenu) return '/dao-tao';
  if (canAccessFacilityArea(state)) return '/co-so-vat-chat';

  return preview;
}

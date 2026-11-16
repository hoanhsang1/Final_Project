import { useAuthStore } from '../stores/authStore';
import { isOwnerRole } from '../features/auth/permissions';

/**
 * Hook kiểm quyền phía client (CHỈ để ẩn/hiện UI — BE vẫn là người chặn thật).
 *
 * - `can(code)`: có mã quyền (không xét phạm vi). OWNER luôn đúng.
 * - `canAny(codes)`: có ít nhất một mã.
 * - `canIn(code, departmentId)`: có quyền trong phòng ban — đọc claim
 *   `permissionScopes`; token cũ chưa có claim thì coi như có quyền.
 */
export function usePermission() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const permissionScopes = useAuthStore((s) => s.permissionScopes);
  const isOwner = isOwnerRole(backendRoles);

  const can = (code: string): boolean => isOwner || permissions.includes(code);

  const canAny = (codes: readonly string[]): boolean =>
    isOwner || codes.some((code) => permissions.includes(code));

  const canIn = (code: string, departmentId: string | null | undefined): boolean => {
    if (isOwner) return true;
    if (!permissions.includes(code)) return false;
    const scopes = permissionScopes[code];
    if (!scopes || scopes.length === 0) return true;
    if (scopes.includes('ORGANIZATION')) return true;
    return !!departmentId && scopes.includes(`DEPARTMENT:${departmentId}`);
  };

  return { isOwner, permissions, permissionScopes, can, canAny, canIn };
}

import { isOwner, isSuperAdmin } from '@/lib/nav'
import { PERM } from '@/lib/permissions'
import type { Session } from '@/types/session'

export type ScopeReason = 'owner' | 'org-scope' | 'department-scope' | 'unknown'

export interface DepartmentScope {
  /** true = chỉ được xem/thao tác trong phòng ban `departmentId`. */
  isScoped: boolean
  departmentId: string | null
  reason: ScopeReason
}

/**
 * Xác định phạm vi phòng ban từ **quyền hiệu lực**, không từ tên chức vụ.
 *
 * - OWNER/SUPER_ADMIN: toàn tổ chức.
 * - Có `permissionScopes[employee.view|department.view]` chứa `ORGANIZATION`: toàn tổ chức.
 * - Còn lại có `departmentId`: giới hạn phòng ban đó.
 * - JWT cũ không có `permissionScopes`: fallback theo `departmentId` (an toàn hơn mở rộng).
 *
 * Backend vẫn là nơi kiểm tra cuối cùng; đây chỉ là phạm vi UI gọi API.
 */
export function resolveDepartmentScope(session: Session | null): DepartmentScope {
  if (!session) return { isScoped: false, departmentId: null, reason: 'unknown' }
  if (isOwner(session) || isSuperAdmin(session)) {
    return { isScoped: false, departmentId: null, reason: 'owner' }
  }

  const departmentId = session.user.departmentId ?? null
  const scopes = session.permissionScopes ?? {}

  const hasOrganizationScope = (code: string): boolean =>
    Boolean(scopes[code]?.includes('ORGANIZATION'))

  if (hasOrganizationScope(PERM.employeeView) || hasOrganizationScope(PERM.departmentView)) {
    return { isScoped: false, departmentId: null, reason: 'org-scope' }
  }

  if (departmentId) {
    return { isScoped: true, departmentId, reason: 'department-scope' }
  }

  return { isScoped: false, departmentId: null, reason: 'unknown' }
}

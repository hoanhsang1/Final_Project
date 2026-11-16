import { useSession } from '@/features/auth/hooks'
import { isOwner } from '@/lib/nav'

/**
 * Phạm vi phòng ban của người đang đăng nhập.
 * OWNER/SUPER_ADMIN xem toàn tổ chức; người có departmentId chỉ được xem phòng ban đó
 * (backend trả 403 nếu gọi thành viên của phòng khác).
 */
export function useDepartmentScope() {
  const session = useSession()
  const scopedDepartmentId =
    session && !isOwner(session) ? (session.user.departmentId ?? null) : null

  return {
    session,
    isScoped: Boolean(scopedDepartmentId),
    scopedDepartmentId,
  }
}

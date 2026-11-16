import { useSession } from '@/features/auth/hooks'
import { resolveDepartmentScope } from '@/lib/scope'

/**
 * Phạm vi phòng ban của người đang đăng nhập, suy ra từ quyền hiệu lực.
 * OWNER hoặc người có quyền scope ORGANIZATION xem toàn tổ chức; còn lại
 * giới hạn theo `departmentId` trong JWT.
 */
export function useDepartmentScope() {
  const session = useSession()
  const scope = resolveDepartmentScope(session)
  return {
    session,
    ...scope,
    // Tương thích với tên cũ đang dùng trong hook/trang.
    scopedDepartmentId: scope.departmentId,
  }
}

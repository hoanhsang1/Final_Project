import { Navigate } from 'react-router-dom'

import { usePermission } from '@/features/auth/hooks'
import { PERM } from '@/lib/permissions'

/**
 * Trang gốc khu Đào tạo: chọn màn hình đầu tiên mà người dùng thực sự dùng được,
 * thay vì luôn nhảy tới "Giáo viên" (giáo viên/trưởng phòng không có quyền đó).
 */
export function AcademicLanding() {
  const { can, session } = usePermission()
  if (!session) return null

  if (can(PERM.classView)) return <Navigate to="/dao-tao/lop-hoc" replace />
  if (can(PERM.classSelfView)) return <Navigate to="/dao-tao/lop-cua-toi" replace />
  if (can(PERM.studentView)) return <Navigate to="/dao-tao/sinh-vien" replace />
  if (can(PERM.scheduleView)) return <Navigate to="/dao-tao/lich-hoc" replace />
  if (can(PERM.scheduleSelfView)) return <Navigate to="/lich-cua-toi" replace />
  if (can(PERM.facilityView)) return <Navigate to="/dao-tao/co-so-vat-chat" replace />
  if (can(PERM.employeeView) || can(PERM.classAssignTeacher)) {
    return <Navigate to="/dao-tao/giao-vien" replace />
  }
  return <Navigate to="/ho-so" replace />
}

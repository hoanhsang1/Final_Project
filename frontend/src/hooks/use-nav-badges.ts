import { useMemo } from 'react'

import { usePermission } from '@/features/auth/hooks'
import { useNotifications, useTransferInbox } from '@/features/organization/hooks'
import { usePendingOrganizations } from '@/features/platform/hooks'
import { PERM } from '@/lib/permissions'

/** Số liệu hiển thị trên badge điều hướng; chỉ gọi API khi người dùng có quyền. */
export function useNavBadges() {
  const { can, isSuperAdmin, session } = usePermission()
  const canSeeApprovals =
    can(PERM.approvalInboxView) ||
    can(PERM.employeeApproveTransfer) ||
    Boolean(session?.approvals?.any)

  const pending = usePendingOrganizations(isSuperAdmin)
  const approvals = useTransferInbox(canSeeApprovals)
  // SUPER_ADMIN không thuộc tổ chức nào nên không có hộp thông báo cấp tổ chức.
  const notifications = useNotifications(!isSuperAdmin)

  const unreadNotifications = useMemo(
    () => (notifications.data ?? []).filter((item) => !item.readAt).length,
    [notifications.data],
  )

  return {
    pendingOrganizations: isSuperAdmin ? (pending.data?.length ?? 0) : 0,
    approvals: canSeeApprovals ? (approvals.data?.length ?? 0) : 0,
    notifications: unreadNotifications,
  }
}

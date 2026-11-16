import { useMemo } from 'react'

import { usePermission } from '@/features/auth/hooks'
import { useNotifications, useTransferInbox } from '@/features/organization/hooks'
import { usePendingOrganizations } from '@/features/platform/hooks'
import { PERM } from '@/lib/permissions'

/** Số liệu hiển thị trên badge điều hướng; chỉ gọi API khi người dùng có quyền. */
export function useNavBadges() {
  const { can, isSuperAdmin } = usePermission()
  const canSeeApprovals = can(PERM.approvalInboxView) || can(PERM.employeeApproveTransfer)

  const pending = usePendingOrganizations(isSuperAdmin)
  const approvals = useTransferInbox(canSeeApprovals)
  const notifications = useNotifications(true)

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

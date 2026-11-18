import { authApi } from '@/features/auth/api'
import { orgModulesApi } from '@/features/organization/api'
import { moduleStatesFrom } from '@/lib/modules'
import { useSessionStore } from '@/stores/session-store'

/**
 * Nạp dữ liệu phiên không có trong JWT cho MỌI vai trò:
 *  - trạng thái module của tổ chức (active/disabled/locked/not_registered);
 *  - khả năng duyệt theo chức danh + uỷ quyền.
 * Lỗi mạng/403 không được làm ẩn menu oan: giữ trạng thái "chưa xác định".
 */
export async function hydrateSessionContext(): Promise<void> {
  if (!useSessionStore.getState().session) return

  const [modules, capabilities] = await Promise.allSettled([
    orgModulesApi.status(),
    authApi.approvalCapabilities(),
  ])

  const store = useSessionStore.getState()
  if (modules.status === 'fulfilled') store.setModuleStates(moduleStatesFrom(modules.value))
  if (capabilities.status === 'fulfilled') store.setApprovalCapabilities(capabilities.value)
}

/**
 * Đồng bộ lại quyền hiệu lực sau khi chức vụ/uỷ quyền thay đổi.
 * Token vẫn mang quyền cũ tới khi refresh; backend luôn kiểm tra lại.
 */
export async function refreshEffectivePermissions(): Promise<void> {
  if (!useSessionStore.getState().session) return
  try {
    const payload = await authApi.effectivePermissions()
    useSessionStore.getState().mergePermissions({
      permissions: payload.permissions,
      scopes: payload.permissionScopes,
      delegatedPermissions: payload.delegatedPermissions,
    })
    await hydrateSessionContext()
  } catch {
    // Giữ quyền hiện có; hành động sẽ được backend chặn nếu thực sự thiếu quyền.
  }
}

import { orgModulesApi } from '@/features/organization/api'
import { enabledModuleCodes } from '@/lib/modules'
import { isOwner } from '@/lib/nav'
import { useSessionStore } from '@/stores/session-store'

/**
 * Nạp module đang bật của tổ chức cho OWNER vì JWT chưa có claim module.
 * Vai trò khác không có API đọc module của mình → giữ "chưa xác định", menu không ẩn oan.
 */
export async function hydrateOwnerModules(): Promise<void> {
  const session = useSessionStore.getState().session
  if (!session || !isOwner(session)) return

  try {
    const modules = await orgModulesApi.mine()
    useSessionStore.getState().setModules(enabledModuleCodes(modules))
  } catch {
    // Lỗi mạng/403 không được làm ẩn menu; backend vẫn chặn bằng MODULE_NOT_ENABLED.
  }
}

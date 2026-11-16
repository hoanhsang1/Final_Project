import { hydrateOwnerModules } from '@/features/auth/module-hydration'
import { authApi } from '@/features/auth/api'
import { isTokenExpired } from '@/lib/jwt'
import { tokenStorage } from '@/lib/token-storage'
import { useSessionStore } from '@/stores/session-store'

/**
 * Khôi phục phiên khi tải lại trang:
 *  - access token còn hạn → dựng phiên ngay;
 *  - access token hết hạn nhưng có refresh token → đổi token;
 *  - không còn gì → chưa đăng nhập.
 * Không gọi endpoint hồ sơ vì backend chưa có `/me`.
 */
export async function bootstrapSession(): Promise<void> {
  const store = useSessionStore.getState()
  const accessToken = tokenStorage.getAccessToken()
  const refreshToken = tokenStorage.getRefreshToken()

  if (accessToken && !isTokenExpired(accessToken)) {
    store.restore(accessToken, refreshToken)
    void hydrateOwnerModules()
    return
  }

  if (refreshToken) {
    try {
      const response = await authApi.refresh(refreshToken)
      store.loginSuccess(response)
      void hydrateOwnerModules()
      return
    } catch {
      store.clear()
      return
    }
  }

  store.clear()
}

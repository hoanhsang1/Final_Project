const ACCESS_TOKEN_KEY = 'mems.v2.accessToken'
const REFRESH_TOKEN_KEY = 'mems.v2.refreshToken'

/**
 * Token được lưu ở localStorage để giữ phiên qua lần tải lại trang.
 * Rủi ro XSS là hữu hạn ở mức ứng dụng: backend không đặt cookie và
 * access token chỉ sống 15 phút. Không lưu bất kỳ dữ liệu nghiệp vụ nào.
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY)
    } catch {
      return null
    }
  },
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(accessToken: string, refreshToken: string) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } catch {
      /* chế độ riêng tư có thể chặn localStorage — phiên chỉ sống trong bộ nhớ */
    }
  },
  setAccessToken(accessToken: string) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    } catch {
      /* noop */
    }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      /* noop */
    }
  },
}

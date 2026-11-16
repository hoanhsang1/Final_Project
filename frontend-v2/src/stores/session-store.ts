import { create } from 'zustand'

import { claimsToSession, decodeJwt, isTokenExpired } from '@/lib/jwt'
import { tokenStorage } from '@/lib/token-storage'
import type { LoginResponse, Session } from '@/types/session'

export type SessionStatus = 'booting' | 'authenticated' | 'unauthenticated'

interface SessionState {
  status: SessionStatus
  session: Session | null
  accessToken: string | null
  refreshToken: string | null
  /** Đăng nhập thành công: lưu token và dựng phiên từ claim. */
  loginSuccess: (response: LoginResponse) => void
  /** Làm mới token (refresh) mà không đổi người dùng. */
  setTokens: (accessToken: string, refreshToken: string) => void
  /** Khôi phục phiên từ token còn hiệu lực khi tải lại trang. */
  restore: (accessToken: string, refreshToken: string | null) => void
  /** Bổ sung module đang bật sau khi nạp từ API (JWT không có claim module). */
  setModules: (codes: string[]) => void
  clear: () => void
  finishBoot: () => void
}

function buildSession(accessToken: string): Session | null {
  const claims = decodeJwt(accessToken)
  return claimsToSession(claims)
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  status: 'booting',
  session: null,
  accessToken: null,
  refreshToken: null,

  loginSuccess: (response) => {
    const session = buildSession(response.accessToken)
    if (!session) {
      tokenStorage.clear()
      set({ status: 'unauthenticated', session: null, accessToken: null, refreshToken: null })
      return
    }
    tokenStorage.set(response.accessToken, response.refreshToken)
    set({
      status: 'authenticated',
      session,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    })
  },

  setTokens: (accessToken, refreshToken) => {
    const session = buildSession(accessToken)
    // Refresh token không mang claim module: giữ kết quả đã nạp thay vì xoá trắng.
    const loadedModules = get().session?.modules ?? []
    if (session && loadedModules.length > 0) session.modules = loadedModules
    tokenStorage.set(accessToken, refreshToken)
    set({
      status: session ? 'authenticated' : 'unauthenticated',
      session,
      accessToken,
      refreshToken,
    })
  },

  restore: (accessToken, refreshToken) => {
    if (isTokenExpired(accessToken)) {
      set({ status: 'unauthenticated', session: null, accessToken: null, refreshToken })
      return
    }
    const session = buildSession(accessToken)
    set({
      status: session ? 'authenticated' : 'unauthenticated',
      session,
      accessToken,
      refreshToken,
    })
  },

  setModules: (codes) => {
    set((state) => (state.session ? { session: { ...state.session, modules: codes } } : {}))
  },

  clear: () => {
    tokenStorage.clear()
    set({ status: 'unauthenticated', session: null, accessToken: null, refreshToken: null })
  },

  finishBoot: () => {
    if (get().status === 'booting') set({ status: 'unauthenticated' })
  },
}))

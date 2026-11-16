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

  clear: () => {
    tokenStorage.clear()
    set({ status: 'unauthenticated', session: null, accessToken: null, refreshToken: null })
  },

  finishBoot: () => {
    if (get().status === 'booting') set({ status: 'unauthenticated' })
  },
}))

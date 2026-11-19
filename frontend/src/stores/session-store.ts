import { create } from 'zustand'

import { claimsToSession, decodeJwt, isTokenExpired } from '@/lib/jwt'
import { tokenStorage } from '@/lib/token-storage'
import type {
  ApprovalCapabilities,
  LoginResponse,
  ModuleState,
  Session,
} from '@/types/session'

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
  /** Ghi trạng thái chi tiết của module (active/disabled/locked/not_registered). */
  setModuleStates: (states: Record<string, ModuleState>) => void
  /** Khả năng duyệt lấy từ backend theo chức danh + uỷ quyền. */
  setApprovalCapabilities: (capabilities: ApprovalCapabilities | null) => void
  /** Ghi đè quyền hiệu lực sau khi chức vụ/uỷ quyền thay đổi. */
  mergePermissions: (payload: {
    permissions: string[]
    scopes?: Record<string, string[]>
    delegatedPermissions?: string[]
  }) => void
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
    // Refresh token không mang claim module/capability: giữ kết quả đã nạp.
    const previous = get().session
    if (session && previous) {
      session.modules = previous.modules
      session.moduleStates = previous.moduleStates
      session.approvals = previous.approvals
    }
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

  setModuleStates: (states) => {
    const modules = Object.entries(states)
      .filter(([, status]) => status === 'active')
      .map(([code]) => code)
    set((state) =>
      state.session ? { session: { ...state.session, modules, moduleStates: states } } : {},
    )
  },

  setApprovalCapabilities: (capabilities) => {
    set((state) =>
      state.session ? { session: { ...state.session, approvals: capabilities } } : {},
    )
  },

  mergePermissions: ({ permissions, scopes, delegatedPermissions }) => {
    set((state) => {
      if (!state.session) return {}
      return {
        session: {
          ...state.session,
          permissions,
          permissionScopes: scopes ?? state.session.permissionScopes,
          delegatedPermissions: delegatedPermissions ?? state.session.delegatedPermissions,
          // Vừa lấy lại trực tiếp từ People: quyền hiện tại đã được xác minh.
          permissionsStale: false,
        },
      }
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

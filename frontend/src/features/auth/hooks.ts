import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { authApi } from '@/features/auth/api'
import { hydrateSessionContext } from '@/features/auth/module-hydration'
import { hasAnyPermission, hasPermission, isOwner, isSuperAdmin } from '@/lib/nav'
import { queryKeys } from '@/lib/query-keys'
import { useSessionStore } from '@/stores/session-store'
import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterOrganizationRequest,
  Session,
} from '@/types/session'

export function useSession(): Session | null {
  return useSessionStore((state) => state.session)
}

export function useAuthStatus() {
  return useSessionStore((state) => state.status)
}

export function usePermission() {
  const session = useSession()
  return {
    session,
    can: (code: string) => hasPermission(session, code),
    canAny: (codes: string[]) => hasAnyPermission(session, codes),
    isOwner: isOwner(session),
    isSuperAdmin: isSuperAdmin(session),
    hasRole: (role: string) => Boolean(session?.roles.includes(role)),
  }
}

export function useLoginMutation() {
  const loginSuccess = useSessionStore((state) => state.loginSuccess)
  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (response) => {
      loginSuccess(response)
      void hydrateSessionContext()
    },
  })
}

/** Danh mục module công khai cho biểu mẫu đăng ký tổ chức. */
export function usePublicModules() {
  return useQuery({
    queryKey: ['public-modules'],
    queryFn: () => authApi.publicModules(),
    staleTime: 10 * 60_000,
  })
}

/** Đăng ký tổ chức mới — backend tạo tổ chức và tài khoản chủ ở trạng thái PENDING. */
export function useRegisterOrganization() {
  return useMutation({
    mutationFn: (payload: RegisterOrganizationRequest) => authApi.register(payload),
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const refreshToken = useSessionStore.getState().refreshToken
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken)
        } catch {
          // Đăng xuất phía client vẫn phải thành công dù server không phản hồi.
        }
      }
    },
    onSettled: () => {
      useSessionStore.getState().clear()
      queryClient.clear()
      navigate('/dang-nhap', { replace: true })
    },
  })
}

export function useChangePasswordMutation() {
  const clear = useSessionStore((state) => state.clear)
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => authApi.changePassword(payload),
    onSuccess: () => {
      // Backend thu hồi toàn bộ refresh token sau khi đổi mật khẩu.
      clear()
    },
  })
}

/** Gọi sau khi đăng nhập/đổi mật khẩu để xoá cache của người dùng trước. */
export function useResetSessionQueries() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.removeQueries({ queryKey: queryKeys.notifications })
  }
}

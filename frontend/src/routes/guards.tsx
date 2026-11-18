import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Logo } from '@/components/brand/logo'
import { ForbiddenState } from '@/components/ui/states'
import { useAuthStatus, useSession } from '@/features/auth/hooks'
import { canEnter, defaultRouteFor } from '@/routes/access'
import type { WorkspaceId } from '@/lib/nav'

/** Màn hình chờ khi đang khôi phục phiên từ token. */
export function BootSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <Logo showTagline />
      <div className="flex items-center gap-2 text-xs text-ink-400" role="status">
        <span className="size-1.5 animate-pulse rounded-full bg-jade-500" />
        Đang khôi phục phiên làm việc…
      </div>
    </div>
  )
}

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const status = useAuthStatus()
  const location = useLocation()

  if (status === 'booting') return <BootSplash />
  if (status === 'unauthenticated') {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />
  }
  return <>{children ?? <Outlet />}</>
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const status = useAuthStatus()
  const session = useSession()

  if (status === 'booting') return <BootSplash />
  if (status === 'authenticated' && session) {
    return <Navigate to={defaultRouteFor(session)} replace />
  }
  return <>{children}</>
}

export function WorkspaceGuard({
  workspaceId,
  children,
}: {
  workspaceId: WorkspaceId
  children: React.ReactNode
}) {
  const session = useSession()
  if (!session) return null
  if (!canEnter(session, workspaceId)) {
    return (
      <div className="py-10">
        <ForbiddenState
          title="Bạn không có quyền vào khu vực này"
          description="Khu vực yêu cầu một trong các nhóm quyền mà tài khoản của bạn chưa được cấp. Hãy liên hệ Chủ tổ chức hoặc quản trị viên để được bổ sung chức vụ phù hợp."
        />
      </div>
    )
  }
  return <>{children}</>
}

export function PermissionGuard({
  permission,
  anyOf,
  children,
}: {
  permission?: string
  anyOf?: string[]
  children: React.ReactNode
}) {
  const session = useSession()
  if (!session) return null
  const owner = session.roles.some((role) => role === 'OWNER' || role === 'ORG_OWNER')
  const codes = anyOf ?? (permission ? [permission] : [])
  const allowed = owner || codes.some((code) => session.permissions.includes(code))
  if (!allowed) {
    return (
      <div className="py-10">
        <ForbiddenState />
      </div>
    )
  }
  return <>{children}</>
}

export function LandingRedirect() {
  const status = useAuthStatus()
  const session = useSession()

  if (status === 'booting') return <BootSplash />
  if (status === 'unauthenticated' || !session) return <Navigate to="/dang-nhap" replace />
  return <Navigate to={defaultRouteFor(session)} replace />
}

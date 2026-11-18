import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { createQueryClient } from '@/app/providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSessionStore } from '@/stores/session-store'
import type { Session, SessionUser } from '@/types/session'

const baseUser: SessionUser = {
  id: 'user-owner',
  username: 'owner.test',
  fullName: 'Chủ tổ chức',
  email: 'owner@example.test',
  organizationId: 'org-1',
  organizationName: 'Trường Test',
  departmentId: null,
  mustChangePassword: false,
}

type SignInOverrides = Omit<Partial<Session>, 'user'> & { user?: Partial<SessionUser> }

/** Dựng phiên đã đăng nhập trong store — không gọi API đăng nhập. */
export function signInAs(overrides: SignInOverrides = {}): Session {
  const { user: userOverrides, ...rest } = overrides
  const session: Session = {
    ...rest,
    roles: rest.roles ?? ['OWNER'],
    role: rest.role ?? 'OWNER',
    permissions: rest.permissions ?? [],
    permissionScopes: rest.permissionScopes ?? {},
    delegatedPermissions: rest.delegatedPermissions ?? [],
    modules: rest.modules ?? [],
    user: { ...baseUser, ...(userOverrides ?? {}) },
  }
  useSessionStore.setState({
    status: 'authenticated',
    session,
    accessToken: sessionToken(session),
    refreshToken: 'test-refresh-token',
  })
  return session
}

/**
 * Token không ký nhưng đọc được claim — mock adapter dựng tài khoản từ claim
 * nên các lời gọi nền (module/khả năng duyệt/quyền hiệu lực) không rơi vào 401.
 */
function sessionToken(session: Session): string {
  const encode = (value: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  const payload = {
    sub: session.user.id,
    userId: session.user.id,
    username: session.user.username,
    roles: session.roles,
    role: session.role,
    permissions: session.permissions,
    permissionScopes: session.permissionScopes,
    delegatedPermissions: session.delegatedPermissions,
    departmentId: session.user.departmentId,
    orgId: session.user.organizationId,
    mustChangePassword: session.user.mustChangePassword,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.test-signature`
}

/** Render một page trong providers giống app thật (router + query + tooltip). */
export function renderPage(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

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

/** Dựng phiên đã đăng nhập trong store — không gọi API đăng nhập. */
export function signInAs(overrides: Partial<Session> = {}): Session {
  const session: Session = {
    user: { ...baseUser, ...(overrides.user ?? {}) },
    roles: ['OWNER'],
    role: 'OWNER',
    permissions: [],
    permissionScopes: {},
    delegatedPermissions: [],
    modules: [],
    ...overrides,
  }
  useSessionStore.setState({
    status: 'authenticated',
    session,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
  })
  return session
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

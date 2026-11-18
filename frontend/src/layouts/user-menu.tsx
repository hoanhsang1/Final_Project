import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout, useSession } from '@/features/auth/hooks'
import { getInitials } from '@/lib/format'
import { isOwner } from '@/lib/nav'

function roleLabel(roles: string[]): string {
  if (roles.includes('SUPER_ADMIN')) return 'Quản trị hệ thống'
  if (roles.some((role) => role === 'OWNER' || role === 'ORG_OWNER')) return 'Chủ tổ chức'
  if (roles.includes('MANAGER')) return 'Quản lý phòng ban'
  if (roles.includes('STUDENT')) return 'Sinh viên'
  return 'Nhân viên'
}

export function UserMenu() {
  const session = useSession()
  const logout = useLogout()
  if (!session) return null

  const displayName = session.user.fullName ?? session.user.username
  const organization = session.user.organizationName
    ? session.user.organizationName
    : session.user.organizationId
      ? `Tổ chức · ${session.user.organizationId.slice(0, 8)}`
      : 'Toàn hệ thống'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left transition-colors hover:bg-ink-100/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
          aria-label={`Tài khoản của ${displayName}`}
        >
          <Avatar size="sm">
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="max-w-[9rem] truncate text-xs font-semibold text-ink-800">
              {displayName}
            </span>
            <span className="max-w-[9rem] truncate text-2xs text-ink-400">
              {isOwner(session) ? 'Chủ tổ chức' : roleLabel(session.roles)}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-ink-400 sm:block" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar>
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{displayName}</p>
            <p className="truncate text-xs text-ink-500">@{session.user.username}</p>
          </div>
        </div>
        <div className="mx-1 mb-1 rounded-sm bg-ink-50 px-2.5 py-2">
          <p className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-400">Phạm vi</p>
          <p className="mt-0.5 truncate text-xs font-medium text-ink-700">{organization}</p>
          <p className="mt-0.5 text-2xs text-ink-500">{roleLabel(session.roles)}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/ho-so">
            <UserRound aria-hidden="true" />
            Hồ sơ cá nhân
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/doi-mat-khau">
            <KeyRound aria-hidden="true" />
            Đổi mật khẩu
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={logout.isPending}
          onSelect={(event) => {
            event.preventDefault()
            logout.mutate()
          }}
        >
          <LogOut aria-hidden="true" />
          {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </DropdownMenuItem>
        <DropdownMenuLabel className="normal-case tracking-normal text-ink-400">
          Quyền hiệu lực: {session.permissions.length} · Ủy quyền:{' '}
          {session.delegatedPermissions.length}
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

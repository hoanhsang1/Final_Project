import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

import { Logo } from '@/components/brand/logo'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth/hooks'
import { useNavBadges } from '@/hooks/use-nav-badges'
import { cn } from '@/lib/cn'
import { isMockMode } from '@/services/http'
import {
  resolveWorkspace,
  visibleGroups,
  type NavItem,
  type Workspace,
} from '@/lib/nav'
import { WorkspaceSwitcher } from '@/layouts/workspace-switcher'
import type { Session } from '@/types/session'

const ACTIVE_BAR = 'before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-jade-300'

function badgeFor(item: NavItem, badges: ReturnType<typeof useNavBadges>): number {
  switch (item.badge) {
    case 'approvals':
      return badges.approvals
    case 'notifications':
      return badges.notifications
    case 'pendingOrganizations':
      return badges.pendingOrganizations
    default:
      return 0
  }
}

export function SidebarNav({
  collapsed,
  workspace,
  session,
  onNavigate,
}: {
  collapsed: boolean
  workspace: Workspace
  session: Session
  onNavigate?: () => void
}) {
  const badges = useNavBadges()
  const groups = visibleGroups(session, workspace)

  return (
    <nav className="mems-scroll flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Điều hướng chính">
      {groups.map((group) => (
        <div key={group.id} className="mt-4 first:mt-2">
          {collapsed ? (
            <div className="mx-2 mb-1.5 h-px bg-sidebar-line" aria-hidden="true" />
          ) : (
            <p className="mb-1.5 px-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-sidebar-muted/80">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              const count = badgeFor(item, badges)
              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-2.5 rounded-sm py-2 text-sm transition-colors',
                      collapsed ? 'justify-center px-0' : 'px-2.5',
                      isActive
                        ? cn('bg-white/[0.07] font-medium text-white', ACTIVE_BAR)
                        : 'text-sidebar-text hover:bg-white/[0.045] hover:text-white',
                    )
                  }
                  aria-label={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          'size-[17px] shrink-0',
                          isActive ? 'text-jade-300' : 'text-sidebar-muted group-hover:text-sidebar-text',
                        )}
                        aria-hidden="true"
                      />
                      {collapsed ? null : (
                        <>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {count > 0 ? (
                            <span className="rounded-full bg-saffron-400/15 px-1.5 py-0.5 text-2xs font-semibold text-saffron-300 tabular">
                              {count > 99 ? '99+' : count}
                            </span>
                          ) : item.status !== 'ready' ? (
                            <span
                              className="size-1.5 shrink-0 rounded-full bg-saffron-400/60"
                              title="Màn hình đang chờ triển khai"
                              aria-hidden="true"
                            />
                          ) : null}
                        </>
                      )}
                      {collapsed && count > 0 ? (
                        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-saffron-400" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              )

              return (
                <li key={item.id}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.status !== 'ready' ? (
                          <span className="text-saffron-300">· chờ triển khai</span>
                        ) : null}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function DataSourceNote({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="mx-auto flex size-6 items-center justify-center">
            <span
              className={cn('size-2 rounded-full', isMockMode ? 'bg-saffron-400' : 'bg-jade-300')}
              aria-hidden="true"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isMockMode ? 'Dữ liệu demo cục bộ — chưa gọi backend' : 'Đang kết nối API thật'}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex items-center gap-2 px-2.5 text-2xs text-sidebar-muted">
      <span
        className={cn('size-1.5 rounded-full', isMockMode ? 'bg-saffron-400' : 'bg-jade-300')}
        aria-hidden="true"
      />
      <span className="truncate">{isMockMode ? 'Dữ liệu demo · chưa nối API' : 'Đã kết nối API'}</span>
    </div>
  )
}

export function SidebarContent({
  collapsed,
  onToggleCollapse,
  onNavigate,
  mobile = false,
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  mobile?: boolean
}) {
  const session = useSession()
  const { pathname } = useLocation()
  if (!session) return null

  const workspace = resolveWorkspace(pathname)

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-line',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <Logo tone="light" compact />
        ) : (
          <Logo tone="light" showTagline />
        )}
        {mobile ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-sm p-1.5 text-sidebar-muted hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-400"
            aria-label="Đóng menu"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'rounded-sm p-1.5 text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-400',
              collapsed && 'hidden',
            )}
            aria-label="Thu gọn thanh điều hướng"
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className={cn('px-3 pt-3', collapsed && 'px-2')}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {workspace ? (
        <SidebarNav
          collapsed={collapsed}
          workspace={workspace}
          session={session}
          onNavigate={onNavigate}
        />
      ) : null}

      <div className="shrink-0 border-t border-sidebar-line px-3 py-3">
        <DataSourceNote collapsed={collapsed} />
        {collapsed ? (
          onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="mx-auto mt-2 flex size-7 items-center justify-center rounded-sm text-sidebar-muted hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-400"
              aria-label="Mở rộng thanh điều hướng"
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </button>
          ) : null
        ) : (
          <p className="mt-2 px-2.5 text-2xs text-sidebar-muted/60">MEMS v2.0 · FE-00</p>
        )}
      </div>
    </div>
  )
}

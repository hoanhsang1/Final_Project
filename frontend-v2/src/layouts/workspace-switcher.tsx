import { ChevronsUpDown, Check } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth/hooks'
import { cn } from '@/lib/cn'
import { accessibleWorkspaces, resolveWorkspace } from '@/lib/nav'

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const session = useSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (!session) return null
  const workspaces = accessibleWorkspaces(session)
  const current = resolveWorkspace(pathname) ?? workspaces[0]
  if (!current) return null

  const CurrentIcon = current.icon
  const hasMultiple = workspaces.length > 1

  if (!hasMultiple) {
    return (
      <div className="flex items-center gap-2.5 px-1 py-1">
        <span className="flex size-7 items-center justify-center rounded-sm bg-white/6 text-jade-300">
          <CurrentIcon className="size-4" aria-hidden="true" />
        </span>
        {collapsed ? null : (
          <span className="truncate text-xs font-medium text-sidebar-muted">{current.label}</span>
        )}
      </div>
    )
  }

  const trigger = (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md border border-sidebar-line bg-sidebar-raised px-2.5 py-2 text-left transition-colors hover:border-white/15 hover:bg-white/[0.04]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-400',
        collapsed && 'justify-center px-0',
      )}
      aria-label={`Không gian làm việc: ${current.label}. Đổi không gian`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-jade-500/15 text-jade-300">
        <CurrentIcon className="size-3.5" aria-hidden="true" />
      </span>
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1">
            <span className="block text-2xs uppercase tracking-[0.12em] text-sidebar-muted">
              Không gian
            </span>
            <span className="block truncate text-xs font-semibold text-white">{current.label}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-muted" aria-hidden="true" />
        </>
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right">
          {current.label} — bấm để đổi không gian làm việc
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 border-sidebar-line bg-sidebar text-sidebar-text">
        <DropdownMenuLabel className="text-sidebar-muted">Không gian làm việc</DropdownMenuLabel>
        {workspaces.map((workspace) => {
          const Icon = workspace.icon
          const active = workspace.id === current.id
          return (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => navigate(workspace.to)}
              className={cn(
                'gap-2.5 text-sidebar-text focus:bg-white/6 focus:text-white',
                active && 'bg-white/5 text-white',
              )}
            >
              <Icon aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm">{workspace.label}</span>
              </span>
              {active ? <Check className="size-3.5 text-jade-300" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator className="bg-sidebar-line" />
        <p className="px-2.5 py-1.5 text-2xs leading-relaxed text-sidebar-muted">
          Menu bên dưới được lọc theo quyền hiệu lực của bạn.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

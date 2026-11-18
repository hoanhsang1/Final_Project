import { Bell, Menu } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useNavBadges } from '@/hooks/use-nav-badges'
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs'
import { CommandPalette } from '@/layouts/command-palette'
import { UserMenu } from '@/layouts/user-menu'
import { SHOW_DEMO_TOOLBAR } from '@/lib/env'
import { useUiStore } from '@/stores/ui-store'

const DemoPersonaSwitcher = lazy(() =>
  import('@/layouts/demo-persona-switcher').then((module) => ({
    default: module.DemoPersonaSwitcher,
  })),
)

export function Topbar() {
  const openMobileNav = useUiStore((state) => state.setMobileNavOpen)
  const breadcrumbs = useBreadcrumbs()
  const badges = useNavBadges()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => openMobileNav(true)}
        className="flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink-600 shadow-xs hover:border-ink-300 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600 lg:hidden"
        aria-label="Mở điều hướng"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>

      <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
        <Breadcrumb items={breadcrumbs} />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {SHOW_DEMO_TOOLBAR ? (
          <Suspense fallback={null}>
            <DemoPersonaSwitcher inline />
          </Suspense>
        ) : null}
        <CommandPalette />
        <Link
          to="/thong-bao"
          className="relative flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink-500 shadow-xs transition-colors hover:border-ink-300 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
          aria-label={
            badges.notifications > 0
              ? `Thông báo, ${badges.notifications} chưa đọc`
              : 'Thông báo'
          }
        >
          <Bell className="size-4" aria-hidden="true" />
          {badges.notifications > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-saffron-500 px-1 text-[10px] font-semibold leading-4 text-white">
              {badges.notifications > 9 ? '9+' : badges.notifications}
            </span>
          ) : null}
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}

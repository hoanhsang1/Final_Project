import { Outlet } from 'react-router-dom'

import { MobileNav } from '@/layouts/mobile-nav'
import { SidebarContent } from '@/layouts/sidebar'
import { Topbar } from '@/layouts/topbar'
import { useUiStore } from '@/stores/ui-store'

export function AppShell() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  return (
    <div
      className="min-h-dvh bg-canvas"
      style={
        {
          '--sidebar-width': collapsed ? '4.75rem' : '16.5rem',
        } as React.CSSProperties
      }
    >
      <a
        href="#noi-dung-chinh"
        className="sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Bỏ qua điều hướng, tới nội dung chính
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] border-r border-sidebar-line transition-[width] duration-200 lg:block">
        <SidebarContent collapsed={collapsed} onToggleCollapse={toggleSidebar} />
      </aside>

      <div className="flex min-h-dvh flex-col transition-[padding] duration-200 lg:pl-[var(--sidebar-width)]">
        <Topbar />
        <main id="noi-dung-chinh" className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-line px-4 py-4 text-2xs text-ink-400 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
            <span>© 2026 MEMS — Nền tảng quản lý giáo dục đa tổ chức</span>
            <span>Giao diện lọc theo quyền hiệu lực; máy chủ luôn kiểm tra lại quyền thật.</span>
          </div>
        </footer>
      </div>

      <MobileNav />
    </div>
  )
}

import { useLocation } from 'react-router-dom'

import type { BreadcrumbItem } from '@/components/ui/breadcrumb'
import { useSession } from '@/features/auth/hooks'
import { resolveWorkspace, visibleGroups } from '@/lib/nav'
import type { Session } from '@/types/session'

const DETAIL_CRUMBS: [RegExp, string][] = [
  [/^\/to-chuc\/phong-ban\/[^/]+$/, 'Chi tiết phòng ban'],
  [/^\/to-chuc\/nhan-su\/[^/]+$/, 'Hồ sơ nhân sự'],
  [/^\/quan-tri\/to-chuc\/(?!cho-duyet$)[^/]+$/, 'Chi tiết tổ chức'],
]

function buildBreadcrumbs(pathname: string, session: Session | null): BreadcrumbItem[] {
  const workspace = resolveWorkspace(pathname)
  if (!workspace || !session) return []

  const items: BreadcrumbItem[] = [{ label: workspace.shortLabel, to: workspace.to }]
  const groups = visibleGroups(session, workspace)
  const allItems = groups.flatMap((group) => group.items.map((item) => ({ ...item, group })))

  const match = allItems
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]

  if (match) {
    items.push({ label: match.group.label })
    items.push({ label: match.label, to: match.to })
  }

  const detail = DETAIL_CRUMBS.find(([pattern]) => pattern.test(pathname))
  if (detail) items.push({ label: detail[1] })

  return items
}

/** Sinh breadcrumb từ cấu hình điều hướng thay vì khai báo lại ở từng trang. */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const { pathname } = useLocation()
  const session = useSession()
  return buildBreadcrumbs(pathname, session)
}

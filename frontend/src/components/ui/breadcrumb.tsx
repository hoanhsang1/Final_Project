import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <nav aria-label="Đường dẫn" className={cn('flex items-center gap-1 text-xs', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight className="size-3 text-ink-300" aria-hidden="true" />
            ) : null}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="rounded-xs px-0.5 text-ink-500 transition-colors hover:text-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn('px-0.5', isLast ? 'font-medium text-ink-700' : 'text-ink-500')}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

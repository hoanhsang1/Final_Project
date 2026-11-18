import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode
  className?: string
  /** Dùng khi tiêu đề nằm trong khung hẹp (drawer, panel). */
  compact?: boolean
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.14em] text-jade-700">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              'text-balance font-semibold tracking-[-0.02em] text-ink-900',
              compact ? 'text-xl' : 'text-2xl',
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-ink-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div> : null}
    </header>
  )
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

/** Nhãn + giá trị dùng trong phần meta của trang. */
export function MetaItem({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span className="text-ink-400">{label}</span>
      <span className="font-medium text-ink-700">{children}</span>
    </span>
  )
}

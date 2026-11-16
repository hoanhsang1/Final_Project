import { cn } from '@/lib/cn'

/** Khung nội dung chuẩn của mọi trang trong console. */
export function PageContainer({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode
  className?: string
  /** Bỏ giới hạn bề rộng cho bảng nhiều cột / lịch. */
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8',
        wide ? 'max-w-[1600px]' : 'max-w-[1400px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageSection({
  children,
  className,
  title,
  description,
  action,
}: {
  children: React.ReactNode
  className?: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {title ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink-900">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-ink-500">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

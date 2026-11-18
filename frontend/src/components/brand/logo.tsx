import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.12" />
      <path
        d="M8 22V11.5c0-.6.7-.9 1.1-.5l3.9 3.6c.3.3.8.3 1.1 0l3.9-3.6c.4-.4 1.1-.1 1.1.5V22"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22.5 11v11" stroke="#f1c04f" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({
  className,
  tone = 'dark',
  showTagline = false,
  compact = false,
}: {
  className?: string
  tone?: 'dark' | 'light'
  showTagline?: boolean
  compact?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg',
          tone === 'light' ? 'bg-white/8 text-jade-300' : 'bg-jade-700 text-white',
        )}
      >
        <LogoMark className="size-7 text-current" />
      </span>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'text-[1.05rem] font-semibold tracking-[-0.03em]',
              tone === 'light' ? 'text-white' : 'text-ink-900',
            )}
          >
            MEMS
          </span>
          {showTagline ? (
            <span
              className={cn(
                'mt-1 text-2xs font-medium tracking-wide',
                tone === 'light' ? 'text-sidebar-muted' : 'text-ink-400',
              )}
            >
              Quản lý giáo dục
            </span>
          ) : null}
        </span>
      )}
    </span>
  )
}

import { AlertTriangle, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const toneStyles: Record<AlertTone, string> = {
  info: 'border-info-100 bg-info-50 text-info-600',
  success: 'border-success-100 bg-success-50 text-success-600',
  warning: 'border-warning-100 bg-warning-50 text-warning-600',
  danger: 'border-danger-100 bg-danger-50 text-danger-500',
  neutral: 'border-line bg-ink-50 text-ink-600',
}

const iconStyles: Record<AlertTone, string> = {
  info: 'text-info-500',
  success: 'text-success-500',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
  neutral: 'text-ink-500',
}

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone
  title?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

/** Thông báo ngữ cảnh trong trang (không phải toast). */
export function Alert({
  tone = 'info',
  title,
  icon,
  action,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border px-4 py-3 text-sm', toneStyles[tone], className)}
      {...props}
    >
      <span className={cn('mt-0.5 shrink-0', iconStyles[tone])} aria-hidden="true">
        {icon ?? (tone === 'warning' || tone === 'danger' ? <AlertTriangle className="size-4" /> : <Info className="size-4" />)}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold text-current">{title}</p> : null}
        {children ? <div className={cn('text-current/90', title && 'mt-0.5')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'outline' }
  secondaryAction?: { label: string; onClick: () => void }
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-surface-muted px-6 text-center',
        compact ? 'py-8' : 'py-14',
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-400 shadow-xs">
        {icon ?? <Info className="size-5" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {secondaryAction ? (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
          {action ? (
            <Button variant={action.variant ?? 'primary'} size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

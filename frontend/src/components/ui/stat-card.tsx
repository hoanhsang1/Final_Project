import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'

export interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ReactNode
  trend?: {
    value: string
    direction: 'up' | 'down' | 'flat'
    /** `up` tốt hay xấu — quyết định màu. */
    positive?: boolean
  }
  spark?: number[]
  className?: string
  accent?: 'jade' | 'saffron' | 'ink'
  footer?: React.ReactNode
}

function buildSparkline(values: number[], width = 96, height = 30): string {
  if (values.length < 2) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 4) - 2
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  spark,
  className,
  accent = 'jade',
  footer,
}: StatCardProps) {
  const accentClass = {
    jade: 'bg-jade-50 text-jade-700',
    saffron: 'bg-saffron-50 text-saffron-600',
    ink: 'bg-ink-100 text-ink-600',
  }[accent]

  const trendGood =
    trend?.direction === 'flat' ? 'text-ink-400' : trend?.positive ? 'text-success-600' : 'text-danger-500'

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-ink-900 tabular">
            {value}
          </p>
        </div>
        {icon ? (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', accentClass)}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-2">
        <div className="min-w-0">
          {trend ? (
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium', trendGood)}>
              {trend.direction === 'up' ? (
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              ) : trend.direction === 'down' ? (
                <ArrowDownRight className="size-3.5" aria-hidden="true" />
              ) : (
                <Minus className="size-3.5" aria-hidden="true" />
              )}
              {trend.value}
            </span>
          ) : null}
          {hint ? <p className="mt-0.5 truncate text-xs text-ink-400">{hint}</p> : null}
        </div>
        {spark && spark.length > 1 ? (
          <svg
            viewBox="0 0 96 30"
            className="h-8 w-24 shrink-0 overflow-visible"
            aria-hidden="true"
            role="presentation"
          >
            <path
              d={buildSparkline(spark)}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-jade-500"
            />
          </svg>
        ) : null}
      </div>
      {footer ? <div className="border-t border-line px-5 py-2.5">{footer}</div> : null}
    </Card>
  )
}

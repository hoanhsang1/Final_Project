import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-ink-50 text-ink-600',
        brand: 'border-jade-100 bg-jade-50 text-jade-800',
        success: 'border-success-100 bg-success-50 text-success-600',
        warning: 'border-warning-100 bg-warning-50 text-warning-600',
        danger: 'border-danger-100 bg-danger-50 text-danger-500',
        info: 'border-info-100 bg-info-50 text-info-500',
        outline: 'border-line-strong bg-transparent text-ink-600',
        dark: 'border-transparent bg-ink-900 text-white',
      },
      size: {
        sm: 'px-2 py-0.5 text-2xs',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, tone, size, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

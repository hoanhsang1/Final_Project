import * as TabsPrimitive from '@radix-ui/react-tabs'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export const TabsList = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: 'pill' | 'underline' }
>(function TabsList({ className, variant = 'pill', ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === 'pill'
          ? 'inline-flex items-center gap-0.5 rounded-md border border-line bg-ink-50/80 p-1'
          : 'flex items-center gap-5 border-b border-line',
        className,
      )}
      {...props}
    />
  )
})

export const TabsTrigger = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { variant?: 'pill' | 'underline' }
>(function TabsTrigger({ className, variant = 'pill', ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'pill'
          ? [
              'rounded-sm px-3 py-1.5 text-ink-500 hover:text-ink-800',
              'data-[state=active]:bg-surface data-[state=active]:text-ink-900 data-[state=active]:shadow-xs',
            ]
          : [
              '-mb-px border-b-2 border-transparent px-0.5 pb-2.5 text-ink-500 hover:text-ink-800',
              'data-[state=active]:border-jade-700 data-[state=active]:text-ink-900',
            ],
        '[&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
})

export const TabsContent = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('focus-visible:outline-none', className)}
      {...props}
    />
  )
})

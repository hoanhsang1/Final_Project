import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-64 rounded-sm bg-ink-900 px-2.5 py-1.5 text-xs font-medium leading-relaxed text-white shadow-md',
          'animate-fade-in',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})

export function InfoTip({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded-full border border-line-strong text-[10px] font-semibold text-ink-400 hover:border-ink-300 hover:text-ink-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
          aria-label={label}
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent>{children ?? label}</TooltipContent>
    </Tooltip>
  )
}

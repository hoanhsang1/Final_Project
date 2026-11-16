import * as PopoverPrimitive from '@radix-ui/react-popover'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export const PopoverContent = forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = 'start', sideOffset = 6, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-auto rounded-md border border-line bg-surface p-3 shadow-lg outline-none',
          'data-[state=open]:animate-scale-in',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})

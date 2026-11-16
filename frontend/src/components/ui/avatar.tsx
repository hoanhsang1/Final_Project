import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

export const Avatar = forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: 'xs' | 'sm' | 'md' | 'lg' }
>(function Avatar({ className, size = 'md', ...props }, ref) {
  const sizeClass = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-xs',
    md: 'size-9 text-sm',
    lg: 'size-12 text-base',
  }[size]
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full border border-line bg-jade-50',
        sizeClass,
        className,
      )}
      {...props}
    />
  )
})

export const AvatarImage = forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...props }, ref) {
  return <AvatarPrimitive.Image ref={ref} className={cn('aspect-square size-full object-cover', className)} {...props} />
})

export const AvatarFallback = forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(function AvatarFallback({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        'flex size-full items-center justify-center font-semibold uppercase tracking-wide text-jade-800',
        className,
      )}
      {...props}
    />
  )
})

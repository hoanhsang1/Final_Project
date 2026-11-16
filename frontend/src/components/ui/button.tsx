import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'font-medium tracking-[-0.006em] transition-[background-color,border-color,color,box-shadow] duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600',
    'disabled:pointer-events-none disabled:opacity-45',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-jade-700 text-white shadow-xs hover:bg-jade-800 active:bg-jade-900 data-[state=open]:bg-jade-800',
        secondary:
          'bg-ink-900 text-white shadow-xs hover:bg-ink-800 active:bg-ink-950 data-[state=open]:bg-ink-800',
        outline:
          'border border-line-strong bg-surface text-ink-700 shadow-xs hover:border-ink-300 hover:bg-ink-50 data-[state=open]:bg-ink-50',
        ghost: 'text-ink-600 hover:bg-ink-100/80 hover:text-ink-900 data-[state=open]:bg-ink-100',
        subtle: 'bg-jade-50 text-jade-800 hover:bg-jade-100 data-[state=open]:bg-jade-100',
        danger: 'bg-danger-500 text-white shadow-xs hover:bg-danger-600 active:bg-danger-600',
        'danger-ghost': 'text-danger-500 hover:bg-danger-50 hover:text-danger-600',
        link: 'h-auto p-0 text-jade-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-xs',
        md: 'h-9.5 px-3.5 text-sm',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render phần tử con thay cho <button> (ví dụ: <Link>). */
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild = false, isLoading = false, loadingText, children, disabled, type, ...props },
  ref,
) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </Component>
  )
})

export { buttonVariants }

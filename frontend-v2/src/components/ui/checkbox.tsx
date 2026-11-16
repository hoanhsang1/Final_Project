import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

export const Checkbox = forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-line-strong bg-surface transition-colors',
        'hover:border-ink-300',
        'data-[state=checked]:border-jade-700 data-[state=checked]:bg-jade-700 data-[state=checked]:text-white',
        'data-[state=indeterminate]:border-jade-700 data-[state=indeterminate]:bg-jade-700 data-[state=indeterminate]:text-white',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3" strokeWidth={3} aria-hidden="true" />
        ) : (
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})

export function CheckboxRow({
  id,
  label,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof Checkbox> & {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} className="mt-0.5" {...props} />
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-ink-700">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-ink-500">{description}</p> : null}
      </div>
    </div>
  )
}

import { forwardRef, useId } from 'react'

import { cn } from '@/lib/cn'

const fieldBase = [
  'w-full rounded-md border border-line-strong bg-surface text-sm text-ink-900 shadow-xs transition-colors',
  'placeholder:text-ink-400 hover:border-ink-300',
  'focus:border-jade-600 focus:outline-none focus:ring-3 focus:ring-jade-600/12',
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
  'aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:ring-danger-500/12',
].join(' ')

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(fieldBase, 'h-9.5 px-3', className)}
        {...props}
      />
    )
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldBase, 'resize-y px-3 py-2 leading-relaxed', className)}
      {...props}
    />
  )
})

export interface FieldProps {
  label?: React.ReactNode
  htmlFor?: string
  required?: boolean
  hint?: React.ReactNode
  error?: React.ReactNode
  className?: string
  children: React.ReactNode
  /** Hiển thị nhãn nhỏ phía trên, dùng cho bộ lọc gọn. */
  labelSize?: 'sm' | 'md'
}

/** Bao nhãn + control + gợi ý + lỗi, bảo đảm liên kết aria. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
  labelSize = 'md',
}: FieldProps) {
  const generatedId = useId()
  const targetId = htmlFor ?? generatedId
  const describedBy = error ? `${targetId}-error` : hint ? `${targetId}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label
          htmlFor={targetId}
          className={cn(
            'font-medium text-ink-700',
            labelSize === 'sm' ? 'text-xs' : 'text-sm',
          )}
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-danger-500" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div data-field-control data-invalid={error ? 'true' : undefined}>
        {children}
      </div>
      {error ? (
        <p id={`${targetId}-error`} className="text-xs font-medium text-danger-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${targetId}-hint`} className="text-xs text-ink-400">
          {hint}
        </p>
      ) : null}
      {describedBy && !error ? <span className="sr-only" aria-hidden="true" /> : null}
    </div>
  )
}


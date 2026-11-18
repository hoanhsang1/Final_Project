import { CalendarDays, X } from 'lucide-react'
import { useId } from 'react'

import { cn } from '@/lib/cn'

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value?: string | null
  onChange: (value: string | null) => void
  clearable?: boolean
  containerClassName?: string
}

/**
 * Ô chọn ngày dựa trên input gốc của trình duyệt:
 * hỗ trợ bàn phím, trình đọc màn hình và định dạng theo ngôn ngữ người dùng.
 * Giá trị trao đổi luôn là `yyyy-MM-dd`.
 */
export function DatePicker({
  value,
  onChange,
  clearable = true,
  containerClassName,
  className,
  disabled,
  ...props
}: DatePickerProps) {
  const id = useId()

  return (
    <div className={cn('relative', containerClassName)}>
      <CalendarDays
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden="true"
      />
      <input
        id={props.id ?? id}
        type="date"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
        className={cn(
          'h-9.5 w-full appearance-none rounded-md border border-line-strong bg-surface pl-9 text-sm text-ink-900 shadow-xs',
          'placeholder:text-ink-400 hover:border-ink-300',
          'focus:border-jade-600 focus:outline-none focus:ring-3 focus:ring-jade-600/12',
          'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
          '[color-scheme:light]',
          '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0',
          '[&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10',
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
          clearable && value ? 'pr-9' : 'pr-3',
          className,
        )}
        {...props}
      />
      {clearable && value && !disabled ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xs p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade-600"
          aria-label="Xoá ngày đã chọn"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

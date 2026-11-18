import { Search, X } from 'lucide-react'

import { cn } from '@/lib/cn'

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  containerClassName?: string
}

/** Ô tìm kiếm có icon và nút xoá; debounce do nơi gọi xử lý. */
export function SearchInput({
  value,
  onValueChange,
  placeholder = 'Tìm kiếm…',
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full sm:max-w-xs', containerClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-md border border-line-strong bg-surface pl-9 pr-8 text-sm text-ink-900 shadow-xs',
          'placeholder:text-ink-400 hover:border-ink-300',
          'focus:border-jade-600 focus:outline-none focus:ring-3 focus:ring-jade-600/12',
          '[&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xs p-0.5 text-ink-400 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
          aria-label="Xoá nội dung tìm kiếm"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

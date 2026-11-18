import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { buildPageList, PAGE_SIZE_OPTIONS, rangeLabel } from '@/lib/pagination'

export interface PaginationProps {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  onSizeChange?: (size: number) => void
  className?: string
  /** Ẩn phần chọn số dòng khi bảng cố định kích thước. */
  hideSizeSelect?: boolean
}

export function Pagination({
  page,
  size,
  total,
  onPageChange,
  onSizeChange,
  className,
  hideSizeSelect = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  const pages = buildPageList(page, totalPages)
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-3 text-xs text-ink-500">
        <span className="tabular">{rangeLabel(page, size, total)}</span>
        {hideSizeSelect || !onSizeChange ? null : (
          <span className="flex items-center gap-1.5">
            <span className="hidden text-ink-400 sm:inline">Số dòng</span>
            <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
              <SelectTrigger className="h-7 w-[4.5rem] text-xs" aria-label="Số dòng mỗi trang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        )}
      </div>

      <nav className="flex items-center gap-1" aria-label="Phân trang">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label="Trang trước"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        {pages.map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-xs text-ink-400" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'outline' : 'ghost'}
              size="icon-sm"
              className={cn('min-w-8 text-xs tabular', item === page && 'border-jade-200 bg-jade-50 font-semibold text-jade-800')}
              onClick={() => onPageChange(item)}
              aria-label={`Trang ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label="Trang sau"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </div>
  )
}

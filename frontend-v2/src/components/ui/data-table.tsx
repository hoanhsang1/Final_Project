import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/ui/feedback'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/ui/skeleton'
import { TBody, TD, TH, THead, TR, Table, TableWrap } from '@/components/ui/table'
import { cn } from '@/lib/cn'

export interface DataColumn<T> {
  id: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /** Có hàm này thì cột sắp xếp được. */
  sortValue?: (row: T) => string | number | Date | null | undefined
  className?: string
  headerClassName?: string
  width?: string
  align?: 'left' | 'right' | 'center'
  /** Ẩn trên màn hình nhỏ để bảng không bị vỡ. */
  hideBelow?: 'sm' | 'md' | 'lg'
}

export interface ServerPagination {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  onSizeChange?: (size: number) => void
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  isLoading?: boolean
  error?: React.ReactNode
  empty?: React.ReactNode
  serverPagination?: ServerPagination
  initialPageSize?: number
  initialSort?: { id: string; dir: 'asc' | 'desc' }
  onRowClick?: (row: T) => void
  className?: string
  dense?: boolean
  stickyHeader?: boolean
  /** Tổng kết ghim cuối bảng. */
  footer?: React.ReactNode
}

type SortState = { id: string; dir: 'asc' | 'desc' } | null

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' })
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  error,
  empty,
  serverPagination,
  initialPageSize = 10,
  initialSort,
  onRowClick,
  className,
  dense = false,
  stickyHeader = false,
  footer,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(initialSort ?? null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initialPageSize)

  const sorted = useMemo(() => {
    if (!sort) return data
    const column = columns.find((item) => item.id === sort.id)
    if (!column?.sortValue) return data
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...data].sort((a, b) => factor * compareValues(column.sortValue!(a), column.sortValue!(b)))
  }, [columns, data, sort])

  const total = serverPagination?.total ?? sorted.length
  const activePage = serverPagination?.page ?? page
  const activeSize = serverPagination?.size ?? size
  const totalPages = Math.max(1, Math.ceil(total / activeSize))
  const safePage = Math.min(activePage, totalPages)
  const rows = serverPagination
    ? sorted
    : sorted.slice((safePage - 1) * activeSize, safePage * activeSize)

  const handlePageChange = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages)
    if (serverPagination) serverPagination.onPageChange(clamped)
    else setPage(clamped)
  }

  const handleSizeChange = (next: number) => {
    if (serverPagination?.onSizeChange) serverPagination.onSizeChange(next)
    else {
      setSize(next)
      setPage(1)
    }
  }

  if (isLoading) {
    return (
      <div className={cn('overflow-hidden rounded-md border border-line bg-surface', className)}>
        <TableSkeleton rows={6} columns={columns.length} />
      </div>
    )
  }

  if (error) {
    return <div className={cn('rounded-md border border-line bg-surface', className)}>{error}</div>
  }

  if (data.length === 0) {
    return (
      <div className={cn('p-4', className)}>
        {empty ?? (
          <EmptyState
            icon={<Inbox className="size-5" aria-hidden="true" />}
            title="Chưa có dữ liệu"
            description="Khi có bản ghi phù hợp với bộ lọc, danh sách sẽ hiển thị tại đây."
          />
        )}
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-md border border-line bg-surface', className)}>
      <TableWrap>
        <Table>
          <THead className={stickyHeader ? 'sticky top-0 z-10' : undefined}>
            <TR className="hover:bg-transparent">
              {columns.map((column) => {
                const isSorted = sort?.id === column.id ? sort.dir : null
                const sortable = Boolean(column.sortValue)
                return (
                  <TH
                    key={column.id}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      column.headerClassName,
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.hideBelow === 'sm' && 'hidden sm:table-cell',
                      column.hideBelow === 'md' && 'hidden md:table-cell',
                      column.hideBelow === 'lg' && 'hidden lg:table-cell',
                    )}
                    aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : sortable ? 'none' : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((current) =>
                            current?.id === column.id
                              ? current.dir === 'asc'
                                ? { id: column.id, dir: 'desc' }
                                : null
                              : { id: column.id, dir: 'asc' },
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-1 rounded-xs uppercase tracking-[0.08em] transition-colors hover:text-ink-700',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600',
                          column.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {column.header}
                        {isSorted === 'asc' ? (
                          <ArrowUp className="size-3 text-jade-600" aria-hidden="true" />
                        ) : isSorted === 'desc' ? (
                          <ArrowDown className="size-3 text-jade-600" aria-hidden="true" />
                        ) : (
                          <ArrowUpDown className="size-3 text-ink-300" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TH>
                )
              })}
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR
                key={rowKey(row)}
                className={cn(onRowClick && 'cursor-pointer hover:bg-ink-50/70')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <TD
                    key={column.id}
                    className={cn(
                      dense && 'py-2',
                      column.align === 'right' && 'text-right tabular',
                      column.align === 'center' && 'text-center',
                      column.hideBelow === 'sm' && 'hidden sm:table-cell',
                      column.hideBelow === 'md' && 'hidden md:table-cell',
                      column.hideBelow === 'lg' && 'hidden lg:table-cell',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      {footer}

      {total > activeSize ? (
        <Pagination
          page={safePage}
          size={activeSize}
          total={total}
          onPageChange={handlePageChange}
          onSizeChange={handleSizeChange}
        />
      ) : null}
    </div>
  )
}

/** Thanh công cụ phía trên bảng: tìm kiếm, bộ lọc và hành động chính. */
export function TableToolbar({
  className,
  children,
  actions,
}: {
  className?: string
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

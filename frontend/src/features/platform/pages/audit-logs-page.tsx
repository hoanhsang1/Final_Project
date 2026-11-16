import { ScrollText, Search } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, TableToolbar, type DataColumn } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useAuditLogs } from '@/features/platform/hooks'
import { AUDIT_ACTION_LABELS, type AuditLogItem } from '@/features/platform/types'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

const PAGE_SIZE = 20

const ACTION_TONE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  ORG_APPROVED: 'success',
  ORG_REJECTED: 'danger',
  ORG_SUSPENDED: 'warning',
  ORG_REACTIVATED: 'success',
  ORG_MODULES_UPDATED: 'info',
  ACCOUNT_STATUS_CHANGED: 'warning',
  ACCOUNT_CREATED: 'info',
  ACCOUNT_ROLE_CHANGED: 'info',
  ACCOUNT_PASSWORD_RESET: 'neutral',
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [action, setAction] = useState('')

  const query = useAuditLogs({
    page,
    size: PAGE_SIZE,
    keyword: appliedKeyword || undefined,
  })

  const rows = (query.data?.items ?? []).filter((row) =>
    action ? row.action === action : true,
  )

  const columns: DataColumn<AuditLogItem>[] = [
    {
      id: 'createdAt',
      header: 'Thời điểm',
      width: '170px',
      sortValue: (row) => row.createdAt,
      cell: (row) => <span className="tabular text-xs text-ink-600">{formatDateTime(row.createdAt)}</span>,
    },
    {
      id: 'action',
      header: 'Hành động',
      cell: (row) => (
        <Badge tone={ACTION_TONE[row.action] ?? 'neutral'}>
          {AUDIT_ACTION_LABELS[row.action] ?? row.action}
        </Badge>
      ),
    },
    {
      id: 'actor',
      header: 'Người thực hiện',
      cell: (row) => <span className="text-sm text-ink-700">{row.actorUsername || '—'}</span>,
    },
    {
      id: 'target',
      header: 'Đối tượng',
      hideBelow: 'sm',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-800">{row.targetName || '—'}</p>
          <p className="truncate font-mono text-2xs text-ink-400">{row.targetId}</p>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Chi tiết',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="line-clamp-2 text-xs text-ink-500">{row.description || '—'}</span>
      ),
    },
  ]

  const actions = Array.from(
    new Set((query.data?.items ?? []).map((row) => row.action)),
  ).sort()

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Nền tảng · Nhật ký"
        title="Nhật ký hệ thống"
        description="Lịch sử thao tác của quản trị nền tảng trên tổ chức, tài khoản và module."
        meta={
          <Badge tone="info" dot>
            Chỉ đọc · dữ liệu từ /api/v1/audit-logs
          </Badge>
        }
      />

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
        <TableToolbar
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={!action && !appliedKeyword}
              onClick={() => {
                setAction('')
                setAppliedKeyword('')
                setKeyword('')
                setPage(1)
              }}
            >
              Xoá bộ lọc
            </Button>
          }
        >
          <SearchInput
            value={keyword}
            onValueChange={setKeyword}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setAppliedKeyword(keyword.trim())
                setPage(1)
              }
            }}
            placeholder="Tìm theo mã, tên đối tượng…"
            aria-label="Tìm nhật ký"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAppliedKeyword(keyword.trim())
              setPage(1)
            }}
          >
            <Search aria-hidden="true" />
            Tìm
          </Button>
          <label className="flex items-center gap-2 text-xs text-ink-500">
            Hành động
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink-900"
            >
              <option value="">Tất cả</option>
              {actions.map((code) => (
                <option key={code} value={code}>
                  {AUDIT_ACTION_LABELS[code] ?? code}
                </option>
              ))}
            </select>
          </label>
        </TableToolbar>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          isLoading={query.isLoading}
          error={
            query.isError ? (
              <ErrorState
                title="Không tải được nhật ký"
                description={ApiError.from(query.error).message}
                onRetry={() => void query.refetch()}
              />
            ) : undefined
          }
          empty={
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-ink-500">
              <ScrollText className="size-5 text-ink-300" aria-hidden="true" />
              Chưa có bản ghi phù hợp.
            </div>
          }
          serverPagination={{
            page,
            size: PAGE_SIZE,
            total: query.data?.total ?? 0,
            onPageChange: setPage,
          }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-400">
        Bộ lọc hành động áp dụng trên trang hiện tại; dùng tìm kiếm để tra cứu toàn bộ nhật ký.
      </p>
    </PageContainer>
  )
}

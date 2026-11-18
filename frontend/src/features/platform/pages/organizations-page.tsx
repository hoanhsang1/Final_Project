import { Building2, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, TableToolbar, type DataColumn } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/feedback'
import { Field, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useDebounce } from '@/hooks/use-debounce'
import {
  useApproveOrganization,
  useOrganizations,
  useRejectOrganization,
} from '@/features/platform/hooks'
import {
  ORG_STATUS_LABELS,
  ORG_TYPE_LABELS,
  type OrganizationRow,
  type OrgStatus,
  type OrgType,
} from '@/features/platform/types'
import { ApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'

const STATUS_TONE: Record<OrgStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'neutral',
  rejected: 'danger',
}

export function OrganizationsPage({ onlyPending = false }: { onlyPending?: boolean }) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<OrgStatus | 'all'>(onlyPending ? 'pending' : 'all')
  const [orgType, setOrgType] = useState<OrgType | 'all'>('all')
  const debouncedKeyword = useDebounce(keyword)

  const query = useOrganizations({
    page,
    size,
    status: status === 'all' ? undefined : [status],
    orgType: orgType === 'all' ? undefined : orgType,
    keyword: debouncedKeyword.trim() || undefined,
    sort: 'created_at,desc',
  })

  const approve = useApproveOrganization()
  const reject = useRejectOrganization()
  const [approveTarget, setApproveTarget] = useState<OrganizationRow | null>(null)
  const [rejectTarget, setRejectTarget] = useState<OrganizationRow | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()

  const resetFilters = () => {
    setKeyword('')
    setStatus(onlyPending ? 'pending' : 'all')
    setOrgType('all')
    setPage(1)
  }

  const columns: DataColumn<OrganizationRow>[] = [
    {
      id: 'name',
      header: 'Tổ chức',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <Link
            to={`/quan-tri/to-chuc/${row.id}`}
            onClick={(event) => event.stopPropagation()}
            className="truncate font-medium text-ink-800 hover:text-jade-800 hover:underline"
          >
            {row.name}
          </Link>
          <p className="text-2xs text-ink-400">{ORG_TYPE_LABELS[row.orgType]}</p>
        </div>
      ),
    },
    {
      id: 'owner',
      header: 'Chủ sở hữu',
      hideBelow: 'md',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-700">{row.ownerUsername}</p>
          <p className="truncate text-2xs text-ink-400">{row.ownerEmail}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      sortValue: (row) => row.status,
      cell: (row) => (
        <Badge tone={STATUS_TONE[row.status]} dot>
          {ORG_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      header: 'Ngày tạo',
      hideBelow: 'sm',
      sortValue: (row) => row.createdAt ?? '',
      cell: (row) => <span className="text-xs text-ink-500 tabular">{formatDate(row.createdAt)}</span>,
    },
    ...(onlyPending
      ? [
          {
            id: 'actions',
            header: 'Xử lý',
            align: 'right' as const,
            cell: (row: OrganizationRow) => (
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRejectTarget(row)
                    setReason('')
                    setReasonError(undefined)
                  }}
                >
                  <XCircle aria-hidden="true" />
                  Từ chối
                </Button>
                <Button size="sm" onClick={() => setApproveTarget(row)}>
                  <CheckCircle2 aria-hidden="true" />
                  Duyệt
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  const pendingDecisions = (query.data?.items ?? []).filter((row) => row.status === 'pending')

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Nền tảng · Tổ chức"
        title={onlyPending ? 'Tổ chức chờ duyệt' : 'Tất cả tổ chức'}
        description={
          onlyPending
            ? 'Hồ sơ đăng ký mới cần được xem xét. Duyệt để kích hoạt tổ chức và tài khoản chủ sở hữu.'
            : 'Danh sách toàn bộ tổ chức trên nền tảng, lọc theo trạng thái và loại hình.'
        }
        actions={
          <>
            {!onlyPending ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/quan-tri/to-chuc/cho-duyet">
                  <Building2 aria-hidden="true" />
                  Chờ duyệt
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RefreshCw aria-hidden="true" />
              Làm mới
            </Button>
          </>
        }
      />

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
        <TableToolbar>
          <SearchInput
            value={keyword}
            onValueChange={(value) => {
              setKeyword(value)
              setPage(1)
            }}
            placeholder="Tìm theo tên, chủ sở hữu, email…"
            aria-label="Tìm tổ chức"
          />
          <Select
            value={orgType}
            onValueChange={(value) => {
              setOrgType(value as OrgType | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Loại hình tổ chức">
              <SelectValue placeholder="Loại hình" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi loại hình</SelectItem>
              <SelectItem value="SCHOOL">Trường học</SelectItem>
              <SelectItem value="CENTER">Trung tâm</SelectItem>
            </SelectContent>
          </Select>
          {onlyPending ? null : (
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as OrgStatus | 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Trạng thái tổ chức">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi trạng thái</SelectItem>
                {(Object.keys(ORG_STATUS_LABELS) as OrgStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {ORG_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Xoá lọc
          </Button>
        </TableToolbar>

        <div className="border-b border-line bg-surface-muted px-4 py-2 text-xs text-ink-500">
          {query.data ? `${query.data.total} tổ chức` : 'Đang tải…'}
          {debouncedKeyword ? ` khớp “${debouncedKeyword}”` : ''}
        </div>

        {query.isError ? (
          <div className="p-4">
            <ErrorState
              title="Không tải được danh sách tổ chức"
              description={ApiError.from(query.error).message}
              onRetry={() => void query.refetch()}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={query.data?.items ?? []}
            rowKey={(row) => row.id}
            isLoading={query.isLoading}
            serverPagination={{
              page: query.data?.page ?? page,
              size: query.data?.size ?? size,
              total: query.data?.total ?? 0,
              onPageChange: setPage,
              onSizeChange: (value) => {
                setSize(value)
                setPage(1)
              },
            }}
            empty={
              <EmptyState
                icon={<Building2 className="size-5" aria-hidden="true" />}
                title={onlyPending ? 'Không có tổ chức chờ duyệt' : 'Không tìm thấy tổ chức'}
                description={
                  onlyPending
                    ? 'Mọi hồ sơ đăng ký đã được xử lý.'
                    : 'Thử đổi từ khoá hoặc bộ lọc trạng thái.'
                }
                action={{ label: 'Xoá bộ lọc', onClick: resetFilters, variant: 'outline' }}
              />
            }
          />
        )}
      </div>

      {!onlyPending && pendingDecisions.length > 0 ? (
        <p className="mt-3 text-xs text-ink-400">
          Có {pendingDecisions.length} tổ chức đang chờ duyệt trong trang này. Chuyển sang{' '}
          <Link to="/quan-tri/to-chuc/cho-duyet" className="font-medium text-jade-700 hover:underline">
            hàng chờ duyệt
          </Link>{' '}
          để xử lý.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null)
        }}
        title="Duyệt tổ chức?"
        description={
          approveTarget
            ? `${approveTarget.name} sẽ được kích hoạt và chủ sở hữu có thể đăng nhập.`
            : undefined
        }
        confirmLabel="Duyệt"
        tone="primary"
        isLoading={approve.isPending}
        onConfirm={() => {
          if (!approveTarget) return
          approve.mutate(approveTarget.id, {
            onSuccess: () => {
              toast.success(`Đã duyệt ${approveTarget.name}`)
              setApproveTarget(null)
            },
            onError: (error) => toast.error(ApiError.from(error).message),
          })
        }}
      />

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setReason('')
          }
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Từ chối tổ chức</DialogTitle>
            <DialogDescription>
              {rejectTarget?.name} sẽ không thể đăng nhập. Lý do được yêu cầu bắt buộc.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Lý do từ chối" htmlFor="reject-reason-list" required error={reasonError}>
              <Textarea
                id="reject-reason-list"
                rows={4}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setReasonError(undefined)
                }}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={reject.isPending}
              onClick={() => {
                if (!rejectTarget) return
                if (!reason.trim()) {
                  setReasonError('Vui lòng nhập lý do từ chối.')
                  return
                }
                reject.mutate(
                  { id: rejectTarget.id, reason: reason.trim() },
                  {
                    onSuccess: () => {
                      toast.success(`Đã từ chối ${rejectTarget.name}`)
                      setRejectTarget(null)
                      setReason('')
                    },
                    onError: (error) => toast.error(ApiError.from(error).message),
                  },
                )
              }}
            >
              Từ chối hồ sơ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

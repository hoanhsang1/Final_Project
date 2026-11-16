import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleSlash,
  Clock3,
  Inbox,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { Field, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import {
  useApproveOrganization,
  useAuditLogs,
  useOrganizations,
  usePendingOrganizations,
  useRejectOrganization,
} from '@/features/platform/hooks'
import {
  AUDIT_ACTION_LABELS,
  ORG_STATUS_LABELS,
  ORG_TYPE_LABELS,
  type OrgStatus,
  type PendingOrganization,
} from '@/features/platform/types'
import { formatDate, formatRelative } from '@/lib/format'
import { ApiError } from '@/lib/api-error'

const STATUS_TONE: Record<OrgStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'neutral',
  rejected: 'danger',
}

export function PlatformDashboard() {
  const total = useOrganizations({ page: 1, size: 1 })
  const active = useOrganizations({ page: 1, size: 1, status: ['active'] })
  const pending = useOrganizations({ page: 1, size: 1, status: ['pending'] })
  const suspended = useOrganizations({ page: 1, size: 1, status: ['suspended'] })
  const rejected = useOrganizations({ page: 1, size: 1, status: ['rejected'] })
  const recent = useOrganizations({ page: 1, size: 5, sort: 'created_at,desc' })
  const pendingList = usePendingOrganizations()
  const audit = useAuditLogs({ page: 1, size: 6 })

  const approve = useApproveOrganization()
  const reject = useRejectOrganization()

  const [approveTarget, setApproveTarget] = useState<PendingOrganization | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingOrganization | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()

  const counts = {
    total: total.data?.total ?? 0,
    active: active.data?.total ?? 0,
    pending: pending.data?.total ?? 0,
    suspended: suspended.data?.total ?? 0,
    rejected: rejected.data?.total ?? 0,
  }

  const isLoading = total.isLoading || active.isLoading || pending.isLoading
  const isError = total.isError || active.isError || pending.isError

  const refreshAll = () => {
    ;[total, active, pending, suspended, rejected, recent, pendingList, audit].forEach((query) =>
      void query.refetch(),
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Không tải được dữ liệu hệ thống"
          description="Danh sách tổ chức hoặc nhật ký không phản hồi. Kiểm tra kết nối rồi thử lại."
          onRetry={refreshAll}
        />
      </PageContainer>
    )
  }

  const handleApprove = () => {
    if (!approveTarget) return
    approve.mutate(approveTarget.id, {
      onSuccess: () => {
        toast.success(`Đã duyệt ${approveTarget.name}`)
        setApproveTarget(null)
      },
      onError: (error) => toast.error(ApiError.from(error).message),
    })
  }

  const handleReject = () => {
    if (!rejectTarget) return
    if (!reason.trim()) {
      setReasonError('Vui lòng nhập lý do từ chối để chủ tổ chức biết cần bổ sung gì.')
      return
    }
    if (reason.trim().length > 500) {
      setReasonError('Lý do tối đa 500 ký tự.')
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
  }

  const pendingOrgs = pendingList.data ?? []
  const recentOrgs = recent.data?.items ?? []
  const maxStatus = Math.max(1, counts.active, counts.pending, counts.suspended, counts.rejected)

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Nền tảng · Tổng quan"
        title="Bảng điều khiển hệ thống"
        description="Tình trạng tổ chức trên toàn hệ thống, hàng chờ duyệt và nhật ký thao tác gần nhất."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw aria-hidden="true" />
              Làm mới
            </Button>
            <Button size="sm" asChild>
              <Link to="/quan-tri/to-chuc">
                <Building2 aria-hidden="true" />
                Tất cả tổ chức
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[118px] rounded-lg" />
          ))
        ) : (
          <>
            <StatCard
              label="Tổng tổ chức"
              value={counts.total}
              hint={`${counts.rejected} hồ sơ bị từ chối`}
              icon={<Building2 className="size-4" aria-hidden="true" />}
            />
            <StatCard
              label="Chờ duyệt"
              value={counts.pending}
              hint="Cần quyết định trong tuần"
              icon={<Clock3 className="size-4" aria-hidden="true" />}
              accent="saffron"
              footer={
                <Link
                  to="/quan-tri/to-chuc/cho-duyet"
                  className="flex items-center justify-between text-2xs font-medium text-jade-700 hover:underline"
                >
                  Mở hàng chờ duyệt
                  <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              }
            />
            <StatCard
              label="Đang hoạt động"
              value={counts.active}
              hint="Tài khoản chủ tổ chức đã kích hoạt"
              icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
              accent="ink"
            />
            <StatCard
              label="Tạm ngưng"
              value={counts.suspended}
              hint="Tài khoản bị chặn đăng nhập"
              icon={<CircleSlash className="size-4" aria-hidden="true" />}
              accent="ink"
            />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="size-4 text-jade-600" aria-hidden="true" />
                  Hàng chờ duyệt tổ chức
                </CardTitle>
                <p className="mt-0.5 text-sm text-ink-500">
                  Duyệt để kích hoạt tài khoản chủ tổ chức và các module đã đề nghị.
                </p>
              </div>
              {pendingOrgs.length > 0 ? <Badge tone="warning">{pendingOrgs.length} hồ sơ</Badge> : null}
            </CardHeader>
            <CardContent className="pt-2">
              {pendingList.isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : pendingOrgs.length === 0 ? (
                <EmptyState
                  compact
                  icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
                  title="Không còn hồ sơ chờ duyệt"
                  description="Mọi tổ chức đăng ký đã được xử lý."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {pendingOrgs.slice(0, 4).map((org) => (
                    <li
                      key={org.id}
                      className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-800">
                          {org.name}
                          <Badge tone="outline">{ORG_TYPE_LABELS[org.orgType]}</Badge>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {org.ownerUsername} · {org.ownerEmail}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectTarget(org)
                            setReason('')
                            setReasonError(undefined)
                          }}
                        >
                          <XCircle aria-hidden="true" />
                          Từ chối
                        </Button>
                        <Button size="sm" onClick={() => setApproveTarget(org)}>
                          <CheckCircle2 aria-hidden="true" />
                          Duyệt
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {pendingOrgs.length > 4 ? (
                <Button variant="ghost" size="sm" className="mt-2" asChild>
                  <Link to="/quan-tri/to-chuc/cho-duyet">Xem toàn bộ hàng chờ</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tổ chức mới nhất</CardTitle>
                <p className="mt-0.5 text-sm text-ink-500">Sắp xếp theo ngày gửi đăng ký.</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/quan-tri/to-chuc">Xem tất cả</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-1">
              {recent.isLoading ? (
                <Skeleton className="h-40" />
              ) : recentOrgs.length === 0 ? (
                <EmptyState compact title="Chưa có tổ chức nào" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="py-2 pr-3 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-400">
                          Tổ chức
                        </th>
                        <th className="hidden py-2 pr-3 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-400 sm:table-cell">
                          Chủ sở hữu
                        </th>
                        <th className="py-2 pr-3 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-400">
                          Trạng thái
                        </th>
                        <th className="hidden py-2 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-400 md:table-cell">
                          Ngày tạo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {recentOrgs.map((org) => (
                        <tr key={org.id} className="text-sm">
                          <td className="py-2.5 pr-3">
                            <p className="font-medium text-ink-800">{org.name}</p>
                            <p className="text-2xs text-ink-400">{ORG_TYPE_LABELS[org.orgType]}</p>
                          </td>
                          <td className="hidden py-2.5 pr-3 text-xs text-ink-500 sm:table-cell">
                            {org.ownerUsername}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge tone={STATUS_TONE[org.status]} dot>
                              {ORG_STATUS_LABELS[org.status]}
                            </Badge>
                          </td>
                          <td className="hidden py-2.5 text-xs text-ink-500 md:table-cell">
                            {formatDate(org.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Phân bố trạng thái</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-2">
              {(
                [
                  ['active', counts.active, 'bg-success-500'],
                  ['pending', counts.pending, 'bg-saffron-400'],
                  ['suspended', counts.suspended, 'bg-ink-400'],
                  ['rejected', counts.rejected, 'bg-danger-500'],
                ] as [OrgStatus, number, string][]
              ).map(([status, value, color]) => (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-600">{ORG_STATUS_LABELS[status]}</span>
                    <span className="font-medium text-ink-800 tabular">{value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${(value / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="size-4 text-jade-600" aria-hidden="true" />
                Nhật ký gần đây
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/quan-tri/nhat-ky">Xem</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {audit.isLoading ? (
                <Skeleton className="h-32" />
              ) : (audit.data?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-500">Chưa có bản ghi nhật ký.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {audit.data?.items.map((log) => (
                    <li key={log.id} className="flex gap-2.5">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-400">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink-700">
                          {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                        </p>
                        <p className="truncate text-2xs text-ink-500">{log.targetName}</p>
                        <p className="text-2xs text-ink-400">
                          {log.actorUsername} · {formatRelative(log.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Alert tone="info" title="Nguyên tắc quyền">
            Quản trị hệ thống chỉ xử lý vòng đời tổ chức và tài khoản. Mọi nghiệp vụ phòng ban do
            tổ chức tự vận hành.
          </Alert>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null)
        }}
        title="Duyệt tổ chức?"
        description={
          approveTarget
            ? `${approveTarget.name} sẽ được kích hoạt, tài khoản chủ tổ chức có thể đăng nhập và các module đề nghị được bật.`
            : undefined
        }
        confirmLabel="Duyệt tổ chức"
        tone="primary"
        isLoading={approve.isPending}
        onConfirm={handleApprove}
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
              {rejectTarget?.name} sẽ không thể đăng nhập. Hãy nêu rõ lý do để chủ tổ chức bổ sung
              hồ sơ.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field
              label="Lý do từ chối"
              htmlFor="reject-reason"
              required
              error={reasonError}
              hint="Tối đa 500 ký tự."
            >
              <Textarea
                id="reject-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setReasonError(undefined)
                }}
                rows={4}
                aria-invalid={Boolean(reasonError)}
                placeholder="Ví dụ: Hồ sơ chưa có thông tin pháp lý của đơn vị."
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)} disabled={reject.isPending}>
              Huỷ
            </Button>
            <Button variant="danger" size="sm" onClick={handleReject} isLoading={reject.isPending}>
              Từ chối hồ sơ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

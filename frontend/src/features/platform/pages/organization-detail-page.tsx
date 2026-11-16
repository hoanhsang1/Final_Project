import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { Alert } from '@/components/ui/feedback'
import { Field, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import {
  useApproveOrganization,
  useOrganizationDetail,
  useReactivateOrganization,
  useRejectOrganization,
  useSuspendOrganization,
} from '@/features/platform/hooks'
import {
  ORG_STATUS_LABELS,
  ORG_TYPE_LABELS,
  type OrgStatus,
} from '@/features/platform/types'
import { ApiError } from '@/lib/api-error'

const STATUS_TONE: Record<OrgStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'neutral',
  rejected: 'danger',
}

const MODULE_STATUS_LABEL: Record<string, string> = {
  requested: 'Đang chờ duyệt',
  active: 'Đang bật',
  rejected: 'Bị từ chối',
}

type ReasonAction = 'reject' | 'suspend' | 'reactivate'

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const query = useOrganizationDetail(id)
  const approve = useApproveOrganization()
  const reject = useRejectOrganization()
  const suspend = useSuspendOrganization()
  const reactivate = useReactivateOrganization()

  const [approveOpen, setApproveOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()

  if (query.isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-96" />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-56 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
      </PageContainer>
    )
  }

  if (query.isError || !query.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Không tải được tổ chức"
          description={ApiError.from(query.error).message}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    )
  }

  const { organization, owners, modules } = query.data
  const status = organization.status
  const pending = status === 'pending'
  const active = status === 'active'
  const suspended = status === 'suspended'

  const submitReason = () => {
    if (!id || !reasonAction) return
    const trimmed = reason.trim()
    if ((reasonAction === 'reject' || reasonAction === 'suspend') && !trimmed) {
      setReasonError(
        reasonAction === 'reject'
          ? 'Cần nêu lý do để chủ tổ chức biết cần bổ sung gì.'
          : 'Cần nêu lý do tạm ngưng tổ chức.',
      )
      return
    }
    if (trimmed.length > 500) {
      setReasonError('Lý do tối đa 500 ký tự.')
      return
    }

    const onSuccess = () => {
      toast.success(
        reasonAction === 'reject'
          ? 'Đã từ chối tổ chức'
          : reasonAction === 'suspend'
            ? 'Đã tạm ngưng tổ chức'
            : 'Đã kích hoạt lại tổ chức',
      )
      setReasonAction(null)
      setReason('')
    }
    const onError = (error: unknown) => toast.error(ApiError.from(error).message)

    if (reasonAction === 'reject') {
      reject.mutate({ id, reason: trimmed }, { onSuccess, onError })
    } else if (reasonAction === 'suspend') {
      suspend.mutate({ id, reason: trimmed }, { onSuccess, onError })
    } else {
      reactivate.mutate({ id, reason: trimmed || undefined }, { onSuccess, onError })
    }
  }

  const actionPending =
    reasonAction === 'reject'
      ? reject.isPending
      : reasonAction === 'suspend'
        ? suspend.isPending
        : reactivate.isPending

  return (
    <PageContainer>
      <Link
        to="/quan-tri/to-chuc"
        className="mb-4 inline-flex items-center gap-1.5 rounded-xs text-xs font-medium text-ink-500 hover:text-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Danh sách tổ chức
      </Link>

      <PageHeader
        eyebrow="Nền tảng · Tổ chức"
        title={organization.name}
        description={`${ORG_TYPE_LABELS[organization.orgType]} · Mã ${organization.id}`}
        actions={
          <>
            {pending ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReasonAction('reject')
                    setReason('')
                    setReasonError(undefined)
                  }}
                >
                  <XCircle aria-hidden="true" />
                  Từ chối
                </Button>
                <Button size="sm" onClick={() => setApproveOpen(true)}>
                  <CheckCircle2 aria-hidden="true" />
                  Duyệt tổ chức
                </Button>
              </>
            ) : null}
            {active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReasonAction('suspend')
                  setReason('')
                  setReasonError(undefined)
                }}
              >
                <PauseCircle aria-hidden="true" />
                Tạm ngưng
              </Button>
            ) : null}
            {suspended ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReasonAction('reactivate')
                  setReason('')
                  setReasonError(undefined)
                }}
              >
                <PlayCircle aria-hidden="true" />
                Kích hoạt lại
              </Button>
            ) : null}
          </>
        }
        meta={
          <>
            <Badge tone={STATUS_TONE[status]} dot size="md">
              {ORG_STATUS_LABELS[status]}
            </Badge>
            <span className="text-xs text-ink-400">
              Thao tác của quản trị hệ thống được ghi nhật ký.
            </span>
          </>
        }
      />

      {pending ? (
        <Alert tone="warning" className="mt-5" title="Hồ sơ đang chờ duyệt">
          Duyệt để kích hoạt tổ chức và tài khoản chủ sở hữu, đồng thời bật các module đã đề nghị.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-jade-600" aria-hidden="true" />
                Chủ sở hữu
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {owners.length === 0 ? (
                <p className="text-sm text-ink-500">Chưa có tài khoản chủ sở hữu.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {owners.map((owner) => (
                    <li key={owner.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">{owner.username}</p>
                        <p className="truncate text-xs text-ink-500">{owner.email}</p>
                      </div>
                      <Badge tone={owner.status === 'active' ? 'success' : 'warning'} dot>
                        {owner.status === 'active' ? 'Đang hoạt động' : owner.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-jade-600" aria-hidden="true" />
                  Module của tổ chức
                </CardTitle>
                <p className="mt-0.5 text-sm text-ink-500">
                  Trạng thái do backend trả về; module lõi không thể tắt.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-1">
              {modules.length === 0 ? (
                <p className="text-sm text-ink-500">Chưa có module.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {modules.map((module) => (
                    <li
                      key={module.code}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-800">{module.name}</p>
                        <p className="font-mono text-2xs text-ink-400">{module.code}</p>
                      </div>
                      <Badge
                        tone={
                          module.status === 'active'
                            ? 'success'
                            : module.status === 'requested'
                              ? 'warning'
                              : 'danger'
                        }
                        dot
                      >
                        {MODULE_STATUS_LABEL[module.status] ?? module.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4 text-jade-600" aria-hidden="true" />
                Trạng thái vòng đời
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-1 text-sm text-ink-600">
              <p>
                <span className="font-medium text-ink-800">Chờ duyệt</span> → duyệt để kích hoạt tài
                khoản chủ sở hữu và module đề nghị.
              </p>
              <p>
                <span className="font-medium text-ink-800">Tạm ngưng</span> → mọi tài khoản của tổ
                chức bị chặn đăng nhập cho tới khi kích hoạt lại.
              </p>
              <p>
                Từ chối giữ nguyên dữ liệu nhưng chủ sở hữu không thể đăng nhập.
              </p>
              <p className="rounded-sm bg-ink-50 px-2 py-1.5 text-2xs text-ink-400">
                Lý do từ chối/tạm ngưng hiện được gửi tới backend; backend đang chạy có thể chưa lưu
                lý do (D-05).
              </p>
            </CardContent>
          </Card>

          <Alert tone="info" title="Khóa module cấp nền tảng">
            Chức năng khóa module cho tổ chức cần endpoint{' '}
            <code>PATCH /organizations/&#123;id&#125;/modules/&#123;code&#125;/lock</code>. Backend đang
            chạy trả 404 nên màn này chưa bật — ghi nhận là <strong>BACKEND_DEPENDENCY</strong>.
          </Alert>
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Duyệt tổ chức?"
        description={`${organization.name} sẽ được kích hoạt và chủ sở hữu có thể đăng nhập.`}
        confirmLabel="Duyệt tổ chức"
        tone="primary"
        isLoading={approve.isPending}
        onConfirm={() => {
          if (!id) return
          approve.mutate(id, {
            onSuccess: () => {
              toast.success('Đã duyệt tổ chức')
              setApproveOpen(false)
            },
            onError: (error) => toast.error(ApiError.from(error).message),
          })
        }}
      />

      <Dialog
        open={Boolean(reasonAction)}
        onOpenChange={(open) => {
          if (!open) {
            setReasonAction(null)
            setReason('')
          }
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {reasonAction === 'reject'
                ? 'Từ chối tổ chức'
                : reasonAction === 'suspend'
                  ? 'Tạm ngưng tổ chức'
                  : 'Kích hoạt lại tổ chức'}
            </DialogTitle>
            <DialogDescription>
              {reasonAction === 'reject'
                ? 'Chủ sở hữu sẽ không thể đăng nhập. Nêu rõ lý do để họ bổ sung hồ sơ.'
                : reasonAction === 'suspend'
                  ? 'Mọi tài khoản thuộc tổ chức sẽ bị chặn đăng nhập cho tới khi kích hoạt lại.'
                  : 'Tổ chức và các tài khoản sẽ hoạt động trở lại.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field
              label="Lý do"
              htmlFor="org-reason"
              required={reasonAction !== 'reactivate'}
              error={reasonError}
              hint="Tối đa 500 ký tự."
            >
              <Textarea
                id="org-reason"
                rows={4}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setReasonError(undefined)
                }}
                aria-invalid={Boolean(reasonError)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReasonAction(null)}>
              Huỷ
            </Button>
            <Button
              size="sm"
              variant={reasonAction === 'reject' ? 'danger' : 'primary'}
              onClick={submitReason}
              isLoading={actionPending}
            >
              {reasonAction === 'reject'
                ? 'Từ chối'
                : reasonAction === 'suspend'
                  ? 'Tạm ngưng'
                  : 'Kích hoạt lại'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

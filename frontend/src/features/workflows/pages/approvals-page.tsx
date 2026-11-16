import { ArrowLeftRight, CheckCircle2, FileText, Inbox, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import { useDepartments, useDepartmentMembers } from '@/features/organization/hooks'
import { TRANSFER_STATUS_LABELS, TRANSFER_STEP_LABELS } from '@/features/organization/types'
import type { ResignationRequest } from '@/features/workflows/types'
import { RESIGNATION_STATUS_LABELS } from '@/features/workflows/types'
import { useResignationMutations, useResignations, useTransferWorkflow } from '@/features/workflows/hooks'
import { PERM } from '@/lib/permissions'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

function canDecideResignation(
  isOwner: boolean,
  hasApprovePermission: boolean,
  delegated: boolean,
  isManager: boolean,
) {
  return isOwner || hasApprovePermission || delegated || isManager
}

export function ApprovalsPage() {
  const { can, isOwner, hasRole, session } = usePermission()
  const departments = useDepartments()
  const transfer = useTransferWorkflow()

  const [departmentId, setDepartmentId] = useState<string>('')
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [decisionTarget, setDecisionTarget] = useState<ResignationRequest | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [note, setNote] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createUserId, setCreateUserId] = useState('')
  const [createReason, setCreateReason] = useState('')
  const [createError, setCreateError] = useState<string>()

  const activeDepartmentId = departmentId || departments.data?.[0]?.id || ''
  const resignations = useResignations(activeDepartmentId || undefined, status)
  const members = useDepartmentMembers(activeDepartmentId || undefined)
  const mutations = useResignationMutations(activeDepartmentId || undefined)

  const canCreate = can(PERM.employeeResign)
  const showResignationDecisions = canDecideResignation(
    isOwner,
    can(PERM.employeeApproveResignation),
    (session?.delegatedPermissions ?? []).includes(PERM.employeeApproveResignation),
    hasRole('MANAGER'),
  )

  const memberMap = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.userId, member])),
    [members.data],
  )

  const transferInbox = transfer.inbox.data ?? []
  const pendingCount = transferInbox.length + (resignations.data?.length ?? 0)

  const openDecision = (request: ResignationRequest, next: 'approve' | 'reject') => {
    setDecisionTarget(request)
    setDecision(next)
    setNote('')
  }

  const submitDecision = () => {
    if (!decisionTarget) return
    mutations.decide.mutate(
      {
        requestId: decisionTarget.id,
        decision,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(decision === 'approve' ? 'Đã chấp thuận nghỉ việc' : 'Đã từ chối yêu cầu')
          setDecisionTarget(null)
          setNote('')
        },
        onError: (error) => toast.error(ApiError.from(error).message),
      },
    )
  }

  const openCreate = () => {
    setCreateUserId('')
    setCreateReason('')
    setCreateError(undefined)
    setCreateOpen(true)
  }

  const submitCreate = () => {
    if (!activeDepartmentId) return
    setCreateError(undefined)
    if (!createUserId) {
      setCreateError('Chọn nhân sự cần tạo yêu cầu nghỉ việc.')
      return
    }
    if (!createReason.trim()) {
      setCreateError('Vui lòng nhập lý do nghỉ việc.')
      return
    }
    mutations.create.mutate(
      { userId: createUserId, reason: createReason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã tạo yêu cầu nghỉ việc.')
          setCreateOpen(false)
          setCreateUserId('')
          setCreateReason('')
        },
        onError: (cause) =>
          setCreateError(ApiError.from(cause).message || 'Không tạo được yêu cầu nghỉ việc.'),
      },
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân · Việc chờ duyệt"
        title="Việc chờ tôi duyệt"
        description="Các bước điều chuyển tới lượt bạn và yêu cầu nghỉ việc trong phòng ban."
        meta={
          <>
            <Badge tone={pendingCount ? 'warning' : 'success'} dot>
              {pendingCount} việc đang chờ
            </Badge>
            <span className="text-xs text-ink-400">
              Quyền quyết định do backend kiểm theo chức danh và uỷ quyền.
            </span>
          </>
        }
      />

      <div className="mt-5">
        <Tabs defaultValue="transfers">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="transfers">
              Điều chuyển ({transferInbox.length})
            </TabsTrigger>
            <TabsTrigger variant="underline" value="resignations">
              Nghỉ việc ({resignations.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="mt-4">
            {transfer.inbox.isError ? (
              <ErrorState
                title="Không tải được hộp duyệt điều chuyển"
                description={ApiError.from(transfer.inbox.error).message}
                onRetry={() => void transfer.inbox.refetch()}
              />
            ) : transferInbox.length === 0 && !transfer.inbox.isLoading ? (
              <EmptyState
                icon={<ArrowLeftRight className="size-5" aria-hidden="true" />}
                title="Không có bước điều chuyển chờ bạn"
                description="Yêu cầu điều chuyển tới lượt bạn sẽ xuất hiện tại đây."
                action={{ label: 'Mở trang điều chuyển', onClick: () => window.location.assign('/to-chuc/chuyen-phong'), variant: 'outline' }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {transferInbox.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {request.fullName || request.username}: {request.fromDepartmentName} →{' '}
                          {request.toDepartmentName}
                        </p>
                        <p className="text-xs text-ink-500">
                          Bước chờ:{' '}
                          {request.actionableSteps
                            .map((step) => TRANSFER_STEP_LABELS[step] ?? step)
                            .join(', ')}{' '}
                          · {TRANSFER_STATUS_LABELS[request.status] ?? request.status}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/to-chuc/chuyen-phong">Xử lý</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resignations" className="mt-4">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <Field label="Phòng ban" labelSize="sm" className="w-full sm:w-72">
                <select
                  value={activeDepartmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
                >
                  {(departments.data ?? []).map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Trạng thái" labelSize="sm" className="w-full sm:w-48">
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as 'PENDING' | 'APPROVED' | 'REJECTED')
                  }
                  className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
                >
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="APPROVED">Đã chấp thuận</option>
                  <option value="REJECTED">Bị từ chối</option>
                </select>
              </Field>
            </div>

            <Alert tone="info" className="mb-3" title="DEC-08">
              Thứ tự thẩm quyền: HR giữ quyền trực tiếp → Trưởng phòng ban → Tổng quản lý có uỷ
              quyền → Chủ tổ chức. Người tạo và người xin nghỉ không được tự duyệt.
            </Alert>

            {resignations.isError ? (
              <ErrorState
                title="Không tải được yêu cầu nghỉ việc"
                description={
                  ApiError.from(resignations.error).status === 403
                    ? 'Bạn không có quyền xem hộp nghỉ việc của phòng ban này.'
                    : ApiError.from(resignations.error).message
                }
                onRetry={() => void resignations.refetch()}
              />
            ) : resignations.isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-ink-500">Đang tải…</CardContent>
              </Card>
            ) : (resignations.data ?? []).length === 0 ? (
              <EmptyState
                icon={<Inbox className="size-5" aria-hidden="true" />}
                title="Không có yêu cầu nghỉ việc"
                description="Yêu cầu nghỉ việc ở trạng thái đã chọn sẽ hiển thị tại đây."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {(resignations.data ?? []).map((request) => {
                  const member = memberMap.get(request.userId)
                  return (
                    <Card key={request.id}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">
                              {request.fullName || request.username}
                              {member?.role ? (
                                <span className="ml-2 text-xs font-normal text-ink-400">
                                  {member.role}
                                </span>
                              ) : null}
                            </CardTitle>
                            <p className="mt-0.5 text-xs text-ink-500">
                              Tạo bởi {request.requestedByName} · {formatDateTime(request.requestedAt)}
                            </p>
                          </div>
                          <Badge tone={STATUS_TONE[request.status] ?? 'neutral'} dot>
                            {RESIGNATION_STATUS_LABELS[request.status] ?? request.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 pt-1">
                        <p className="text-sm text-ink-600">{request.reason}</p>
                        {request.decisionNote ? (
                          <p className="rounded-sm bg-ink-50 px-2 py-1.5 text-xs text-ink-500">
                            Ghi chú quyết định: {request.decisionNote}
                            {request.decidedByName ? ` · ${request.decidedByName}` : ''}
                          </p>
                        ) : null}
                        {request.status === 'PENDING' && showResignationDecisions ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDecision(request, 'reject')}
                            >
                              <XCircle aria-hidden="true" />
                              Từ chối
                            </Button>
                            <Button size="sm" onClick={() => openDecision(request, 'approve')}>
                              <CheckCircle2 aria-hidden="true" />
                              Chấp thuận
                            </Button>
                          </div>
                        ) : null}
                        {request.status === 'PENDING' && !showResignationDecisions ? (
                          <p className="text-xs text-ink-400">
                            Bạn chỉ xem được yêu cầu; người có thẩm quyền theo DEC-08 sẽ quyết định.
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {canCreate && activeDepartmentId ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-line bg-surface-muted px-3 py-2">
                <p className="text-xs text-ink-500">
                  Nhân sự có quyền tạo yêu cầu nghỉ việc cho nhân viên trong phòng ban.
                </p>
                <Button size="sm" variant="outline" onClick={openCreate}>
                  Tạo yêu cầu nghỉ việc
                </Button>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu nghỉ việc</DialogTitle>
            <DialogDescription>
              Chọn nhân sự đang hoạt động trong phòng ban và ghi rõ lý do. Backend kiểm tra lại
              quyền tạo và thứ tự duyệt DEC-08.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Field label="Nhân sự" required>
              <select
                value={createUserId}
                onChange={(event) => setCreateUserId(event.target.value)}
                className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
              >
                <option value="">Chọn nhân sự</option>
                {(members.data ?? [])
                  .filter((member) => member.status === 'ACTIVE')
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.username} · {member.role}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Lý do nghỉ việc" required hint="Tối đa 1000 ký tự.">
              <Textarea
                rows={3}
                value={createReason}
                maxLength={1000}
                onChange={(event) => setCreateReason(event.target.value)}
              />
            </Field>
            {createError ? <Alert tone="danger">{createError}</Alert> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Huỷ
            </Button>
            <Button isLoading={mutations.create.isPending} onClick={submitCreate}>
              Tạo yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(decisionTarget)}
        onOpenChange={(open) => {
          if (!open) setDecisionTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'approve' ? 'Chấp thuận nghỉ việc' : 'Từ chối yêu cầu nghỉ việc'}
            </DialogTitle>
            <DialogDescription>
              {decisionTarget
                ? `${decisionTarget.fullName || decisionTarget.username} · ${RESIGNATION_STATUS_LABELS[decisionTarget.status]}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Ghi chú" hint="Tuỳ chọn, tối đa 1000 ký tự.">
              <Textarea
                rows={3}
                value={note}
                maxLength={1000}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-400">
              <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Backend sẽ kiểm tra lại thẩm quyền và trả SELF_APPROVAL_NOT_ALLOWED /
              RESIGNATION_APPROVER_NOT_ALLOWED nếu không hợp lệ.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant={decision === 'reject' ? 'danger' : 'primary'}
              isLoading={mutations.decide.isPending}
              onClick={submitDecision}
            >
              {decision === 'approve' ? 'Chấp thuận' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

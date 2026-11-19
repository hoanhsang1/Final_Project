import { ArrowLeftRight, CheckCircle2, FileText, Inbox, XCircle } from 'lucide-react'
import { useState } from 'react'
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
import { useClassMutations } from '@/features/academic/hooks'
import { CLASS_STATUS_LABELS } from '@/features/academic/types'
import { usePermission } from '@/features/auth/hooks'
import { TRANSFER_STATUS_LABELS, TRANSFER_STEP_LABELS } from '@/features/organization/types'
import { useApprovalInbox, useInboxResignationDecision } from '@/features/workflows/hooks'
import {
  RESIGNATION_STATUS_LABELS,
  type ClassLifecycleInboxItem,
  type ResignationStatus,
} from '@/features/workflows/types'
import { PERM } from '@/lib/permissions'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

const CLASS_KIND_LABELS: Record<string, string> = {
  CLOSE: 'Đóng lớp',
  CANCEL: 'Hủy lớp',
}

export function ApprovalsPage() {
  const { can } = usePermission()
  const [resignationStatus, setResignationStatus] = useState<ResignationStatus>('PENDING')
  const inbox = useApprovalInbox(resignationStatus)
  const resignationDecision = useInboxResignationDecision()
  const classMutations = useClassMutations()

  const [resignationTarget, setResignationTarget] = useState<{
    requestId: string
    departmentId: string
    subject: string
    decision: 'approve' | 'reject'
  } | null>(null)
  const [resignationNote, setResignationNote] = useState('')

  const [classTarget, setClassTarget] = useState<{
    item: ClassLifecycleInboxItem
    decision: 'approve' | 'reject'
  } | null>(null)
  const [classReason, setClassReason] = useState('')

  const transfers = inbox.data?.transfers ?? []
  const resignations = inbox.data?.resignations ?? []
  const classItems = inbox.data?.classLifecycle ?? []
  const total = inbox.data?.total ?? 0

  const openResignationDecision = (
    requestId: string,
    departmentId: string,
    subject: string,
    decision: 'approve' | 'reject',
  ) => {
    setResignationTarget({ requestId, departmentId, subject, decision })
    setResignationNote('')
  }

  const submitResignationDecision = () => {
    if (!resignationTarget) return
    resignationDecision.mutate(
      {
        departmentId: resignationTarget.departmentId,
        requestId: resignationTarget.requestId,
        decision: resignationTarget.decision,
        note: resignationNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            resignationTarget.decision === 'approve'
              ? 'Đã chấp thuận nghỉ việc'
              : 'Đã từ chối yêu cầu nghỉ việc',
          )
          setResignationTarget(null)
        },
        onError: (error) => toast.error(ApiError.from(error).message),
      },
    )
  }

  const openClassDecision = (item: ClassLifecycleInboxItem, decision: 'approve' | 'reject') => {
    setClassTarget({ item, decision })
    setClassReason('')
  }

  const submitClassDecision = () => {
    if (!classTarget) return
    const { item, decision } = classTarget
    const reason = classReason.trim()
    if (decision === 'reject' && !reason) {
      toast.error('Vui lòng nhập lý do từ chối.')
      return
    }
    const onSuccess = () => {
      toast.success(decision === 'approve' ? 'Đã duyệt yêu cầu của lớp' : 'Đã từ chối yêu cầu của lớp')
      setClassTarget(null)
    }
    const onError = (error: unknown) => toast.error(ApiError.from(error).message)

    if (item.kind === 'CLOSE') {
      if (decision === 'approve') {
        classMutations.approveClose.mutate(item.classId, { onSuccess, onError })
      } else {
        classMutations.rejectClose.mutate({ id: item.classId, reason }, { onSuccess, onError })
      }
    } else if (decision === 'approve') {
      classMutations.approveCancel.mutate(item.classId, { onSuccess, onError })
    } else {
      classMutations.rejectCancel.mutate({ id: item.classId, reason }, { onSuccess, onError })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân · Việc chờ duyệt"
        title="Việc chờ tôi duyệt"
        description="Điều chuyển, nghỉ việc và thay đổi vòng đời lớp mà bạn có thẩm quyền quyết định."
        meta={
          <>
            <Badge tone={total ? 'warning' : 'success'} dot>
              {total} việc đang chờ
            </Badge>
            <span className="text-xs text-ink-400">
              Danh sách do backend lọc theo chức danh và uỷ quyền — không phụ thuộc quyền xem
              phòng ban.
            </span>
          </>
        }
      />

      {inbox.isError ? (
        <div className="mt-5">
          <ErrorState
            title="Không tải được hộp duyệt"
            description={ApiError.from(inbox.error).message}
            onRetry={() => void inbox.refetch()}
          />
        </div>
      ) : (
        <div className="mt-5">
          <Tabs defaultValue="transfers">
            <TabsList variant="underline">
              <TabsTrigger variant="underline" value="transfers">
                Điều chuyển ({transfers.length})
              </TabsTrigger>
              <TabsTrigger variant="underline" value="resignations">
                Nghỉ việc ({resignations.length})
              </TabsTrigger>
              <TabsTrigger variant="underline" value="classes">
                Vòng đời lớp ({classItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transfers" className="mt-4">
              {transfers.length === 0 && !inbox.isLoading ? (
                <EmptyState
                  icon={<ArrowLeftRight className="size-5" aria-hidden="true" />}
                  title="Không có bước điều chuyển chờ bạn"
                  description="Yêu cầu điều chuyển tới lượt bạn sẽ xuất hiện tại đây."
                  action={{
                    label: 'Mở trang điều chuyển',
                    onClick: () => window.location.assign('/to-chuc/chuyen-phong'),
                    variant: 'outline',
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {transfers.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-ink-900">
                            {request.fullName || request.username}: {request.fromDepartmentName} →{' '}
                            {request.toDepartmentName}
                          </p>
                          <p className="text-xs text-ink-500">
                            Yêu cầu bởi {request.requestedByName} ·{' '}
                            {formatDateTime(request.requestedAt)}
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
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <Field label="Trạng thái" labelSize="sm" className="w-full sm:w-56">
                  <select
                    value={resignationStatus}
                    onChange={(event) =>
                      setResignationStatus(event.target.value as ResignationStatus)
                    }
                    className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
                  >
                    <option value="PENDING">Chờ duyệt</option>
                    <option value="APPROVED">Đã chấp thuận</option>
                    <option value="REJECTED">Bị từ chối</option>
                  </select>
                </Field>
                {can(PERM.employeeApproveResignation) ? null : (
                  <Alert tone="info" className="max-w-xl" title="Thẩm quyền">
                    Chỉ các yêu cầu backend xác nhận bạn có quyền theo DEC-08 mới hiển thị.
                  </Alert>
                )}
              </div>

              {resignations.length === 0 && !inbox.isLoading ? (
                <EmptyState
                  icon={<Inbox className="size-5" aria-hidden="true" />}
                  title="Không có yêu cầu nghỉ việc"
                  description="Yêu cầu nghỉ việc ở trạng thái đã chọn mà bạn được duyệt sẽ hiển thị tại đây."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {resignations.map((request) => (
                    <Card key={request.id}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">
                              {request.fullName || request.username}
                            </CardTitle>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {request.departmentName ?? 'Phòng ban đã xoá'} · Tạo bởi{' '}
                              {request.requestedByName} · {formatDateTime(request.requestedAt)}
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
                        {request.status === 'PENDING' ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openResignationDecision(
                                  request.id,
                                  request.departmentId,
                                  request.fullName || request.username,
                                  'reject',
                                )
                              }
                            >
                              <XCircle aria-hidden="true" />
                              Từ chối
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                openResignationDecision(
                                  request.id,
                                  request.departmentId,
                                  request.fullName || request.username,
                                  'approve',
                                )
                              }
                            >
                              <CheckCircle2 aria-hidden="true" />
                              Chấp thuận
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="classes" className="mt-4">
              {classItems.length === 0 && !inbox.isLoading ? (
                <EmptyState
                  icon={<Inbox className="size-5" aria-hidden="true" />}
                  title="Không có yêu cầu vòng đời lớp"
                  description="Yêu cầu đóng hoặc hủy lớp đang chờ duyệt sẽ xuất hiện tại đây."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {classItems.map((item) => (
                    <Card key={`${item.kind}-${item.classId}`}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">
                              {item.classCode} · {item.className}
                            </CardTitle>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {CLASS_KIND_LABELS[item.kind] ?? item.kind} ·{' '}
                              {CLASS_STATUS_LABELS[item.classStatus] ?? item.classStatus} ·{' '}
                              {item.studentCount} học sinh
                            </p>
                            <p className="text-xs text-ink-500">
                              Yêu cầu bởi {item.requesterName ?? item.requesterId} ·{' '}
                              {item.requestedAt ? formatDateTime(item.requestedAt) : '—'}
                            </p>
                          </div>
                          <Badge tone="warning" dot>
                            Chờ duyệt
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 pt-1">
                        {item.reason ? <p className="text-sm text-ink-600">{item.reason}</p> : null}
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openClassDecision(item, 'reject')}
                          >
                            <XCircle aria-hidden="true" />
                            Từ chối
                          </Button>
                          <Button size="sm" onClick={() => openClassDecision(item, 'approve')}>
                            <CheckCircle2 aria-hidden="true" />
                            Chấp thuận
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog
        open={Boolean(resignationTarget)}
        onOpenChange={(open) => {
          if (!open) setResignationTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resignationTarget?.decision === 'approve'
                ? 'Chấp thuận nghỉ việc'
                : 'Từ chối yêu cầu nghỉ việc'}
            </DialogTitle>
            <DialogDescription>{resignationTarget?.subject ?? ''}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Ghi chú" hint="Tuỳ chọn, tối đa 1000 ký tự.">
              <Textarea
                rows={3}
                value={resignationNote}
                maxLength={1000}
                onChange={(event) => setResignationNote(event.target.value)}
              />
            </Field>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-400">
              <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Backend kiểm tra lại thẩm quyền và trả SELF_APPROVAL_NOT_ALLOWED /
              RESIGNATION_APPROVER_NOT_ALLOWED nếu không hợp lệ.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResignationTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant={resignationTarget?.decision === 'reject' ? 'danger' : 'primary'}
              isLoading={resignationDecision.isPending}
              onClick={submitResignationDecision}
            >
              {resignationTarget?.decision === 'approve' ? 'Chấp thuận' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(classTarget)}
        onOpenChange={(open) => {
          if (!open) setClassTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {classTarget?.decision === 'approve'
                ? 'Chấp thuận yêu cầu của lớp'
                : 'Từ chối yêu cầu của lớp'}
            </DialogTitle>
            <DialogDescription>
              {classTarget
                ? `${CLASS_KIND_LABELS[classTarget.item.kind] ?? classTarget.item.kind} · ${
                    classTarget.item.classCode
                  }`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field
              label="Lý do"
              required={classTarget?.decision === 'reject'}
              hint={
                classTarget?.decision === 'reject'
                  ? 'Bắt buộc khi từ chối, tối đa 1000 ký tự.'
                  : 'Tuỳ chọn khi chấp thuận.'
              }
            >
              <Textarea
                rows={3}
                maxLength={1000}
                value={classReason}
                onChange={(event) => setClassReason(event.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant={classTarget?.decision === 'reject' ? 'danger' : 'primary'}
              isLoading={
                classMutations.approveClose.isPending ||
                classMutations.rejectClose.isPending ||
                classMutations.approveCancel.isPending ||
                classMutations.rejectCancel.isPending
              }
              onClick={submitClassDecision}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

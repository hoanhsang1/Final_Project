import { ArrowLeftRight, CheckCircle2, FileText, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import {
  TRANSFER_STATUS_LABELS,
  type TransferRequest,
} from '@/features/organization/types'
import { TransferTimeline } from '@/features/workflows/components/transfer-timeline'
import {
  useMyResignations,
  useResignationMutations,
  useTransferDepartments,
  useTransferWorkflow,
} from '@/features/workflows/hooks'
import { RESIGNATION_STATUS_LABELS } from '@/features/workflows/types'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

/** Nhân sự tự gửi và theo dõi yêu cầu nghỉ việc / điều chuyển của chính mình. */
export function MyRequestsPage() {
  const { session } = usePermission()
  const userId = session?.user.id ?? ''
  const departmentId = session?.user.departmentId ?? null

  const resignations = useMyResignations(undefined, Boolean(departmentId))
  const resignationMutations = useResignationMutations(departmentId ?? undefined)
  const transfer = useTransferWorkflow()
  const departments = useTransferDepartments(Boolean(departmentId))

  const [resignOpen, setResignOpen] = useState(false)
  const [resignReason, setResignReason] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)
  const [targetDepartmentId, setTargetDepartmentId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [formError, setFormError] = useState<string>()

  const [decisionTarget, setDecisionTarget] = useState<{
    request: TransferRequest
    decision: 'approve' | 'reject'
  } | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [cancelTarget, setCancelTarget] = useState<TransferRequest | null>(null)

  const targets = (departments.data ?? []).filter((department) => department.id !== departmentId)

  const submitResignation = () => {
    setFormError(undefined)
    if (!resignReason.trim()) {
      setFormError('Vui lòng nhập lý do nghỉ việc.')
      return
    }
    resignationMutations.createMine.mutate(
      { userId, reason: resignReason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã gửi yêu cầu nghỉ việc.')
          setResignOpen(false)
          setResignReason('')
        },
        onError: (cause) => setFormError(ApiError.from(cause).message),
      },
    )
  }

  const submitTransfer = () => {
    setFormError(undefined)
    if (!targetDepartmentId) {
      setFormError('Chọn phòng ban muốn chuyển đến.')
      return
    }
    if (!transferReason.trim()) {
      setFormError('Vui lòng nhập lý do điều chuyển.')
      return
    }
    transfer.createMine.mutate(
      { userId, toDepartmentId: targetDepartmentId, reason: transferReason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã gửi yêu cầu điều chuyển.')
          setTransferOpen(false)
          setTargetDepartmentId('')
          setTransferReason('')
        },
        onError: (cause) => setFormError(ApiError.from(cause).message),
      },
    )
  }

  if (!departmentId) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Cá nhân · Yêu cầu"
          title="Yêu cầu của tôi"
          description="Gửi và theo dõi yêu cầu nghỉ việc hoặc điều chuyển phòng ban."
        />
        <Alert tone="info" className="mt-5" title="Chưa thuộc phòng ban">
          Tài khoản của bạn chưa được xếp vào phòng ban nên chưa gửi được yêu cầu nhân sự. Hãy liên
          hệ quản trị viên tổ chức.
        </Alert>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân · Yêu cầu"
        title="Yêu cầu của tôi"
        description="Gửi và theo dõi yêu cầu nghỉ việc hoặc điều chuyển phòng ban của chính bạn."
      />

      <div className="mt-5">
        <Tabs defaultValue="resignations">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="resignations">
              Nghỉ việc ({resignations.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger variant="underline" value="transfers">
              Điều chuyển ({transfer.mine.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resignations" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setResignOpen(true)}>
                <FileText aria-hidden="true" />
                Gửi yêu cầu nghỉ việc
              </Button>
            </div>
            {resignations.isLoading ? <Spinner label="Đang tải yêu cầu…" /> : null}
            {resignations.isError ? (
              <ErrorState
                title="Không tải được yêu cầu nghỉ việc"
                description={ApiError.from(resignations.error).message}
                onRetry={() => void resignations.refetch()}
              />
            ) : null}
            {!resignations.isLoading && !resignations.isError && (resignations.data ?? []).length === 0 ? (
              <EmptyState
                icon={<FileText className="size-5" aria-hidden="true" />}
                title="Bạn chưa có yêu cầu nghỉ việc"
                description="Yêu cầu đã gửi sẽ hiển thị tại đây cùng trạng thái duyệt."
              />
            ) : null}
            {(resignations.data ?? []).map((request) => (
              <Card key={request.id}>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-ink-900">{request.reason}</p>
                    <Badge tone={request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'danger' : 'warning'} dot>
                      {RESIGNATION_STATUS_LABELS[request.status] ?? request.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-500">
                    Gửi {formatDateTime(request.requestedAt)}
                    {request.decidedByName ? ` · Xử lý bởi ${request.decidedByName}` : ''}
                  </p>
                  {request.decisionNote ? (
                    <p className="text-xs text-ink-500">Ghi chú: {request.decisionNote}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="transfers" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight aria-hidden="true" />
                Gửi yêu cầu điều chuyển
              </Button>
            </div>
            {transfer.mine.isLoading ? <Spinner label="Đang tải yêu cầu…" /> : null}
            {transfer.mine.isError ? (
              <ErrorState
                title="Không tải được yêu cầu điều chuyển"
                description={ApiError.from(transfer.mine.error).message}
                onRetry={() => void transfer.mine.refetch()}
              />
            ) : null}
            {!transfer.mine.isLoading && !transfer.mine.isError && (transfer.mine.data ?? []).length === 0 ? (
              <EmptyState
                icon={<ArrowLeftRight className="size-5" aria-hidden="true" />}
                title="Bạn chưa có yêu cầu điều chuyển"
                description="Yêu cầu điều chuyển và tiến độ 4 bước sẽ hiển thị tại đây."
              />
            ) : null}
            {(transfer.mine.data ?? []).map((request) => (
              <Card key={request.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-ink-900">
                        {request.fromDepartmentName} → {request.toDepartmentName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        Yêu cầu bởi {request.requestedByName} · Gửi{' '}
                        {formatDateTime(request.requestedAt)}
                      </p>
                    </div>
                    <Badge tone={request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' || request.status === 'CANCELLED' ? 'danger' : 'warning'} dot>
                      {TRANSFER_STATUS_LABELS[request.status] ?? request.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-500">{request.reason}</p>
                  <TransferTimeline steps={request.steps} />
                  {request.actionableSteps.includes('EMPLOYEE') ||
                  (request.status === 'PENDING' && request.requestedBy === userId) ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {request.status === 'PENDING' && request.requestedBy === userId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelTarget(request)}
                        >
                          Huỷ yêu cầu
                        </Button>
                      ) : null}
                      {request.actionableSteps.includes('EMPLOYEE') ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDecisionNote('')
                              setDecisionTarget({ request, decision: 'reject' })
                            }}
                          >
                            <XCircle aria-hidden="true" />
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDecisionNote('')
                              setDecisionTarget({ request, decision: 'approve' })
                            }}
                          >
                            <CheckCircle2 aria-hidden="true" />
                            Xác nhận chuyển
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={resignOpen} onOpenChange={setResignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gửi yêu cầu nghỉ việc</DialogTitle>
            <DialogDescription>
              Yêu cầu được chuyển tới người duyệt theo thứ tự HR phòng ban → Trưởng phòng → Tổng
              quản lý được uỷ quyền → Chủ tổ chức.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Lý do nghỉ việc" required hint="Tối đa 1000 ký tự.">
              <Textarea
                rows={3}
                maxLength={1000}
                value={resignReason}
                onChange={(event) => setResignReason(event.target.value)}
              />
            </Field>
            {formError ? <Alert tone="danger" className="mt-3">{formError}</Alert> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResignOpen(false)}>
              Huỷ
            </Button>
            <Button isLoading={resignationMutations.createMine.isPending} onClick={submitResignation}>
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gửi yêu cầu điều chuyển</DialogTitle>
            <DialogDescription>
              Yêu cầu đi qua 4 bước: Trưởng phòng cũ → Trưởng phòng mới → Nhân sự → Bạn xác nhận.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Field label="Phòng ban muốn đến" required>
              <select
                className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
                value={targetDepartmentId}
                onChange={(event) => setTargetDepartmentId(event.target.value)}
              >
                <option value="">Chọn phòng ban</option>
                {targets.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lý do" required hint="Tối đa 1000 ký tự.">
              <Textarea
                rows={3}
                maxLength={1000}
                value={transferReason}
                onChange={(event) => setTransferReason(event.target.value)}
              />
            </Field>
            {formError ? <Alert tone="danger">{formError}</Alert> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Huỷ
            </Button>
            <Button isLoading={transfer.createMine.isPending} onClick={submitTransfer}>
              Gửi yêu cầu
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
              {decisionTarget?.decision === 'approve'
                ? 'Xác nhận chuyển phòng ban'
                : 'Từ chối điều chuyển'}
            </DialogTitle>
            <DialogDescription>
              {decisionTarget
                ? `${decisionTarget.request.fromDepartmentName} → ${decisionTarget.request.toDepartmentName}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field
              label="Ghi chú"
              hint="Tuỳ chọn, tối đa 1000 ký tự. Backend kiểm tra lại bước EMPLOYEE và thứ tự 4 bước."
            >
              <Textarea
                rows={3}
                maxLength={1000}
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant={decisionTarget?.decision === 'reject' ? 'danger' : 'primary'}
              isLoading={transfer.decide.isPending}
              onClick={() => {
                if (!decisionTarget) return
                transfer.decide.mutate(
                  {
                    id: decisionTarget.request.id,
                    step: 'EMPLOYEE',
                    decision: decisionTarget.decision,
                    input: { note: decisionNote.trim() || undefined },
                  },
                  {
                    onSuccess: () => {
                      toast.success(
                        decisionTarget.decision === 'approve'
                          ? 'Đã xác nhận chuyển phòng ban.'
                          : 'Đã từ chối điều chuyển.',
                      )
                      setDecisionTarget(null)
                    },
                    onError: (error) => toast.error(ApiError.from(error).message),
                  },
                )
              }}
            >
              {decisionTarget?.decision === 'approve' ? 'Xác nhận' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
        title="Huỷ yêu cầu điều chuyển?"
        description="Chỉ người tạo yêu cầu mới huỷ được yêu cầu đang chờ duyệt."
        confirmLabel="Huỷ yêu cầu"
        tone="danger"
        isLoading={transfer.cancel.isPending}
        onConfirm={() => {
          if (!cancelTarget) return
          transfer.cancel.mutate(
            { id: cancelTarget.id },
            {
              onSuccess: () => {
                toast.success('Đã huỷ yêu cầu điều chuyển.')
                setCancelTarget(null)
              },
              onError: (error) => toast.error(ApiError.from(error).message),
            },
          )
        }}
      />
    </PageContainer>
  )
}

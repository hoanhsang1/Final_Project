import { ArrowLeftRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { EmptyState } from '@/components/ui/feedback'
import { Field, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import { useDepartments, useEmployeeDirectory } from '@/features/organization/hooks'
import {
  TRANSFER_STATUS_LABELS,
  TRANSFER_STEP_LABELS,
  type TransferRequest,
} from '@/features/organization/types'
import { TransferTimeline } from '@/features/workflows/components/transfer-timeline'
import { useTransferWorkflow } from '@/features/workflows/hooks'
import { PERM } from '@/lib/permissions'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
}

function TransferCard({
  request,
  canDecide,
  canCancel,
  onDecision,
  onCancel,
}: {
  request: TransferRequest
  canDecide: boolean
  canCancel: boolean
  onDecision: (request: TransferRequest) => void
  onCancel: (request: TransferRequest) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {request.fullName || request.username} · {request.fromDepartmentName} →{' '}
              {request.toDepartmentName}
            </CardTitle>
            <p className="mt-0.5 text-xs text-ink-500">
              Tạo bởi {request.requestedByName} · {formatDateTime(request.requestedAt)}
            </p>
          </div>
          <Badge tone={STATUS_TONE[request.status] ?? 'neutral'} dot>
            {TRANSFER_STATUS_LABELS[request.status] ?? request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-1">
        <p className="text-sm text-ink-600">{request.reason}</p>
        <TransferTimeline steps={request.steps} />
        {canDecide || canCancel ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canCancel ? (
              <Button variant="outline" size="sm" onClick={() => onCancel(request)}>
                Huỷ yêu cầu
              </Button>
            ) : null}
            {canDecide ? (
              <Button size="sm" onClick={() => onDecision(request)}>
                Xử lý bước đang chờ
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function TransfersPage() {
  const { can, session } = usePermission()
  const currentUserId = session?.user.id ?? ''
  const workflow = useTransferWorkflow()
  const departments = useDepartments()
  const directory = useEmployeeDirectory()

  const canCreate = can(PERM.employeeTransfer)
  const canViewEmployees = can(PERM.employeeView)

  const [tab, setTab] = useState<'inbox' | 'mine'>('inbox')
  const [createOpen, setCreateOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string>()

  const [decisionTarget, setDecisionTarget] = useState<TransferRequest | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [cancelTarget, setCancelTarget] = useState<TransferRequest | null>(null)

  const inbox = workflow.inbox.data ?? []
  const mine = workflow.mine.data ?? []

  const employeeOptions = useMemo(
    () =>
      directory.rows
        .filter((row) => row.status === 'ACTIVE')
        .map((row) => ({
          id: row.userId,
          label: `${row.fullName || row.username} · ${row.departmentName}`,
        })),
    [directory.rows],
  )

  const submitCreate = () => {
    if (!userId) return setFormError('Chọn nhân sự cần điều chuyển.')
    if (!targetId) return setFormError('Chọn phòng ban đích.')
    if (!reason.trim()) return setFormError('Nêu lý do điều chuyển.')
    workflow.create.mutate(
      { userId, toDepartmentId: targetId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã tạo yêu cầu điều chuyển')
          setCreateOpen(false)
          setUserId('')
          setTargetId('')
          setReason('')
          setFormError(undefined)
        },
        onError: (error) => setFormError(ApiError.from(error).message),
      },
    )
  }

  const actionableStep = (request: TransferRequest) => request.actionableSteps[0]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tổ chức · Nhân sự"
        title="Điều chuyển phòng ban"
        description="Luồng 4 bên: trưởng phòng cũ → trưởng phòng mới → nhân sự → nhân viên xác nhận."
        actions={
          canCreate && canViewEmployees ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Tạo yêu cầu
            </Button>
          ) : null
        }
        meta={
          <span className="text-xs text-ink-400">
            Mỗi bước do đúng người có thẩm quyền quyết định; giao diện chỉ hiện nút cho bước
            backend trả trong <code className="font-mono">actionableSteps</code>.
          </span>
        }
      />

      {!canViewEmployees && canCreate ? (
        <p className="mt-4 rounded-md border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-600">
          Cần quyền xem nhân sự để chọn người điều chuyển.
        </p>
      ) : null}

      <div className="mt-5">
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'inbox' | 'mine')}>
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="inbox">
              Hộp chờ tôi duyệt ({inbox.length})
            </TabsTrigger>
            <TabsTrigger variant="underline" value="mine">
              Yêu cầu tôi tạo ({mine.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={tab} className="mt-4">
        <TabsContent value="inbox">
          {workflow.inbox.isError ? (
            <ErrorState
              title="Không tải được hộp duyệt"
              description={ApiError.from(workflow.inbox.error).message}
              onRetry={() => void workflow.inbox.refetch()}
            />
          ) : inbox.length === 0 && !workflow.inbox.isLoading ? (
            <EmptyState
              icon={<ArrowLeftRight className="size-5" aria-hidden="true" />}
              title="Không có yêu cầu chờ bạn"
              description="Khi tới lượt bạn duyệt một bước điều chuyển, yêu cầu sẽ xuất hiện tại đây."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {inbox.map((request) => (
                <TransferCard
                  key={request.id}
                  request={request}
                  canDecide={request.actionableSteps.length > 0}
                  canCancel={false}
                  onDecision={setDecisionTarget}
                  onCancel={setCancelTarget}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="mine">
          {workflow.mine.isError ? (
            <ErrorState
              title="Không tải được yêu cầu của bạn"
              description={ApiError.from(workflow.mine.error).message}
              onRetry={() => void workflow.mine.refetch()}
            />
          ) : mine.length === 0 && !workflow.mine.isLoading ? (
            <EmptyState
              icon={<ArrowLeftRight className="size-5" aria-hidden="true" />}
              title="Bạn chưa tạo yêu cầu điều chuyển"
              description="Yêu cầu do bạn khởi tạo sẽ hiển thị ở đây kèm tiến độ từng bước."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {mine.map((request) => (
                <TransferCard
                  key={request.id}
                  request={request}
                  canDecide={request.actionableSteps.length > 0}
                  canCancel={request.status === 'PENDING' && request.requestedBy === currentUserId}
                  onDecision={setDecisionTarget}
                  onCancel={setCancelTarget}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setFormError(undefined)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu điều chuyển</DialogTitle>
            <DialogDescription>
              Backend yêu cầu cả phòng nguồn và đích có Trưởng phòng; nhân sự đang có yêu cầu chờ
              duyệt sẽ bị từ chối.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Nhân sự" required error={formError && !userId ? formError : undefined}>
              <select
                value={userId}
                onChange={(event) => {
                  setUserId(event.target.value)
                  setFormError(undefined)
                }}
                className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
              >
                <option value="">Chọn nhân sự</option>
                {employeeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phòng ban đích" required>
              <select
                value={targetId}
                onChange={(event) => {
                  setTargetId(event.target.value)
                  setFormError(undefined)
                }}
                className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
              >
                <option value="">Chọn phòng ban</option>
                {(departments.data ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lý do" required hint="Tối đa 1000 ký tự.">
              <Textarea
                rows={4}
                value={reason}
                maxLength={1000}
                onChange={(event) => {
                  setReason(event.target.value)
                  setFormError(undefined)
                }}
              />
            </Field>
            {formError ? (
              <p className="text-xs font-medium text-danger-500" role="alert">
                {formError}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={submitCreate} isLoading={workflow.create.isPending}>
              Tạo yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(decisionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDecisionTarget(null)
            setDecisionNote('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quyết định bước điều chuyển</DialogTitle>
            <DialogDescription>
              {decisionTarget
                ? `${decisionTarget.fullName || decisionTarget.username}: ${
                    TRANSFER_STEP_LABELS[actionableStep(decisionTarget)] ??
                    actionableStep(decisionTarget)
                  }`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Ghi chú" hint="Tuỳ chọn, tối đa 1000 ký tự.">
              <Textarea
                rows={3}
                value={decisionNote}
                maxLength={1000}
                onChange={(event) => setDecisionNote(event.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              isLoading={workflow.decide.isPending}
              onClick={() => {
                if (!decisionTarget) return
                workflow.decide.mutate(
                  {
                    id: decisionTarget.id,
                    step: actionableStep(decisionTarget),
                    decision: 'reject',
                    input: { note: decisionNote.trim() || undefined },
                  },
                  {
                    onSuccess: () => {
                      toast.success('Đã từ chối bước này')
                      setDecisionTarget(null)
                      setDecisionNote('')
                    },
                    onError: (error) => toast.error(ApiError.from(error).message),
                  },
                )
              }}
            >
              Từ chối
            </Button>
            <Button
              isLoading={workflow.decide.isPending}
              onClick={() => {
                if (!decisionTarget) return
                workflow.decide.mutate(
                  {
                    id: decisionTarget.id,
                    step: actionableStep(decisionTarget),
                    decision: 'approve',
                    input: { note: decisionNote.trim() || undefined },
                  },
                  {
                    onSuccess: () => {
                      toast.success('Đã duyệt bước này')
                      setDecisionTarget(null)
                      setDecisionNote('')
                    },
                    onError: (error) => toast.error(ApiError.from(error).message),
                  },
                )
              }}
            >
              Duyệt
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
        description="Chỉ người tạo mới huỷ được yêu cầu đang chờ. Thao tác không thể hoàn tác."
        confirmLabel="Huỷ yêu cầu"
        tone="danger"
        isLoading={workflow.cancel.isPending}
        onConfirm={() => {
          if (!cancelTarget) return
          workflow.cancel.mutate(
            { id: cancelTarget.id },
            {
              onSuccess: () => {
                toast.success('Đã huỷ yêu cầu')
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

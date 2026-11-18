import { CheckCircle2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Field, Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import {
  useEquipment,
  useFacilityMutations,
  useIssues,
} from '@/features/facility/hooks'
import { ISSUE_STATUS_LABELS, type FacilityIssue } from '@/features/facility/types'
import { useDepartments } from '@/features/organization/hooks'
import { useDepartmentScope } from '@/features/organization/use-scope'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { moduleState } from '@/lib/nav'
import { PERM } from '@/lib/permissions'

function ReportIssueDialog({
  open,
  onOpenChange,
  departmentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string
}) {
  const equipment = useEquipment(departmentId)
  const mutations = useFacilityMutations(departmentId)
  const [equipmentId, setEquipmentId] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setEquipmentId('')
    setDescription('')
    setPhotoUrl('')
    setError(undefined)
  }, [open])

  const submit = () => {
    setError(undefined)
    if (!equipmentId) {
      setError('Vui lòng chọn thiết bị gặp sự cố.')
      return
    }
    if (!description.trim()) {
      setError('Vui lòng mô tả sự cố.')
      return
    }
    mutations.reportIssue.mutate(
      {
        equipmentId,
        description: description.trim(),
        photoUrl: photoUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Đã gửi báo cáo sự cố.')
          onOpenChange(false)
        },
        onError: (cause) =>
          setError(ApiError.from(cause).message || 'Không gửi được báo cáo sự cố.'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo cáo sự cố</DialogTitle>
          <DialogDescription>
            Thiết bị sẽ chuyển sang trạng thái hỏng cho đến khi sự cố được xử lý.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="Thiết bị" required>
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn thiết bị" />
              </SelectTrigger>
              <SelectContent>
                {(equipment.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.assetCode} · {item.name}
                    {item.roomName ? ` · ${item.roomName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mô tả sự cố" required>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mô tả tình trạng hỏng hóc…"
            />
          </Field>
          <Field label="Ảnh minh hoạ (URL)">
            <Input
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} isLoading={mutations.reportIssue.isPending}>
            Gửi báo cáo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FacilityIssuesPage() {
  const { can, session } = usePermission()
  const facilityState = moduleState(session, 'FACILITY_MANAGEMENT')
  const readOnly = facilityState === 'disabled' || facilityState === 'locked'
  const writable = !readOnly && facilityState !== 'not_registered'
  const scope = useDepartmentScope()
  const departments = useDepartments()
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [resolving, setResolving] = useState<FacilityIssue | null>(null)

  useEffect(() => {
    if (!scope.isScoped && !departmentId && departments.data?.length) {
      setDepartmentId(departments.data[0]!.id)
    }
  }, [scope.isScoped, departmentId, departments.data])

  const effectiveDepartmentId = scope.isScoped ? scope.departmentId : departmentId || null
  const issues = useIssues(effectiveDepartmentId, status)
  const mutations = useFacilityMutations(effectiveDepartmentId)

  const canReport = writable && (can(PERM.facilityIssueReport) || can(PERM.facilityManage))
  const canResolve = writable && (can(PERM.facilityIssueResolve) || can(PERM.facilityManage))
  const rows = issues.data ?? []

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Cơ sở vật chất"
        title="Sự cố thiết bị"
        description="Theo dõi báo cáo sự cố và đánh dấu xử lý xong cho từng thiết bị."
        actions={
          canReport && effectiveDepartmentId ? (
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <Plus aria-hidden="true" />
              Báo cáo sự cố
            </Button>
          ) : null
        }
      />

      {readOnly ? (
        <div className="mt-5">
          <Alert tone="warning">
            Module cơ sở vật chất đang ở chế độ chỉ đọc. Bạn vẫn có thể xem dữ liệu nhưng không thể
            tạo hoặc cập nhật.
          </Alert>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        {!scope.isScoped ? (
          <Field label="Phòng ban" labelSize="sm">
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="sm:w-60">
                <SelectValue placeholder="Chọn phòng ban" />
              </SelectTrigger>
              <SelectContent>
                {(departments.data ?? []).map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <Field label="Trạng thái" labelSize="sm">
          <Select value={status || 'all'} onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="open">Chờ xử lý</SelectItem>
              <SelectItem value="in_progress">Đang xử lý</SelectItem>
              <SelectItem value="resolved">Đã xử lý</SelectItem>
              <SelectItem value="unresolved">Chưa xử lý được</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="mt-4 space-y-3">
        {!effectiveDepartmentId ? (
          <Alert tone="info" title="Chọn phòng ban">
            Chọn phòng ban để xem danh sách sự cố.
          </Alert>
        ) : null}
        {issues.isLoading ? <Spinner label="Đang tải sự cố…" /> : null}
        {issues.isError ? (
          <ErrorState
            title="Không tải được danh sách sự cố"
            description={ApiError.from(issues.error).message}
            onRetry={() => void issues.refetch()}
          />
        ) : null}
        {!issues.isLoading && effectiveDepartmentId && rows.length === 0 ? (
          <EmptyState title="Chưa có sự cố" description="Không có báo cáo sự cố phù hợp bộ lọc." />
        ) : null}
        {rows.map((issue) => (
          <Card key={issue.id}>
            <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink-900">{issue.equipmentName ?? 'Thiết bị'}</p>
                  <Badge
                    tone={
                      issue.status === 'resolved'
                        ? 'success'
                        : issue.status === 'open'
                          ? 'warning'
                          : 'info'
                    }
                    dot
                  >
                    {ISSUE_STATUS_LABELS[issue.status] ?? issue.status}
                  </Badge>
                </div>
                <p className="text-sm text-ink-700">{issue.description}</p>
                <p className="text-xs text-ink-500">
                  Báo lúc {formatDateTime(issue.createdAt)}
                  {issue.resolvedAt ? ` · Xử lý lúc ${formatDateTime(issue.resolvedAt)}` : ''}
                </p>
                {issue.photoUrl ? (
                  <a
                    href={issue.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-jade-700 underline underline-offset-2"
                  >
                    Ảnh minh hoạ
                  </a>
                ) : null}
              </div>
              {canResolve && issue.status !== 'resolved' ? (
                <Button size="sm" variant="outline" onClick={() => setResolving(issue)}>
                  <CheckCircle2 aria-hidden="true" />
                  Đánh dấu đã xử lý
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {effectiveDepartmentId ? (
        <ReportIssueDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          departmentId={effectiveDepartmentId}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(resolving)}
        onOpenChange={(open) => !open && setResolving(null)}
        title="Xác nhận đã xử lý sự cố"
        description="Thiết bị sẽ trở lại trạng thái đang sử dụng sau khi sự cố được đánh dấu xử lý."
        confirmLabel="Đã xử lý"
        onConfirm={() => {
          if (!resolving) return
          mutations.resolveIssue.mutate(resolving.id, {
            onSuccess: () => {
              toast.success('Đã đánh dấu sự cố đã xử lý.')
              setResolving(null)
            },
            onError: (cause) =>
              toast.error(ApiError.from(cause).message || 'Không cập nhật được sự cố.'),
          })
        }}
      />
    </PageContainer>
  )
}

import { CalendarDays, DoorOpen, Pencil, Plus, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataColumn } from '@/components/ui/data-table'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useAssignableTeachers, useClasses } from '@/features/academic/hooks'
import { usePermission } from '@/features/auth/hooks'
import { useDepartments } from '@/features/organization/hooks'
import { useDepartmentScope } from '@/features/organization/use-scope'
import {
  useRoomSuggestions,
  useScheduleMutations,
  useSchedules,
} from '@/features/schedule/hooks'
import { SESSION_STATUS_LABELS, type ScheduleInput, type ScheduleSession } from '@/features/schedule/types'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { PERM } from '@/lib/permissions'

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function dayBounds(from: string, to: string): { from?: string; to?: string } {
  return {
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  }
}

type SessionForm = {
  classId: string
  teacherId: string
  roomId: string
  startTime: string
  endTime: string
}

const EMPTY_FORM: SessionForm = {
  classId: '',
  teacherId: 'none',
  roomId: 'none',
  startTime: '',
  endTime: '',
}

function SessionDialog({
  open,
  onOpenChange,
  departmentId,
  session,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string | null
  session: ScheduleSession | null
}) {
  const classes = useClasses({ page: 1, size: 100, selectable: true })
  const teachers = useAssignableTeachers('', open)
  const mutations = useScheduleMutations(departmentId)
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setForm(
      session
        ? {
            classId: session.classId,
            teacherId: session.teacherId ?? 'none',
            roomId: session.roomId ?? 'none',
            startTime: toLocalInput(session.startTime),
            endTime: toLocalInput(session.endTime),
          }
        : EMPTY_FORM,
    )
    setError(undefined)
  }, [open, session])

  const startIso = toIso(form.startTime)
  const endIso = toIso(form.endTime)
  const suggestions = useRoomSuggestions(
    departmentId,
    { startTime: startIso, endTime: endIso },
    open,
  )

  const submit = () => {
    setError(undefined)
    if (!form.classId) {
      setError('Vui lòng chọn lớp học.')
      return
    }
    if (!startIso || !endIso) {
      setError('Vui lòng nhập thời gian bắt đầu và kết thúc.')
      return
    }
    if (endIso <= startIso) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.')
      return
    }
    const input: ScheduleInput = {
      classId: form.classId,
      teacherId: form.teacherId === 'none' ? undefined : form.teacherId,
      roomId: form.roomId === 'none' ? undefined : form.roomId,
      startTime: startIso,
      endTime: endIso,
    }
    const handlers = {
      onSuccess: () => {
        toast.success(session ? 'Đã cập nhật buổi học.' : 'Đã tạo buổi học.')
        onOpenChange(false)
      },
      onError: (cause: unknown) =>
        setError(ApiError.from(cause).message || 'Không lưu được buổi học.'),
    }
    if (session) mutations.update.mutate({ id: session.id, input }, handlers)
    else mutations.create.mutate(input, handlers)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{session ? 'Cập nhật buổi học' : 'Xếp buổi học'}</DialogTitle>
          <DialogDescription>
            Thời gian được gửi theo múi giờ hiện tại. Phòng gợi ý chỉ gồm phòng còn trống và đang hoạt động.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="Lớp học" required>
            <Select
              value={form.classId}
              onValueChange={(value) => setForm({ ...form, classId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp" />
              </SelectTrigger>
              <SelectContent>
                {(classes.data?.items ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.classCode} · {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bắt đầu" required>
              <Input
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
              />
            </Field>
            <Field label="Kết thúc" required>
              <Input
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Giáo viên">
            <Select
              value={form.teacherId}
              onValueChange={(value) => setForm({ ...form, teacherId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn giáo viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa phân công</SelectItem>
                {(teachers.data?.items ?? []).map((teacher) => (
                  <SelectItem key={teacher.userId} value={teacher.userId}>
                    {teacher.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Phòng học"
            hint={
              suggestions.isFetching
                ? 'Đang tìm phòng trống…'
                : 'Chọn thời gian để tải danh sách phòng còn trống.'
            }
          >
            <Select value={form.roomId} onValueChange={(value) => setForm({ ...form, roomId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn phòng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa xếp phòng</SelectItem>
                {(suggestions.data ?? []).map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.code} · {room.name} ({room.capacity} chỗ)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={submit}
            isLoading={mutations.create.isPending || mutations.update.isPending}
          >
            {session ? 'Lưu thay đổi' : 'Xếp lịch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SchedulePage() {
  const { can } = usePermission()
  const scope = useDepartmentScope()
  const departments = useDepartments()
  const [departmentId, setDepartmentId] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleSession | null>(null)
  const [cancelling, setCancelling] = useState<ScheduleSession | null>(null)
  const [deleting, setDeleting] = useState<ScheduleSession | null>(null)

  const effectiveDepartmentId = scope.isScoped ? scope.departmentId : departmentId || null

  useEffect(() => {
    if (!scope.isScoped && !departmentId && departments.data?.length) {
      setDepartmentId(departments.data[0]!.id)
    }
  }, [scope.isScoped, departmentId, departments.data])

  const bounds = useMemo(() => dayBounds(from, to), [from, to])
  const sessions = useSchedules(effectiveDepartmentId, bounds)
  const mutations = useScheduleMutations(effectiveDepartmentId)
  const classes = useClasses({ page: 1, size: 100 })

  const className = (id: string) => {
    const found = classes.data?.items.find((item) => item.id === id)
    return found ? `${found.classCode} · ${found.name}` : id.slice(0, 8)
  }

  const rows = sessions.data ?? []
  const cancelled = rows.filter((row) => row.status === 'cancelled').length

  const columns: DataColumn<ScheduleSession>[] = [
    {
      id: 'class',
      header: 'Lớp & Môn học',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{className(row.classId)}</p>
          {row.subjectName ? (
            <p className="truncate text-xs font-medium text-brand-600">{row.subjectName}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'teacher',
      header: 'Giáo viên',
      cell: (row) => (
        <span className="text-sm text-ink-800">
          {row.teacherName ?? (row.teacherId ? `${row.teacherId.slice(0, 8)}…` : '—')}
        </span>
      ),
    },
    {
      id: 'room',
      header: 'Phòng học',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-900">
            {row.roomCode ?? (row.roomId ? `${row.roomId.slice(0, 8)}…` : '—')}
          </p>
          <p className="truncate text-xs text-ink-500">{row.roomId ? 'Đã xếp phòng' : 'Chưa có phòng'}</p>
        </div>
      ),
    },
    {
      id: 'start',
      header: 'Bắt đầu',
      cell: (row) => formatDateTime(row.startTime),
      sortValue: (row) => row.startTime,
    },
    {
      id: 'end',
      header: 'Kết thúc',
      hideBelow: 'md',
      cell: (row) => formatDateTime(row.endTime),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <Badge tone={row.status === 'cancelled' ? 'danger' : row.status === 'ongoing' ? 'success' : 'neutral'} dot>
          {SESSION_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {can(PERM.scheduleEdit) && row.status !== 'cancelled' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row)
                setDialogOpen(true)
              }}
            >
              <Pencil aria-hidden="true" />
              Sửa
            </Button>
          ) : null}
          {can(PERM.scheduleCancelSession) && row.status !== 'cancelled' ? (
            <Button variant="ghost" size="sm" onClick={() => setCancelling(row)}>
              <XCircle aria-hidden="true" />
              Huỷ
            </Button>
          ) : null}
          {can(PERM.scheduleDelete) ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleting(row)}>
              <Trash2 aria-hidden="true" />
              Xoá
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Lịch học"
        title="Lịch học"
        description="Xếp buổi học theo phòng ban, chọn phòng còn trống và theo dõi trạng thái buổi học."
        actions={
          can(PERM.scheduleCreate) ? (
            <Button
              size="sm"
              disabled={!effectiveDepartmentId}
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus aria-hidden="true" />
              Xếp buổi học
            </Button>
          ) : null
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {rows.length} buổi
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <DoorOpen className="size-3.5" aria-hidden="true" />
              {cancelled} đã huỷ
            </span>
          </>
        }
      />

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
        <Field label="Từ ngày" labelSize="sm">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="Đến ngày" labelSize="sm">
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          isLoading={sessions.isLoading}
          error={
            sessions.isError ? (
              <ErrorState
                title="Không tải được lịch học"
                description={ApiError.from(sessions.error).message}
                onRetry={() => void sessions.refetch()}
              />
            ) : undefined
          }
          empty={
            <p className="py-8 text-center text-sm text-ink-500">
              {effectiveDepartmentId
                ? 'Không có buổi học trong khoảng thời gian đã chọn.'
                : 'Chọn phòng ban để xem lịch học.'}
            </p>
          }
          initialPageSize={20}
        />
      </div>

      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departmentId={effectiveDepartmentId}
        session={editing}
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Huỷ buổi học"
        description="Buổi học sẽ chuyển sang trạng thái đã huỷ và không thể khôi phục tự động."
        confirmLabel="Huỷ buổi"
        tone="danger"
        onConfirm={() => {
          if (!cancelling) return
          mutations.cancel.mutate(cancelling.id, {
            onSuccess: () => {
              toast.success('Đã huỷ buổi học.')
              setCancelling(null)
            },
            onError: (cause) =>
              toast.error(ApiError.from(cause).message || 'Không huỷ được buổi học.'),
          })
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá buổi học"
        description="Buổi học sẽ bị xoá khỏi lịch. Thao tác không thể hoàn tác."
        confirmLabel="Xoá"
        tone="danger"
        onConfirm={() => {
          if (!deleting) return
          mutations.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Đã xoá buổi học.')
              setDeleting(null)
            },
            onError: (cause) =>
              toast.error(ApiError.from(cause).message || 'Không xoá được buổi học.'),
          })
        }}
      />
    </PageContainer>
  )
}

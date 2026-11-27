import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  List,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer } from '@/components/layout/page-container'
import { useAssignableTeachers, useClasses } from '@/features/academic/hooks'
import { usePermission } from '@/features/auth/hooks'
import { useDepartments } from '@/features/organization/hooks'
import { useDepartmentScope } from '@/features/organization/use-scope'
import { WeekCalendar, laneStyle, type WeekCalendarEntry } from '@/features/schedule/components/week-calendar'
import {
  addDaysLocal,
  dateKey,
  parseDateKey,
  startOfWeekLocal,
} from '@/features/schedule/components/week-calendar-utils'
import {
  useRoomSuggestions,
  useScheduleMutations,
  useSchedules,
  useSchedulesByDepartments,
} from '@/features/schedule/hooks'
import {
  ROOM_TYPE_LABELS,
  SESSION_STATUS_LABELS,
  type ScheduleInput,
  type ScheduleSession,
} from '@/features/schedule/types'
import { ApiError } from '@/lib/api-error'
import { formatDateTime, formatDayMonth } from '@/lib/format'
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
    { startTime: startIso, endTime: endIso, classId: form.classId || undefined },
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
                    {room.roomType ? ` · ${ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}` : ''}
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

type ScheduleTab = 'week' | 'list'

export function SchedulePage() {
  const { can } = usePermission()
  const scope = useDepartmentScope()
  const departments = useDepartments()
  const classes = useClasses({ page: 1, size: 100 })
  const [tab, setTab] = useState<ScheduleTab>('week')
  const [departmentId, setDepartmentId] = useState('')
  const [anchorKey, setAnchorKey] = useState(() => dateKey(startOfWeekLocal(new Date())))
  const [hiddenDepartmentIds, setHiddenDepartmentIds] = useState<string[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleSession | null>(null)
  const [cancelling, setCancelling] = useState<ScheduleSession | null>(null)
  const [deleting, setDeleting] = useState<ScheduleSession | null>(null)

  useEffect(() => {
    if (!scope.isScoped && !departmentId && departments.data?.length) {
      setDepartmentId(departments.data[0]!.id)
    }
  }, [scope.isScoped, departmentId, departments.data])

  const createDepartmentId = scope.isScoped ? scope.departmentId : departmentId || null
  const anchor = parseDateKey(anchorKey)
  const weekEnd = addDaysLocal(anchor, 6)

  const weekParams = useMemo(() => {
    const start = parseDateKey(anchorKey)
    const end = addDaysLocal(start, 6)
    return {
      from: new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString(),
      to: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString(),
    }
  }, [anchorKey])

  const weekDepartments = useMemo(() => {
    if (!scope.isScoped) return (departments.data ?? []).map(({ id, name }) => ({ id, name }))
    if (!scope.departmentId) return []
    const found = (departments.data ?? []).find((department) => department.id === scope.departmentId)
    return [{ id: scope.departmentId, name: found?.name ?? 'Phòng ban của tôi' }]
  }, [scope.isScoped, scope.departmentId, departments.data])

  const weekQueries = useSchedulesByDepartments(
    weekDepartments.map((department) => department.id),
    weekParams,
  )

  const weekEntries: WeekCalendarEntry[] = weekQueries.flatMap((query, index) => {
    const department = weekDepartments[index]
    if (!department || hiddenDepartmentIds.includes(department.id)) return []
    return (query.data ?? []).map((session) => ({ session, lane: index }))
  })
  const weekLoading =
    departments.isLoading ||
    (weekDepartments.length > 0 && weekQueries.some((query) => query.isPending))
  const weekFailed =
    weekDepartments.length > 0 && weekQueries.every((query) => query.isError)
  const weekErrors = weekQueries
    .map((query, index) => ({ query, name: weekDepartments[index]?.name ?? '' }))
    .filter((entry) => entry.query.isError)

  const listBounds = useMemo(() => dayBounds(from, to), [from, to])
  const listSessions = useSchedules(createDepartmentId, listBounds)
  const listMutations = useScheduleMutations(createDepartmentId)
  const listRows = listSessions.data ?? []

  const labelOf = (session: ScheduleSession) => {
    const found = classes.data?.items.find((item) => item.id === session.classId)
    if (found) return `${found.classCode} · ${found.name}`
    return session.className ?? session.classId.slice(0, 8)
  }

  const className = (id: string) => {
    const found = classes.data?.items.find((item) => item.id === id)
    return found ? `${found.classCode} · ${found.name}` : id.slice(0, 8)
  }

  const toggleDepartment = (id: string, checked: boolean) => {
    setHiddenDepartmentIds((current) =>
      checked ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const shownRows = tab === 'week' ? weekEntries.map((entry) => entry.session) : listRows
  const cancelled = shownRows.filter((row) => row.status === 'cancelled').length

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
        description="Lịch tuần hiển thị mọi phòng ban được phân quyền; buổi học mới xếp theo phòng ban đang chọn."
        actions={
          can(PERM.scheduleCreate) ? (
            <Button
              size="sm"
              disabled={!createDepartmentId}
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
              {shownRows.length} buổi
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <DoorOpen className="size-3.5" aria-hidden="true" />
              {cancelled} đã huỷ
            </span>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as ScheduleTab)} className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
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

            {tab === 'week' ? (
              <>
                <Field label="Tuần" labelSize="sm">
                  <Input
                    type="date"
                    value={anchorKey}
                    onChange={(event) => {
                      if (!event.target.value) return
                      setAnchorKey(dateKey(startOfWeekLocal(parseDateKey(event.target.value))))
                    }}
                  />
                </Field>
                <div className="flex items-center gap-1 pb-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Tuần trước"
                    onClick={() => setAnchorKey(dateKey(addDaysLocal(anchor, -7)))}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAnchorKey(dateKey(startOfWeekLocal(new Date())))}
                  >
                    Hôm nay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Tuần sau"
                    onClick={() => setAnchorKey(dateKey(addDaysLocal(anchor, 7)))}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
                <span className="pb-2 text-sm font-medium text-ink-800">
                  {formatDayMonth(anchor)} – {formatDayMonth(weekEnd)}/{weekEnd.getFullYear()}
                </span>
              </>
            ) : (
              <>
                <Field label="Từ ngày" labelSize="sm">
                  <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                </Field>
                <Field label="Đến ngày" labelSize="sm">
                  <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                </Field>
              </>
            )}
          </div>

          <TabsList>
            <TabsTrigger value="week">
              <CalendarDays aria-hidden="true" />
              Tuần
            </TabsTrigger>
            <TabsTrigger value="list">
              <List aria-hidden="true" />
              Danh sách
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="week" className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {weekDepartments.map((department, index) => (
              <div
                key={department.id}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1"
              >
                <Checkbox
                  id={`week-dept-${department.id}`}
                  checked={!hiddenDepartmentIds.includes(department.id)}
                  onCheckedChange={(checked) => toggleDepartment(department.id, checked === true)}
                />
                <label
                  htmlFor={`week-dept-${department.id}`}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-700"
                >
                  <span
                    className={`size-2.5 rounded-full ${laneStyle(index).dot}`}
                    aria-hidden="true"
                  />
                  {department.name}
                </label>
              </div>
            ))}
            {weekErrors.map((entry) => (
              <Badge key={entry.name} tone="danger">
                {entry.name}: {ApiError.from(entry.query.error).message}
              </Badge>
            ))}
          </div>

          {weekFailed ? (
            <ErrorState
              title="Không tải được lịch học"
              description={ApiError.from(weekErrors[0]?.query.error).message}
              onRetry={() => weekQueries.forEach((query) => void query.refetch())}
            />
          ) : weekLoading ? (
            <p className="py-8 text-center text-sm text-ink-500">Đang tải lịch…</p>
          ) : (
            <>
              {weekEntries.length === 0 ? (
                <p className="text-sm text-ink-500">Không có buổi học trong tuần này.</p>
              ) : null}
              <WeekCalendar
                weekStart={anchor}
                entries={weekEntries}
                labelOf={labelOf}
                canEdit={can(PERM.scheduleEdit)}
                onSelect={(session) => {
                  setEditing(session)
                  setDialogOpen(true)
                }}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <DataTable
            columns={columns}
            data={listRows}
            rowKey={(row) => row.id}
            isLoading={listSessions.isLoading}
            error={
              listSessions.isError ? (
                <ErrorState
                  title="Không tải được lịch học"
                  description={ApiError.from(listSessions.error).message}
                  onRetry={() => void listSessions.refetch()}
                />
              ) : undefined
            }
            empty={
              <p className="py-8 text-center text-sm text-ink-500">
                {createDepartmentId
                  ? 'Không có buổi học trong khoảng thời gian đã chọn.'
                  : 'Chọn phòng ban để xem lịch học.'}
              </p>
            }
            initialPageSize={20}
          />
        </TabsContent>
      </Tabs>

      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departmentId={editing?.departmentId ?? createDepartmentId}
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
          listMutations.cancel.mutate(cancelling.id, {
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
          listMutations.remove.mutate(deleting.id, {
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

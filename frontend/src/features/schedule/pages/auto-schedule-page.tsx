import { AlertCircle, CalendarCog, CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataColumn } from '@/components/ui/data-table'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageContainer } from '@/components/layout/page-container'
import { useClasses } from '@/features/academic/hooks'
import { useDepartments } from '@/features/organization/hooks'
import { useDepartmentScope } from '@/features/organization/use-scope'
import { useAutoSchedule, useSchedules } from '@/features/schedule/hooks'
import type { AutoScheduleResult, TimeSlot, UnscheduledItem } from '@/features/schedule/types'
import { SESSION_STATUS_LABELS, type ScheduleSession } from '@/features/schedule/types'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { PERM } from '@/lib/permissions'
import { usePermission } from '@/features/auth/hooks'

const DAY_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { startTime: '07:30', endTime: '09:00' },
  { startTime: '09:15', endTime: '10:45' },
  { startTime: '13:00', endTime: '14:30' },
  { startTime: '14:45', endTime: '16:15' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function nextMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function AutoSchedulePage() {
  const { can } = usePermission()
  const scope = useDepartmentScope()
  const departments = useDepartments()
  const [departmentId, setDepartmentId] = useState<string>(scope.departmentId ?? '')
  const effectiveDepartmentId = scope.isScoped ? scope.departmentId : departmentId

  // ---- Form state ----
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(nextMonth())
  const [slots, setSlots] = useState<TimeSlot[]>(DEFAULT_SLOTS)
  const [sessionDays, setSessionDays] = useState<number[]>([1, 2, 3, 4, 5])

  // ---- Result state ----
  const [result, setResult] = useState<AutoScheduleResult | null>(null)
  const [showScheduled, setShowScheduled] = useState(true)
  const [showUnscheduled, setShowUnscheduled] = useState(true)

  const classes = useClasses({ page: 1, size: 100, selectable: true })
  const autoSchedule = useAutoSchedule(effectiveDepartmentId ?? null)

  // Reload scheduled sessions after auto-generate
  const _sessions = useSchedules(effectiveDepartmentId ?? null, {
    from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
    to: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
  })
  void _sessions

  const canRun = can(PERM.scheduleCreate) && Boolean(effectiveDepartmentId) && selectedClassIds.length > 0

  function toggleClass(id: string) {
    setSelectedClassIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    )
  }

  function toggleDay(day: number) {
    setSessionDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort(),
    )
  }

  function addSlot() {
    setSlots(prev => [...prev, { startTime: '07:30', endTime: '09:00' }])
  }

  function removeSlot(index: number) {
    setSlots(prev => prev.filter((_, i) => i !== index))
  }

  function updateSlot(index: number, field: keyof TimeSlot, value: string) {
    setSlots(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function runAutoSchedule() {
    if (!effectiveDepartmentId) return
    setResult(null)
    autoSchedule.mutate(
      {
        classIds: selectedClassIds,
        dateFrom,
        dateTo,
        slots,
        sessionDays: sessionDays.length > 0 ? sessionDays : undefined,
      },
      {
        onSuccess: (data) => {
          setResult(data)
          if (data.summary.scheduled > 0) {
            toast.success(`Đã xếp được ${data.summary.scheduled}/${data.summary.totalRequested} lớp.`)
          } else {
            toast.error('Không xếp được lớp nào. Xem chi tiết bên dưới.')
          }
        },
        onError: (err) => {
          toast.error(ApiError.from(err).message || 'Lỗi khi chạy thuật toán.')
        },
      },
    )
  }

  // ---- Table columns: scheduled ----
  const scheduledColumns: DataColumn<ScheduleSession>[] = [
    { id: 'className', header: 'Lớp', cell: (r: ScheduleSession) => r.className ?? r.classId },
    {
      id: 'startTime',
      header: 'Bắt đầu',
      cell: (r: ScheduleSession) => formatDateTime(r.startTime),
    },
    {
      id: 'endTime',
      header: 'Kết thúc',
      cell: (r: ScheduleSession) => formatDateTime(r.endTime),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (r: ScheduleSession) => (
        <Badge tone="neutral">
          {SESSION_STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      ),
    },
  ]

  // ---- Table columns: unscheduled ----
  const unscheduledColumns: DataColumn<UnscheduledItem>[] = [
    { id: 'className', header: 'Lớp', cell: (r: UnscheduledItem) => r.className ?? r.classId },
    { id: 'subjectName', header: 'Môn học', cell: (r: UnscheduledItem) => r.subjectName ?? '—' },
    {
      id: 'reason',
      header: 'Lý do không xếp được',
      cell: (r: UnscheduledItem) => (
        <span className="flex items-start gap-1.5 text-red-600">
          <XCircle className="mt-0.5 size-4 shrink-0" />
          {r.reason}
        </span>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo › Lịch học"
        title="Tự động xếp lịch"
        description="Chọn lớp, khoảng thời gian và khung giờ — hệ thống sẽ tự phân bổ giáo viên, phòng và buổi học."
      />

      {/* ---- Input section ---- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Dept selector */}
        {!scope.isScoped && (
          <div className="lg:col-span-2">
            <Field label="Phòng ban" labelSize="sm">
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="sm:w-72">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {(departments.data ?? []).map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {/* Date range */}
        <div className="flex gap-3">
          <Field label="Từ ngày" labelSize="sm">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </Field>
          <Field label="Đến ngày" labelSize="sm">
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </Field>
        </div>

        {/* Session days */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">Các thứ được phép xếp</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  sessionDays.includes(day)
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-zinc-300 bg-white text-ink-700 hover:border-blue-400'
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div className="lg:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-medium text-ink-700">Khung giờ trong ngày</p>
            <Button size="sm" variant="ghost" onClick={addSlot}>
              <Plus className="size-3.5" />
              Thêm khung giờ
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <Field label={`Ca ${i + 1} – Bắt đầu`} labelSize="sm">
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={e => updateSlot(i, 'startTime', e.target.value)}
                  />
                </Field>
                <Field label="Kết thúc" labelSize="sm">
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={e => updateSlot(i, 'endTime', e.target.value)}
                  />
                </Field>
                {slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="mt-5 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Class selector */}
        <div className="lg:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-ink-700">
            Chọn lớp cần xếp lịch
            {selectedClassIds.length > 0 && (
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {selectedClassIds.length} đã chọn
              </span>
            )}
          </p>
          {classes.isLoading ? (
            <p className="text-sm text-ink-500">Đang tải danh sách lớp...</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
              {((classes.data as { items?: { id: string; name: string; classCode?: string; subjectName?: string }[] } | undefined)?.items ?? []).map(cls => (
                <label
                  key={cls.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-zinc-300"
                    checked={selectedClassIds.includes(cls.id)}
                    onChange={() => toggleClass(cls.id)}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{cls.name}</span>
                    {cls.classCode && (
                      <span className="ml-1.5 text-xs text-ink-500">({cls.classCode})</span>
                    )}
                    {cls.subjectName && (
                      <span className="ml-1.5 text-xs text-ink-400">· {cls.subjectName}</span>
                    )}
                  </span>
                </label>
              ))}
              {((classes.data as { items?: unknown[] } | undefined)?.items ?? []).length === 0 && (
                <p className="py-4 text-center text-sm text-ink-500">Không có lớp nào.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Run button ---- */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          size="md"
          disabled={!canRun || autoSchedule.isPending}
          onClick={runAutoSchedule}
        >
          {autoSchedule.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Đang xếp lịch...
            </>
          ) : (
            <>
              <CalendarCog className="size-4" />
              Tự động xếp lịch
            </>
          )}
        </Button>
        {!can(PERM.scheduleCreate) && (
          <p className="text-sm text-red-500">Bạn không có quyền xếp lịch.</p>
        )}
        {!effectiveDepartmentId && (
          <p className="text-sm text-zinc-500">Chọn phòng ban để bắt đầu.</p>
        )}
      </div>

      {/* ---- Results ---- */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Summary banner */}
          <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="size-5" />
              <span className="font-semibold">{result.summary.scheduled}</span>
              <span className="text-sm">lớp đã xếp</span>
            </div>
            <div className="h-5 w-px bg-zinc-300" />
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="size-5" />
              <span className="font-semibold">{result.summary.unscheduled}</span>
              <span className="text-sm">lớp chưa xếp được</span>
            </div>
            <div className="h-5 w-px bg-zinc-300" />
            <span className="text-sm text-ink-500">Tổng: {result.summary.totalRequested} lớp</span>
          </div>

          {/* Scheduled sessions */}
          {result.scheduled.length > 0 && (
            <div>
              <button
                type="button"
                className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-green-700"
                onClick={() => setShowScheduled(v => !v)}
              >
                {showScheduled ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                Buổi học đã xếp ({result.scheduled.length})
              </button>
              {showScheduled && (
                <DataTable
                  columns={scheduledColumns}
                  data={result.scheduled}
                  rowKey={r => r.id}
                  initialPageSize={20}
                />
              )}
            </div>
          )}

          {/* Unscheduled items */}
          {result.unscheduled.length > 0 && (
            <div>
              <button
                type="button"
                className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-red-600"
                onClick={() => setShowUnscheduled(v => !v)}
              >
                {showUnscheduled ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                Lớp chưa xếp được ({result.unscheduled.length})
              </button>
              {showUnscheduled && (
                <DataTable
                  columns={unscheduledColumns}
                  data={result.unscheduled}
                  rowKey={r => r.classId}
                  initialPageSize={20}
                />
              )}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}

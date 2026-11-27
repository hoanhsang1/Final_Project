import {
  AlertCircle,
  CalendarCog,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useClasses } from '@/features/academic/hooks'
import { useDepartments } from '@/features/organization/hooks'
import { useDepartmentScope } from '@/features/organization/use-scope'
import { DraftItemDialog } from '@/features/schedule/components/draft-item-dialog'
import { DraftWeekGrid } from '@/features/schedule/components/draft-week-grid'
import {
  useScheduleDraftDetail,
  useScheduleDraftMutations,
  useScheduleDrafts,
  useScheduleTimeSlots,
} from '@/features/schedule/hooks'
import {
  DRAFT_STATUS_LABELS,
  WEEKDAY_LABELS,
  type ScheduleDraftConfirmResult,
  type ScheduleDraftItem,
  type ScheduleDraftPatch,
  type ScheduleDraftStatus,
} from '@/features/schedule/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { usePermission } from '@/features/auth/hooks'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function plusDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const STATUS_TONES: Record<ScheduleDraftStatus, 'neutral' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  CONFIRMED: 'success',
  DISCARDED: 'danger',
}

export function AutoSchedulePage() {
  const { can } = usePermission()
  const scope = useDepartmentScope()
  const departments = useDepartments()
  const [departmentId, setDepartmentId] = useState<string>(scope.departmentId ?? '')
  const effectiveDepartmentId = scope.isScoped ? scope.departmentId : departmentId

  // ---- Form tạo lịch nháp ----
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(plusDays(28))
  const [sessionDays, setSessionDays] = useState<number[]>([1, 2, 3, 4, 5])

  // ---- Lịch nháp đang mở ----
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [week, setWeek] = useState(1)
  const [classFilter, setClassFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [editing, setEditing] = useState<ScheduleDraftItem | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [confirmFailures, setConfirmFailures] = useState<ScheduleDraftConfirmResult['failed']>([])

  // Lớp không thuộc phòng ban nào: lấy toàn bộ lớp org có môn học (server tự giới hạn
  // theo phạm vi xem). Phòng ban đang chọn chỉ dùng cho lịch nháp + cấu hình tiết.
  const classes = useClasses(
    {
      page: 1,
      size: 100,
      selectable: true,
      hasSubjects: true,
    },
    true,
  )
  const timeSlots = useScheduleTimeSlots()
  const drafts = useScheduleDrafts(effectiveDepartmentId ?? null)
  const detail = useScheduleDraftDetail(effectiveDepartmentId ?? null, activeDraftId, week)
  const mutations = useScheduleDraftMutations(effectiveDepartmentId ?? null)

  function changeDepartment(id: string) {
    setDepartmentId(id)
    setSelectedClassIds([])
    setActiveDraftId(null)
    setWeek(1)
    setConfirmFailures([])
    setConfirmOpen(false)
    setDiscardOpen(false)
  }

  const classItems = useMemo(() => classes.data?.items ?? [], [classes.data])
  const classNameById = useMemo(
    () => new Map(classItems.map((item) => [item.id, item.name])),
    [classItems],
  )
  const classNameOf = (classId: string) => classNameById.get(classId) ?? classId.slice(0, 8)
  const slots = timeSlots.data ?? []
  const configMissing = timeSlots.isSuccess && slots.length === 0
  const canCreate = can(PERM.scheduleCreate)
  const detailData = detail.data
  const canEdit = canCreate && detailData?.status === 'DRAFT'

  const teachersInDraft = useMemo(() => {
    const map = new Map<string, string>()
    detailData?.items.forEach((item) => {
      if (item.teacherId) map.set(item.teacherId, item.teacherName ?? item.teacherId.slice(0, 8))
    })
    return Array.from(map.entries())
  }, [detailData])

  const filteredItems = useMemo(
    () =>
      (detailData?.items ?? []).filter(
        (item) =>
          (classFilter === 'all' || item.classId === classFilter) &&
          (teacherFilter === 'all' || item.teacherId === teacherFilter),
      ),
    [detailData, classFilter, teacherFilter],
  )

  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    )
  }

  function toggleDay(day: number) {
    setSessionDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].sort(),
    )
  }

  function createDraft() {
    if (!effectiveDepartmentId) return
    mutations.create.mutate(
      {
        classIds: selectedClassIds,
        dateFrom,
        dateTo,
        sessionDays: sessionDays.length > 0 ? sessionDays : undefined,
      },
      {
        onSuccess: (created) => {
          setActiveDraftId(created.id)
          setWeek(1)
          setClassFilter('all')
          setTeacherFilter('all')
          setConfirmFailures([])
          toast.success(`Đã tạo lịch nháp với ${created.totalItems} buổi dự kiến.`)
        },
        onError: (error) => toast.error(ApiError.from(error).message),
      },
    )
  }

  function openDraft(id: string) {
    setActiveDraftId(id)
    setWeek(1)
    setClassFilter('all')
    setTeacherFilter('all')
    setConfirmFailures([])
  }

  function saveItem(patch: ScheduleDraftPatch) {
    if (!activeDraftId || !editing) return
    setSaveError(null)
    mutations.patchItem.mutate(
      { draftId: activeDraftId, itemId: editing.id, patch },
      {
        onSuccess: () => {
          setEditing(null)
          toast.success('Đã cập nhật buổi học trong lịch nháp.')
        },
        onError: (error) => setSaveError(ApiError.from(error).message),
      },
    )
  }

  function confirmDraft() {
    if (!activeDraftId) return
    mutations.confirm.mutate(activeDraftId, {
      onSuccess: (result) => {
        setConfirmOpen(false)
        if (result.failed.length > 0) {
          setConfirmFailures(result.failed)
          toast.error('Không xác nhận được lịch nháp. Toàn bộ thay đổi đã được hoàn tác.')
        } else {
          setConfirmFailures([])
          toast.success(`Đã xác nhận ${result.created} buổi học vào lịch chính thức.`)
        }
      },
      onError: (error) => toast.error(ApiError.from(error).message),
    })
  }

  function discardDraft() {
    if (!activeDraftId) return
    mutations.discard.mutate(activeDraftId, {
      onSuccess: () => {
        setDiscardOpen(false)
        setActiveDraftId(null)
        toast.success('Đã huỷ lịch nháp.')
      },
      onError: (error) => toast.error(ApiError.from(error).message),
    })
  }

  const canRun = canCreate && Boolean(effectiveDepartmentId) && selectedClassIds.length > 0

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo › Lịch học"
        title="Xếp lịch tự động"
        description="Tạo lịch nháp cho nhiều lớp, xem lưới tuần, sửa tay nếu cần rồi xác nhận mới ghi vào lịch chính thức."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {!scope.isScoped && (
          <div className="lg:col-span-2">
            <Field label="Phòng ban" labelSize="sm">
              <Select value={departmentId} onValueChange={changeDepartment}>
                <SelectTrigger className="sm:w-72">
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
            <p className="mt-1 text-xs text-ink-500">
              Phòng ban dùng để lưu lịch nháp và cấu hình tiết; danh sách lớp bên dưới gồm toàn bộ
              lớp của tổ chức.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Field label="Từ ngày" labelSize="sm">
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </Field>
          <Field label="Đến ngày" labelSize="sm">
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">Các thứ được phép xếp</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  sessionDays.includes(day)
                    ? 'border-jade-700 bg-jade-700 text-white'
                    : 'border-line-strong bg-surface text-ink-700 hover:border-jade-400'
                }`}
              >
                {WEEKDAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-ink-700">
            Chọn lớp cần xếp lịch
            {selectedClassIds.length > 0 && (
              <span className="ml-2 rounded-full bg-jade-100 px-2 py-0.5 text-xs font-semibold text-jade-800">
                {selectedClassIds.length} đã chọn
              </span>
            )}
          </p>
          {classes.isLoading ? (
            <p className="text-sm text-ink-500">Đang tải danh sách lớp...</p>
          ) : classes.isError ? (
            <p className="py-4 text-center text-sm text-danger-600">
              Không tải được danh sách lớp. Vui lòng tải lại trang.
            </p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-line p-2">
              {classItems.map((schoolClass) => (
                <label
                  key={schoolClass.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-ink-50"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-line-strong"
                    checked={selectedClassIds.includes(schoolClass.id)}
                    onChange={() => toggleClass(schoolClass.id)}
                  />
                  <span className="text-sm font-medium">{schoolClass.name}</span>
                  <span className="text-xs text-ink-500">({schoolClass.classCode})</span>
                </label>
              ))}
              {classItems.length === 0 && (
                <p className="py-4 text-center text-sm text-ink-500">
                  Chưa có lớp nào được gán chương trình đào tạo kèm môn học.{' '}
                  <Link to="/dao-tao/lop-hoc" className="font-medium text-jade-700 underline">
                    Gán chương trình cho lớp
                  </Link>{' '}
                  rồi quay lại xếp lịch.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="md" disabled={!canRun || mutations.create.isPending} onClick={createDraft}>
          {mutations.create.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Đang tạo lịch nháp...
            </>
          ) : (
            <>
              <CalendarCog className="size-4" />
              Tạo lịch nháp
            </>
          )}
        </Button>
        {!canCreate && <p className="text-sm text-danger-500">Bạn không có quyền xếp lịch.</p>}
        {!effectiveDepartmentId && (
          <p className="text-sm text-ink-500">Chọn phòng ban để lưu lịch nháp.</p>
        )}
        {configMissing && (
          <p className="flex items-center gap-1.5 text-sm text-warning-600">
            <AlertCircle className="size-4" />
            Chưa cấu hình khung tiết.
            <Link to="/dao-tao/cau-hinh-lich" className="font-medium text-jade-700 hover:underline">
              Mở cấu hình lịch
            </Link>
          </p>
        )}
      </div>

      {confirmFailures.length > 0 && (
        <div className="mt-6 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger-500">
            <XCircle className="size-4" />
            Không xác nhận được — toàn bộ thay đổi đã được hoàn tác
          </p>
          <ul className="space-y-1 text-xs text-danger-500">
            {confirmFailures.map((failure) => (
              <li key={failure.itemId}>
                {classNameOf(failure.classId ?? '')} · {failure.subjectName ?? '—'} — {failure.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeDraftId && detail.isLoading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="size-4 animate-spin" />
          Đang tải lịch nháp...
        </p>
      ) : null}

      {activeDraftId && detail.isError ? (
        <div className="mt-8">
          <ErrorState
            title="Không tải được lịch nháp"
            description={ApiError.from(detail.error).message}
            onRetry={() => void detail.refetch()}
          />
        </div>
      ) : null}

      {activeDraftId && detailData ? (
        <section className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink-900">Lịch nháp</h2>
              <Badge tone={STATUS_TONES[detailData.status]}>
                {DRAFT_STATUS_LABELS[detailData.status]}
              </Badge>
            </div>
            <span className="text-xs text-ink-500">
              {detailData.totalItems} buổi · {detailData.exceptionCount} ngoại lệ ·{' '}
              {detailData.unscheduledCount} chưa xếp được
            </span>

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Tuần trước"
                disabled={week <= 1}
                onClick={() => {
                  setWeek((value) => Math.max(1, value - 1))
                  setEditing(null)
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-medium text-ink-700">
                Tuần {detailData.week}/{detailData.totalWeeks}
              </span>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Tuần sau"
                disabled={week >= detailData.totalWeeks}
                onClick={() => {
                  setWeek((value) => Math.min(detailData.totalWeeks, value + 1))
                  setEditing(null)
                }}
              >
                <ChevronRight className="size-4" />
              </Button>

              {canEdit && (
                <>
                  <Button size="sm" onClick={() => setConfirmOpen(true)}>
                    <CheckCircle2 className="size-4" />
                    Xác nhận
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDiscardOpen(true)}>
                    Huỷ lịch nháp
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setActiveDraftId(null)}>
                Đóng
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Lọc theo lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả lớp</SelectItem>
                {detailData.classIds.map((classId) => (
                  <SelectItem key={classId} value={classId}>
                    {classNameOf(classId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Lọc theo giáo viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả giáo viên</SelectItem>
                {teachersInDraft.map(([teacherId, name]) => (
                  <SelectItem key={teacherId} value={teacherId}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DraftWeekGrid
            detail={{ ...detailData, items: filteredItems }}
            timeSlots={slots}
            classNameOf={classNameOf}
            canEdit={canEdit}
            onEdit={(item) => {
              setSaveError(null)
              setEditing(item)
            }}
          />

          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger-500">
              <AlertCircle className="size-4" />
              Chưa xếp được ({detailData.unscheduledCount})
            </h3>
            {detailData.unscheduled.length === 0 ? (
              <p className="text-sm text-ink-500">Tất cả buổi dự kiến đều đã xếp được.</p>
            ) : (
              <ul className="space-y-1 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-ink-600">
                {detailData.unscheduled.map((item) => (
                  <li key={item.id}>
                    {classNameOf(item.classId)}
                    {item.sessionNo ? ` · buổi ${item.sessionNo}` : ''} — {item.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Lịch nháp gần đây</h2>
          {!effectiveDepartmentId ? (
            <p className="text-sm text-ink-500">Chọn phòng ban để xem lịch nháp.</p>
          ) : drafts.isLoading ? (
            <p className="text-sm text-ink-500">Đang tải danh sách lịch nháp...</p>
          ) : (drafts.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-500">Chưa có lịch nháp nào.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {(drafts.data ?? []).map((draft) => (
                <li key={draft.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <Badge tone={STATUS_TONES[draft.status]}>
                    {DRAFT_STATUS_LABELS[draft.status]}
                  </Badge>
                  <span className="text-ink-700">
                    {draft.dateFrom} → {draft.dateTo}
                  </span>
                  <span className="text-xs text-ink-500">
                    {draft.classIds.length} lớp · {draft.itemCount} buổi · {draft.unscheduledCount} chưa
                    xếp được
                  </span>
                  <span className="text-xs text-ink-400">
                    Tạo lúc {new Date(draft.createdAt).toLocaleString('vi-VN')}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => openDraft(draft.id)}
                  >
                    Mở
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {detailData && editing && (
        <DraftItemDialog
          item={editing}
          detail={detailData}
          timeSlots={slots}
          departmentId={effectiveDepartmentId ?? ''}
          classNameOf={classNameOf}
          isSaving={mutations.patchItem.isPending}
          error={saveError}
          onClose={() => {
            setEditing(null)
            setSaveError(null)
          }}
          onSave={saveItem}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận lịch nháp?"
        description="Hệ thống sẽ kiểm tra lại toàn bộ ràng buộc và ghi các buổi học vào lịch chính thức. Nếu một buổi bị trùng, toàn bộ thay đổi sẽ được hoàn tác."
        confirmLabel="Xác nhận lịch"
        tone="primary"
        isLoading={mutations.confirm.isPending}
        onConfirm={confirmDraft}
      />

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Huỷ lịch nháp?"
        description="Lịch nháp sẽ được đánh dấu đã huỷ và không thể sửa hay xác nhận nữa."
        confirmLabel="Huỷ lịch nháp"
        isLoading={mutations.discard.isPending}
        onConfirm={discardDraft}
      />
    </PageContainer>
  )
}

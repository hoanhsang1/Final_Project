import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClasses, useTeachers } from '@/features/academic/hooks'
import { usePermission } from '@/features/auth/hooks'
import {
  useClassSlotRules,
  useScheduleConfigMutations,
  useScheduleTimeSlots,
  useTeacherAvailability,
} from '@/features/schedule/hooks'
import type {
  ClassSlotRule,
  ScheduleTimeSlotInput,
  TeacherAvailabilityEntry,
  TeacherAvailabilityKind,
} from '@/features/schedule/types'
import { TEACHER_AVAILABILITY_LABELS, WEEKDAY_LABELS } from '@/features/schedule/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

const EMPTY_SLOT: Omit<ScheduleTimeSlotInput, 'periodNo'> = {
  name: null,
  startTime: '07:30',
  endTime: '08:30',
  joinsNext: false,
  isActive: true,
}

function toInput(slot: ScheduleTimeSlotInput): ScheduleTimeSlotInput {
  return {
    periodNo: slot.periodNo,
    name: slot.name ?? null,
    startTime: slot.startTime,
    endTime: slot.endTime,
    joinsNext: Boolean(slot.joinsNext),
    isActive: slot.isActive ?? true,
  }
}

export function ScheduleConfigPage() {
  const { can } = usePermission()
  const canConfig = can(PERM.scheduleConfig)
  const mutations = useScheduleConfigMutations()

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo › Lịch học"
        title="Cấu hình lịch"
        description="Khung tiết của tổ chức, tiết được phép của từng lớp và lịch rảnh của giáo viên — dùng làm ràng buộc khi xếp lịch."
      />

      {!canConfig && (
        <p className="mt-4 text-sm text-danger-500">
          Bạn không có quyền cấu hình lịch của tổ chức.
        </p>
      )}

      <Tabs defaultValue="time-slots" className="mt-6">
        <TabsList>
          <TabsTrigger value="time-slots">Khung tiết</TabsTrigger>
          <TabsTrigger value="class-rules">Quy tắc tiết của lớp</TabsTrigger>
          <TabsTrigger value="teacher-availability">Lịch rảnh giáo viên</TabsTrigger>
        </TabsList>

        <TabsContent value="time-slots" className="mt-4">
          <TimeSlotsTab canSave={canConfig} mutations={mutations} />
        </TabsContent>
        <TabsContent value="class-rules" className="mt-4">
          <ClassRulesTab canSave={canConfig} mutations={mutations} />
        </TabsContent>
        <TabsContent value="teacher-availability" className="mt-4">
          <TeacherAvailabilityTab canSave={canConfig} mutations={mutations} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

type Mutations = ReturnType<typeof useScheduleConfigMutations>

function TimeSlotsTab({ canSave, mutations }: { canSave: boolean; mutations: Mutations }) {
  const query = useScheduleTimeSlots()
  const [draft, setDraft] = useState<ScheduleTimeSlotInput[] | null>(null)

  // Bản nháp chỉ giữ thay đổi tại chỗ; chưa sửa thì hiển thị dữ liệu máy chủ.
  const slots = draft ?? query.data?.map(toInput) ?? []

  function update(index: number, patch: Partial<ScheduleTimeSlotInput>) {
    setDraft((prev) =>
      (prev ?? slots).map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    )
  }

  function add() {
    setDraft((prev) => {
      const list = prev ?? slots
      return [...list, { ...EMPTY_SLOT, periodNo: list.length + 1 }]
    })
  }

  function remove(index: number) {
    setDraft((prev) =>
      (prev ?? slots)
        .filter((_, i) => i !== index)
        .map((slot, i) => ({ ...slot, periodNo: i + 1 })),
    )
  }

  function save() {
    mutations.saveTimeSlots.mutate(slots, {
      onSuccess: () => toast.success('Đã lưu cấu hình tiết học.'),
      onError: (err) => toast.error(ApiError.from(err).message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Khung tiết trong ngày</CardTitle>
          <CardDescription>
            Số tiết phải liên tục từ 1. Bật “Ghép tiết sau” khi tiết học kéo dài sang tiết kế tiếp.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={add} disabled={!canSave}>
          <Plus className="size-3.5" />
          Thêm tiết
        </Button>
      </CardHeader>

      <div className="p-5 pt-3">
        {query.isPending ? (
          <p className="text-sm text-ink-500">Đang tải cấu hình tiết học…</p>
        ) : query.isError ? (
          <p className="text-sm text-danger-500">{ApiError.from(query.error).message}</p>
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">Tiết</TH>
                  <TH>Tên</TH>
                  <TH className="w-32">Bắt đầu</TH>
                  <TH className="w-32">Kết thúc</TH>
                  <TH className="w-32">Ghép tiết sau</TH>
                  <TH className="w-24">Đang dùng</TH>
                  <TH className="w-12" />
                </TR>
              </THead>
              <TBody>
                {slots.map((slot, index) => (
                  <TR key={index}>
                    <TD className="font-mono text-xs">{slot.periodNo}</TD>
                    <TD>
                      <Input
                        aria-label={`Tên tiết ${slot.periodNo}`}
                        value={slot.name ?? ''}
                        placeholder="VD: Tiết 1"
                        onChange={(e) => update(index, { name: e.target.value || null })}
                      />
                    </TD>
                    <TD>
                      <Input
                        type="time"
                        aria-label={`Bắt đầu tiết ${slot.periodNo}`}
                        value={slot.startTime}
                        onChange={(e) => update(index, { startTime: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <Input
                        type="time"
                        aria-label={`Kết thúc tiết ${slot.periodNo}`}
                        value={slot.endTime}
                        onChange={(e) => update(index, { endTime: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <Switch
                        label={`Ghép tiết sau – tiết ${slot.periodNo}`}
                        checked={Boolean(slot.joinsNext)}
                        onCheckedChange={(checked) => update(index, { joinsNext: checked })}
                      />
                    </TD>
                    <TD>
                      <Switch
                        label={`Đang dùng – tiết ${slot.periodNo}`}
                        checked={slot.isActive ?? true}
                        onCheckedChange={(checked) => update(index, { isActive: checked })}
                      />
                    </TD>
                    <TD>
                      <button
                        type="button"
                        aria-label={`Xoá tiết ${slot.periodNo}`}
                        className="text-ink-400 hover:text-danger-500"
                        onClick={() => remove(index)}
                        disabled={!canSave}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </TD>
                  </TR>
                ))}
                {slots.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-6 text-center text-sm text-ink-500">
                      Chưa có tiết nào. Thêm ít nhất một tiết để dùng cho xếp lịch.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </TableWrap>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            onClick={save}
            disabled={!canSave || slots.length === 0 || mutations.saveTimeSlots.isPending}
          >
            {mutations.saveTimeSlots.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Lưu cấu hình tiết
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ClassRulesTab({ canSave, mutations }: { canSave: boolean; mutations: Mutations }) {
  const slotsQuery = useScheduleTimeSlots()
  const classesQuery = useClasses({ page: 1, size: 100, selectable: true })
  const [classId, setClassId] = useState('')
  const rulesQuery = useClassSlotRules(classId || null)
  const [draft, setDraft] = useState<ClassSlotRule[] | null>(null)

  const maxPeriod = useMemo(
    () => (slotsQuery.data ?? []).reduce((max, slot) => Math.max(max, slot.periodNo), 0) || 1,
    [slotsQuery.data],
  )

  const rules = draft ?? rulesQuery.data ?? []

  // Đổi lớp thì bỏ bản nháp của lớp trước để không lưu nhầm.
  function changeClass(next: string) {
    setClassId(next)
    setDraft(null)
  }

  function update(index: number, patch: Partial<ClassSlotRule>) {
    setDraft((prev) =>
      (prev ?? rules).map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    )
  }

  function add() {
    setDraft((prev) => [
      ...(prev ?? rules),
      { weekday: 1, fromPeriod: 1, toPeriod: maxPeriod, off: true },
    ])
  }

  function remove(index: number) {
    setDraft((prev) => (prev ?? rules).filter((_, i) => i !== index))
  }

  function save() {
    if (!classId) return
    mutations.saveClassRules.mutate(
      { classId, rules },
      {
        onSuccess: () => toast.success('Đã lưu quy tắc tiết của lớp.'),
        onError: (err) => toast.error(ApiError.from(err).message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Tiết được phép theo lớp</CardTitle>
          <CardDescription>
            Không khai báo thì lớp được phép dạy mọi tiết. Quy tắc “nghỉ” luôn được ưu tiên hơn
            quy tắc cho phép.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="space-y-4 p-5 pt-3">
        <Field label="Lớp học" labelSize="sm" className="max-w-md">
          <Select value={classId} onValueChange={changeClass}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn lớp để cấu hình" />
            </SelectTrigger>
            <SelectContent>
              {(classesQuery.data?.items ?? []).map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.classCode ? `${cls.classCode} · ${cls.name}` : cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {classesQuery.isError ? (
          <p className="text-sm text-danger-500">
            Không tải được danh sách lớp: {ApiError.from(classesQuery.error).message}
          </p>
        ) : null}

        {!classId ? (
          <p className="text-sm text-ink-500">Chọn một lớp để xem và sửa quy tắc tiết.</p>
        ) : rulesQuery.isPending ? (
          <p className="text-sm text-ink-500">Đang tải quy tắc…</p>
        ) : rulesQuery.isError ? (
          <p className="text-sm text-danger-500">{ApiError.from(rulesQuery.error).message}</p>
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-40">Thứ</TH>
                    <TH className="w-28">Từ tiết</TH>
                    <TH className="w-28">Đến tiết</TH>
                    <TH className="w-40">Loại quy tắc</TH>
                    <TH className="w-12" />
                  </TR>
                </THead>
                <TBody>
                  {rules.map((rule, index) => (
                    <TR key={index}>
                      <TD>
                        <Select
                          value={String(rule.weekday)}
                          onValueChange={(value) => update(index, { weekday: Number(value) })}
                        >
                          <SelectTrigger aria-label={`Thứ của quy tắc ${index + 1}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                {WEEKDAY_LABELS[day]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min={1}
                          max={maxPeriod}
                          aria-label={`Từ tiết của quy tắc ${index + 1}`}
                          value={rule.fromPeriod}
                          onChange={(e) => update(index, { fromPeriod: Number(e.target.value) })}
                        />
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min={1}
                          max={maxPeriod}
                          aria-label={`Đến tiết của quy tắc ${index + 1}`}
                          value={rule.toPeriod}
                          onChange={(e) => update(index, { toPeriod: Number(e.target.value) })}
                        />
                      </TD>
                      <TD>
                        <Select
                          value={rule.off ? 'off' : 'allow'}
                          onValueChange={(value) => update(index, { off: value === 'off' })}
                        >
                          <SelectTrigger aria-label={`Loại của quy tắc ${index + 1}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="allow">Được phép dạy</SelectItem>
                            <SelectItem value="off">Nghỉ (chặn)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TD>
                      <TD>
                        <button
                          type="button"
                          aria-label={`Xoá quy tắc ${index + 1}`}
                          className="text-ink-400 hover:text-danger-500"
                          onClick={() => remove(index)}
                          disabled={!canSave}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </TD>
                    </TR>
                  ))}
                  {rules.length === 0 && (
                    <TR>
                      <TD colSpan={5} className="py-6 text-center text-sm text-ink-500">
                        Lớp chưa có quy tắc — mọi tiết đều được phép.
                      </TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </TableWrap>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={add} disabled={!canSave}>
                <Plus className="size-3.5" />
                Thêm quy tắc
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={!canSave || mutations.saveClassRules.isPending}
              >
                {mutations.saveClassRules.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Lưu quy tắc lớp
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

function TeacherAvailabilityTab({ canSave, mutations }: { canSave: boolean; mutations: Mutations }) {
  const slotsQuery = useScheduleTimeSlots()
  const teachersQuery = useTeachers({ page: 1, size: 100 })
  const [teacherId, setTeacherId] = useState('')
  const availabilityQuery = useTeacherAvailability(teacherId || null)
  const [draft, setDraft] = useState<TeacherAvailabilityEntry[] | null>(null)

  const maxPeriod = useMemo(
    () => (slotsQuery.data ?? []).reduce((max, slot) => Math.max(max, slot.periodNo), 0) || 1,
    [slotsQuery.data],
  )

  const entries = draft ?? availabilityQuery.data ?? []

  function changeTeacher(next: string) {
    setTeacherId(next)
    setDraft(null)
  }

  function update(index: number, patch: Partial<TeacherAvailabilityEntry>) {
    setDraft((prev) =>
      (prev ?? entries).map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    )
  }

  function add() {
    setDraft((prev) => [
      ...(prev ?? entries),
      { weekday: 1, fromPeriod: 1, toPeriod: maxPeriod, kind: 'UNAVAILABLE' },
    ])
  }

  function remove(index: number) {
    setDraft((prev) => (prev ?? entries).filter((_, i) => i !== index))
  }

  function save() {
    if (!teacherId) return
    mutations.saveTeacherAvailability.mutate(
      { teacherId, entries },
      {
        onSuccess: () => toast.success('Đã lưu lịch rảnh của giáo viên.'),
        onError: (err) => toast.error(ApiError.from(err).message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Lịch rảnh của giáo viên</CardTitle>
          <CardDescription>
            Không khai báo thì giáo viên được coi là rảnh mọi tiết. “Không thể dạy” luôn được ưu
            tiên hơn “Có thể dạy”.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="space-y-4 p-5 pt-3">
        <Field label="Giáo viên" labelSize="sm" className="max-w-md">
          <Select value={teacherId} onValueChange={changeTeacher}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn giáo viên" />
            </SelectTrigger>
            <SelectContent>
              {(teachersQuery.data?.items ?? []).map((teacher) => (
                <SelectItem key={teacher.userId} value={teacher.userId}>
                  {teacher.staffCode
                    ? `${teacher.staffCode} · ${teacher.fullName}`
                    : teacher.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {teachersQuery.isError ? (
          <p className="text-sm text-danger-500">
            Không tải được danh sách giáo viên: {ApiError.from(teachersQuery.error).message}
          </p>
        ) : null}

        {!teacherId ? (
          <p className="text-sm text-ink-500">Chọn một giáo viên để xem và sửa lịch rảnh.</p>
        ) : availabilityQuery.isPending ? (
          <p className="text-sm text-ink-500">Đang tải lịch rảnh…</p>
        ) : availabilityQuery.isError ? (
          <p className="text-sm text-danger-500">{ApiError.from(availabilityQuery.error).message}</p>
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-40">Thứ</TH>
                    <TH className="w-28">Từ tiết</TH>
                    <TH className="w-28">Đến tiết</TH>
                    <TH className="w-44">Trạng thái</TH>
                    <TH className="w-12" />
                  </TR>
                </THead>
                <TBody>
                  {entries.map((entry, index) => (
                    <TR key={index}>
                      <TD>
                        <Select
                          value={String(entry.weekday)}
                          onValueChange={(value) => update(index, { weekday: Number(value) })}
                        >
                          <SelectTrigger aria-label={`Thứ của mục ${index + 1}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                {WEEKDAY_LABELS[day]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min={1}
                          max={maxPeriod}
                          aria-label={`Từ tiết của mục ${index + 1}`}
                          value={entry.fromPeriod}
                          onChange={(e) => update(index, { fromPeriod: Number(e.target.value) })}
                        />
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min={1}
                          max={maxPeriod}
                          aria-label={`Đến tiết của mục ${index + 1}`}
                          value={entry.toPeriod}
                          onChange={(e) => update(index, { toPeriod: Number(e.target.value) })}
                        />
                      </TD>
                      <TD>
                        <Select
                          value={entry.kind}
                          onValueChange={(value) =>
                            update(index, { kind: value as TeacherAvailabilityKind })
                          }
                        >
                          <SelectTrigger aria-label={`Trạng thái của mục ${index + 1}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TEACHER_AVAILABILITY_LABELS) as TeacherAvailabilityKind[]).map(
                              (kind) => (
                                <SelectItem key={kind} value={kind}>
                                  {TEACHER_AVAILABILITY_LABELS[kind]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </TD>
                      <TD>
                        <button
                          type="button"
                          aria-label={`Xoá mục ${index + 1}`}
                          className="text-ink-400 hover:text-danger-500"
                          onClick={() => remove(index)}
                          disabled={!canSave}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </TD>
                    </TR>
                  ))}
                  {entries.length === 0 && (
                    <TR>
                      <TD colSpan={5} className="py-6 text-center text-sm text-ink-500">
                        Chưa khai báo lịch rảnh — giáo viên được coi là rảnh mọi tiết.
                      </TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </TableWrap>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={add} disabled={!canSave}>
                <Plus className="size-3.5" />
                Thêm khoảng
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={!canSave || mutations.saveTeacherAvailability.isPending}
              >
                {mutations.saveTeacherAvailability.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Lưu lịch rảnh
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

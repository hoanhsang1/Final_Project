import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTeachers } from '@/features/academic/hooks'
import { useRoomSuggestions } from '@/features/schedule/hooks'
import {
  activeSlots,
  blockedRoomIds,
  instantOf,
  maxConsecutivePeriods,
} from '@/features/schedule/draft-utils'
import {
  EXCEPTION_TYPE_LABELS,
  type ScheduleDraftDetail,
  type ScheduleDraftItem,
  type ScheduleDraftPatch,
  type ScheduleTimeSlot,
} from '@/features/schedule/types'

interface DraftItemDialogProps {
  item: ScheduleDraftItem | null
  detail: ScheduleDraftDetail
  timeSlots: ScheduleTimeSlot[]
  departmentId: string
  classNameOf: (classId: string) => string
  isSaving: boolean
  error: string | null
  onClose: () => void
  onSave: (patch: ScheduleDraftPatch) => void
}

/** Sửa tay phòng / tiết / giáo viên của một buổi nháp; backend kiểm tra lại toàn bộ ràng buộc. */
export function DraftItemDialog({
  item,
  detail,
  timeSlots,
  departmentId,
  classNameOf,
  isSaving,
  error,
  onClose,
  onSave,
}: DraftItemDialogProps) {
  const slots = useMemo(() => activeSlots(timeSlots), [timeSlots])
  const [startPeriod, setStartPeriod] = useState(item?.periods[0] ?? 1)
  const [length, setLength] = useState(Math.max(1, item?.periods.length ?? 1))
  const [roomId, setRoomId] = useState(item?.roomId ?? '')
  const [teacherId, setTeacherId] = useState(item?.teacherId ?? '')

  const startIndex = slots.findIndex((slot) => slot.periodNo === startPeriod)
  const startSlot = startIndex >= 0 ? slots[startIndex] : undefined
  const maxLength = startSlot ? Math.max(1, maxConsecutivePeriods(slots, startSlot.periodNo)) : 1
  const effectiveLength = Math.min(length, maxLength)
  const endSlot = startIndex >= 0 ? slots[startIndex + effectiveLength - 1] : undefined
  const newPeriods = slots
    .slice(startIndex, startIndex + effectiveLength)
    .map((slot) => slot.periodNo)

  const startIso = item && startSlot ? instantOf(item.date, startSlot.startTime) : ''
  const endIso = item && endSlot ? instantOf(item.date, endSlot.endTime) : ''

  const rooms = useRoomSuggestions(
    departmentId,
    { startTime: startIso, endTime: endIso, classId: item?.classId },
    Boolean(item),
  )
  const teachers = useTeachers({ page: 1, size: 100 })

  const blocked = blockedRoomIds(detail.items, item?.id ?? '', item?.date ?? '', newPeriods)
  const roomOptions = (rooms.data ?? []).filter((room) => !blocked.has(room.id))
  const currentRoom = item?.roomId
    ? roomOptions.find((room) => room.id === item.roomId) ?? {
        id: item.roomId,
        code: item.roomCode ?? item.roomId.slice(0, 8),
      }
    : null
  const teacherOptions = teachers.data?.items ?? []

  const periodsChanged = item ? newPeriods.join(',') !== item.periods.join(',') : false
  const patch: ScheduleDraftPatch = {}
  if (item && roomId && roomId !== item.roomId) patch.roomId = roomId
  if (item && teacherId && teacherId !== item.teacherId) patch.teacherId = teacherId
  if (item && periodsChanged && startIso && endIso) {
    patch.startTime = startIso
    patch.endTime = endIso
  }
  const hasChange = Object.keys(patch).length > 0

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Sửa buổi học trong lịch nháp</DialogTitle>
          <DialogDescription>
            {item
              ? `${classNameOf(item.classId)} · ${item.subjectName ?? '—'} · ${item.date}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {item?.exception && (
            <p className="rounded-lg border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-600">
              Ngoại lệ: {EXCEPTION_TYPE_LABELS[item.exceptionType ?? ''] ?? 'thay đổi mẫu tuần'}
              {item.exceptionReason ? ` — ${item.exceptionReason}` : ''}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiết bắt đầu" labelSize="sm">
              <Select
                value={String(startPeriod)}
                onValueChange={(value) => {
                  setStartPeriod(Number(value))
                  setLength(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tiết" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((slot) => (
                    <SelectItem key={slot.periodNo} value={String(slot.periodNo)}>
                      Tiết {slot.periodNo} ({slot.startTime}–{slot.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Số tiết" labelSize="sm">
              <Select
                value={String(effectiveLength)}
                onValueChange={(value) => setLength(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxLength }, (_, index) => index + 1).map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} tiết
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Giáo viên"
              labelSize="sm"
              hint={
                teachers.isError
                  ? 'Không tải được danh sách giáo viên. Vui lòng đóng và mở lại hộp thoại.'
                  : 'Danh sách toàn bộ giáo viên; hệ thống sẽ từ chối nếu chưa đủ điều kiện dạy môn.'
              }
            >
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giáo viên" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.userId} value={teacher.userId}>
                      {teacher.fullName}
                    </SelectItem>
                  ))}
                  {item?.teacherId && !teacherOptions.some((t) => t.userId === item.teacherId) && (
                    <SelectItem value={item.teacherId}>
                      {item.teacherName ?? item.teacherId.slice(0, 8)}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Phòng học"
              labelSize="sm"
              hint={
                rooms.isError
                  ? 'Không tải được gợi ý phòng. Bạn vẫn có thể giữ phòng hiện tại hoặc thử lại sau.'
                  : rooms.isFetching
                    ? 'Đang tải gợi ý phòng...'
                    : 'Gợi ý đã loại phòng bị buổi khác trong lịch nháp chiếm.'
              }
            >
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng" />
                </SelectTrigger>
                <SelectContent>
                  {currentRoom && (
                    <SelectItem value={currentRoom.id}>
                      {currentRoom.code}
                      {currentRoom.id === item?.roomId ? ' (hiện tại)' : ''}
                    </SelectItem>
                  )}
                  {roomOptions
                    .filter((room) => room.id !== currentRoom?.id)
                    .map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.code} · {room.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {startSlot && endSlot && (
            <p className="text-xs text-ink-500">
              Khung giờ mới: {startSlot.startTime}–{endSlot.endTime} ({effectiveLength} tiết)
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          {error ? <p className="mr-auto text-xs text-danger-500">{error}</p> : null}
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Đóng
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(patch)}
            disabled={!hasChange || isSaving}
            isLoading={isSaving}
          >
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

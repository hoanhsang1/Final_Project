import { Pencil } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { activeSlots, formatDayMonth, weekStart, weekdayOf } from '@/features/schedule/draft-utils'
import {
  EXCEPTION_TYPE_LABELS,
  WEEKDAY_LABELS,
  type ScheduleDraftDetail,
  type ScheduleDraftItem,
  type ScheduleTimeSlot,
} from '@/features/schedule/types'

interface DraftWeekGridProps {
  detail: ScheduleDraftDetail
  timeSlots: ScheduleTimeSlot[]
  classNameOf: (classId: string) => string
  canEdit: boolean
  onEdit: (item: ScheduleDraftItem) => void
}

/**
 * Lưới tuần của lịch nháp: cột là thứ, dòng là tiết; buổi chiếm nhiều tiết
 * được gộp ô bằng rowSpan. Màu ô thể hiện ngoại lệ / sửa tay.
 */
export function DraftWeekGrid({ detail, timeSlots, classNameOf, canEdit, onEdit }: DraftWeekGridProps) {
  const slots = useMemo(() => activeSlots(timeSlots), [timeSlots])
  const start = weekStart(detail.dateFrom, detail.week)
  const dates = Array.from({ length: 7 }, (_, index) => {
    const value = new Date(start)
    value.setUTCDate(value.getUTCDate() + index)
    return formatDayMonth(value)
  })

  const cellMap = new Map<string, ScheduleDraftItem>()
  detail.items.forEach((item) => {
    const first = item.periods[0]
    if (first === undefined) return
    cellMap.set(`${weekdayOf(item.date)}:${first}`, item)
  })

  const covered = new Set<string>()

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[900px] border-collapse text-xs" aria-label="Lưới lịch nháp">
        <thead>
          <tr className="bg-surface-muted text-ink-600">
            <th className="w-24 border border-line px-2 py-2 text-left font-medium">Tiết</th>
            {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
              <th key={weekday} className="border border-line px-2 py-2 text-left font-medium">
                <div>{WEEKDAY_LABELS[weekday]}</div>
                <div className="text-2xs font-normal text-ink-400">{dates[weekday - 1]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.length === 0 && (
            <tr>
              <td colSpan={8} className="border border-line px-3 py-6 text-center text-ink-500">
                Chưa có khung tiết nào được cấu hình.
              </td>
            </tr>
          )}
          {slots.map((slot) => (
            <tr key={slot.periodNo}>
              <th className="border border-line bg-surface-muted px-2 py-2 text-left align-top font-medium text-ink-600">
                <div>Tiết {slot.periodNo}</div>
                <div className="text-2xs font-normal text-ink-400">
                  {slot.startTime}–{slot.endTime}
                </div>
              </th>
              {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
                const key = `${weekday}:${slot.periodNo}`
                if (covered.has(key)) return null
                const item = cellMap.get(key)
                if (!item) {
                  return (
                    <td key={key} className="border border-line p-1 align-top">
                      <div className="min-h-14" />
                    </td>
                  )
                }
                const span = slots.filter((candidate) =>
                  item.periods.includes(candidate.periodNo),
                ).length
                item.periods.forEach((period) => covered.add(`${weekday}:${period}`))
                return (
                  <td key={key} rowSpan={Math.max(1, span)} className="border border-line p-1 align-top">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onEdit(item)}
                      title={[classNameOf(item.classId), item.subjectName, item.teacherName, item.roomCode]
                        .filter(Boolean)
                        .join(' · ')}
                      className={cn(
                        'flex h-full w-full flex-col gap-1 rounded-lg border p-2 text-left transition-shadow',
                        canEdit && 'hover:shadow-md',
                        item.exception
                          ? 'border-warning-100 bg-warning-50'
                          : item.manualEdit
                            ? 'border-info-100 bg-info-50'
                            : 'border-jade-100 bg-jade-50',
                      )}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="truncate font-semibold text-ink-900">
                          {classNameOf(item.classId)}
                        </span>
                        {item.manualEdit && (
                          <Pencil className="size-3 shrink-0 text-info-500" aria-label="Sửa tay" />
                        )}
                      </span>
                      <span className="truncate text-2xs text-ink-600">{item.subjectName ?? '—'}</span>
                      <span className="truncate text-2xs text-ink-500">
                        {item.teacherName ?? '—'} · {item.roomCode ?? '—'}
                      </span>
                      {item.exception && (
                        <Badge tone="warning" size="sm">
                          {EXCEPTION_TYPE_LABELS[item.exceptionType ?? ''] ?? 'Ngoại lệ'}
                        </Badge>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

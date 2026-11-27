import { useMemo } from 'react'

import {
  addDaysLocal,
  dateKey,
  dayIndexInWeek,
  hourRangeOf,
  layoutDaySessions,
  minutesOfDay,
  type SessionInterval,
} from '@/features/schedule/components/week-calendar-utils'
import { WEEKDAY_LABELS, type ScheduleSession } from '@/features/schedule/types'
import { cn } from '@/lib/cn'

export interface WeekCalendarEntry {
  session: ScheduleSession
  /** Chỉ số màu của phòng ban (0..5). */
  lane: number
}

/** Màu cố định cho từng phòng ban; lớp phải viết nguyên văn để Tailwind sinh CSS. */
export const LANE_STYLES = [
  { dot: 'bg-lane-1-500', block: 'border-lane-1-500 bg-lane-1-50' },
  { dot: 'bg-lane-2-500', block: 'border-lane-2-500 bg-lane-2-50' },
  { dot: 'bg-lane-3-500', block: 'border-lane-3-500 bg-lane-3-50' },
  { dot: 'bg-lane-4-500', block: 'border-lane-4-500 bg-lane-4-50' },
  { dot: 'bg-lane-5-500', block: 'border-lane-5-500 bg-lane-5-50' },
  { dot: 'bg-lane-6-500', block: 'border-lane-6-500 bg-lane-6-50' },
] as const

export function laneStyle(lane: number) {
  const size = LANE_STYLES.length
  return LANE_STYLES[((lane % size) + size) % size]!
}

const HOUR_HEIGHT = 56
const GUTTER = '3.5rem'
const MIN_BLOCK_HEIGHT = 22
const MIN_BLOCK_MINUTES = 15

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function hhmm(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface WeekCalendarProps {
  weekStart: Date
  entries: WeekCalendarEntry[]
  labelOf: (session: ScheduleSession) => string
  canEdit: boolean
  onSelect: (session: ScheduleSession) => void
}

/**
 * Lưới tuần kiểu Google Calendar: cột là thứ, trục dọc là giờ; buổi trùng giờ
 * được chia cột song song, màu khối theo phòng ban.
 */
export function WeekCalendar({ weekStart, entries, labelOf, canEdit, onSelect }: WeekCalendarProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysLocal(weekStart, index)),
    [weekStart],
  )
  const range = useMemo(() => hourRangeOf(entries.map((entry) => entry.session)), [entries])
  const hours = useMemo(
    () => Array.from({ length: range.end - range.start }, (_, index) => range.start + index),
    [range],
  )
  const totalHeight = (range.end - range.start) * HOUR_HEIGHT
  const todayKey = dateKey(new Date())
  const nowMinutes = minutesOfDay(new Date())

  const perDay = useMemo(() => {
    const groups: WeekCalendarEntry[][] = Array.from({ length: 7 }, () => [])
    entries.forEach((entry) => {
      const start = new Date(entry.session.startTime)
      if (Number.isNaN(start.getTime())) return
      const index = dayIndexInWeek(weekStart, start)
      if (index >= 0 && index < 7) groups[index]!.push(entry)
    })
    return groups
  }, [entries, weekStart])

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div className="min-w-[860px]" role="group" aria-label="Lịch tuần">
        <div
          className="grid border-b border-line bg-surface-muted"
          style={{ gridTemplateColumns: `${GUTTER} repeat(7, minmax(0, 1fr))` }}
        >
          <div className="px-2 py-2 text-2xs font-medium text-ink-400">GMT+7</div>
          {days.map((day, index) => {
            const key = dateKey(day)
            const isToday = key === todayKey
            return (
              <div
                key={key}
                className={cn('border-l border-line px-2 py-1.5 text-center', isToday && 'bg-jade-50/60')}
              >
                <p className="text-2xs font-medium text-ink-500">{WEEKDAY_LABELS[index + 1]}</p>
                <p
                  className={cn(
                    'mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-semibold text-ink-800',
                    isToday && 'bg-jade-700 text-white',
                  )}
                >
                  {day.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: `${GUTTER} repeat(7, minmax(0, 1fr))` }}
        >
          <div className="relative" style={{ height: totalHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-1.5 text-2xs tabular-nums text-ink-400"
                style={{ top: (hour - range.start) * HOUR_HEIGHT + 2 }}
              >
                {pad(hour)}:00
              </div>
            ))}
          </div>

          {days.map((day, index) => {
            const key = dateKey(day)
            const isToday = key === todayKey
            const dayEntries = perDay[index] ?? []
            const laneBySession = new Map(dayEntries.map((entry) => [entry.session.id, entry.lane]))
            const intervals: SessionInterval[] = dayEntries.map((entry) => {
              const startMinute = minutesOfDay(new Date(entry.session.startTime))
              const endMinute = minutesOfDay(new Date(entry.session.endTime))
              return {
                session: entry.session,
                startMinute,
                endMinute: Math.max(startMinute + MIN_BLOCK_MINUTES, endMinute),
              }
            })
            const laidOut = layoutDaySessions(intervals)
            const showNow =
              isToday && nowMinutes >= range.start * 60 && nowMinutes <= range.end * 60

            return (
              <div
                key={key}
                className={cn('relative border-l border-line', isToday && 'bg-jade-50/30')}
                style={{ height: totalHeight }}
              >
                {hours.map((hour) => (
                  <div key={hour} className="border-t border-line" style={{ height: HOUR_HEIGHT }}>
                    <div className="h-1/2 border-b border-dashed border-line/70" />
                  </div>
                ))}

                {laidOut.map((item) => {
                  const cancelled = item.session.status === 'cancelled'
                  const lane = laneStyle(laneBySession.get(item.session.id) ?? 0)
                  const time = `${hhmm(item.session.startTime)}–${hhmm(item.session.endTime)}`
                  const label = labelOf(item.session)
                  const room = item.session.roomCode ?? 'Chưa có phòng'
                  const title = [time, label, item.session.subjectName, item.session.teacherName, room]
                    .filter(Boolean)
                    .join(' · ')
                  const interactive = canEdit && !cancelled
                  const top = Math.max(0, ((item.startMinute - range.start * 60) / 60) * HOUR_HEIGHT)
                  const height = Math.max(
                    MIN_BLOCK_HEIGHT,
                    ((item.endMinute - item.startMinute) / 60) * HOUR_HEIGHT,
                  )

                  return (
                    <button
                      key={item.session.id}
                      type="button"
                      disabled={!interactive}
                      onClick={() => onSelect(item.session)}
                      title={title}
                      aria-label={title}
                      className={cn(
                        'absolute z-[1] overflow-hidden rounded-md border border-l-[3px] px-1.5 py-1 text-left text-2xs leading-tight shadow-xs transition',
                        cancelled
                          ? 'border-ink-300 border-l-ink-400 bg-ink-100 text-ink-500 line-through'
                          : cn(lane.block, 'text-ink-800'),
                        interactive &&
                          'cursor-pointer hover:z-[2] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade-600',
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${(item.column / item.columns) * 100}% + 1px)`,
                        width: `calc(${100 / item.columns}% - 2px)`,
                      }}
                    >
                      <span className="block truncate font-semibold tabular-nums">{time}</span>
                      <span className="block truncate font-semibold">{label}</span>
                      {item.session.subjectName ? (
                        <span className="block truncate">{item.session.subjectName}</span>
                      ) : null}
                      <span className="block truncate">
                        <span>{item.session.teacherName ?? 'Chưa có GV'}</span> · <span>{room}</span>
                      </span>
                    </button>
                  )
                })}

                {showNow ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-[3]"
                    style={{ top: ((nowMinutes - range.start * 60) / 60) * HOUR_HEIGHT }}
                    aria-hidden="true"
                  >
                    <div className="relative h-px bg-danger-500">
                      <span className="absolute -left-1 -top-1 size-2 rounded-full bg-danger-500" />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

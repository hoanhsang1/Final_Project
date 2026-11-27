import type { ScheduleSession } from '@/features/schedule/types'

/** Khung giờ mặc định của lưới tuần (07:00–18:00). */
export const DEFAULT_HOUR_RANGE = { start: 7, end: 18 }

const DAY_MS = 86_400_000

export function startOfWeekLocal(date: Date): Date {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7))
  return value
}

export function addDaysLocal(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function dateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Vị trí 0..6 của ngày trong tuần bắt đầu từ `monday`. */
export function dayIndexInWeek(monday: Date, date: Date): number {
  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime()
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round((target - start) / DAY_MS)
}

export interface HourRange {
  start: number
  end: number
}

/** Khung giờ hiển thị: luôn gồm mặc định 07:00–18:00, mở rộng cho buổi học ngoài khung. */
export function hourRangeOf(
  sessions: Pick<ScheduleSession, 'startTime' | 'endTime'>[],
): HourRange {
  let start = DEFAULT_HOUR_RANGE.start
  let end = DEFAULT_HOUR_RANGE.end
  sessions.forEach((session) => {
    const from = new Date(session.startTime)
    const to = new Date(session.endTime)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return
    start = Math.min(start, Math.floor(minutesOfDay(from) / 60))
    end = Math.max(end, Math.ceil(minutesOfDay(to) / 60))
  })
  start = Math.max(0, Math.min(start, 23))
  end = Math.max(start + 1, Math.min(24, end))
  return { start, end }
}

export interface SessionInterval {
  session: ScheduleSession
  startMinute: number
  endMinute: number
}

export interface LaidOutSession extends SessionInterval {
  column: number
  columns: number
}

/**
 * Xếp các buổi trùng giờ trong một ngày thành cột song song (như Google Calendar).
 * Các buổi giao nhau tạo thành một cụm; trong cụm, mỗi buổi vào cột trống sớm nhất.
 */
export function layoutDaySessions(intervals: SessionInterval[]): LaidOutSession[] {
  const sorted = intervals
    .slice()
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute)
  const result: LaidOutSession[] = []
  let cluster: SessionInterval[] = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length === 0) return
    const columnEnds: number[] = []
    const placed = cluster.map((interval) => {
      let column = columnEnds.findIndex((end) => end <= interval.startMinute)
      if (column === -1) {
        column = columnEnds.length
        columnEnds.push(interval.endMinute)
      } else {
        columnEnds[column] = interval.endMinute
      }
      return { ...interval, column }
    })
    const columns = columnEnds.length
    placed.forEach((item) => result.push({ ...item, columns }))
    cluster = []
    clusterEnd = -1
  }

  sorted.forEach((interval) => {
    if (cluster.length > 0 && interval.startMinute >= clusterEnd) flush()
    cluster.push(interval)
    clusterEnd = Math.max(clusterEnd, interval.endMinute)
  })
  flush()
  return result
}

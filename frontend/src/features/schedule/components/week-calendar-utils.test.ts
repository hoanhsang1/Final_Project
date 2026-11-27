import { describe, expect, it } from 'vitest'

import {
  addDaysLocal,
  dateKey,
  dayIndexInWeek,
  hourRangeOf,
  layoutDaySessions,
  minutesOfDay,
  parseDateKey,
  startOfWeekLocal,
  type SessionInterval,
} from '@/features/schedule/components/week-calendar-utils'
import type { ScheduleSession } from '@/features/schedule/types'

function atMinutes(date: string, minutes: number): string {
  const day = parseDateKey(date)
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  ).toISOString()
}

function interval(date: string, startMinute: number, endMinute: number): SessionInterval {
  const session: ScheduleSession = {
    id: `${date}-${startMinute}`,
    classId: 'class-1',
    className: 'Lớp 10A1',
    teacherId: null,
    roomId: null,
    startTime: atMinutes(date, startMinute),
    endTime: atMinutes(date, endMinute),
    status: 'draft',
    departmentId: 'dept-1',
  }
  return { session, startMinute, endMinute }
}

describe('week-calendar-utils', () => {
  it('tuần bắt đầu từ thứ 2 với mọi ngày trong tuần', () => {
    expect(dateKey(startOfWeekLocal(new Date(2026, 2, 2)))).toBe('2026-03-02')
    expect(dateKey(startOfWeekLocal(new Date(2026, 2, 4, 15, 30)))).toBe('2026-03-02')
    // Chủ nhật thuộc tuần bắt đầu từ thứ 2 trước đó.
    expect(dateKey(startOfWeekLocal(new Date(2026, 2, 8)))).toBe('2026-03-02')
  })

  it('dateKey và parseDateKey đối xứng nhau', () => {
    expect(dateKey(new Date(2026, 10, 3))).toBe('2026-11-03')
    expect(dateKey(parseDateKey('2026-11-03'))).toBe('2026-11-03')
    expect(dateKey(addDaysLocal(parseDateKey('2026-11-03'), -7))).toBe('2026-10-27')
  })

  it('dayIndexInWeek trả vị trí 0..6 trong tuần', () => {
    const monday = startOfWeekLocal(new Date(2026, 2, 4))
    expect(dayIndexInWeek(monday, new Date(2026, 2, 2))).toBe(0)
    expect(dayIndexInWeek(monday, new Date(2026, 2, 8, 22))).toBe(6)
    expect(dayIndexInWeek(monday, new Date(2026, 2, 9))).toBe(7)
  })

  it('hourRangeOf giữ 07:00–18:00 và mở rộng cho buổi ngoài khung', () => {
    expect(hourRangeOf([])).toEqual({ start: 7, end: 18 })
    expect(hourRangeOf([interval('2026-03-02', 8 * 60, 10 * 60).session])).toEqual({
      start: 7,
      end: 18,
    })
    expect(
      hourRangeOf([
        interval('2026-03-02', 6 * 60 + 30, 7 * 60).session,
        interval('2026-03-03', 17 * 60, 19 * 60 + 15).session,
      ]),
    ).toEqual({ start: 6, end: 20 })
  })

  it('minutesOfDay trả số phút tính từ nửa đêm theo giờ địa phương', () => {
    expect(minutesOfDay(new Date(2026, 2, 2, 0, 0))).toBe(0)
    expect(minutesOfDay(new Date(2026, 2, 2, 8, 15))).toBe(495)
  })

  it('layoutDaySessions tách buổi trùng giờ thành cột song song', () => {
    const laidOut = layoutDaySessions([
      interval('2026-03-02', 8 * 60, 10 * 60),
      interval('2026-03-02', 9 * 60, 11 * 60),
    ])
    expect(laidOut).toHaveLength(2)
    expect(laidOut.map((item) => item.column)).toEqual([0, 1])
    expect(laidOut.every((item) => item.columns === 2)).toBe(true)
  })

  it('layoutDaySessions dùng lại cột khi buổi trước đã kết thúc', () => {
    const laidOut = layoutDaySessions([
      interval('2026-03-02', 8 * 60, 11 * 60),
      interval('2026-03-02', 8 * 60, 9 * 60),
      interval('2026-03-02', 9 * 60 + 30, 10 * 60 + 30),
    ])
    const byStart = new Map(laidOut.map((item) => [item.startMinute, item]))
    expect(byStart.get(8 * 60)?.columns).toBe(2)
    expect(byStart.get(9 * 60 + 30)?.column).toBe(1)
  })

  it('layoutDaySessions tách cụm rời rạc', () => {
    const laidOut = layoutDaySessions([
      interval('2026-03-02', 7 * 60, 8 * 60),
      interval('2026-03-02', 9 * 60, 10 * 60),
    ])
    expect(laidOut.every((item) => item.column === 0 && item.columns === 1)).toBe(true)
  })
})

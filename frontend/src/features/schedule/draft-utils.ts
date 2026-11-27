import type { ScheduleDraftItem, ScheduleTimeSlot } from '@/features/schedule/types'

/** Múi giờ nghiệp vụ cố định của MEMS (Asia/Ho_Chi_Minh, UTC+7, không có DST). */
export const BUSINESS_UTC_OFFSET = '+07:00'

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(date: string, days: number): Date {
  const value = parse(date)
  value.setUTCDate(value.getUTCDate() + days)
  return value
}

/** Thứ trong tuần theo quy ước MEMS: 1 = Thứ 2 … 7 = Chủ nhật. */
export function weekdayOf(date: string): number {
  return ((parse(date).getUTCDay() + 6) % 7) + 1
}

/** Thứ 2 của tuần chứa ngày `date`. */
export function mondayOf(date: string): Date {
  return addDays(date, 1 - weekdayOf(date))
}

/** Ngày bắt đầu (thứ 2) của tuần thứ `week` (1-based) tính từ `dateFrom`. */
export function weekStart(dateFrom: string, week: number): Date {
  return addDays(dateFrom, 1 - weekdayOf(dateFrom) + (week - 1) * 7)
}

export function formatDayMonth(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(
    date.getUTCMonth() + 1,
  ).padStart(2, '0')}`
}

/** Đổi ngày + giờ "HH:mm" (giờ Việt Nam) sang Instant ISO để gửi backend. */
export function instantOf(date: string, time: string): string {
  return new Date(`${date}T${time}:00${BUSINESS_UTC_OFFSET}`).toISOString()
}

export function activeSlots(timeSlots: ScheduleTimeSlot[]): ScheduleTimeSlot[] {
  return timeSlots
    .filter((slot) => slot.isActive)
    .slice()
    .sort((a, b) => a.periodNo - b.periodNo)
}

/** Số tiết tối đa có thể nối tiếp từ tiết bắt đầu (theo cờ joinsNext). */
export function maxConsecutivePeriods(
  slots: ScheduleTimeSlot[],
  startPeriod: number,
): number {
  const index = slots.findIndex((slot) => slot.periodNo === startPeriod)
  if (index < 0) return 0
  let count = 1
  for (let i = index; i < slots.length - 1; i += 1) {
    if (!slots[i]!.joinsNext) break
    if (slots[i + 1]!.periodNo !== slots[i]!.periodNo + 1) break
    count += 1
  }
  return count
}

export function periodsOverlap(a: number[], b: number[]): boolean {
  return a.some((period) => b.includes(period))
}

/** Phòng đã bị buổi khác trong cùng ngày và trùng tiết chiếm. */
export function blockedRoomIds(
  items: ScheduleDraftItem[],
  editingId: string,
  date: string,
  periods: number[],
): Set<string> {
  const blocked = new Set<string>()
  items.forEach((item) => {
    if (item.id === editingId || !item.roomId) return
    if (item.date !== date) return
    if (periodsOverlap(item.periods, periods)) blocked.add(item.roomId)
  })
  return blocked
}

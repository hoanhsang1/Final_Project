import type { AutoScheduleSlot } from './autoScheduleApi';

export { classOptionLabel, DAYS_OPTIONS } from './autoScheduleMessages';

/**
 * Dạng tối thiểu của một tiết: payload dùng `startTime`/`endTime`, còn unit test
 * và các nơi gọi cũ có thể dùng `start`/`end`. Cả hai cùng được chấp nhận.
 */
export type TimeSlotLike =
  | { startTime: string; endTime: string }
  | { start: string; end: string };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Khung 4 tiết liên tiếp 07:30 → 10:30 (D11). Có thể chỉnh từng tiết trên UI. */
export const DEFAULT_TIME_SLOTS: AutoScheduleSlot[] = [
  { startTime: '07:30', endTime: '08:15' },
  { startTime: '08:15', endTime: '09:00' },
  { startTime: '09:00', endTime: '09:45' },
  { startTime: '09:45', endTime: '10:30' },
];

function toMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function boundaries(slot: TimeSlotLike): { start: string; end: string } | null {
  const start = 'startTime' in slot ? slot.startTime : slot.start;
  const end = 'endTime' in slot ? slot.endTime : slot.end;
  if (typeof start !== 'string' || typeof end !== 'string') return null;
  return { start, end };
}

/**
 * D10: mỗi tiết phải có độ dài bội của 45 phút, và các tiết phải nối liền nhau
 * (tiết trước kết thúc đúng lúc tiết sau bắt đầu). 90 phút = 2 tiết hợp lệ;
 * 60 phút hoặc có khoảng trống giữa 2 tiết thì bị từ chối.
 */
export function isContiguous45Slots(slots: readonly TimeSlotLike[]): boolean {
  if (!Array.isArray(slots) || slots.length === 0) return false;

  let previousEnd: number | null = null;
  for (const slot of slots) {
    const pair = boundaries(slot);
    if (!pair) return false;

    const start = toMinutes(pair.start);
    const end = toMinutes(pair.end);
    if (start === null || end === null || end <= start) return false;

    const duration = end - start;
    if (duration <= 0 || duration % 45 !== 0) return false;
    if (previousEnd !== null && previousEnd !== start) return false;

    previousEnd = end;
  }
  return true;
}

const DAY_NUMBERS: Readonly<Record<string, number>> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

/** `CheckboxList` dùng `mon`…`sun`; hợp đồng BE dùng 1..7. */
export function sessionDaysFromValues(days: readonly string[]): number[] {
  return days
    .map((day) => DAY_NUMBERS[day])
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);
}

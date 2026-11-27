/**
 * Bố cục lưới tuần (07:00–20:00) thuần túy: không render, không gọi API.
 * Mọi mốc thời gian được đọc theo giờ địa phương của trình duyệt.
 */
import dayjs from 'dayjs';
import type { ScheduleItem } from './types';

export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 20;
export const HOUR_HEIGHT_PX = 56;

export const PASTEL_COLORS: readonly string[] = [
  '#D6E2F3', '#D1E5DB', '#E2D7EF', '#EED9E4', '#F1E3C5',
];

const WINDOW_START_MIN = GRID_START_HOUR * 60;
const WINDOW_END_MIN = GRID_END_HOUR * 60;
const WINDOW_SPAN_MIN = WINDOW_END_MIN - WINDOW_START_MIN;
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export interface PositionedSession {
  item: ScheduleItem;
  lane: number;
  laneCount: number;
  topPercent: number;
  heightPercent: number;
  clipped: boolean;
}

export interface WeekDay {
  key: string;
  label: string;
  dateLabel: string;
  sessions: PositionedSession[];
}

export interface WeekLayout {
  days: WeekDay[];
  weekStart: string;
  weekEnd: string;
  outOfRangeCount: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Thứ Hai của tuần chứa `value`, định dạng `YYYY-MM-DD` theo giờ local. */
export function weekKeyOf(value: string): string {
  const date = dayjs(value);
  return date.subtract((date.day() + 6) % 7, 'day').format('YYYY-MM-DD');
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  return dayjs(weekStart).add(deltaWeeks, 'week').format('YYYY-MM-DD');
}

/** Băm ổn định, có trọng số theo vị trí để các tên khác nhau không dễ trùng màu. */
export function pastelFor(item: ScheduleItem): string {
  const key = item.subjectName || item.className || item.classId || '';
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % PASTEL_COLORS.length;
  }
  return PASTEL_COLORS[hash];
}

/** Trạng thái buổi đã hủy — nhận `cancelled` và mọi biến thể `huỷ`/`hủy`/`HỦY`. */
export function isCancelledStatus(status: string): boolean {
  const normalized = (status ?? '').trim().toLowerCase();
  // Bỏ dấu tiếng Việt để "huỷ" (dấu ở y) và "hủy" (dấu ở u) cùng khớp một mẫu.
  const unaccented = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return unaccented.includes('cancel') || unaccented.includes('huy');
}

interface TimedSession {
  position: PositionedSession;
  start: number;
  end: number;
}

export function layoutWeek(items: ScheduleItem[], weekStart: string): WeekLayout {
  const monday = weekKeyOf(weekStart);
  let outOfRangeCount = 0;

  const days: WeekDay[] = Array.from({ length: 7 }, (_, dayIndex) => {
    const key = dayjs(monday).add(dayIndex, 'day').format('YYYY-MM-DD');
    const dayStart = dayjs(key);

    const timed: TimedSession[] = items
      .filter((item) => dayjs(item.startTime).format('YYYY-MM-DD') === key)
      .map((item) => {
        // diff theo ngày của khóa: buổi qua nửa đêm có end > 1440, không bị quay về 00:30.
        const rawStart = dayjs(item.startTime).diff(dayStart, 'minute');
        const rawEnd = dayjs(item.endTime).diff(dayStart, 'minute');
        const clipped = rawStart < WINDOW_START_MIN || rawEnd > WINDOW_END_MIN;
        if (clipped || rawEnd <= rawStart) outOfRangeCount += 1;

        const start = clamp(rawStart, WINDOW_START_MIN, WINDOW_END_MIN);
        const end = clamp(rawEnd, WINDOW_START_MIN, WINDOW_END_MIN);
        return {
          position: {
            item,
            lane: 0,
            laneCount: 1,
            topPercent: ((start - WINDOW_START_MIN) / WINDOW_SPAN_MIN) * 100,
            heightPercent: Math.max(((end - start) / WINDOW_SPAN_MIN) * 100, 2),
            clipped,
          },
          start,
          end,
        };
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);

    let cluster: TimedSession[] = [];
    let laneEnds: number[] = [];
    const closeCluster = (): void => {
      for (const session of cluster) session.position.laneCount = laneEnds.length;
      cluster = [];
      laneEnds = [];
    };

    for (const session of timed) {
      // Chỉ gọi Math.max khi cluster (và laneEnds) đang có phần tử.
      if (cluster.length > 0 && session.start >= Math.max(...laneEnds)) closeCluster();

      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= session.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(session.end);
      } else {
        laneEnds[lane] = session.end;
      }
      session.position.lane = lane;
      cluster.push(session);
    }
    if (cluster.length > 0) closeCluster();

    return {
      key,
      label: DAY_LABELS[dayIndex],
      dateLabel: dayjs(key).format('DD/MM'),
      sessions: timed.map((session) => session.position),
    };
  });

  return {
    days,
    weekStart: monday,
    weekEnd: dayjs(monday).add(6, 'day').format('YYYY-MM-DD'),
    outOfRangeCount,
  };
}

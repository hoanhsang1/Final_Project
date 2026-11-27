/**
 * Bố cục "lịch gọn" 3 buổi (Sáng/Chiều/Tối) thuần túy: không render, không gọi API.
 * Mọi mốc thời gian được đọc theo giờ địa phương của trình duyệt.
 */
import dayjs from 'dayjs';
import type { ScheduleItem } from './types';
import { isCancelledStatus, pastelFor, weekKeyOf } from './weeklyGrid';

export type BuoiKey = 'SANG' | 'CHIEU' | 'TOI';

export interface CompactSession {
  item: ScheduleItem;
  buoi: BuoiKey;
  timeLabel: string;
  color: string;
  cancelled: boolean;
}

export interface CompactBuoi {
  key: BuoiKey;
  label: string;
  sessions: CompactSession[];
}

export interface CompactDay {
  key: string;
  label: string;
  dateLabel: string;
  buoi: CompactBuoi[];
}

export interface CompactWeekLayout {
  days: CompactDay[];
  weekStart: string;
  weekEnd: string;
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
const BUOI_ORDER: readonly BuoiKey[] = ['SANG', 'CHIEU', 'TOI'];
const BUOI_LABELS: Record<BuoiKey, string> = {
  SANG: 'Sáng',
  CHIEU: 'Chiều',
  TOI: 'Tối',
};

/** Buổi của một mốc bắt đầu: trước 12:00 là Sáng, trước 18:00 là Chiều, còn lại là Tối. */
export function buoiOf(startTime: string): BuoiKey {
  const hour = dayjs(startTime).hour();
  if (hour < 12) return 'SANG';
  if (hour < 18) return 'CHIEU';
  return 'TOI';
}

const timeLabelOf = (item: ScheduleItem): string =>
  `${dayjs(item.startTime).format('HH:mm')}–${dayjs(item.endTime).format('HH:mm')}`;

export function layoutCompactWeek(items: ScheduleItem[], weekStart: string): CompactWeekLayout {
  const monday = weekKeyOf(weekStart);

  const days: CompactDay[] = Array.from({ length: 7 }, (_, dayIndex) => {
    const key = dayjs(monday).add(dayIndex, 'day').format('YYYY-MM-DD');
    const dayItems = items
      .filter((item) => dayjs(item.startTime).format('YYYY-MM-DD') === key)
      .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());

    const buoi: CompactBuoi[] = BUOI_ORDER.map((buoiKey) => ({
      key: buoiKey,
      label: BUOI_LABELS[buoiKey],
      sessions: dayItems
        .filter((item) => buoiOf(item.startTime) === buoiKey)
        .map((item) => ({
          item,
          buoi: buoiKey,
          timeLabel: timeLabelOf(item),
          color: pastelFor(item),
          cancelled: isCancelledStatus(item.status),
        })),
    }));

    return {
      key,
      label: DAY_LABELS[dayIndex],
      dateLabel: dayjs(key).format('DD/MM'),
      buoi,
    };
  });

  return {
    days,
    weekStart: monday,
    weekEnd: dayjs(monday).add(6, 'day').format('YYYY-MM-DD'),
  };
}

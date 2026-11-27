import { describe, expect, it } from 'vitest';
import {
  isCancelledStatus,
  layoutWeek,
  PASTEL_COLORS,
  pastelFor,
  shiftWeek,
  weekKeyOf,
} from './weeklyGrid';
import type { ScheduleItem } from './types';

const item = (over: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: 's1', classId: 'c1', className: '12A1',
  startTime: '2026-12-07T07:30:00', endTime: '2026-12-07T08:15:00',
  subjectName: 'Java cơ bản', status: 'scheduled', ...over,
});

describe('weeklyGrid', () => {
  it('maps a date to its Monday and shifts weeks', () => {
    expect(weekKeyOf('2026-12-09T09:00:00')).toBe('2026-12-07');
    expect(shiftWeek('2026-12-07', 1)).toBe('2026-12-14');
    expect(shiftWeek('2026-12-14', -1)).toBe('2026-12-07');
  });

  it('uses a stable pastel per subject', () => {
    expect(PASTEL_COLORS).toContain(pastelFor(item()));
    expect(pastelFor(item())).toBe(pastelFor(item({ id: 's2', className: '12A2' })));
  });

  it('assigns separate lanes to overlapping sessions', () => {
    const a = item({ id: 'a', startTime: '2026-12-07T07:30:00', endTime: '2026-12-07T09:00:00' });
    const b = item({ id: 'b', startTime: '2026-12-07T08:15:00', endTime: '2026-12-07T09:45:00', subjectName: 'CSDL' });
    const t2 = layoutWeek([a, b], '2026-12-07').days[0];
    expect(t2.sessions).toHaveLength(2);
    expect(new Set(t2.sessions.map((s) => s.lane)).size).toBe(2);
    expect(t2.sessions.every((s) => s.laneCount === 2)).toBe(true);
  });

  it('clips sessions outside the window and counts them', () => {
    const early = item({ id: 'e', startTime: '2026-12-07T06:00:00', endTime: '2026-12-07T07:30:00' });
    const late = item({ id: 'l', startTime: '2026-12-07T19:30:00', endTime: '2026-12-08T00:30:00' });
    const result = layoutWeek([early, late], '2026-12-07');
    expect(result.outOfRangeCount).toBe(2);
    expect(result.days[0].sessions.every((s) => s.clipped)).toBe(true);
  });

  it('recognises cancelled statuses in either language', () => {
    expect(isCancelledStatus('cancelled')).toBe(true);
    expect(isCancelledStatus('ĐÃ HỦY')).toBe(true);
    expect(isCancelledStatus('scheduled')).toBe(false);
  });
});

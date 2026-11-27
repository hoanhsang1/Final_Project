import { describe, expect, it } from 'vitest';
import { buoiOf, layoutCompactWeek } from './compactSchedule';
import { pastelFor } from './weeklyGrid';
import type { ScheduleItem } from './types';

const item = (over: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: 's1', classId: 'c1', className: '12A1',
  startTime: '2026-12-01T07:30:00', endTime: '2026-12-01T09:00:00',
  subjectName: 'Java cơ bản', status: 'scheduled', ...over,
});

describe('buoiOf', () => {
  it('splits the day at 12:00 and 18:00', () => {
    expect(buoiOf('2026-12-01T11:59:00')).toBe('SANG');
    expect(buoiOf('2026-12-01T12:00:00')).toBe('CHIEU');
    expect(buoiOf('2026-12-01T17:59:00')).toBe('CHIEU');
    expect(buoiOf('2026-12-01T18:00:00')).toBe('TOI');
    expect(buoiOf('2026-12-01T23:30:00')).toBe('TOI');
  });
});

describe('layoutCompactWeek', () => {
  const a = item({ id: 'a', startTime: '2026-12-01T07:30:00', endTime: '2026-12-01T09:00:00' });
  const b = item({ id: 'b', startTime: '2026-12-01T09:00:00', endTime: '2026-12-01T10:30:00' });
  const e = item({ id: 'e', startTime: '2026-12-01T19:00:00', endTime: '2026-12-01T20:30:00' });
  // Tuần 2026-11-30 (T2) … 2026-12-06 (CN); 2026-12-01 là thứ Ba → days[1].
  const layout = layoutCompactWeek([a, b, e], '2026-11-30');

  it('builds 7 days from Monday with 3 buổi each in fixed order', () => {
    expect(layout.days.map((d) => d.label)).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    expect(layout.weekStart).toBe('2026-11-30');
    expect(layout.weekEnd).toBe('2026-12-06');
    expect(layout.days.every((d) => d.buoi.length === 3)).toBe(true);
    expect(layout.days[0].buoi.map((bu) => bu.key)).toEqual(['SANG', 'CHIEU', 'TOI']);
    expect(layout.days[0].buoi.map((bu) => bu.label)).toEqual(['Sáng', 'Chiều', 'Tối']);
  });

  it('groups sessions into the right buổi, sorted by start time', () => {
    expect(layout.days[1].buoi[0].sessions.map((s) => s.item.id)).toEqual(['a', 'b']);
    expect(layout.days[1].buoi[1].sessions).toEqual([]);
    expect(layout.days[1].buoi[2].sessions.map((s) => s.item.id)).toEqual(['e']);
    expect(layout.days[0].buoi.every((bu) => bu.sessions.length === 0)).toBe(true);
    expect(layout.days[2].buoi.every((bu) => bu.sessions.length === 0)).toBe(true);
  });

  it('formats the time label and takes the colour from the subject', () => {
    const first = layout.days[1].buoi[0].sessions[0];
    expect(first.timeLabel).toBe('07:30–09:00');
    expect(first.color).toBe(pastelFor(a));
    expect(first.cancelled).toBe(false);
  });

  it('marks cancelled sessions', () => {
    const cancelled = item({
      id: 'x', startTime: '2026-12-02T13:00:00', endTime: '2026-12-02T14:00:00', status: 'ĐÃ HỦY',
    });
    const result = layoutCompactWeek([cancelled], '2026-11-30');
    const session = result.days[2].buoi[1].sessions[0];
    expect(session.cancelled).toBe(true);
    expect(session.color).toBe(pastelFor(cancelled));
  });

  it('sorts sessions within a buổi by start time, not input order', () => {
    const later = item({ id: 'late', startTime: '2026-12-03T10:00:00', endTime: '2026-12-03T11:00:00' });
    const earlier = item({ id: 'early', startTime: '2026-12-03T07:00:00', endTime: '2026-12-03T08:00:00' });
    const result = layoutCompactWeek([later, earlier], '2026-11-30');
    expect(result.days[3].buoi[0].sessions.map((s) => s.item.id)).toEqual(['early', 'late']);
  });
});

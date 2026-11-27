import { describe, expect, it } from 'vitest';
import { canToggleScheduleMode, initialScheduleMode } from './scheduleViewMode';

describe('initialScheduleMode', () => {
  it('gives teachers the hourly grid, everyone else the compact view', () => {
    expect(initialScheduleMode(['TEACHER'])).toBe('hourly');
    expect(initialScheduleMode(['STUDENT'])).toBe('compact');
    expect(initialScheduleMode([])).toBe('compact');
  });

  it('lets TEACHER win when several roles are present', () => {
    expect(initialScheduleMode(['STUDENT', 'TEACHER'])).toBe('hourly');
  });
});

describe('canToggleScheduleMode', () => {
  it('only lets roles without TEACHER/STUDENT switch mode', () => {
    expect(canToggleScheduleMode(['TEACHER'])).toBe(false);
    expect(canToggleScheduleMode(['STUDENT'])).toBe(false);
    expect(canToggleScheduleMode([])).toBe(true);
  });

  it('refuses to toggle when a self-service role is mixed with others', () => {
    expect(canToggleScheduleMode(['OWNER', 'STUDENT'])).toBe(false);
    expect(canToggleScheduleMode(['OWNER'])).toBe(true);
  });
});

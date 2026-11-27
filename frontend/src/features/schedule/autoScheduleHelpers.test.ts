import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_SLOTS,
  isContiguous45Slots,
  sessionDaysFromValues,
} from './autoScheduleHelpers';

describe('isContiguous45Slots (D10/D11)', () => {
  it('chuỗi 2 tiết 45 phút liền nhau thì hợp lệ', () => {
    expect(
      isContiguous45Slots([
        { start: '07:30', end: '08:15' },
        { start: '08:15', end: '09:00' },
      ]),
    ).toBe(true);
  });

  it('chấp nhận cả dạng startTime/endTime của payload', () => {
    expect(isContiguous45Slots(DEFAULT_TIME_SLOTS)).toBe(true);
  });

  it('tiết 60 phút thì không hợp lệ', () => {
    expect(isContiguous45Slots([{ startTime: '07:30', endTime: '08:30' }])).toBe(false);
  });

  it('có khoảng trống giữa các tiết thì không hợp lệ', () => {
    expect(
      isContiguous45Slots([
        { startTime: '07:30', endTime: '08:15' },
        { startTime: '08:30', endTime: '09:15' },
      ]),
    ).toBe(false);
  });

  it('tiết chồng nhau hoặc giờ sai định dạng thì không hợp lệ', () => {
    expect(
      isContiguous45Slots([
        { start: '07:30', end: '08:15' },
        { start: '08:00', end: '08:45' },
      ]),
    ).toBe(false);
    expect(isContiguous45Slots([{ start: '25:00', end: '25:45' }])).toBe(false);
  });

  it('mảng rỗng hoặc kết thúc trước khi bắt đầu thì không hợp lệ', () => {
    expect(isContiguous45Slots([])).toBe(false);
    expect(isContiguous45Slots([{ start: '08:15', end: '07:30' }])).toBe(false);
  });
});

describe('sessionDaysFromValues', () => {
  it('map mon..sun sang 1..7 và bỏ giá trị lạ', () => {
    expect(sessionDaysFromValues(['fri', 'mon', 'unknown', 'wed'])).toEqual([1, 3, 5]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAutoSchedule } from './autoScheduleApi';
import type { AutoSchedulePayload } from './autoScheduleApi';

const mockPost = vi.fn();

vi.mock('../../lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const PAYLOAD: AutoSchedulePayload = {
  classIds: ['c1'],
  dateFrom: '2026-12-01',
  dateTo: '2026-12-07',
  slots: [{ startTime: '07:30', endTime: '08:15' }],
  sessionDays: [1, 3],
};

const RESULT = {
  scheduled: [],
  unscheduled: [],
  summary: { totalRequested: 1, scheduled: 0, unscheduled: 0 },
};

beforeEach(() => {
  mockPost.mockReset();
});

describe('autoScheduleApi — hợp đồng /auto-generate', () => {
  it('dryRun=true gọi POST đúng URL kèm ?dryRun=true', async () => {
    mockPost.mockResolvedValue({ data: RESULT });

    await expect(generateAutoSchedule('d1', PAYLOAD, true)).resolves.toEqual(RESULT);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/departments/d1/schedules/auto-generate?dryRun=true',
      PAYLOAD,
    );
  });

  it('dryRun=false gọi POST đúng URL kèm ?dryRun=false', async () => {
    mockPost.mockResolvedValue({ data: RESULT });

    await expect(generateAutoSchedule('d1', PAYLOAD, false)).resolves.toEqual(RESULT);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/departments/d1/schedules/auto-generate?dryRun=false',
      PAYLOAD,
    );
  });

  it('mã hoá departmentId khi có ký tự đặc biệt', async () => {
    mockPost.mockResolvedValue({ data: RESULT });

    await generateAutoSchedule('d 1', PAYLOAD, true);
    expect(mockPost.mock.calls[0][0]).toBe(
      '/api/departments/d%201/schedules/auto-generate?dryRun=true',
    );
  });

  it('lỗi 409 ROOM_SCHEDULE_CONFLICT được map sang câu tiếng Việt', async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 409,
        data: { code: 'ROOM_SCHEDULE_CONFLICT', message: 'raw backend message' },
      },
    });

    await expect(generateAutoSchedule('d1', PAYLOAD, false)).rejects.toThrow(
      'Phòng học đã được đặt trong khung giờ này.',
    );
  });

  it.each([
    ['MODULE_NOT_ENABLED', 'Tổ chức chưa bật module Quản lý lịch.'],
    ['ROOM_NOT_AVAILABLE', 'Không có phòng phù hợp hoặc phòng đã được sử dụng.'],
    ['ROOM_TYPE_MISMATCH', 'Loại phòng không phù hợp với yêu cầu của môn học.'],
  ])('mã lỗi chuỗi %s giữ nguyên thông báo nghiệp vụ', async (code, message) => {
    mockPost.mockRejectedValue({
      response: { status: 409, data: { code, message: 'raw' } },
    });

    await expect(generateAutoSchedule('d1', PAYLOAD, true)).rejects.toThrow(message);
  });

  it('mã số không được xem là mã lỗi chuỗi', async () => {
    mockPost.mockRejectedValue({
      response: { status: 409, data: { code: 1133, message: 'Lỗi lạ' } },
    });

    await expect(generateAutoSchedule('d1', PAYLOAD, true)).rejects.toThrow('Lỗi lạ');
  });
});

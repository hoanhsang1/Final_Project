import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelSession,
  createSchedule,
  deleteSession,
  fetchImpacts,
  fetchMySchedule,
  fetchRoomSuggestions,
  fetchSchedules,
  scheduleErrorMessage,
  updateSchedule,
} from './scheduleApi';

/** Mock tầng HTTP — kiểm tra contract mà không cần ScheduleService chạy thật. */
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const SESSION = {
  id: 's1',
  classId: 'c1',
  className: '10A1',
  teacherId: 't1',
  teacherName: 'Nguyễn Văn A',
  roomId: 'r1',
  roomCode: 'P101',
  subjectName: 'Toán',
  startTime: '2026-12-01T07:30:00',
  endTime: '2026-12-01T09:00:00',
  status: 'DRAFT',
  departmentId: 'd1',
};

const PAYLOAD = {
  classId: 'c1',
  teacherId: 't1',
  roomId: 'r1',
  startTime: '2026-12-01T07:30:00',
  endTime: '2026-12-01T09:00:00',
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe('scheduleApi — lịch theo phòng ban', () => {
  it('fetchSchedules gửi from/to/classId tới GET /api/departments/{d}/schedules', async () => {
    mockGet.mockResolvedValue({ data: [SESSION] });

    await expect(
      fetchSchedules({
        departmentId: 'd1',
        from: '2026-12-01T00:00:00',
        to: '2026-12-07T23:59:59',
        classId: 'c1',
      }),
    ).resolves.toEqual([SESSION]);

    expect(mockGet).toHaveBeenCalledWith('/api/departments/d1/schedules', {
      params: {
        from: '2026-12-01T00:00:00',
        to: '2026-12-07T23:59:59',
        classId: 'c1',
      },
    });
  });

  it('createSchedule gọi POST /api/departments/{d}/schedules với payload', async () => {
    mockPost.mockResolvedValue({ data: SESSION });

    await expect(createSchedule('d1', PAYLOAD)).resolves.toEqual(SESSION);
    expect(mockPost).toHaveBeenCalledWith('/api/departments/d1/schedules', PAYLOAD);
  });

  it('updateSchedule gọi PUT /api/departments/{d}/schedules/{id}', async () => {
    mockPut.mockResolvedValue({ data: SESSION });

    await expect(updateSchedule('d1', 's1', PAYLOAD)).resolves.toEqual(SESSION);
    expect(mockPut).toHaveBeenCalledWith('/api/departments/d1/schedules/s1', PAYLOAD);
  });

  it('cancelSession gọi POST .../{id}/cancel (KHÔNG phải DELETE)', async () => {
    mockPost.mockResolvedValue({ data: { ...SESSION, status: 'CANCELLED' } });

    await expect(cancelSession('d1', 's1')).resolves.toEqual({
      ...SESSION,
      status: 'CANCELLED',
    });
    expect(mockPost).toHaveBeenCalledWith('/api/departments/d1/schedules/s1/cancel');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deleteSession gọi DELETE .../{id}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await expect(deleteSession('d1', 's1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/departments/d1/schedules/s1');
  });
});

describe('scheduleApi — room picker / impacts / lịch cá nhân', () => {
  it('fetchRoomSuggestions chỉ gửi startTime/endTime, KHÔNG gửi classId', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'r1', code: 'P101', name: 'Phòng 101', capacity: 40 }] });

    const query = {
      departmentId: 'd1',
      startTime: '2026-12-01T07:30:00',
      endTime: '2026-12-01T09:00:00',
      // Trường bị cấm cho tới khi chốt S7 — truyền vào để chứng minh bị bỏ qua.
      classId: 'c1',
    };
    await expect(
      fetchRoomSuggestions(query as typeof query & { classId?: string }),
    ).resolves.toEqual([{ id: 'r1', code: 'P101', name: 'Phòng 101', capacity: 40 }]);

    expect(mockGet).toHaveBeenCalledWith('/api/departments/d1/schedules/room-suggestions', {
      params: {
        startTime: '2026-12-01T07:30:00',
        endTime: '2026-12-01T09:00:00',
      },
    });
    expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('classId');
  });

  it('fetchImpacts gọi GET .../impacts với status (không gửi departmentId trong params)', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await expect(fetchImpacts({ departmentId: 'd1', status: 'PENDING' })).resolves.toEqual([]);
    expect(mockGet).toHaveBeenCalledWith('/api/departments/d1/schedules/impacts', {
      params: { status: 'PENDING' },
    });
    expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('departmentId');
  });

  it('fetchMySchedule gọi GET /api/schedules/me với from/to, KHÔNG gửi departmentId', async () => {
    mockGet.mockResolvedValue({ data: [SESSION] });

    const query = { from: '2026-12-01T00:00:00', to: '2026-12-07T23:59:59', departmentId: 'd1' };
    await expect(fetchMySchedule(query as Omit<typeof query, 'departmentId'>)).resolves.toEqual([
      SESSION,
    ]);

    expect(mockGet).toHaveBeenCalledWith('/api/schedules/me', {
      params: {
        from: '2026-12-01T00:00:00',
        to: '2026-12-07T23:59:59',
      },
    });
    expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('departmentId');
  });
});

describe('scheduleApi — mã lỗi dạng CHUỖI', () => {
  it.each([
    ['ROOM_SCHEDULE_CONFLICT', 'Phòng học đã được đặt trong khung giờ này.'],
    ['TEACHER_SCHEDULE_CONFLICT', 'Giáo viên đã có buổi học trong khung giờ này.'],
    ['CLASS_SCHEDULE_CONFLICT', 'Lớp học đã có buổi học trong khung giờ này.'],
  ])('%s hiện đúng thông báo nghiệp vụ', async (code, message) => {
    mockPost.mockRejectedValueOnce({
      response: { status: 409, data: { code, message: 'raw backend message' } },
    });

    await expect(createSchedule('d1', PAYLOAD)).rejects.toThrow(message);
    expect(scheduleErrorMessage({ response: { data: { code }, status: 409 } })).toBe(message);
  });

  it('mã số 1133 không được hiểu là mã lỗi chuỗi', () => {
    expect(
      scheduleErrorMessage({ response: { status: 409, data: { code: 1133, message: 'Lỗi lạ' } } }),
    ).toBe('Lỗi lạ');
    expect(scheduleErrorMessage({ response: { status: 500, data: { code: null } } })).toBe(
      'Không lưu được lịch, vui lòng thử lại.',
    );
  });
});

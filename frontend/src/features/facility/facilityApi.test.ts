import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEquipment,
  createRoom,
  deleteEquipment,
  deleteRoom,
  facilityErrorMessage,
  fetchEquipment,
  fetchFacilityIssues,
  fetchRooms,
  reportFacilityIssue,
  resolveFacilityIssue,
  updateEquipment,
  updateRoom,
} from './facilityApi';

/** Mock tầng HTTP — kiểm tra contract mà không cần FacilityService chạy thật. */
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

const ROOM = {
  id: 'r1',
  code: 'P101',
  name: 'Phòng 101',
  building: 'A',
  floor: '1',
  capacity: 40,
  roomType: 'classroom',
  status: 'active',
};

const ROOM_PAYLOAD = {
  code: 'P101',
  name: 'Phòng 101',
  building: 'A',
  floor: '1',
  capacity: 40,
  roomType: 'classroom' as const,
  status: 'active' as const,
};

const EQUIPMENT = {
  id: 'e1',
  assetCode: 'TS-001',
  name: 'Máy chiếu',
  equipmentType: 'Projector',
  roomId: 'r1',
  roomName: 'Phòng 101',
  status: 'in_use',
  purchaseDate: '2026-01-10',
};

const EQUIPMENT_PAYLOAD = {
  assetCode: 'TS-001',
  name: 'Máy chiếu',
  equipmentType: 'Projector',
  roomId: 'r1',
  status: 'in_use' as const,
  purchaseDate: '2026-01-10',
};

const ISSUE = {
  id: 'i1',
  equipmentId: 'e1',
  equipmentName: 'Máy chiếu',
  reportedBy: 'u1',
  description: 'Máy chiếu không bật',
  photoUrl: null,
  status: 'open',
  resolvedAt: null,
  createdAt: '2026-11-26T08:00:00Z',
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe('facilityApi — phòng', () => {
  it('fetchRooms gọi GET /api/departments/{d}/facilities/rooms', async () => {
    mockGet.mockResolvedValue({ data: [ROOM] });

    await expect(fetchRooms('d1')).resolves.toEqual([ROOM]);
    expect(mockGet).toHaveBeenCalledWith('/api/departments/d1/facilities/rooms');
  });

  it('createRoom gọi POST .../rooms với RoomRequest', async () => {
    mockPost.mockResolvedValue({ data: ROOM });

    await expect(createRoom('d1', ROOM_PAYLOAD)).resolves.toEqual(ROOM);
    expect(mockPost).toHaveBeenCalledWith('/api/departments/d1/facilities/rooms', ROOM_PAYLOAD);
  });

  it('updateRoom gọi PUT .../rooms/{roomId}', async () => {
    mockPut.mockResolvedValue({ data: ROOM });

    await expect(updateRoom('d1', 'r1', ROOM_PAYLOAD)).resolves.toEqual(ROOM);
    expect(mockPut).toHaveBeenCalledWith('/api/departments/d1/facilities/rooms/r1', ROOM_PAYLOAD);
  });

  it('deleteRoom gọi DELETE .../rooms/{roomId}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await expect(deleteRoom('d1', 'r1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/departments/d1/facilities/rooms/r1');
  });
});

describe('facilityApi — thiết bị', () => {
  it('fetchEquipment gọi GET .../equipment', async () => {
    mockGet.mockResolvedValue({ data: [EQUIPMENT] });

    await expect(fetchEquipment('d1')).resolves.toEqual([EQUIPMENT]);
    expect(mockGet).toHaveBeenCalledWith('/api/departments/d1/facilities/equipment');
  });

  it('createEquipment gọi POST .../equipment với EquipmentRequest', async () => {
    mockPost.mockResolvedValue({ data: EQUIPMENT });

    await expect(createEquipment('d1', EQUIPMENT_PAYLOAD)).resolves.toEqual(EQUIPMENT);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/departments/d1/facilities/equipment',
      EQUIPMENT_PAYLOAD,
    );
  });

  it('updateEquipment gọi PUT .../equipment/{equipmentId}', async () => {
    mockPut.mockResolvedValue({ data: EQUIPMENT });

    await expect(updateEquipment('d1', 'e1', EQUIPMENT_PAYLOAD)).resolves.toEqual(EQUIPMENT);
    expect(mockPut).toHaveBeenCalledWith(
      '/api/departments/d1/facilities/equipment/e1',
      EQUIPMENT_PAYLOAD,
    );
  });

  it('deleteEquipment gọi DELETE .../equipment/{equipmentId}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await expect(deleteEquipment('d1', 'e1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/departments/d1/facilities/equipment/e1');
  });
});

describe('facilityApi — sự cố', () => {
  it('fetchFacilityIssues gọi GET .../issues?status= (không gửi departmentId trong params)', async () => {
    mockGet.mockResolvedValue({ data: [ISSUE] });

    await expect(fetchFacilityIssues({ departmentId: 'd1', status: 'open' })).resolves.toEqual([
      ISSUE,
    ]);
    expect(mockGet).toHaveBeenCalledWith('/api/departments/d1/facilities/issues', {
      params: { status: 'open' },
    });
    expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('departmentId');
  });

  it('fetchFacilityIssues gửi status undefined khi không lọc', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await expect(fetchFacilityIssues({ departmentId: 'd1' })).resolves.toEqual([]);
    expect(mockGet).toHaveBeenCalledWith('/api/departments/d1/facilities/issues', {
      params: { status: undefined },
    });
  });

  it('reportFacilityIssue gọi POST .../issues với IssueReportRequest', async () => {
    const payload = { equipmentId: 'e1', description: 'Máy chiếu không bật', photoUrl: null };
    mockPost.mockResolvedValue({ data: ISSUE });

    await expect(reportFacilityIssue('d1', payload)).resolves.toEqual(ISSUE);
    expect(mockPost).toHaveBeenCalledWith('/api/departments/d1/facilities/issues', payload);
  });

  it('resolveFacilityIssue gọi POST .../issues/{issueId}/resolve — KHÔNG phải PUT', async () => {
    mockPost.mockResolvedValue({ data: { ...ISSUE, status: 'resolved' } });

    await expect(resolveFacilityIssue('d1', 'i1')).resolves.toEqual({
      ...ISSUE,
      status: 'resolved',
    });
    expect(mockPost).toHaveBeenCalledWith('/api/departments/d1/facilities/issues/i1/resolve');
    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe('facilityApi — mã lỗi dạng CHUỖI', () => {
  it('ROOM_IN_USE (chuỗi) hiện thông báo nghiệp vụ, kể cả khi message thô khác', async () => {
    mockDelete.mockRejectedValueOnce({
      response: { status: 409, data: { code: 'ROOM_IN_USE', message: 'raw backend message' } },
    });

    await expect(deleteRoom('d1', 'r1')).rejects.toThrow(
      'Không thể xoá phòng vì vẫn còn thiết bị đang hoạt động trong phòng.',
    );
    expect(
      facilityErrorMessage({ response: { data: { code: 'ROOM_IN_USE' }, status: 409 } }),
    ).toBe('Không thể xoá phòng vì vẫn còn thiết bị đang hoạt động trong phòng.');
  });

  it('mã số 1133 không được hiểu là mã lỗi chuỗi', () => {
    expect(
      facilityErrorMessage({ response: { status: 409, data: { code: 1133, message: 'Lỗi lạ' } } }),
    ).toBe('Lỗi lạ');
  });

  it('không có response thì báo lỗi kết nối', () => {
    expect(facilityErrorMessage(new Error('network'))).toBe(
      'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
    );
  });
});

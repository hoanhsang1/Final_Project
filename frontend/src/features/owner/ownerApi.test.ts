import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDepartment,
  createMember,
  createPosition,
  deleteDepartment,
  deleteMember,
  deletePosition,
  fetchDepartments,
  fetchMembers,
  fetchPermissions,
  fetchPositions,
  OwnerApiError,
  ownerErrorMessage,
  updateDepartment,
  updateMemberPositions,
  updatePosition,
} from './ownerApi';

/**
 * Mock tầng HTTP (axios client) — test riêng logic của `ownerApi`, không phụ thuộc
 * mạng hay PeopleService đang chạy. Cùng khuôn với `features/auth/authApi.test.ts`.
 */
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

/** Error giống axios ném ra khi response lỗi (có `response.status` + `response.data`). */
function axiosLikeError(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } };
}

const DEPARTMENT = {
  id: 'd1',
  name: 'Khoa CNTT',
  description: 'Khoa Công nghệ thông tin',
  createdAt: '2026-10-01T03:00:00Z',
};

const POSITION = {
  id: 'p1',
  name: 'Giáo vụ',
  description: 'Quản lý hồ sơ sinh viên',
  createdAt: '2026-10-02T03:00:00Z',
  permissions: ['PEOPLE_VIEW'],
};

const MEMBER = {
  userId: 'u1',
  departmentId: 'd1',
  role: 'STAFF',
  appointedBy: 'owner-1',
  appointedAt: '2026-10-03T03:00:00Z',
  positionIds: ['p1'],
  permissions: ['PEOPLE_VIEW'],
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe('phòng ban', () => {
  it('fetchDepartments gọi GET /departments và trả mảng', async () => {
    mockGet.mockResolvedValue({ data: [DEPARTMENT] });

    await expect(fetchDepartments()).resolves.toEqual([DEPARTMENT]);
    expect(mockGet).toHaveBeenCalledWith('/departments');
  });

  it('createDepartment gửi đúng body', async () => {
    mockPost.mockResolvedValue({ data: DEPARTMENT });

    const payload = { name: 'Khoa CNTT', description: 'Khoa Công nghệ thông tin' };
    await expect(createDepartment(payload)).resolves.toEqual(DEPARTMENT);
    expect(mockPost).toHaveBeenCalledWith('/departments', payload);
  });

  it('updateDepartment gọi PUT /departments/{id}', async () => {
    mockPut.mockResolvedValue({ data: DEPARTMENT });

    await updateDepartment('d1', { name: 'Khoa CNTT' });
    expect(mockPut).toHaveBeenCalledWith('/departments/d1', {
      name: 'Khoa CNTT',
      description: undefined,
    });
  });

  it('deleteDepartment gọi DELETE /departments/{id}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await deleteDepartment('d1');
    expect(mockDelete).toHaveBeenCalledWith('/departments/d1');
  });
});

describe('chức vụ và quyền', () => {
  it('fetchPositions gọi GET /positions', async () => {
    mockGet.mockResolvedValue({ data: [POSITION] });

    await expect(fetchPositions()).resolves.toEqual([POSITION]);
    expect(mockGet).toHaveBeenCalledWith('/positions');
  });

  it('fetchPermissions gọi GET /permissions', async () => {
    const permissions = [{ code: 'PEOPLE_VIEW', description: 'View department members' }];
    mockGet.mockResolvedValue({ data: permissions });

    await expect(fetchPermissions()).resolves.toEqual(permissions);
    expect(mockGet).toHaveBeenCalledWith('/permissions');
  });

  it('createPosition gửi kèm mảng quyền', async () => {
    mockPost.mockResolvedValue({ data: POSITION });

    const payload = { name: 'Giáo vụ', permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT'] };
    await createPosition(payload);
    expect(mockPost).toHaveBeenCalledWith('/positions', payload);
  });

  it('updatePosition gọi PUT /positions/{id}', async () => {
    mockPut.mockResolvedValue({ data: POSITION });

    await updatePosition('p1', { name: 'Giáo vụ', description: 'Mô tả', permissions: [] });
    expect(mockPut).toHaveBeenCalledWith('/positions/p1', {
      name: 'Giáo vụ',
      description: 'Mô tả',
      permissions: [],
    });
  });

  it('deletePosition gọi DELETE /positions/{id}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await deletePosition('p1');
    expect(mockDelete).toHaveBeenCalledWith('/positions/p1');
  });
});

describe('nhân viên', () => {
  it('fetchMembers gọi GET /departments/{id}/members', async () => {
    mockGet.mockResolvedValue({ data: [MEMBER] });

    await expect(fetchMembers('d1')).resolves.toEqual([MEMBER]);
    expect(mockGet).toHaveBeenCalledWith('/departments/d1/members');
  });

  it('createMember gửi đúng body và trả mật khẩu tạm', async () => {
    const created = { member: MEMBER, temporaryPassword: 'abc123', mustChangePassword: true };
    mockPost.mockResolvedValue({ data: created });

    const payload = {
      username: 'gv.an',
      email: 'an@example.com',
      role: 'STAFF' as const,
      positionIds: ['p1'],
    };
    await expect(createMember('d1', payload)).resolves.toEqual(created);
    expect(mockPost).toHaveBeenCalledWith('/departments/d1/members', payload);
  });

  it('updateMemberPositions gọi PUT .../positions với mảng id chức vụ', async () => {
    mockPut.mockResolvedValue({ data: MEMBER });

    await updateMemberPositions('d1', 'u1', ['p1', 'p2']);
    expect(mockPut).toHaveBeenCalledWith('/departments/d1/members/u1/positions', {
      positionIds: ['p1', 'p2'],
    });
  });

  it('deleteMember gọi DELETE /departments/{id}/members/{userId}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await deleteMember('d1', 'u1');
    expect(mockDelete).toHaveBeenCalledWith('/departments/d1/members/u1');
  });
});

describe('bọc lỗi', () => {
  it('ném OwnerApiError giữ status và code của BE', async () => {
    mockDelete.mockRejectedValue(
      axiosLikeError(409, { code: 'DEPARTMENT_NOT_EMPTY', message: 'Remove department members first' }),
    );

    const error = await deleteDepartment('d1').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(OwnerApiError);
    expect((error as OwnerApiError).status).toBe(409);
    expect((error as OwnerApiError).code).toBe('DEPARTMENT_NOT_EMPTY');
  });
});

describe('ownerErrorMessage', () => {
  const messageFor = (status: number, code: string) =>
    ownerErrorMessage(new OwnerApiError(status, code, code));

  it('dịch phòng ban còn nhân viên', () => {
    expect(messageFor(409, 'DEPARTMENT_NOT_EMPTY')).toBe(
      'Phòng ban còn nhân viên. Hãy xoá hết nhân viên khỏi phòng ban trước.',
    );
  });

  it('dịch chức vụ đang được gán', () => {
    expect(messageFor(409, 'POSITION_IN_USE')).toBe(
      'Chức vụ đang được gán cho nhân viên. Gỡ chức vụ khỏi nhân viên trước khi xoá.',
    );
  });

  it('dịch tài khoản đã tồn tại', () => {
    expect(messageFor(409, 'ACCOUNT_EXISTS')).toBe('Tên đăng nhập hoặc email đã tồn tại.');
  });

  it('dịch không đủ quyền', () => {
    expect(messageFor(403, 'FORBIDDEN')).toBe('Bạn không có quyền thực hiện thao tác này.');
  });

  it('dịch dịch vụ tài khoản không phản hồi', () => {
    expect(messageFor(503, 'IDENTITY_UNAVAILABLE')).toBe(
      'Hệ thống tài khoản đang không phản hồi. Vui lòng thử lại sau ít phút.',
    );
  });

  it('dịch không tìm thấy', () => {
    expect(messageFor(404, 'DEPARTMENT_NOT_FOUND')).toBe('Không tìm thấy dữ liệu này.');
  });

  it('lỗi mạng không có response', () => {
    expect(ownerErrorMessage({ isAxiosError: true, request: {} })).toBe(
      'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
    );
  });

  it('mã quyền không hợp lệ', () => {
    expect(messageFor(400, 'UNKNOWN_PERMISSION')).toBe(
      'Có quyền không hợp lệ trong danh sách. Vui lòng tải lại trang và thử lại.',
    );
  });

  it('KHÔNG hiện message tiếng Anh chưa biết cho người dùng', () => {
    expect(messageFor(500, 'INTERNAL_ERROR')).toBe('Không lưu được, vui lòng thử lại.');
  });
});

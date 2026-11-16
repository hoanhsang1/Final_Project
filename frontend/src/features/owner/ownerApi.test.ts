import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appointGeneralManager,
  clonePosition,
  createDelegation,
  createDepartment,
  createMember,
  createPosition,
  deleteDepartment,
  deleteMember,
  deletePosition,
  fetchDelegations,
  fetchDepartmentAvailablePermissions,
  fetchDepartmentModuleImpact,
  fetchDepartments,
  fetchGeneralManagerCandidates,
  fetchGeneralManagers,
  fetchMyDelegations,
  fetchMembers,
  fetchPermissions,
  fetchPositionImpact,
  fetchPositions,
  OwnerApiError,
  ownerErrorMessage,
  removeGeneralManager,
  revokeDelegation,
  updateDelegation,
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

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return {
    ...actual,
    apiClient: {
      get: (...args: unknown[]) => mockGet(...args),
      post: (...args: unknown[]) => mockPost(...args),
      put: (...args: unknown[]) => mockPut(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  };
});

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
  permissions: ['employee.view'],
  bundleCodes: ['HR_MANAGEMENT'],
  scope: 'ORGANIZATION' as const,
  departmentId: null,
};

const MEMBER = {
  userId: 'u1',
  departmentId: 'd1',
  role: 'STAFF',
  appointedBy: 'owner-1',
  appointedAt: '2026-10-03T03:00:00Z',
  positionIds: ['p1'],
  permissions: ['employee.view'],
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

    const payload = {
      name: 'Khoa CNTT',
      description: 'Khoa Công nghệ thông tin',
      moduleCodes: [],
    };
    await expect(createDepartment(payload)).resolves.toEqual(DEPARTMENT);
    expect(mockPost).toHaveBeenCalledWith('/departments', payload);
  });

  it('updateDepartment gọi PUT /departments/{id}', async () => {
    mockPut.mockResolvedValue({ data: DEPARTMENT });

    await updateDepartment('d1', { name: 'Khoa CNTT', moduleCodes: [] });
    expect(mockPut).toHaveBeenCalledWith('/departments/d1', {
      name: 'Khoa CNTT',
      description: undefined,
      moduleCodes: [],
    });
  });

  it('deleteDepartment gọi DELETE /departments/{id}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await deleteDepartment('d1');
    expect(mockDelete).toHaveBeenCalledWith('/departments/d1');
  });

  it('fetchDepartmentAvailablePermissions gọi GET .../available-permissions', async () => {
    const permissions = [
      { code: 'employee.view', description: 'View employees', allowedScopes: ['DEPARTMENT'] },
    ];
    mockGet.mockResolvedValue({ data: permissions });

    await expect(fetchDepartmentAvailablePermissions('d1')).resolves.toEqual(permissions);
    expect(mockGet).toHaveBeenCalledWith('/departments/d1/available-permissions');
  });

  it('fetchDepartmentModuleImpact gửi danh sách module còn lại dạng CSV', async () => {
    const impact = { removedModules: ['FACILITY_MANAGEMENT'], positions: [], affectedMembers: 0 };
    mockGet.mockResolvedValue({ data: impact });

    await expect(fetchDepartmentModuleImpact('d1', ['STUDENT_MANAGEMENT'])).resolves.toEqual(impact);
    expect(mockGet).toHaveBeenCalledWith('/departments/d1/module-impact', {
      params: { moduleCodes: 'STUDENT_MANAGEMENT' },
    });
  });
});

describe('chức vụ và quyền', () => {
  it('fetchPositions gọi GET /positions', async () => {
    mockGet.mockResolvedValue({ data: [POSITION] });

    await expect(fetchPositions()).resolves.toEqual([POSITION]);
    expect(mockGet).toHaveBeenCalledWith('/positions');
  });

  it('fetchPermissions gọi GET /permissions', async () => {
    const permissions = [{ code: 'employee.view', description: 'View employees', allowedScopes: ['ORGANIZATION', 'DEPARTMENT'] }];
    mockGet.mockResolvedValue({ data: permissions });

    await expect(fetchPermissions()).resolves.toEqual(permissions);
    expect(mockGet).toHaveBeenCalledWith('/permissions');
  });

  it('createPosition gửi kèm mảng quyền', async () => {
    mockPost.mockResolvedValue({ data: POSITION });

    const payload = {
      name: 'Giáo vụ',
      permissions: ['employee.view', 'employee.edit'],
      bundleCodes: [],
      scope: 'ORGANIZATION' as const,
    };
    await createPosition(payload);
    expect(mockPost).toHaveBeenCalledWith('/positions', payload);
  });

  it('updatePosition gọi PUT /positions/{id}', async () => {
    mockPut.mockResolvedValue({ data: POSITION });

    await updatePosition('p1', {
      name: 'Giáo vụ',
      description: 'Mô tả',
      permissions: [],
      bundleCodes: [],
      scope: 'DEPARTMENT',
      departmentId: 'd1',
    });
    expect(mockPut).toHaveBeenCalledWith('/positions/p1', {
      name: 'Giáo vụ',
      description: 'Mô tả',
      permissions: [],
      bundleCodes: [],
      scope: 'DEPARTMENT',
      departmentId: 'd1',
    });
  });

  it('deletePosition gọi DELETE /positions/{id}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await deletePosition('p1');
    expect(mockDelete).toHaveBeenCalledWith('/positions/p1');
  });

  it('fetchPositionImpact gọi GET /positions/{id}/impact', async () => {
    mockGet.mockResolvedValue({ data: { activeHolders: 2 } });

    await expect(fetchPositionImpact('p1')).resolves.toEqual({ activeHolders: 2 });
    expect(mockGet).toHaveBeenCalledWith('/positions/p1/impact');
  });

  it('clonePosition gửi phòng đích và trả danh sách quyền bị loại', async () => {
    const result = { position: POSITION, removedPermissions: ['facility.view'], droppedBundles: [] };
    mockPost.mockResolvedValue({ data: result });

    await expect(clonePosition('p1', { departmentId: 'd2' })).resolves.toEqual(result);
    expect(mockPost).toHaveBeenCalledWith('/positions/p1/clone', { departmentId: 'd2' });
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

  it('module chưa bật hoặc không hợp lệ', () => {
    expect(messageFor(400, 'MODULE_NOT_ENABLED')).toBe(
      'Module chưa được bật cho tổ chức hoặc không hợp lệ.',
    );
  });

  it('quyền nằm ngoài module của phòng ban', () => {
    expect(messageFor(403, 'PERMISSION_OUT_OF_MODULE')).toBe(
      'Có quyền hoặc gói quyền không thuộc module của phòng ban đã chọn. Hãy bật module tương ứng hoặc bỏ quyền đó.',
    );
  });

  it('KHÔNG hiện message tiếng Anh chưa biết cho người dùng', () => {
    expect(messageFor(500, 'INTERNAL_ERROR')).toBe('Không lưu được, vui lòng thử lại.');
  });
});


describe('Tổng quản lý và ủy quyền', () => {
  const DELEGATION = {
    id: 'del-1',
    delegatorId: 'owner-1',
    delegatorName: 'Chủ tổ chức',
    delegateId: 'gm-1',
    delegateName: 'Tổng quản lý',
    delegateUsername: 'gm',
    delegateDepartmentId: 'd1',
    delegateDepartmentName: 'Khoa CNTT',
    permissions: ['employee.view'],
    scope: 'ORGANIZATION',
    effectiveFrom: '2026-11-13T00:00:00Z',
    effectiveTo: null,
    status: 'ACTIVE',
    active: true,
    reason: 'Điều hành',
    createdAt: '2026-11-13T00:00:00Z',
    revokedAt: null,
    revokedReason: null,
  };

  it('fetchGeneralManagers gọi GET /api/general-manager', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await fetchGeneralManagers();
    expect(mockGet).toHaveBeenCalledWith('/api/general-manager');
  });

  it('fetchGeneralManagerCandidates gọi GET /api/general-manager/candidates', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await fetchGeneralManagerCandidates();
    expect(mockGet).toHaveBeenCalledWith('/api/general-manager/candidates');
  });

  it('appointGeneralManager gửi userId và lý do', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await appointGeneralManager('gm-1', 'Bổ nhiệm');
    expect(mockPost).toHaveBeenCalledWith('/api/general-manager', {
      userId: 'gm-1',
      reason: 'Bổ nhiệm',
    });
  });

  it('removeGeneralManager gọi DELETE kèm reason', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await removeGeneralManager('gm-1', 'Bãi nhiệm');
    expect(mockDelete).toHaveBeenCalledWith('/api/general-manager/gm-1', {
      params: { reason: 'Bãi nhiệm' },
    });
  });

  it('fetchDelegations truyền activeOnly', async () => {
    mockGet.mockResolvedValue({ data: [DELEGATION] });
    await fetchDelegations(true);
    expect(mockGet).toHaveBeenCalledWith('/api/delegations', { params: { activeOnly: true } });
  });

  it('fetchMyDelegations gọi GET /api/delegations/me', async () => {
    mockGet.mockResolvedValue({ data: [DELEGATION] });
    await fetchMyDelegations();
    expect(mockGet).toHaveBeenCalledWith('/api/delegations/me');
  });

  it('createDelegation gửi body', async () => {
    mockPost.mockResolvedValue({ data: DELEGATION });
    const payload = { delegateId: 'gm-1', permissions: ['employee.view'], effectiveTo: null };
    await createDelegation(payload);
    expect(mockPost).toHaveBeenCalledWith('/api/delegations', payload);
  });

  it('updateDelegation gọi PUT /api/delegations/{id}', async () => {
    mockPut.mockResolvedValue({ data: DELEGATION });
    await updateDelegation('del-1', { permissions: ['employee.view'], effectiveTo: null });
    expect(mockPut).toHaveBeenCalledWith('/api/delegations/del-1', {
      permissions: ['employee.view'],
      effectiveTo: null,
    });
  });

  it('revokeDelegation gọi POST .../revoke', async () => {
    mockPost.mockResolvedValue({ data: DELEGATION });
    await revokeDelegation('del-1', 'Thu hồi');
    expect(mockPost).toHaveBeenCalledWith('/api/delegations/del-1/revoke', {
      reason: 'Thu hồi',
    });
  });

  it('mã lỗi ủy quyền được dịch sang tiếng Việt', () => {
    const error = new OwnerApiError(403, 'DELEGATION_PERMISSION_NOT_HELD', 'Cannot delegate');
    expect(ownerErrorMessage(error)).toContain('chỉ được ủy quyền');
  });
});

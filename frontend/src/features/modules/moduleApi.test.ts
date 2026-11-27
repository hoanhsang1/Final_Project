import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAdminModules,
  fetchModuleCatalog,
  fetchModuleStatus,
  fetchMyModules,
  lockAdminModule,
  ModuleApiError,
  moduleErrorMessage,
  toggleMyModule,
} from './moduleApi';

/**
 * Mock tầng HTTP — kiểm tra đúng đường dẫn/body mà không gọi backend (các route
 * module chưa được port trong working tree này).
 */
const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('../../lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

const OWNER_MODULES = [
  {
    code: 'STUDENT_MANAGEMENT',
    name: 'Quản lý học sinh',
    is_core: true,
    status: 'active',
    is_locked_by_admin: false,
  },
];

const ADMIN_MODULES = [
  {
    code: 'LIBRARY_MANAGEMENT',
    name: 'Quản lý thư viện',
    is_core: false,
    status: 'locked',
    locked_by_admin: true,
    locked_reason: 'Bảo trì',
    locked_at: '2026-11-27T08:30:00Z',
    disabled_at: null,
  },
];

const STATUS_ITEMS = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', is_core: true, status: 'active' },
  { code: 'LIBRARY_MANAGEMENT', name: 'Quản lý thư viện', is_core: false, status: 'locked' },
];

beforeEach(() => {
  mockGet.mockReset();
  mockPatch.mockReset();
});

describe('moduleApi — hợp đồng HTTP', () => {
  it('giữ nguyên fetchModuleCatalog: GET /api/v1/modules', async () => {
    mockGet.mockResolvedValue({ data: [{ code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh' }] });

    await expect(fetchModuleCatalog()).resolves.toEqual([
      { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh' },
    ]);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/modules');
  });

  it('fetchMyModules gọi GET /api/v1/organizations/my/modules', async () => {
    mockGet.mockResolvedValue({ data: OWNER_MODULES });

    await expect(fetchMyModules()).resolves.toEqual(OWNER_MODULES);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/organizations/my/modules');
  });

  it('toggleMyModule gửi PATCH đúng path/body và 204 không có body', async () => {
    // 204: axios trả data rỗng — hàm phải resolve `undefined`, không đọc body.
    mockPatch.mockResolvedValue({ data: '', status: 204 });

    await expect(toggleMyModule('LIBRARY_MANAGEMENT', false)).resolves.toBeUndefined();
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/organizations/my/modules/LIBRARY_MANAGEMENT', {
      enabled: false,
    });
  });

  it('fetchAdminModules gọi GET /api/v1/organizations/{orgId}/modules/admin', async () => {
    mockGet.mockResolvedValue({ data: ADMIN_MODULES });

    await expect(fetchAdminModules('org-1')).resolves.toEqual(ADMIN_MODULES);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/organizations/org-1/modules/admin');
  });

  it('lockAdminModule gửi PATCH lock + reason (cả lock lẫn unlock) và 204 rỗng', async () => {
    mockPatch.mockResolvedValue({ data: '', status: 204 });

    await expect(
      lockAdminModule('org-1', 'LIBRARY_MANAGEMENT', { lock: true, reason: 'Bảo trì' }),
    ).resolves.toBeUndefined();
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/v1/organizations/org-1/modules/LIBRARY_MANAGEMENT/lock',
      { lock: true, reason: 'Bảo trì' },
    );

    await expect(
      lockAdminModule('org-1', 'LIBRARY_MANAGEMENT', { lock: false, reason: 'Hết bảo trì' }),
    ).resolves.toBeUndefined();
    expect(mockPatch).toHaveBeenLastCalledWith(
      '/api/v1/organizations/org-1/modules/LIBRARY_MANAGEMENT/lock',
      { lock: false, reason: 'Hết bảo trì' },
    );
  });

  it('fetchModuleStatus gọi GET /api/v1/modules/status cho menu', async () => {
    mockGet.mockResolvedValue({ data: STATUS_ITEMS });

    await expect(fetchModuleStatus()).resolves.toEqual(STATUS_ITEMS);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/modules/status');
  });
});

describe('moduleApi — mã lỗi là chuỗi', () => {
  const axiosError = (code: unknown) => ({
    response: { status: 400, data: { code, message: 'Module error' } },
  });

  it('3 mã nghiệp vụ có 3 thông điệp riêng, không lẫn với message tiếng Anh', () => {
    const messages = ['MODULE_IS_CORE', 'MODULE_LOCKED_BY_ADMIN', 'MODULE_PENDING_WORKFLOWS'].map(
      (code) => moduleErrorMessage(axiosError(code)),
    );

    expect(new Set(messages).size).toBe(3);
    expect(messages[0]).toContain('Module lõi');
    expect(messages[1]).toContain('quản trị viên');
    expect(messages[2]).toContain('quy trình');
    for (const message of messages) {
      expect(message).not.toContain('Module error');
    }
  });

  it('mã dạng số (vd 1128) KHÔNG được coi là mã chuỗi', () => {
    expect(moduleErrorMessage(axiosError(1128))).toBe(
      'Không thể thực hiện thao tác này. Vui lòng thử lại.',
    );
  });

  it('mutation ném ModuleApiError giữ code chuỗi + thông điệp tiếng Việt', async () => {
    mockPatch.mockRejectedValueOnce(axiosError('MODULE_LOCKED_BY_ADMIN'));

    let caught: unknown;
    try {
      await toggleMyModule('LIBRARY_MANAGEMENT', true);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ModuleApiError);
    expect(caught).toMatchObject({
      code: 'MODULE_LOCKED_BY_ADMIN',
      status: 400,
      message: moduleErrorMessage(axiosError('MODULE_LOCKED_BY_ADMIN')),
    });
  });
});

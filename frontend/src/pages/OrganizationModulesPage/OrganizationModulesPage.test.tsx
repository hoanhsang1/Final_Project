import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activeMenuKey, filterMenuByModuleStatus } from '../../features/admin/consoleMenu';
import {
  ModuleApiError,
  type AdminModuleItem,
  type OwnerModuleItem,
} from '../../features/modules/moduleApi';
import { useModuleStatus } from '../../features/modules/useModuleStatus';
import AdminModulesPage from '../AdminModulesPage/AdminModulesPage';
import OrganizationModulesPage from './OrganizationModulesPage';

vi.mock('../../features/modules/moduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/modules/moduleApi')>();
  return {
    ...actual,
    fetchMyModules: vi.fn(),
    toggleMyModule: vi.fn(),
    fetchAdminModules: vi.fn(),
    lockAdminModule: vi.fn(),
    fetchModuleStatus: vi.fn(),
  };
});

const api = await import('../../features/modules/moduleApi');
const mockFetchMyModules = vi.mocked(api.fetchMyModules);
const mockToggleMyModule = vi.mocked(api.toggleMyModule);
const mockFetchAdminModules = vi.mocked(api.fetchAdminModules);
const mockLockAdminModule = vi.mocked(api.lockAdminModule);
const mockFetchModuleStatus = vi.mocked(api.fetchModuleStatus);

const CORE_ACTIVE: OwnerModuleItem = {
  code: 'STUDENT_MANAGEMENT',
  name: 'Quản lý học sinh',
  is_core: true,
  status: 'active',
  is_locked_by_admin: false,
};

const OPTIONAL_ACTIVE: OwnerModuleItem = {
  code: 'LIBRARY_MANAGEMENT',
  name: 'Quản lý thư viện',
  is_core: false,
  status: 'active',
  is_locked_by_admin: false,
};

const LOCKED_MODULE: AdminModuleItem = {
  code: 'LIBRARY_MANAGEMENT',
  name: 'Quản lý thư viện',
  is_core: false,
  status: 'locked',
  locked_by_admin: true,
  locked_reason: 'Bảo trì định kỳ',
  locked_at: '2026-11-27T08:30:00Z',
  disabled_at: null,
};

const CORE_ADMIN: AdminModuleItem = {
  code: 'STUDENT_MANAGEMENT',
  name: 'Quản lý học sinh',
  is_core: true,
  status: 'active',
  locked_by_admin: false,
  locked_reason: null,
  locked_at: null,
  disabled_at: null,
};

const OPTIONAL_ADMIN: AdminModuleItem = {
  code: 'LIBRARY_MANAGEMENT',
  name: 'Quản lý thư viện',
  is_core: false,
  status: 'active',
  locked_by_admin: false,
  locked_reason: null,
  locked_at: null,
  disabled_at: null,
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function renderOwnerPage() {
  const Wrapper = makeWrapper();
  render(
    <Wrapper>
      <MemoryRouter>
        <OrganizationModulesPage />
      </MemoryRouter>
    </Wrapper>,
  );
}

function renderAdminPage() {
  const Wrapper = makeWrapper();
  render(
    <Wrapper>
      <MemoryRouter initialEntries={['/quan-tri/to-chuc/org-1/module']}>
        <Routes>
          <Route path="/quan-tri/to-chuc/:id/module" element={<AdminModulesPage />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

beforeEach(() => {
  mockFetchMyModules.mockReset();
  mockToggleMyModule.mockReset();
  mockFetchAdminModules.mockReset();
  mockLockAdminModule.mockReset();
  mockFetchModuleStatus.mockReset();
});

describe('OrganizationModulesPage — OWNER', () => {
  it('module lõi bị tắt nút, module thường bật/tắt được', async () => {
    mockFetchMyModules.mockResolvedValue([CORE_ACTIVE, OPTIONAL_ACTIVE]);

    renderOwnerPage();

    expect(await screen.findByText('Quản lý thư viện')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tắt module Quản lý học sinh' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Tắt module Quản lý thư viện' }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('module bị khoá hiện lý do + thời điểm khoá', async () => {
    const lockedAt = dayjs('2026-11-27T08:30:00Z').format('DD/MM/YYYY HH:mm');
    mockFetchMyModules.mockResolvedValue([
      { ...OPTIONAL_ACTIVE, status: 'locked', is_locked_by_admin: true, locked_reason: 'Bảo trì định kỳ', locked_at: '2026-11-27T08:30:00Z' },
    ]);

    renderOwnerPage();

    expect(await screen.findByText(/Bảo trì định kỳ/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(lockedAt))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bật module Quản lý thư viện' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('toggle lỗi giữ nguyên trạng thái cũ và hiện đúng thông điệp theo mã lỗi', async () => {
    mockFetchMyModules.mockResolvedValue([OPTIONAL_ACTIVE]);
    mockToggleMyModule.mockRejectedValue(
      new ModuleApiError('toggle failed', { code: 'MODULE_PENDING_WORKFLOWS', status: 400 }),
    );

    renderOwnerPage();
    await screen.findByRole('button', { name: 'Tắt module Quản lý thư viện' });
    await userEvent.click(screen.getByRole('button', { name: 'Tắt module Quản lý thư viện' }));

    expect(
      await screen.findByText(/Module vẫn còn quy trình đang xử lý/),
    ).toBeInTheDocument();
    // Không optimistic update: thao tác lỗi → nút vẫn ở trạng thái "Đang bật".
    expect(
      screen.getByRole('button', { name: 'Tắt module Quản lý thư viện' }),
    ).toBeInTheDocument();
    expect(mockToggleMyModule).toHaveBeenCalledWith('LIBRARY_MANAGEMENT', false);
  });

  it('toggle thành công gọi API với enabled đúng', async () => {
    mockFetchMyModules.mockResolvedValue([
      { ...OPTIONAL_ACTIVE, status: 'disabled' },
    ]);
    mockToggleMyModule.mockResolvedValue(undefined);

    renderOwnerPage();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Bật module Quản lý thư viện' }),
    );

    await waitFor(() =>
      expect(mockToggleMyModule).toHaveBeenCalledWith('LIBRARY_MANAGEMENT', true),
    );
  });
});

describe('AdminModulesPage — SUPER_ADMIN', () => {
  it('core không được khoá', async () => {
    mockFetchAdminModules.mockResolvedValue([CORE_ADMIN, LOCKED_MODULE]);

    renderAdminPage();

    expect(await screen.findByText('Quản lý thư viện')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khoá module Quản lý học sinh' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('module bị khoá hiện lý do/thời gian; thiếu lý do khi MỞ KHOÁ thì không gọi API', async () => {
    mockFetchAdminModules.mockResolvedValue([LOCKED_MODULE]);

    renderAdminPage();

    expect(await screen.findByText(/Bảo trì định kỳ/)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(dayjs('2026-11-27T08:30:00Z').format('DD/MM/YYYY HH:mm'))),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mở khoá module Quản lý thư viện' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Lý do')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));

    expect(await within(dialog).findByText('Vui lòng nhập lý do')).toBeInTheDocument();
    expect(mockLockAdminModule).not.toHaveBeenCalled();
  });

  it('thiếu lý do khi KHOÁ cũng không gọi API', async () => {
    mockFetchAdminModules.mockResolvedValue([OPTIONAL_ADMIN]);

    renderAdminPage();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Khoá module Quản lý thư viện' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));

    expect(await within(dialog).findByText('Vui lòng nhập lý do')).toBeInTheDocument();
    expect(mockLockAdminModule).not.toHaveBeenCalled();
  });

  it('nhập lý do thì gửi lock + reason đúng orgId/code', async () => {
    mockFetchAdminModules.mockResolvedValue([OPTIONAL_ADMIN]);
    mockLockAdminModule.mockResolvedValue(undefined);

    renderAdminPage();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Khoá module Quản lý thư viện' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Lý do'), 'Bảo trì');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() =>
      expect(mockLockAdminModule).toHaveBeenCalledWith('org-1', 'LIBRARY_MANAGEMENT', {
        lock: true,
        reason: 'Bảo trì',
      }),
    );
  });
});

describe('lọc menu theo trạng thái module', () => {
  it('matcher route module tổ chức của admin chọn đúng mục "module"', () => {
    expect(activeMenuKey('/quan-tri/to-chuc/org-1/module')).toBe('module');
    expect(activeMenuKey('/quan-tri/to-chuc/org-1')).toBe('to-chuc');
  });

  it('item gắn moduleCode bị not_registered thì bị bỏ khỏi menu', () => {
    const items = [
      { key: 'co-so-vat-chat', label: 'CSVC', path: '/to-chuc/co-so-vat-chat', moduleCode: 'FACILITY_MANAGEMENT' },
      { key: 'phong-ban', label: 'Phòng ban', path: '/to-chuc' },
    ];

    expect(filterMenuByModuleStatus(items, { FACILITY_MANAGEMENT: 'not_registered' })).toEqual([
      items[1],
    ]);
    expect(filterMenuByModuleStatus(items)).toEqual(items);
  });

  it('useModuleStatus trả map code → status cho menu', async () => {
    mockFetchModuleStatus.mockResolvedValue([
      { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', is_core: true, status: 'active' },
      { code: 'LIBRARY_MANAGEMENT', name: 'Quản lý thư viện', is_core: false, status: 'locked' },
    ]);
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useModuleStatus(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(result.current.data).toEqual({
        STUDENT_MANAGEMENT: 'active',
        LIBRARY_MANAGEMENT: 'locked',
      }),
    );
    expect(mockFetchModuleStatus).toHaveBeenCalledTimes(1);
  });
});

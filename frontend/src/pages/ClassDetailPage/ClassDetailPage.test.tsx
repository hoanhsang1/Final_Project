import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG_CLASS } from '../../features/sprint4/sprint4Messages';
import type { ClassDetail } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import ClassDetailPage from './ClassDetailPage';

// Astryx `useToast` cần provider; mock ở mức hook để trang render được trong test.
const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchClassDetail: vi.fn(),
    fetchStatusLogs: vi.fn(),
    fetchCloseEvents: vi.fn(),
  };
});

const { fetchClassDetail, fetchStatusLogs, fetchCloseEvents } = await import(
  '../../features/sprint4/sprint4Api'
);

const CLASS_1: ClassDetail = {
  id: 'c1',
  classCode: 'LOP-01',
  name: 'Toán 10A1',
  academicYear: '2025-2026',
  startDate: '2025-09-05',
  endDate: '2026-05-30',
  status: 'DANG_DIEN_RA',
  closeState: 'NONE',
  version: 1,
};

function renderPage(backendRoles: string[], permissions: string[]) {
  useAuthStore.setState({
    userId: 'u1',
    username: 'giao.vu',
    isAuthenticated: true,
    role: null,
    backendRoles,
    permissions,
    mustChangePassword: false,
    passwordChangeRequiredByApi: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dao-tao/lop-hoc/c1']}>
        <Routes>
          <Route path="/dao-tao/lop-hoc/:id" element={<ClassDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(fetchClassDetail).mockReset().mockResolvedValue(CLASS_1);
  vi.mocked(fetchStatusLogs).mockReset().mockResolvedValue([]);
  vi.mocked(fetchCloseEvents).mockReset().mockResolvedValue([]);
  notifySpies.success.mockReset();
  notifySpies.error.mockReset();
});

afterEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    isAuthenticated: false,
    role: null,
    backendRoles: [],
    permissions: [],
    mustChangePassword: false,
    passwordChangeRequiredByApi: false,
  });
});

describe('ClassDetailPage — nút "Gán giáo viên" theo dạng mã quyền', () => {
  it('token dotted: STAFF có class.view + class.assign_teacher thì thấy nút', async () => {
    renderPage(['STAFF'], ['class.view', 'class.assign_teacher']);

    expect(await screen.findByRole('button', { name: MSG_CLASS.ASSIGN })).toBeInTheDocument();
  });

  it('token legacy UPPERCASE: STAFF có CLASS_VIEW + CLASS_ASSIGN_TEACHER thì thấy nút', async () => {
    renderPage(['STAFF'], ['CLASS_VIEW', 'CLASS_ASSIGN_TEACHER']);

    expect(await screen.findByRole('button', { name: MSG_CLASS.ASSIGN })).toBeInTheDocument();
  });

  it('thiếu quyền gán: STAFF chỉ có class.view thì không thấy nút', async () => {
    renderPage(['STAFF'], ['class.view']);

    await screen.findByText(CLASS_1.name!);
    expect(screen.queryByRole('button', { name: MSG_CLASS.ASSIGN })).not.toBeInTheDocument();
  });
});

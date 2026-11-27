import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG_S4, MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { TeacherDetail } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import TeacherSelfPage from './TeacherSelfPage';

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchTeacherSelf: vi.fn(),
    // Màn self KHÔNG được gọi endpoint chi tiết quản lý.
    fetchTeacherDetail: vi.fn(),
  };
});

const { fetchTeacherDetail, fetchTeacherSelf } = await import(
  '../../features/sprint4/sprint4Api'
);
const mockFetch = vi.mocked(fetchTeacherSelf);
const mockDetail = vi.mocked(fetchTeacherDetail);

const TEACHER: TeacherDetail = {
  userId: 't1',
  staffCode: 'NV001',
  fullName: 'Vũ Vân Anh',
  email: 'vyvy@example.edu.vn',
  phone: '0901234567',
  departmentId: 'd1',
  specialties: [{ id: 's1', name: 'Toán' }],
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  classCount: 1,
  createdAt: '2025-08-01T00:00:00',
  updatedAt: '2025-08-02T01:02:00',
  version: 1,
};

function renderPage(backendRoles: string[] = ['TEACHER'], permissions: string[] = []) {
  useAuthStore.setState({
    userId: 't1',
    username: 'vyvy',
    isAuthenticated: true,
    role: null,
    backendRoles,
    permissions,
    mustChangePassword: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeacherSelfPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  mockFetch.mockReset();
  mockDetail.mockReset();
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
  });
});

describe('TeacherSelfPage — 5 trạng thái', () => {
  it('forbidden: STUDENT dù có cùng self-permission vẫn không gọi API', async () => {
    renderPage(['STUDENT'], ['class.self_view', 'student.self_view']);

    expect(await screen.findByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockDetail).not.toHaveBeenCalled();
  });

  it('loading: hiện PageLoading, chưa render H1', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('error: hiện Banner kèm nút Thử lại, bấm thì gọi lại wrapper /me', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce(TEACHER);

    renderPage();

    expect(await screen.findByText(MSG_SELF.TEACHER_LOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: MSG_SELF.RETRY }));

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('empty: không có hồ sơ thì hiện câu gợi ý cụ thể', async () => {
    mockFetch.mockResolvedValue(null as unknown as TeacherDetail);

    renderPage();

    expect(
      await screen.findByText(
        'Chưa có hồ sơ giáo viên cho tài khoản này. Vui lòng liên hệ quản trị viên tổ chức.',
      ),
    ).toBeInTheDocument();
  });

  it('success: H1/H2 đúng, hiện đủ trường chỉ đọc, không có nút sửa', async () => {
    mockFetch.mockResolvedValue(TEACHER);

    const queryClient = renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: MSG_SELF.PROFILE_TEACHER }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    for (const text of [
      'NV001',
      'Vũ Vân Anh',
      'vyvy@example.edu.vn',
      '0901234567',
      'd1',
      'Toán',
      'Cơ hữu',
      'Đang dạy',
      '01/08/2025',
      '01:02 02/08/2025',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument();
    expect(queryClient.getQueryData(['teacher-self'])).toEqual(TEACHER);
    expect(mockDetail).not.toHaveBeenCalled();
  });
});

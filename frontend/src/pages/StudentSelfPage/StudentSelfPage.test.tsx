import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG_S4, MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { StudentListItem } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import StudentSelfPage from './StudentSelfPage';

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchStudentSelf: vi.fn(),
    // Màn self KHÔNG được gọi endpoint chi tiết/danh sách quản lý.
    fetchStudent: vi.fn(),
    fetchStudents: vi.fn(),
  };
});

const { fetchStudent, fetchStudents, fetchStudentSelf } = await import(
  '../../features/sprint4/sprint4Api'
);
const mockFetch = vi.mocked(fetchStudentSelf);
const mockDetail = vi.mocked(fetchStudent);
const mockList = vi.mocked(fetchStudents);

const STUDENT: StudentListItem = {
  id: 's1',
  studentCode: 'HS001',
  fullName: 'Nguyễn Văn An',
  dateOfBirth: '2010-05-12',
  email: 'demo_student@example.edu.vn',
  phone: '0901234567',
  status: 'active',
  classId: 'c1',
  classCode: '12A1',
  className: '12A1',
  accountUsername: 'demo_student',
  accountCreatedAt: '2025-08-01T00:00:00',
  createdAt: '2025-08-01T00:00:00',
  updatedAt: '2025-09-02T01:02:00',
};

function renderPage(
  backendRoles: string[] = ['STUDENT'],
  permissions: string[] = ['student.self_view'],
) {
  useAuthStore.setState({
    userId: 's1',
    username: 'demo_student',
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
        <StudentSelfPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  mockFetch.mockReset();
  mockDetail.mockReset();
  mockList.mockReset();
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

describe('StudentSelfPage — 5 trạng thái', () => {
  it('forbidden: TEACHER dù có cùng self-permission vẫn không gọi API', async () => {
    renderPage(['TEACHER'], ['class.self_view', 'student.self_view']);

    expect(await screen.findByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockDetail).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  });

  it('loading: hiện PageLoading, chưa render H1', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('error: hiện Banner kèm nút Thử lại, bấm thì gọi lại wrapper /me', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce(STUDENT);

    renderPage();

    expect(await screen.findByText('Không tải được hồ sơ học sinh.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: MSG_SELF.RETRY }));

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('empty: không có hồ sơ thì hiện câu gợi ý cụ thể', async () => {
    mockFetch.mockResolvedValue(null as unknown as StudentListItem);

    renderPage();

    expect(
      await screen.findByText(
        'Chưa có hồ sơ học sinh cho tài khoản này. Vui lòng liên hệ quản trị viên tổ chức.',
      ),
    ).toBeInTheDocument();
  });

  it('success: H1/H2 đúng, hiện đủ 10 trường chỉ đọc, không có nút sửa', async () => {
    mockFetch.mockResolvedValue(STUDENT);

    const queryClient = renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Hồ sơ học sinh của tôi',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    for (const label of [
      'Mã học sinh',
      'Họ tên',
      'Ngày sinh',
      'Email',
      'Số điện thoại',
      'Trạng thái',
      'Lớp hiện tại',
      'Tài khoản',
      'Ngày tạo',
      'Cập nhật gần nhất',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const value of [
      'HS001',
      'Nguyễn Văn An',
      '12/05/2010',
      'demo_student@example.edu.vn',
      '0901234567',
      'Đang học',
      '12A1',
      'demo_student',
      '01/08/2025',
      '01:02 02/09/2025',
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument();
    expect(queryClient.getQueryData(['student-self'])).toEqual(STUDENT);
    expect(mockDetail).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  });
});

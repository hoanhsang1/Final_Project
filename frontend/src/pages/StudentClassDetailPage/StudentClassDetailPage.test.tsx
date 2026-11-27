import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG_S4, MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { StudentClass } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import StudentClassDetailPage from './StudentClassDetailPage';

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchStudentSelfClasses: vi.fn(),
    // Trang self KHÔNG được gọi endpoint quản lý lớp/học sinh.
    fetchClassDetail: vi.fn(),
    fetchStudents: vi.fn(),
  };
});

const { fetchClassDetail, fetchStudentSelfClasses, fetchStudents } = await import(
  '../../features/sprint4/sprint4Api'
);
const mockFetch = vi.mocked(fetchStudentSelfClasses);
const mockClassDetail = vi.mocked(fetchClassDetail);
const mockStudents = vi.mocked(fetchStudents);

const CLASS_1: StudentClass = {
  id: 'c1',
  classCode: 'LOP-01',
  name: 'Toán 10A1',
  academicYear: '2025-2026',
  startDate: '2025-08-01',
  endDate: '2026-05-31',
  status: 'DANG_DIEN_RA',
  closeState: 'NONE',
  teacherName: 'Vũ Vân Anh',
  subjectName: 'Toán',
};
const CLASS_2: StudentClass = {
  id: 'c2',
  classCode: 'LOP-02',
  name: null,
  academicYear: null,
  startDate: null,
  endDate: null,
  status: 'CHUA_BAT_DAU',
  closeState: null,
  teacherName: null,
  subjectName: 'Lý',
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
      <MemoryRouter initialEntries={['/dao-tao/hoc-sinh/lop-cua-toi/c1']}>
        <Routes>
          <Route
            path="/dao-tao/hoc-sinh/lop-cua-toi/:id"
            element={<StudentClassDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  mockFetch.mockReset();
  mockClassDetail.mockReset();
  mockStudents.mockReset();
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

describe('StudentClassDetailPage — 5 trạng thái', () => {
  it('forbidden: TEACHER có cùng self-permission cũng bị chặn, không gọi API', async () => {
    renderPage(['TEACHER'], ['student.self_view']);

    expect(await screen.findByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockClassDetail).not.toHaveBeenCalled();
    expect(mockStudents).not.toHaveBeenCalled();
  });

  it('loading: hiện PageLoading, chưa render chi tiết', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('error: hiện Banner kèm nút Thử lại, bấm thì gọi lại wrapper /me/classes', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce([CLASS_1]);

    renderPage();

    expect(await screen.findByText(MSG_SELF.STUDENT_CLASSES_LOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: MSG_SELF.RETRY }));

    expect(await screen.findByText('LOP-01')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('empty: id không có trong danh sách lớp của tôi thì nêu câu gợi ý cụ thể', async () => {
    mockFetch.mockResolvedValue([CLASS_2]);

    renderPage();

    expect(await screen.findByText(MSG_SELF.CLASS_DETAIL_EMPTY)).toBeInTheDocument();
    expect(screen.queryByText('LOP-02')).not.toBeInTheDocument();
  });

  it('success: H1/H2 đúng, đủ field của lớp, có link về danh sách và không gọi endpoint quản lý', async () => {
    mockFetch.mockResolvedValue([CLASS_2, CLASS_1]);

    const queryClient = renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: MSG_SELF.CLASS_DETAIL_TITLE }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: MSG_SELF.CLASS_DETAILS }),
    ).toBeInTheDocument();
    for (const value of [
      'LOP-01',
      'Toán 10A1',
      '2025-2026',
      '01/08/2025 → 31/05/2026',
      'Đang diễn ra',
      'Vũ Vân Anh',
      'Toán',
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: MSG_SELF.BACK_TO_CLASSES })).toHaveAttribute(
      'href',
      '/dao-tao/hoc-sinh/lop-cua-toi',
    );
    expect(queryClient.getQueryData(['student-self-classes'])).toEqual([CLASS_2, CLASS_1]);
    expect(mockClassDetail).not.toHaveBeenCalled();
    expect(mockStudents).not.toHaveBeenCalled();
  });
});

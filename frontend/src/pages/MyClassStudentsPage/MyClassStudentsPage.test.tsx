import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG_S4, MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { StudentListItem, TeacherClass } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import MyClassStudentsPage from './MyClassStudentsPage';

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchMyClassStudents: vi.fn(),
    fetchTeacherSelfClasses: vi.fn(),
    // Không dùng endpoint chi tiết lớp quản lý để lấy tên lớp.
    fetchClassDetail: vi.fn(),
  };
});

const { fetchClassDetail, fetchMyClassStudents, fetchTeacherSelfClasses } = await import(
  '../../features/sprint4/sprint4Api'
);
const mockStudents = vi.mocked(fetchMyClassStudents);
const mockClasses = vi.mocked(fetchTeacherSelfClasses);
const mockClassDetail = vi.mocked(fetchClassDetail);

const CLASS_1: TeacherClass = {
  id: 'c1',
  classCode: 'LOP-01',
  name: 'Toán 10A1',
  status: 'DANG_DIEN_RA',
};

const HS_01: StudentListItem = {
  id: 's1',
  studentCode: 'HS001',
  fullName: 'Nguyễn Văn An',
  dateOfBirth: '2008-05-10',
  email: 'an@example.edu.vn',
  phone: '0901234567',
  status: 'active',
  classId: 'c1',
  classCode: 'LOP-01',
  className: '10A1',
  accountUsername: 'hs001.an',
  accountCreatedAt: '2025-09-01T00:00:00Z',
  createdAt: '2025-08-01T00:00:00Z',
  updatedAt: '2025-08-02T00:00:00Z',
};

function renderPage(
  backendRoles: string[] = ['TEACHER'],
  permissions: string[] = ['class.self_view'],
) {
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
      <MemoryRouter initialEntries={['/dao-tao/lop-hoc-cua-toi/c1']}>
        <Routes>
          <Route path="/dao-tao/lop-hoc-cua-toi/:id" element={<MyClassStudentsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  mockStudents.mockReset();
  mockClasses.mockReset();
  mockClassDetail.mockReset();
  mockClasses.mockResolvedValue([CLASS_1]);
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

describe('MyClassStudentsPage — 5 trạng thái', () => {
  it('forbidden: STUDENT có cùng self-permission cũng bị chặn, không gọi API', async () => {
    renderPage(['STUDENT'], ['class.self_view', 'student.self_view']);

    expect(await screen.findByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
    expect(mockStudents).not.toHaveBeenCalled();
    expect(mockClasses).not.toHaveBeenCalled();
    expect(mockClassDetail).not.toHaveBeenCalled();
  });

  it('loading: hiện PageLoading, chưa render bảng', () => {
    mockStudents.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(mockStudents).toHaveBeenCalledWith('c1');
    expect(mockClasses).toHaveBeenCalled();
  });

  it('error: hiện Banner kèm nút Thử lại, bấm thì gọi lại wrapper danh sách học sinh', async () => {
    mockStudents.mockRejectedValueOnce(new Error('network'));
    mockStudents.mockResolvedValueOnce([HS_01]);

    renderPage();

    expect(await screen.findByText(MSG_SELF.CLASS_STUDENTS_LOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: MSG_SELF.RETRY }));

    expect(await screen.findByText('HS001')).toBeInTheDocument();
    expect(mockStudents).toHaveBeenCalledTimes(2);
  });

  it('empty: lớp chưa có học sinh thì nêu câu gợi ý cụ thể', async () => {
    mockStudents.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(MSG_SELF.CLASS_STUDENTS_EMPTY)).toBeInTheDocument();
  });

  it('success: H1/H2 đúng, lấy tên lớp từ query song song, có link về danh sách lớp', async () => {
    mockStudents.mockResolvedValue([HS_01]);

    const queryClient = renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: MSG_SELF.CLASS_STUDENTS }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    expect(screen.getByText('Toán 10A1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: MSG_SELF.BACK_TO_CLASSES })).toHaveAttribute(
      'href',
      '/dao-tao/lop-hoc-cua-toi',
    );
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(table.getByText('an@example.edu.vn')).toBeInTheDocument();
    expect(table.getByText('0901234567')).toBeInTheDocument();
    expect(table.getByText('Đang học')).toBeInTheDocument();
    expect(table.getByText('10A1')).toBeInTheDocument();
    expect(queryClient.getQueryData(['my-class-students', 'c1'])).toEqual([HS_01]);
    expect(queryClient.getQueryData(['teacher-self-classes'])).toEqual([CLASS_1]);
    expect(mockClassDetail).not.toHaveBeenCalled();
  });

  it('success: không tìm thấy tên lớp thì fallback về id', async () => {
    mockStudents.mockResolvedValue([HS_01]);
    mockClasses.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('c1')).toBeInTheDocument();
    expect(screen.queryByText('Toán 10A1')).not.toBeInTheDocument();
  });
});

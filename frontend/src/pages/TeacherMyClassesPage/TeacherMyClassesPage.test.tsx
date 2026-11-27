import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MSG_S4, MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { TeacherClass } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import TeacherMyClassesPage from './TeacherMyClassesPage';

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchTeacherSelfClasses: vi.fn(),
    // Màn danh sách self KHÔNG được gọi endpoint quản lý.
    fetchClasses: vi.fn(),
    fetchClassDetail: vi.fn(),
  };
});

const { fetchClassDetail, fetchClasses, fetchTeacherSelfClasses } = await import(
  '../../features/sprint4/sprint4Api'
);
const mockFetch = vi.mocked(fetchTeacherSelfClasses);
const mockClasses = vi.mocked(fetchClasses);
const mockClassDetail = vi.mocked(fetchClassDetail);

const CLASS_1: TeacherClass = {
  id: 'c1',
  classCode: 'LOP-01',
  name: 'Toán 10A1',
  status: 'DANG_DIEN_RA',
  closeState: 'NONE',
  closeLabel: null,
  needsReassignment: true,
};
const CLASS_2: TeacherClass = {
  id: 'c2',
  classCode: 'LOP-02',
  name: null,
  status: 'CHUA_BAT_DAU',
  closeState: 'CLOSED',
  closeLabel: 'Đã đóng',
};

function renderPage(backendRoles: string[] = ['TEACHER'], permissions: string[] = ['class.self_view']) {
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
        <TeacherMyClassesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  mockFetch.mockReset();
  mockClasses.mockReset();
  mockClassDetail.mockReset();
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

describe('TeacherMyClassesPage — 5 trạng thái', () => {
  it('forbidden: STUDENT có cùng class.self_view cũng bị chặn, không gọi API', async () => {
    renderPage(['STUDENT'], ['class.self_view', 'student.self_view']);

    expect(await screen.findByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockClasses).not.toHaveBeenCalled();
    expect(mockClassDetail).not.toHaveBeenCalled();
  });

  it('loading: hiện PageLoading, chưa render bảng', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('error: hiện Banner kèm nút Thử lại, bấm thì gọi lại wrapper /me/classes', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce([CLASS_1]);

    renderPage();

    expect(await screen.findByText(MSG_SELF.TEACHER_CLASSES_LOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: MSG_SELF.RETRY }));

    expect(await screen.findByRole('link', { name: 'LOP-01' })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('empty: chưa được phân công thì nêu câu gợi ý cụ thể', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(MSG_SELF.TEACHER_CLASSES_EMPTY)).toBeInTheDocument();
  });

  it('success: H1/H2 đúng, dòng lớp link tới màn học sinh, hiện trạng thái/đóng lớp/phân công lại', async () => {
    mockFetch.mockResolvedValue([CLASS_1, CLASS_2]);

    const queryClient = renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: MSG_SELF.MY_CLASSES }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'LOP-01' })).toHaveAttribute(
      'href',
      '/dao-tao/lop-hoc-cua-toi/c1',
    );
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Toán 10A1')).toBeInTheDocument();
    expect(table.getByText('Đang diễn ra')).toBeInTheDocument();
    expect(table.getByText('Chưa bắt đầu')).toBeInTheDocument();
    expect(table.getByText('Đã đóng')).toBeInTheDocument();
    // Chữ xuất hiện ở cả tiêu đề cột lẫn Badge của dòng cần phân công lại.
    expect(table.getAllByText('Cần phân công lại').length).toBeGreaterThan(1);
    expect(table.getAllByText('—').length).toBeGreaterThan(0);
    expect(queryClient.getQueryData(['teacher-self-classes'])).toEqual([CLASS_1, CLASS_2]);
    expect(mockClasses).not.toHaveBeenCalled();
    expect(mockClassDetail).not.toHaveBeenCalled();
  });
});

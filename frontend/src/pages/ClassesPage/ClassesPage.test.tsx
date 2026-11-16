import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import type { ClassListItem } from '../../features/sprint4/types';
import ClassesPage from './ClassesPage';

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return { ...actual, fetchClasses: vi.fn() };
});

const { fetchClasses } = await import('../../features/sprint4/sprint4Api');
const mockFetch = vi.mocked(fetchClasses);

const LOP_01: ClassListItem = {
  id: 'c1',
  classCode: 'LOP-01',
  name: 'Toán 10A1',
  academicYear: '2025-2026',
  startDate: '2025-09-05',
  endDate: '2026-05-30',
  status: 'DANG_DIEN_RA',
  closeState: 'NONE',
  teacher: { id: 't1', fullName: 'Nguyễn Văn A' },
  studentCount: 42,
  version: 3,
};

const LOP_02: ClassListItem = {
  id: 'c2',
  classCode: 'LOP-02',
  name: null,
  academicYear: null,
  startDate: null,
  endDate: null,
  status: 'CHUA_BAT_DAU',
  closeState: 'PENDING',
  teacher: null,
  studentCount: null,
  version: 1,
};

function paged(items: ClassListItem[], overrides: Record<string, number> = {}) {
  return { items, total: items.length, page: 1, size: 20, pages: 1, ...overrides };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClassesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  useAuthStore.setState({
    userId: 'u1',
    username: 'giao.vu',
    isAuthenticated: true,
    role: null,
    backendRoles: [],
    permissions: ['CLASS_VIEW'],
  });
});

afterEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    isAuthenticated: false,
    role: null,
    backendRoles: [],
    permissions: [],
  });
});

describe('ClassesPage — 5 trạng thái', () => {
  it('loading: hiện khối đang tải có role="status"', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    // `VisuallyHidden` bên trong cũng là một `role="status"` nên đếm theo chữ,
    // không theo role.
    expect(screen.getByText('Đang tải…')).toBeInTheDocument();
  });

  it('success: hiện mã lớp (liên kết tới chi tiết), nhãn trạng thái và tổng số lớp', async () => {
    mockFetch.mockResolvedValue(paged([LOP_01, LOP_02]));

    renderPage();

    const link = await screen.findByRole('link', { name: 'LOP-01' });
    expect(link).toHaveAttribute('href', '/dao-tao/lop-hoc/c1');
    // Phải scope vào bảng: listbox ẩn của `Selector` lọc trạng thái cũng chứa
    // đúng các nhãn này.
    const table = within(screen.getByRole('table'));
    // Chữ luôn đi kèm màu badge (BR-08).
    expect(table.getByText('Đang diễn ra')).toBeInTheDocument();
    expect(table.getByText('Chờ duyệt đóng')).toBeInTheDocument();
    // Tổng số lớp là `total` của BE, không phải số dòng đang hiện.
    expect(screen.getByText('2 lớp')).toBeInTheDocument();
  });

  it('success: lớp chưa phân công giáo viên hiện câu thay thế, không để ô trống', async () => {
    mockFetch.mockResolvedValue(paged([LOP_02]));

    renderPage();

    expect(await screen.findByText('Chưa phân công')).toBeInTheDocument();
  });

  it('success: closeState = NONE thì không hiện nhãn đóng lớp', async () => {
    mockFetch.mockResolvedValue(paged([LOP_01]));

    renderPage();

    await screen.findByRole('link', { name: 'LOP-01' });
    expect(screen.queryByText('Đã đóng')).not.toBeInTheDocument();
    expect(screen.queryByText('Chờ duyệt đóng')).not.toBeInTheDocument();
  });

  it('empty: danh sách rỗng thì nêu việc cần làm', async () => {
    mockFetch.mockResolvedValue(paged([]));

    renderPage();

    expect(await screen.findByText('Chưa có lớp học nào.')).toBeInTheDocument();
  });

  it('error: hiện cảnh báo kèm nút "Thử lại", bấm thì gọi lại API', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce(paged([LOP_01]));

    renderPage();

    expect(await screen.findByText('Không tải được danh sách lớp học.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('link', { name: 'LOP-01' })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('no-permission: không gọi API và hiện lời nhắc liên hệ quản trị viên', async () => {
    useAuthStore.setState({ backendRoles: [], permissions: [] });

    renderPage();

    expect(
      await screen.findByText('Bạn không có quyền truy cập khu vực này.'),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    // Không có thanh lọc khi không xem được dữ liệu.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});

describe('ClassesPage — lọc', () => {
  it('gõ từ khoá rồi bấm "Tìm" thì gửi q và quay về trang 1', async () => {
    mockFetch.mockResolvedValue(paged([LOP_01]));

    renderPage();
    await screen.findByRole('link', { name: 'LOP-01' });

    const search = screen.getByRole('searchbox', { name: 'Tìm theo mã lớp hoặc tên lớp' });
    await userEvent.type(search, 'LOP-01');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith({
        page: 1,
        size: 20,
        q: 'LOP-01',
        status: undefined,
      }),
    );
  });

  it('Enter trong ô tìm cũng áp từ khoá', async () => {
    mockFetch.mockResolvedValue(paged([LOP_01]));

    renderPage();
    await screen.findByRole('link', { name: 'LOP-01' });

    const search = screen.getByRole('searchbox', { name: 'Tìm theo mã lớp hoặc tên lớp' });
    await userEvent.type(search, 'Toán{Enter}');

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith({
        page: 1,
        size: 20,
        q: 'Toán',
        status: undefined,
      }),
    );
  });

  it('chọn trạng thái thì gửi đúng tham số status', async () => {
    mockFetch.mockResolvedValue(paged([LOP_01]));

    renderPage();
    await screen.findByRole('link', { name: 'LOP-01' });

    await userEvent.click(screen.getByRole('combobox', { name: 'Tất cả trạng thái' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đang diễn ra' }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith({
        page: 1,
        size: 20,
        q: undefined,
        status: 'DANG_DIEN_RA',
      }),
    );
  });
});

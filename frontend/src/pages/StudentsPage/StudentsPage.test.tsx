import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentListItem } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import StudentsPage from './StudentsPage';

// `useNotify` gọi `useToast` của Astryx (cần provider). Mock ở mức hook để tests
// quan sát được thông báo thành công/thất bại mà không render toast riêng.
const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchStudents: vi.fn(),
    createStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
  };
});

const { createStudent, deleteStudent, fetchStudents, updateStudent } = await import(
  '../../features/sprint4/sprint4Api'
);

const mockFetch = vi.mocked(fetchStudents);
const mockCreate = vi.mocked(createStudent);
const mockUpdate = vi.mocked(updateStudent);
const mockDelete = vi.mocked(deleteStudent);

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
  accountUsername: 'an@example.edu.vn',
  accountCreatedAt: '2025-09-01T00:00:00Z',
  createdAt: '2025-08-01T00:00:00Z',
  updatedAt: '2025-08-02T00:00:00Z',
};

const HS_02: StudentListItem = {
  ...HS_01,
  id: 's2',
  studentCode: 'HS002',
  fullName: 'Trần Thị Bình',
  dateOfBirth: null,
  email: null,
  phone: null,
  status: 'inactive',
  classId: null,
  classCode: null,
  className: null,
  accountUsername: null,
  accountCreatedAt: null,
};

function paged(items: StudentListItem[], overrides: Record<string, number> = {}) {
  return { items, total: items.length, page: 1, size: 20, pages: 1, ...overrides };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Page lấy đúng client này qua `useQueryClient()`; spy đi qua implementation
  // thật nên không làm đổi hành vi cache, chỉ quan sát lỗi invalidate bị bỏ sót.
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateQueriesSpy };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  notifySpies.success.mockReset();
  notifySpies.error.mockReset();

  useAuthStore.setState({
    userId: 'u1',
    username: 'giao.vu',
    isAuthenticated: true,
    role: null,
    backendRoles: [],
    permissions: ['STUDENT_VIEW'],
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

describe('StudentsPage — 5 trạng thái', () => {
  it('loading: hiện khối đang tải có role="status"', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getAllByText('Đang tải…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('success: hiện mã học sinh (liên kết tới hồ sơ), họ tên, nhãn trạng thái và tổng số', async () => {
    mockFetch.mockResolvedValue(paged([HS_01, HS_02]));

    renderPage();

    const link = await screen.findByRole('link', { name: 'HS001' });
    expect(link).toHaveAttribute('href', '/dao-tao/hoc-sinh/s1');

    const table = within(screen.getByRole('table'));
    expect(table.getByText('Nguyễn Văn An')).toBeInTheDocument();
    // Chữ luôn đi kèm màu badge (BR-08).
    expect(table.getByText('Đang học')).toBeInTheDocument();
    expect(table.getByText('Ngừng học')).toBeInTheDocument();
    // Tổng số là `total` của BE, không phải số dòng đang hiện.
    expect(screen.getByText('2 học sinh')).toBeInTheDocument();
  });

  it('success: học sinh chưa có lớp hiện câu thay thế, không để ô trống', async () => {
    mockFetch.mockResolvedValue(paged([HS_02]));

    renderPage();

    expect(await screen.findByText('Chưa ghi danh lớp')).toBeInTheDocument();
  });

  it('empty: danh sách rỗng thì nêu việc cần làm', async () => {
    mockFetch.mockResolvedValue(paged([]));

    renderPage();

    expect(await screen.findByText('Chưa có học sinh nào.')).toBeInTheDocument();
  });

  it('error: hiện cảnh báo kèm nút "Thử lại", bấm thì gọi lại API', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce(paged([HS_01]));

    renderPage();

    expect(await screen.findByText('Không tải được danh sách học sinh.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('link', { name: 'HS001' })).toBeInTheDocument();
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

describe('StudentsPage — quyền sửa', () => {
  it('STUDENT_EDIT: hiện nút tạo, cột "Thao tác" và nút sửa/xoá', async () => {
    useAuthStore.setState({
      backendRoles: [],
      permissions: ['STUDENT_VIEW', 'STUDENT_EDIT'],
    });
    mockFetch.mockResolvedValue(paged([HS_01]));

    renderPage();

    await screen.findByRole('link', { name: 'HS001' });
    expect(screen.getByRole('button', { name: 'Thêm học sinh' })).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument();
    expect(
      table.getByRole('button', { name: 'Sửa hồ sơ Nguyễn Văn An' }),
    ).toBeInTheDocument();
    expect(table.getByRole('button', { name: 'Xoá Nguyễn Văn An' })).toBeInTheDocument();
  });

  it('OWNER không có STUDENT_* vẫn xem được danh sách và toàn bộ thao tác', async () => {
    // OWNER đi qua nhánh `isOwnerRole` của canViewStudents/canEditStudents —
    // nhánh này không được phủ bởi các fixture chỉ dùng STUDENT_* ở trên.
    useAuthStore.setState({ backendRoles: ['OWNER'], permissions: [] });
    mockFetch.mockResolvedValue(paged([HS_01]));

    renderPage();

    const link = await screen.findByRole('link', { name: 'HS001' });
    expect(link).toHaveAttribute('href', '/dao-tao/hoc-sinh/s1');
    expect(screen.getByRole('button', { name: 'Thêm học sinh' })).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument();
    expect(
      table.getByRole('button', { name: 'Sửa hồ sơ Nguyễn Văn An' }),
    ).toBeInTheDocument();
    expect(table.getByRole('button', { name: 'Xoá Nguyễn Văn An' })).toBeInTheDocument();
  });

  it('chỉ STUDENT_VIEW: ẩn cả nút tạo lẫn cột "Thao tác"', async () => {
    mockFetch.mockResolvedValue(paged([HS_01]));

    renderPage();

    await screen.findByRole('link', { name: 'HS001' });
    expect(screen.queryByRole('button', { name: 'Thêm học sinh' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Thao tác' })).not.toBeInTheDocument();
  });
});

describe('StudentsPage — lọc', () => {
  it('gõ từ khoá rồi Enter thì gửi q và quay về trang 1', async () => {
    mockFetch.mockResolvedValue(paged([HS_01]));

    renderPage();
    await screen.findByRole('link', { name: 'HS001' });

    const search = screen.getByRole('searchbox', { name: 'Tìm theo mã học sinh hoặc họ tên' });
    await userEvent.type(search, 'HS001{Enter}');

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith({
        page: 1,
        size: 20,
        q: 'HS001',
        status: undefined,
      }),
    );
  });

  it('chọn trạng thái thì gửi đúng tham số status', async () => {
    mockFetch.mockResolvedValue(paged([HS_01]));

    renderPage();
    await screen.findByRole('link', { name: 'HS001' });

    await userEvent.click(screen.getByRole('combobox', { name: 'Tất cả trạng thái' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đang học' }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith({
        page: 1,
        size: 20,
        q: undefined,
        status: 'active',
      }),
    );
  });
});

describe('StudentsPage — tạo/sửa/xoá', () => {
  beforeEach(() => {
    useAuthStore.setState({
      backendRoles: [],
      permissions: ['STUDENT_VIEW', 'STUDENT_CREATE', 'STUDENT_EDIT', 'STUDENT_DELETE'],
    });
  });

  it('bỏ trống họ tên thì hiện lỗi trong dialog, không gọi API', async () => {
    mockFetch.mockResolvedValue(paged([]));

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm học sinh' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mới' }));

    // Astryx render lỗi ở 2 nơi (trong dialog và live region portal) → scope dialog.
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('Vui lòng nhập họ tên')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submit hợp lệ thì payload tạo không có studentCode, báo toast và vô hiệu cache', async () => {
    mockFetch.mockResolvedValue(paged([]));
    mockCreate.mockResolvedValue(HS_01);

    const { invalidateQueriesSpy } = renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm học sinh' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Họ tên' }), 'Nguyễn Văn An');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mới' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.fullName).toBe('Nguyễn Văn An');
    expect(payload).not.toHaveProperty('studentCode');
    expect(notifySpies.success).toHaveBeenCalledWith('Đã tạo học sinh.');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['students'] });
  });

  it('sửa hồ sơ thì gọi updateStudent đúng id và payload không có studentCode', async () => {
    mockFetch.mockResolvedValue(paged([HS_01]));
    mockUpdate.mockResolvedValue({ ...HS_01, fullName: 'Nguyễn Văn Bình' });

    renderPage();
    await screen.findByRole('link', { name: 'HS001' });

    await userEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ Nguyễn Văn An' }));
    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByRole('textbox', { name: 'Họ tên' });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Nguyễn Văn Bình');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const [id, payload] = mockUpdate.mock.calls[0];
    expect(id).toBe('s1');
    expect(payload.fullName).toBe('Nguyễn Văn Bình');
    expect(payload).not.toHaveProperty('studentCode');
  });

  it('bấm Xoá rồi Huỷ thì không gọi API', async () => {
    mockFetch.mockResolvedValue(paged([HS_01]));

    renderPage();
    await screen.findByRole('link', { name: 'HS001' });

    await userEvent.click(screen.getByRole('button', { name: 'Xoá Nguyễn Văn An' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy' }));

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('bấm Xoá rồi Xác nhận thì gọi API đúng 1 lần, báo toast và vô hiệu cache', async () => {
    mockFetch.mockResolvedValue(paged([HS_01]));
    mockDelete.mockResolvedValue(undefined);

    const { invalidateQueriesSpy } = renderPage();
    await screen.findByRole('link', { name: 'HS001' });

    await userEvent.click(screen.getByRole('button', { name: 'Xoá Nguyễn Văn An' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    // React Query v5 truyền thêm `MutationFunctionContext` làm đối số thứ hai;
    // chỉ đối số đầu là id do page gửi tới API.
    expect(mockDelete.mock.calls[0][0]).toBe('s1');
    expect(notifySpies.success).toHaveBeenCalledWith('Đã xoá học sinh.');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['students'] });
  });
});

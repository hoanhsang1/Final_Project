import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DepartmentOption,
  PositionOption,
  Specialty,
  TeacherListItem,
} from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import TeachersPage from './TeachersPage';

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchTeachers: vi.fn(),
    createTeacher: vi.fn(),
    fetchSpecialties: vi.fn(),
    createSpecialty: vi.fn(),
    fetchPositions: vi.fn(),
    fetchDepartments: vi.fn(),
  };
});

const {
  createTeacher,
  createSpecialty,
  fetchDepartments,
  fetchPositions,
  fetchSpecialties,
  fetchTeachers,
} = await import('../../features/sprint4/sprint4Api');

const mockList = vi.mocked(fetchTeachers);
const mockCreate = vi.mocked(createTeacher);
const mockSpecialties = vi.mocked(fetchSpecialties);
const mockCreateSpecialty = vi.mocked(createSpecialty);
const mockPositions = vi.mocked(fetchPositions);
const mockDepartments = vi.mocked(fetchDepartments);

const GV_01: TeacherListItem = {
  userId: 't1',
  staffCode: 'GV001',
  fullName: 'Nguyễn Văn An',
  email: 'an@example.edu.vn',
  phone: '0901234567',
  specialties: [{ id: 's1', name: 'Toán' }],
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  classCount: 2,
  noClass: false,
};

const GV_02: TeacherListItem = {
  userId: 't2',
  fullName: 'Trần Thị Bình',
  teachingStatus: 'NGHI_VIEC',
  noClass: true,
  classLabel: null,
};

const SPECIALTIES: Specialty[] = [{ id: 's1', name: 'Toán' }];
const POSITIONS: PositionOption[] = [{ id: 'p1', name: 'Giáo viên', profileType: 'TEACHER' }];
const DEPARTMENTS: DepartmentOption[] = [{ id: 'd1', name: 'Tổ Tự nhiên' }];

function paged(items: TeacherListItem[], overrides: Record<string, number> = {}) {
  return { items, total: items.length, page: 1, size: 20, pages: 1, ...overrides };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeachersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockList.mockReset();
  mockCreate.mockReset();
  mockSpecialties.mockReset();
  mockCreateSpecialty.mockReset();
  mockPositions.mockReset();
  mockDepartments.mockReset();

  // React Query coi `undefined` là lỗi ⇒ mọi query phải trả giá trị.
  mockSpecialties.mockResolvedValue(SPECIALTIES);
  mockPositions.mockResolvedValue(POSITIONS);
  mockDepartments.mockResolvedValue(DEPARTMENTS);

  useAuthStore.setState({
    userId: 'u1',
    username: 'giao.vu',
    isAuthenticated: true,
    role: null,
    backendRoles: [],
    permissions: ['PEOPLE_VIEW'],
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

describe('TeachersPage — 5 trạng thái', () => {
  it('loading: hiện khối đang tải', () => {
    mockList.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getAllByText('Đang tải…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('success: họ tên là liên kết tới chi tiết, có nhãn trạng thái dạy và tổng số giáo viên', async () => {
    mockList.mockResolvedValue(paged([GV_01, GV_02]));

    renderPage();

    const link = await screen.findByRole('link', { name: 'Nguyễn Văn An' });
    expect(link).toHaveAttribute('href', '/dao-tao/giao-vien/t1');

    // Phải scope vào bảng: listbox ẩn của `Selector` lọc trạng thái cũng chứa
    // đúng nhãn này.
    const table = within(screen.getByRole('table'));
    // Chữ luôn đi kèm màu badge (BR-08).
    expect(table.getByText('Đang dạy')).toBeInTheDocument();
    expect(table.getByText('Nghỉ việc')).toBeInTheDocument();
    // Tổng số là `total` của BE, không phải số dòng đang hiện.
    expect(screen.getByText('2 giáo viên')).toBeInTheDocument();
  });

  it('success: giáo viên chưa có lớp hiện câu thay thế, không để ô trống', async () => {
    mockList.mockResolvedValue(paged([GV_02]));

    renderPage();

    expect(await screen.findByText('Chưa có lớp')).toBeInTheDocument();
  });

  it('empty: danh sách rỗng thì nêu việc cần làm', async () => {
    mockList.mockResolvedValue(paged([]));

    renderPage();

    expect(await screen.findByText('Chưa có giáo viên nào.')).toBeInTheDocument();
  });

  it('error: hiện cảnh báo kèm nút "Thử lại", bấm thì gọi lại API', async () => {
    mockList.mockRejectedValueOnce(new Error('network'));
    mockList.mockResolvedValueOnce(paged([GV_01]));

    renderPage();

    expect(await screen.findByText('Không tải được danh sách giáo viên.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('link', { name: 'Nguyễn Văn An' })).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('no-permission: không gọi API và hiện lời nhắc liên hệ quản trị viên', async () => {
    useAuthStore.setState({ backendRoles: [], permissions: [] });

    renderPage();

    expect(
      await screen.findByText('Bạn không có quyền truy cập khu vực này.'),
    ).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
    // Không có thanh lọc khi không xem được dữ liệu.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});

describe('TeachersPage — quyền sửa', () => {
  it('PEOPLE_EDIT: hiện nút tạo, cột "Thao tác" và liên kết sửa', async () => {
    useAuthStore.setState({ backendRoles: [], permissions: ['PEOPLE_EDIT'] });
    mockList.mockResolvedValue(paged([GV_01]));

    renderPage();

    // Nút tạo nằm ở header nên hiện ngay; phải chờ bảng tải xong mới soi cột.
    await screen.findByRole('link', { name: 'Nguyễn Văn An' });
    expect(screen.getByRole('button', { name: 'Thêm giáo viên' })).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument();
    expect(table.getByRole('link', { name: 'Chỉnh sửa' })).toHaveAttribute(
      'href',
      '/dao-tao/giao-vien/t1?edit=1',
    );
  });

  it('chỉ PEOPLE_VIEW: ẩn cả nút tạo lẫn cột "Thao tác"', async () => {
    mockList.mockResolvedValue(paged([GV_01]));

    renderPage();

    await screen.findByRole('link', { name: 'Nguyễn Văn An' });
    expect(screen.queryByRole('button', { name: 'Thêm giáo viên' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Thao tác' })).not.toBeInTheDocument();
  });
});

describe('TeachersPage — lọc', () => {
  it('gõ từ khoá rồi bấm "Tìm" thì gửi q và quay về trang 1', async () => {
    mockList.mockResolvedValue(paged([GV_01]));

    renderPage();
    await screen.findByRole('link', { name: 'Nguyễn Văn An' });

    const search = screen.getByRole('searchbox', { name: 'Tìm theo mã nhân sự hoặc họ tên' });
    await userEvent.type(search, 'GV001');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({
        page: 1,
        size: 20,
        q: 'GV001',
        specialtyId: undefined,
        teachingStatus: undefined,
      }),
    );
  });

  it('chọn trạng thái dạy thì gửi đúng tham số teachingStatus', async () => {
    mockList.mockResolvedValue(paged([GV_01]));

    renderPage();
    await screen.findByRole('link', { name: 'Nguyễn Văn An' });

    await userEvent.click(screen.getByRole('combobox', { name: 'Tất cả trạng thái dạy' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đang dạy' }));

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({
        page: 1,
        size: 20,
        q: undefined,
        specialtyId: undefined,
        teachingStatus: 'DANG_DAY',
      }),
    );
  });
});

describe('TeachersPage — tạo giáo viên', () => {
  beforeEach(() => {
    useAuthStore.setState({ backendRoles: [], permissions: ['PEOPLE_EDIT'] });
  });

  it('gửi form rỗng thì hiện lỗi từng trường và không gọi API', async () => {
    mockList.mockResolvedValue(paged([]));

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm giáo viên' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mới' }));

    expect(await screen.findByText('Vui lòng nhập họ tên')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập email')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn bộ phận')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('tạo thành công thì hiện dialog mật khẩu tạm chỉ một lần', async () => {
    mockList.mockResolvedValue(paged([]));
    mockCreate.mockResolvedValue({
      userId: 't9',
      staffCode: 'GV009',
      fullName: 'Lê Văn Cường',
      temporaryPassword: 'Tam@123456',
      mustChangePassword: true,
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm giáo viên' }));

    await userEvent.type(screen.getByRole('textbox', { name: 'Mã nhân sự' }), 'GV009');
    await userEvent.type(screen.getByRole('textbox', { name: 'Họ tên' }), 'Lê Văn Cường');
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên đăng nhập' }), 'gv.cuong');
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'cuong@example.edu.vn');
    await userEvent.type(screen.getByRole('textbox', { name: 'Số điện thoại' }), '0909999999');

    await userEvent.click(screen.getByRole('combobox', { name: 'Bộ phận' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Tổ Tự nhiên' }));

    await userEvent.click(screen.getByRole('combobox', { name: 'Chức vụ' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Giáo viên' }));

    await userEvent.click(screen.getByRole('combobox', { name: 'Chuyên môn' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Toán' }));

    await userEvent.click(screen.getByRole('button', { name: 'Tạo mới' }));

    expect(await screen.findByText('Tôi đã lưu mật khẩu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tam@123456')).toBeInTheDocument();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

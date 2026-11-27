import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sprint4ApiError } from '../../features/sprint4/sprint4Api';
import type { StudentListItem } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import StudentDetailPage from './StudentDetailPage';

// `useNotify` gọi `useToast` của Astryx (cần provider). Mock ở mức hook để tests
// quan sát được thông báo lưu mà không render toast riêng.
const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchStudent: vi.fn(),
    updateStudent: vi.fn(),
  };
});

const { fetchStudent, updateStudent } = await import('../../features/sprint4/sprint4Api');

const mockFetch = vi.mocked(fetchStudent);
const mockUpdate = vi.mocked(updateStudent);

const HS_01: StudentListItem = {
  id: 's-1',
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Page lấy đúng client này qua `useQueryClient()`; spy đi qua implementation
  // thật nên không làm đổi hành vi cache, chỉ quan sát lỗi invalidate bị bỏ sót.
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dao-tao/hoc-sinh/s-1']}>
        {/* `useParams` chỉ có id khi component nằm dưới một Route khớp path. */}
        <Routes>
          <Route path="/dao-tao/hoc-sinh/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateQueriesSpy };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockUpdate.mockReset();
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

describe('StudentDetailPage — trạng thái tải/lỗi', () => {
  it('loading: hiện khối đang tải có role="status" và gọi fetchStudent đúng id', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith('s-1');
  });

  it.each([
    ['404', new Sprint4ApiError(404, 'STUDENT_NOT_FOUND', 'Không tìm thấy học sinh.')],
    ['500', new Sprint4ApiError(500, 'INTERNAL_ERROR', 'Lỗi máy chủ.')],
  ])('error %s: hiện Banner role="alert" kèm nút "Về danh sách"', async (_label, error) => {
    mockFetch.mockRejectedValue(error);

    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Về danh sách' })).toBeInTheDocument();
  });

  it('no-permission: không gọi API, hiện lời nhắc và ẩn nút sửa', async () => {
    useAuthStore.setState({ backendRoles: [], permissions: [] });

    renderPage();

    const status = await screen.findByRole('status');
    expect(
      within(status).getByText('Bạn không có quyền truy cập khu vực này.'),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Sửa hồ sơ' })).not.toBeInTheDocument();
  });
});

describe('StudentDetailPage — nội dung hồ sơ', () => {
  it('success: hiện đủ 3 nhóm, ngày tháng đã định dạng và liên kết về danh sách', async () => {
    mockFetch.mockResolvedValue(HS_01);

    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về danh sách' })).toHaveAttribute(
      'href',
      '/dao-tao/hoc-sinh',
    );

    // Thông tin hồ sơ — mã chỉ đọc, không phải ô nhập liệu.
    expect(screen.getByText('HS001')).toBeInTheDocument();
    expect(screen.getByText('10/05/2008')).toBeInTheDocument();
    expect(screen.getByText('an@example.edu.vn')).toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();
    // Badge của Astryx lặp nhãn trong DOM (hiện thị + live text) → dùng getAllByText.
    expect(screen.getAllByText('Đang học').length).toBeGreaterThan(0);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Lớp hiện tại / tài khoản / ngày tạo-cập nhật.
    expect(screen.getByText('LOP-01 — 10A1')).toBeInTheDocument();
    // Tên đăng nhập nằm trong item "Tên đăng nhập" (dt + dd sibling), không chỉ là email.
    const accountLabel = screen.getByText('Tên đăng nhập');
    expect(accountLabel.nextElementSibling).toHaveTextContent('hs001.an');
    expect(screen.getByText('01/09/2025')).toBeInTheDocument();
    expect(screen.getByText('01/08/2025')).toBeInTheDocument();
    expect(screen.getByText('02/08/2025')).toBeInTheDocument();

    // BE/DB chưa có các field này — tuyệt đối không suy diễn trên UI.
    expect(screen.queryByText(/Giới tính/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lịch sử thay đổi/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lớp quá khứ/)).not.toBeInTheDocument();
  });

  it('success: chưa có lớp/tài khoản thì hiện câu thay thế', async () => {
    mockFetch.mockResolvedValue({
      ...HS_01,
      classCode: null,
      className: null,
      accountUsername: null,
      accountCreatedAt: null,
    });

    renderPage();

    expect(await screen.findByText('Chưa ghi danh lớp')).toBeInTheDocument();
    expect(screen.getByText('Chưa tạo tài khoản')).toBeInTheDocument();
  });
});

describe('StudentDetailPage — quyền sửa', () => {
  it('chỉ STUDENT_VIEW: ẩn nút "Sửa hồ sơ"', async () => {
    mockFetch.mockResolvedValue(HS_01);

    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' });
    expect(screen.queryByRole('button', { name: 'Sửa hồ sơ' })).not.toBeInTheDocument();
  });

  it('OWNER không có STUDENT_* vẫn thấy nút "Sửa hồ sơ"', async () => {
    useAuthStore.setState({ backendRoles: ['OWNER'], permissions: [] });
    mockFetch.mockResolvedValue(HS_01);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Sửa hồ sơ' })).toBeInTheDocument();
  });

  it('bỏ trống họ tên thì hiện lỗi trong dialog, không gọi API', async () => {
    useAuthStore.setState({ backendRoles: [], permissions: ['STUDENT_VIEW', 'STUDENT_EDIT'] });
    mockFetch.mockResolvedValue(HS_01);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa hồ sơ' }));

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByRole('textbox', { name: 'Họ tên' });
    await userEvent.clear(nameInput);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    // Astryx render lỗi ở 2 nơi (trong dialog và live region portal) → scope dialog.
    expect(await within(dialog).findByText('Vui lòng nhập họ tên')).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('lưu hợp lệ thì gọi updateStudent đúng id/payload, báo toast và vô hiệu cả 2 cache', async () => {
    useAuthStore.setState({ backendRoles: [], permissions: ['STUDENT_VIEW', 'STUDENT_EDIT'] });
    mockFetch.mockResolvedValue(HS_01);
    mockUpdate.mockResolvedValue({ ...HS_01, fullName: 'Nguyễn Văn Bình' });

    const { invalidateQueriesSpy } = renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa hồ sơ' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: 'Mã học sinh' })).toHaveAttribute('readonly');
    const nameInput = within(dialog).getByRole('textbox', { name: 'Họ tên' });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Nguyễn Văn Bình');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const [id, payload] = mockUpdate.mock.calls[0];
    expect(id).toBe('s-1');
    expect(payload.fullName).toBe('Nguyễn Văn Bình');
    expect(payload).not.toHaveProperty('studentCode');
    expect(notifySpies.success).toHaveBeenCalledWith('Đã cập nhật học sinh.');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['students'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['students', 's-1'] });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

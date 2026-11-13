import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnerApiError } from '../../features/owner/ownerApi';
import DepartmentsPage from './DepartmentsPage';

vi.mock('../../features/owner/ownerApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/owner/ownerApi')>();
  return {
    ...actual,
    fetchDepartments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
  };
});

const { fetchDepartments, createDepartment, updateDepartment, deleteDepartment } = await import(
  '../../features/owner/ownerApi'
);
const mockFetch = vi.mocked(fetchDepartments);
const mockCreate = vi.mocked(createDepartment);
const mockUpdate = vi.mocked(updateDepartment);
const mockDelete = vi.mocked(deleteDepartment);

const KHOA_CNTT = {
  id: 'd1',
  name: 'Khoa CNTT',
  description: 'Khoa Công nghệ thông tin',
  createdAt: '2026-10-01T03:00:00Z',
};

const PHONG_DAO_TAO = {
  id: 'd2',
  name: 'Phòng Đào tạo',
  description: null,
  createdAt: '2026-10-02T03:00:00Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <App>
        <MemoryRouter>
          <DepartmentsPage />
        </MemoryRouter>
      </App>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
});

describe('DepartmentsPage — danh sách', () => {
  it('hiện tên, mô tả và ngày tạo của từng phòng ban', async () => {
    mockFetch.mockResolvedValue([KHOA_CNTT, PHONG_DAO_TAO]);

    renderPage();

    expect(await screen.findByRole('link', { name: 'Khoa CNTT' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Phòng Đào tạo' })).toBeInTheDocument();
    expect(screen.getByText('Khoa Công nghệ thông tin')).toBeInTheDocument();
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('danh sách rỗng → hiện hướng dẫn tạo phòng ban đầu tiên', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('Chưa có phòng ban nào. Tạo phòng ban đầu tiên để bắt đầu.'),
    ).toBeInTheDocument();
  });

  it('tải lỗi → hiện cảnh báo và nút thử lại', async () => {
    mockFetch.mockRejectedValueOnce(new OwnerApiError(500, 'INTERNAL_ERROR', 'boom'));
    mockFetch.mockResolvedValueOnce([KHOA_CNTT]);

    renderPage();

    expect(await screen.findByText('Không tải được danh sách phòng ban.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('link', { name: 'Khoa CNTT' })).toBeInTheDocument();
  });
});

describe('DepartmentsPage — tạo phòng ban', () => {
  it('bỏ trống tên thì chặn ở form, không gọi API', async () => {
    mockFetch.mockResolvedValue([]);
    renderPage();
    await screen.findByText(/Chưa có phòng ban nào/);

    await userEvent.click(screen.getByRole('button', { name: 'Thêm phòng ban' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Vui lòng nhập tên phòng ban')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('nhập tên rồi lưu → gọi API và đóng modal', async () => {
    mockFetch.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ ...KHOA_CNTT, name: 'Khoa Mới' });
    renderPage();
    await screen.findByText(/Chưa có phòng ban nào/);

    await userEvent.click(screen.getByRole('button', { name: 'Thêm phòng ban' }));
    await userEvent.type(screen.getByLabelText('Tên phòng ban'), 'Khoa Mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ name: 'Khoa Mới', description: undefined }),
    );
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });
});

describe('DepartmentsPage — xoá phòng ban', () => {
  it('xác nhận xoá thì gọi API với đúng id', async () => {
    mockFetch.mockResolvedValue([KHOA_CNTT]);
    mockDelete.mockResolvedValue(undefined);
    renderPage();
    await screen.findByRole('link', { name: 'Khoa CNTT' });

    await userEvent.click(screen.getByRole('button', { name: 'Xoá phòng ban Khoa CNTT' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('d1'));
  });

  it('phòng ban còn nhân viên → hiện câu giải thích phải gỡ nhân viên trước', async () => {
    mockFetch.mockResolvedValue([KHOA_CNTT]);
    mockDelete.mockRejectedValue(
      new OwnerApiError(409, 'DEPARTMENT_NOT_EMPTY', 'Remove department members first'),
    );
    renderPage();
    await screen.findByRole('link', { name: 'Khoa CNTT' });

    await userEvent.click(screen.getByRole('button', { name: 'Xoá phòng ban Khoa CNTT' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));

    expect(
      await screen.findByText(
        'Phòng ban còn nhân viên. Hãy xoá hết nhân viên khỏi phòng ban trước.',
      ),
    ).toBeInTheDocument();
  });
});

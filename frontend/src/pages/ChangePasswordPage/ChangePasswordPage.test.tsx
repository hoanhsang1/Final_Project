import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChangePasswordPage from './ChangePasswordPage';
import { changePassword } from '../../features/auth/authApi';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../features/auth/authApi', () => ({
  changePassword: vi.fn(),
}));
const mockChangePassword = vi.mocked(changePassword);

beforeEach(() => {
  localStorage.clear();
  mockChangePassword.mockReset();
  useAuthStore.setState({
    userId: 'u1',
    username: 'nhanvien',
    role: null,
    backendRoles: ['OWNER'],
    permissions: [],
    mustChangePassword: true,
    isAuthenticated: true,
  });
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: '/doi-mat-khau', element: <ChangePasswordPage /> },
      { path: '/dang-nhap', element: <div>Trang đăng nhập</div> },
    ],
    { initialEntries: ['/doi-mat-khau'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('ChangePasswordPage', () => {
  it('báo rõ đang dùng mật khẩu tạm', () => {
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/mật khẩu tạm/i);
  });

  it('mật khẩu nhập lại không khớp thì chặn tại form, không gọi API', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'Tam@123456789');
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'Moi@123456789');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Khac@123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('đổi thành công thì gọi API, xoá phiên và về trang đăng nhập', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    const router = renderPage();

    await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'Tam@123456789');
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'Moi@123456789');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Moi@123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith('Tam@123456789', 'Moi@123456789'),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });

  it('sai mật khẩu hiện tại thì hiện lỗi, giữ nguyên trang', async () => {
    mockChangePassword.mockRejectedValue(new Error('Mật khẩu hiện tại không đúng.'));
    const router = renderPage();

    await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'Sai@123456789');
    await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'Moi@123456789');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Moi@123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByText('Mật khẩu hiện tại không đúng.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/doi-mat-khau');
  });
});

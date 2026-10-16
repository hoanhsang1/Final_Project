import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ROLES } from '../../features/auth/roles';
import { routes } from '../../router';
import { useAuthStore } from '../../stores/authStore';

/** Mock tầng gọi API để test độc lập, không cần backend chạy. */
vi.mock('../../features/auth/authApi', () => ({
  login: vi.fn(),
}));
const { login } = await import('../../features/auth/authApi');
const mockLogin = vi.mocked(login);

/** JWT giả để test callback thành công (đủ để store decode userId/username/roles). */
function fakeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`;
}

beforeEach(() => {
  localStorage.clear();
  mockLogin.mockReset();
  useAuthStore.setState({ userId: null, username: null, role: null, isAuthenticated: false });
});

function renderLogin(path = '/dang-nhap') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

it('có ô tên đăng nhập và ô mật khẩu', () => {
  renderLogin();

  expect(screen.getByLabelText('Tên đăng nhập')).toBeInTheDocument();
  expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
});

it('có đủ 4 nút tác nhân', () => {
  renderLogin();

  for (const role of ROLES) {
    expect(screen.getByRole('button', { name: new RegExp(role.label, 'i') })).toBeInTheDocument();
  }
});

it('bấm "Giáo viên" thì chuyển sang /xem-thu/teacher', async () => {
  const router = renderLogin();

  await userEvent.click(screen.getByRole('button', { name: /giáo viên/i }));

  expect(router.state.location.pathname).toBe('/xem-thu/teacher');
});

it('bỏ trống rồi bấm Đăng nhập thì hiện lỗi ngay tại từng trường', async () => {
  renderLogin();

  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  expect(await screen.findByText('Vui lòng nhập tên đăng nhập')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
});

it('có lối sang trang đăng ký tổ chức', () => {
  renderLogin();

  expect(screen.getByRole('link', { name: 'Đăng ký tổ chức' })).toHaveAttribute('href', '/dang-ky');
});

it('nhập đúng rồi bấm Đăng nhập thì gọi API và vào trang theo vai trò', async () => {
  mockLogin.mockResolvedValue({
    accessToken: fakeJwt({ userId: 'u1', username: 'gv', roles: ['TEACHER'] }),
    refreshToken: 'r1',
    tokenType: 'Bearer',
    expiresIn: 900,
  });
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'gv');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  // Đợi mutation chạy xong và điều hướng.
  expect(await screen.findByText(/xem thử theo vai trò/i)).toBeInTheDocument();
  // TanStack Query truyền thêm context (QueryClient, meta) làm argument thứ 2 → chỉ so field đầu.
  expect(mockLogin).toHaveBeenCalledWith({ username: 'gv', password: '123456' }, expect.anything());
  expect(router.state.location.pathname).toBe('/xem-thu/teacher');
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});

it('nhập sai mật khẩu thì hiện lỗi, KHÔNG điều hướng (NFR-REL-001)', async () => {
  mockLogin.mockRejectedValue(new Error('Invalid username or password'));
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'gv');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'sai');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/dang-nhap');
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('đăng nhập thành công nhưng vai trò chưa có trang thì hiện thông báo, không crash', async () => {
  mockLogin.mockResolvedValue({
    accessToken: fakeJwt({ userId: 'u2', username: 'kt', roles: ['FACILITY_STAFF'] }),
    refreshToken: 'r2',
    tokenType: 'Bearer',
    expiresIn: 900,
  });
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'kt');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  expect(await screen.findByText(/chưa có màn hình|chưa hỗ trợ/i)).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/dang-nhap');
  // Vẫn coi là đã đăng nhập, chỉ là chưa biết vào trang nào.
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
  expect(useAuthStore.getState().role).toBeNull();
});

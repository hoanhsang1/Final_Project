import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ROLES } from '../../features/auth/roles';
import { ApiError } from '../../features/platform/errorCodes';
import { routes } from '../../router';
import { useAuthStore } from '../../stores/authStore';

/** Mock tầng gọi API để test độc lập, không cần backend chạy. */
vi.mock('../../features/auth/authApi', () => ({
  login: vi.fn(),
  changePassword: vi.fn(),
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
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    permissions: [],
    mustChangePassword: false,
    isAuthenticated: false,
  });
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

  // Tên liên kết là chữ nhìn thấy (không đặt `aria-label` khác) — 2.5.3.
  expect(screen.getByRole('link', { name: 'Đăng ký ngay' })).toHaveAttribute('href', '/dang-ky');
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

  // Đợi mutation chạy xong và điều hướng sang màn xem thử vai trò.
  //
  // Trước đây câu này chờ chữ "hoặc xem thử theo vai trò" của **chính trang Đăng nhập** —
  // chữ đó đã có sẵn TRƯỚC khi bấm nên `findByText` trả về ngay, rồi trong lúc `await`
  // React kịp điều hướng và tháo trang Đăng nhập → phần tử vừa lấy bị tách khỏi DOM.
  // Test chỉ "xanh" nhờ thứ tự thời gian tình cờ (trang xem thử bản trước nặng hơn nên
  // commit chậm hơn). Chờ đúng chữ của trang ĐÍCH vừa hết đua, vừa kiểm tra đúng ý định.
  expect(await screen.findByText('Đã đăng nhập')).toBeInTheDocument();
  // TanStack Query truyền thêm context (QueryClient, meta) làm argument thứ 2 → chỉ so field đầu.
  expect(mockLogin).toHaveBeenCalledWith({ username: 'gv', password: '123456' }, expect.anything());
  expect(router.state.location.pathname).toBe('/xem-thu/teacher');
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
  expect(useAuthStore.getState().mustChangePassword).toBe(false);
});

it('nhập sai mật khẩu thì hiện lỗi, KHÔNG điều hướng (NFR-REL-001)', async () => {
  mockLogin.mockRejectedValue(new Error('Sai tên đăng nhập hoặc mật khẩu.'));
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'gv');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'sai');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  expect(await screen.findByText('Sai tên đăng nhập hoặc mật khẩu.')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/dang-nhap');
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('đăng nhập thành công nhưng vai trò chưa có trang thì hiện thông báo, không crash', async () => {  mockLogin.mockResolvedValue({
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

it('OWNER đăng nhập thành công thì vào thẳng /to-chuc', async () => {
  mockLogin.mockResolvedValue({
    accessToken: fakeJwt({ userId: 'u3', username: 'owner', roles: ['OWNER'] }),
    refreshToken: 'r3',
    tokenType: 'Bearer',
    expiresIn: 900,
  });
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'owner');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/to-chuc'));
  // Cả cây router (console + bảng) mount sau khi đổi URL; 1s mặc định của
  // Testing Library không đủ khi 140 test chạy song song trên máy chậm.
  expect(
    await screen.findByRole('heading', { name: 'Phòng ban' }, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(useAuthStore.getState().backendRoles).toContain('OWNER');
});

it('429 LOGIN_RATE_LIMITED hiện thông báo riêng, KHÔNG hiện "sai mật khẩu"', async () => {
  mockLogin.mockRejectedValue(
    new ApiError('Sai tên đăng nhập hoặc mật khẩu.', {
      code: 'LOGIN_RATE_LIMITED',
      status: 429,
    }),
  );
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'gv');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'sai');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  expect(await screen.findByText(/quá nhiều lần/i)).toBeInTheDocument();
  expect(screen.queryByText('Sai tên đăng nhập hoặc mật khẩu.')).not.toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/dang-nhap');
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('JWT có mustChangePassword:true → mở modal bắt đổi, KHÔNG điều hướng', async () => {
  mockLogin.mockResolvedValue({
    accessToken: fakeJwt({
      userId: 'u4',
      username: 'temp',
      roles: ['TEACHER'],
      mustChangePassword: true,
    }),
    refreshToken: 'r4',
    tokenType: 'Bearer',
    expiresIn: 900,
  });
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'temp');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'MatKhauTam123');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  await waitFor(() => expect(useAuthStore.getState().mustChangePassword).toBe(true));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/dang-nhap');
});

it('FACILITY_STAFF có quyền CSVC đăng nhập thì vào /co-so-vat-chat', async () => {
  mockLogin.mockResolvedValue({
    accessToken: fakeJwt({
      userId: 'u4',
      username: 'nv',
      roles: ['FACILITY_STAFF'],
      permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
    }),
    refreshToken: 'r4',
    tokenType: 'Bearer',
    expiresIn: 900,
  });
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'nv');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/co-so-vat-chat'));
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});

it('ACADEMIC_STAFF có CLASS_READ đăng nhập thì vào khu vực /dao-tao', async () => {
  mockLogin.mockResolvedValue({
    accessToken: fakeJwt({
      userId: 'u5',
      username: 'gv',
      roles: ['ACADEMIC_STAFF'],
      permissions: ['CLASS_READ'],
    }),
    refreshToken: 'r5',
    tokenType: 'Bearer',
    expiresIn: 900,
  });
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'gv');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  // Index /dao-tao tiếp tục đưa tới màn đầu tiên của menu thực tế (`lop-hoc`),
  // nên chờ đích đã resolved thay vì chờ `/dao-tao` thoáng qua.
  await waitFor(() => expect(router.state.location.pathname).toBe('/dao-tao/lop-hoc'));
  expect(router.state.location.pathname).toMatch(/^\/dao-tao(?:\/|$)/);
});

it('API trả code PASSWORD_CHANGE_REQUIRED → mở modal bắt đổi', async () => {
  mockLogin.mockRejectedValue(
    new ApiError('Yêu cầu đổi mật khẩu.', {
      code: 'PASSWORD_CHANGE_REQUIRED',
      status: 403,
    }),
  );
  const router = renderLogin();

  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'temp');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'MatKhauTam123');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(useAuthStore.getState().mustChangePassword).toBe(true);
  expect(router.state.location.pathname).toBe('/dang-nhap');
});

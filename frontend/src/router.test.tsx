import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach } from 'vitest';
import { routes } from './router';
import { useAuthStore } from './stores/authStore';

afterEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    isAuthenticated: false,
  });
});

function renderAt(path: string) {
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

it('chuyển hướng gốc về trang đăng nhập', () => {
  const router = renderAt('/');
  expect(router.state.location.pathname).toBe('/dang-nhap');
  expect(screen.getByRole('heading', { name: 'Đăng nhập để tiếp tục' })).toBeInTheDocument();
});

it('hiện trang đăng ký ở /dang-ky', () => {
  renderAt('/dang-ky');
  expect(screen.getByRole('heading', { name: 'Đăng ký tổ chức' })).toBeInTheDocument();
});

it('hiện 404 ở đường dẫn không tồn tại', () => {
  renderAt('/khong-ton-tai');
  expect(screen.getByText('Không tìm thấy trang')).toBeInTheDocument();
});

it('chưa đăng nhập vào /to-chuc thì bị đưa về /dang-nhap', () => {
  const router = renderAt('/to-chuc');

  expect(router.state.location.pathname).toBe('/dang-nhap');
});

it('SUPER_ADMIN vào /to-chuc thấy 403 của khu vực tổ chức', () => {
  useAuthStore.setState({
    userId: 'admin-1',
    username: 'admin',
    role: null,
    backendRoles: ['SUPER_ADMIN'],
    isAuthenticated: true,
  });

  renderAt('/to-chuc');

  expect(
    screen.getByText('Bạn không có quyền truy cập khu vực quản lý tổ chức.'),
  ).toBeInTheDocument();
});

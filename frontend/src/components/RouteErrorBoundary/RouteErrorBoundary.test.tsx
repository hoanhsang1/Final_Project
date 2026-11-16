import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RouteErrorBoundary from './RouteErrorBoundary';
import { useAuthStore } from '../../stores/authStore';

function Boom(): never {
  throw new Error('boom');
}

function renderError() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Boom />, errorElement: <RouteErrorBoundary /> },
      { path: '/dang-nhap', element: <p>Trang đăng nhập</p> },
    ],
    { initialEntries: ['/'] },
  );

  render(
    <ConfigProvider>
      <RouterProvider router={router} />
    </ConfigProvider>,
  );

  return router;
}

beforeEach(() => {
  // React Router log lỗi ra console khi boundary bắt lỗi — test không cần.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    isAuthenticated: false,
  });
});

describe('RouteErrorBoundary', () => {
  it('thay màn lỗi mặc định bằng thông báo tiếng Việt và 2 nút thoát', () => {
    renderError();

    expect(screen.getByText('Ứng dụng gặp sự cố')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Về trang chính' })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
  });

  it('bấm "Về trang chính" đưa về trang đăng nhập khi chưa có phiên', async () => {
    const router = renderError();

    await userEvent.click(screen.getByRole('button', { name: 'Về trang chính' }));

    expect(router.state.location.pathname).toBe('/dang-nhap');
  });
});

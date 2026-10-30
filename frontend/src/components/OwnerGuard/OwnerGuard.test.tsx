import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import OwnerGuard from './OwnerGuard';

function renderGuard() {
  const router = createMemoryRouter(
    [
      {
        path: '/to-chuc',
        element: (
          <OwnerGuard>
            <p>Nội dung quản lý tổ chức</p>
          </OwnerGuard>
        ),
      },
      { path: '/dang-nhap', element: <p>Trang đăng nhập</p> },
    ],
    { initialEntries: ['/to-chuc'] },
  );

  render(
    <ConfigProvider>
      <RouterProvider router={router} />
    </ConfigProvider>,
  );

  return router;
}

beforeEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    isAuthenticated: false,
  });
});

describe('OwnerGuard', () => {
  it('chưa đăng nhập → chuyển về /dang-nhap', () => {
    const router = renderGuard();

    expect(router.state.location.pathname).toBe('/dang-nhap');
    expect(screen.queryByText('Nội dung quản lý tổ chức')).not.toBeInTheDocument();
  });

  it('role không phải Owner → 403 tại chỗ, không render nội dung', () => {
    useAuthStore.setState({ isAuthenticated: true, backendRoles: ['STAFF'], role: null });

    renderGuard();

    expect(
      screen.getByText('Bạn không có quyền truy cập khu vực quản lý tổ chức.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Nội dung quản lý tổ chức')).not.toBeInTheDocument();
  });

  it('role OWNER → render nội dung con', () => {
    useAuthStore.setState({ isAuthenticated: true, backendRoles: ['OWNER'], role: null });

    renderGuard();

    expect(screen.getByText('Nội dung quản lý tổ chức')).toBeInTheDocument();
  });

  it('role ORG_OWNER (mã cũ) cũng được vào', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      backendRoles: ['ORG_OWNER'],
      role: null,
    });

    renderGuard();

    expect(screen.getByText('Nội dung quản lý tổ chức')).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';
import { useAuthStore } from '../../stores/authStore';
import ConsoleShell from './ConsoleShell';

const logoutMock = vi.fn();
vi.mock('../../features/auth/authApi', () => ({
  logout: () => logoutMock(),
}));

const ITEMS: readonly ConsoleMenuItem[] = [
  { key: 'phong-ban', label: 'Phòng ban', path: '/to-chuc', exact: true },
  { key: 'chuc-vu', label: 'Chức vụ', path: '/to-chuc/chuc-vu', exact: true },
];

function renderShell(selectedKey: string | null = 'phong-ban') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <ConsoleShell
            title="Khu vực tổ chức"
            menuAriaLabel="Menu quản lý tổ chức"
            openMenuLabel="Mở menu quản lý tổ chức"
            logoutLabel="Đăng xuất"
            items={ITEMS}
            selectedKey={selectedKey}
          />
        ),
        children: [{ index: true, element: <p>Nội dung chính</p> }],
      },
      { path: '/dang-nhap', element: <p>Đăng nhập</p> },
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
  logoutMock.mockReset();
  useAuthStore.setState({
    userId: 'u1',
    username: 'chu.to.chuc',
    isAuthenticated: true,
    role: null,
    backendRoles: ['OWNER'],
  });
});

afterEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    isAuthenticated: false,
    role: null,
    backendRoles: [],
  });
});

describe('ConsoleShell', () => {
  it('hiện mọi mục menu trong nav có aria-label truyền vào', () => {
    renderShell();

    const nav = screen.getByRole('navigation', { name: 'Menu quản lý tổ chức' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Phòng ban' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chức vụ' })).toBeInTheDocument();
  });

  it('đánh dấu aria-current="page" cho đúng mục đang chọn', () => {
    renderShell('chuc-vu');

    expect(screen.getByRole('link', { name: 'Chức vụ' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Phòng ban' })).not.toHaveAttribute('aria-current');
  });

  it('không đánh dấu mục nào khi selectedKey = null', () => {
    renderShell(null);

    expect(screen.getByRole('link', { name: 'Phòng ban' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Chức vụ' })).not.toHaveAttribute('aria-current');
  });

  it('hiện username đang đăng nhập và render nội dung con qua Outlet', () => {
    renderShell();

    expect(screen.getByText('chu.to.chuc')).toBeInTheDocument();
    expect(screen.getByText('Nội dung chính')).toBeInTheDocument();
  });

  it('đăng xuất gọi API, xoá phiên và chuyển về /dang-nhap', async () => {
    const user = userEvent.setup();
    const router = renderShell();
    logoutMock.mockResolvedValue({ data: undefined });

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('vẫn thoát phiên khi API đăng xuất lỗi', async () => {
    const user = userEvent.setup();
    const router = renderShell();
    logoutMock.mockRejectedValue(new Error('network'));

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const ORIGINAL_MATCH_MEDIA = window.matchMedia;

/**
 * Giả lập bề rộng khung nhìn. `setup.ts` cho mọi media query trả `false` (môi
 * trường jsdom) — nghĩa là mặc định shell ở chế độ mobile. Muốn test desktop
 * (≥1024px) phải tự trả `true` cho đúng query đó.
 */
function setViewport(isDesktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: isDesktop && query.includes('min-width: 1024px'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

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
      // ConsoleMenu trỏ tới các URL con; thêm nhánh bắt để bấm menu trong test
      // không sinh cảnh báo "No routes matched".
      { path: '*', element: <p>Trang khác</p> },
    ],
    { initialEntries: ['/'] },
  );

  const view = render(<RouterProvider router={router} />);

  return { router, container: view.container };
}

beforeEach(() => {
  logoutMock.mockReset();
  setViewport(true);
  useAuthStore.setState({
    userId: 'u1',
    username: 'chu.to.chuc',
    isAuthenticated: true,
    role: null,
    backendRoles: ['OWNER'],
  });
});

afterEach(() => {
  window.matchMedia = ORIGINAL_MATCH_MEDIA;
  useAuthStore.setState({
    userId: null,
    username: null,
    isAuthenticated: false,
    role: null,
    backendRoles: [],
  });
});

describe('ConsoleShell (desktop)', () => {
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

  it('không có nút mở menu ở desktop, và vùng nội dung nhảy được bằng skip link', () => {
    const { container } = renderShell();

    expect(
      screen.queryByRole('button', { name: 'Mở menu quản lý tổ chức' }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('aside')).not.toBeNull();
    // Skip link trỏ đúng `id` của `<main>` (WCAG 2.4.1).
    expect(screen.getByRole('link', { name: 'Tới nội dung chính' })).toHaveAttribute(
      'href',
      '#noi-dung-chinh',
    );
    expect(container.querySelector('main#noi-dung-chinh')).not.toBeNull();
  });

  it('đăng xuất gọi API, xoá phiên và chuyển về /dang-nhap', async () => {
    const user = userEvent.setup();
    const { router } = renderShell();
    logoutMock.mockResolvedValue({ data: undefined });

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('vẫn thoát phiên khi API đăng xuất lỗi', async () => {
    const user = userEvent.setup();
    const { router } = renderShell();
    logoutMock.mockRejectedValue(new Error('network'));

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('shows app/product identity in the Odoo-style header', () => {
    renderShell();
    expect(screen.getByText(/^MEMS$/i)).toBeInTheDocument();
    expect(screen.getByText('Khu vực tổ chức')).toBeInTheDocument();
  });
});

describe('ConsoleShell (mobile)', () => {
  // `beforeEach` ngoài đặt desktop; ở đây trả về mobile như jsdom mặc định.
  beforeEach(() => setViewport(false));

  it('ẩn cột bên, thay bằng nút mở menu có aria-expanded', () => {
    const { container } = renderShell();

    expect(container.querySelector('aside')).toBeNull();

    const openButton = screen.getByRole('button', { name: 'Mở menu quản lý tổ chức' });
    expect(openButton).toHaveAttribute('aria-expanded', 'false');

    // Nội dung trang vẫn nằm trong `<main>` có id của skip link.
    expect(container.querySelector('main#noi-dung-chinh')).toHaveTextContent('Nội dung chính');
  });

  it('mở Drawer chứa cùng menu, bấm một mục thì đóng Drawer sau khi điều hướng', async () => {
    const user = userEvent.setup();
    const { router } = renderShell();

    const openButton = screen.getByRole('button', { name: 'Mở menu quản lý tổ chức' });
    await user.click(openButton);

    expect(openButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Khu vực tổ chức' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Chức vụ' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/to-chuc/chuc-vu'));
    // `onSelect` đóng Drawer để danh sách không che nội dung vừa mở.
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
  });
});

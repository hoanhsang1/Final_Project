import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ROLES } from '../../features/auth/roles';
import { routes } from '../../router';
import { useAuthStore } from '../../stores/authStore';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

/** Đặt phiên "đã đăng nhập" giả để test nhánh có xác thực. */
function signIn(username: string, role: 'platform-admin' | 'teacher' = 'teacher') {
  useAuthStore.setState({ userId: 'u1', username, role, isAuthenticated: true });
}

/** Store là singleton cấp module nên phải trả về trạng thái sạch sau mỗi test. */
afterEach(() => {
  useAuthStore.setState({ userId: null, username: null, role: null, isAuthenticated: false });
  localStorage.clear();
});

describe('chế độ xem thử (chưa đăng nhập)', () => {
  it('hiện "Bạn đang là" kèm nhãn vai trò khi slug hợp lệ', () => {
    renderAt('/xem-thu/teacher');

    expect(screen.getByText(/bạn đang là/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Giáo viên' })).toBeInTheDocument();
  });

  it.each(ROLES)('mở thẳng /xem-thu/$id thì dựng đúng nhãn "$label"', ({ id, label }) => {
    renderAt(`/xem-thu/${id}`);

    expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
  });

  it('nói rõ đây là chế độ xem thử, CHƯA đăng nhập', () => {
    renderAt('/xem-thu/teacher');

    expect(screen.getByText(/chế độ xem thử/i)).toBeInTheDocument();
    expect(screen.getByText(/chưa đăng nhập/i)).toBeInTheDocument();
  });

  it('KHÔNG hiện nút Đăng xuất khi chưa có phiên', () => {
    renderAt('/xem-thu/teacher');

    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  });
});

describe('đã đăng nhập thật', () => {
  it('hiện tên đăng nhập thật lấy từ phiên, không chỉ nhãn vai trò', () => {
    signIn('platform_admin');
    renderAt('/xem-thu/platform-admin');

    expect(screen.getByText('Đã đăng nhập')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'platform_admin' })).toBeInTheDocument();
    expect(screen.queryByText(/chế độ xem thử/i)).not.toBeInTheDocument();
  });

  it('hiện rõ vai trò kèm mô tả', () => {
    signIn('gv.nguyen', 'teacher');
    renderAt('/xem-thu/teacher');

    expect(screen.getByText(/Vai trò: Giáo viên/)).toBeInTheDocument();
  });

  it('bấm "Đăng xuất" thì xoá phiên và về trang đăng nhập', async () => {
    signIn('platform_admin');
    const router = renderAt('/xem-thu/platform-admin');

    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(router.state.location.pathname).toBe('/dang-nhap');
  });
});

describe('đường dẫn sai', () => {
  it('slug lạ thì hiện thông báo rõ ràng, không trắng trang', () => {
    renderAt('/xem-thu/giao-vien');

    expect(screen.getByText('Không có vai trò này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại đăng nhập' })).toBeInTheDocument();
  });

  it('bấm "Quay lại đăng nhập" thì về /dang-nhap', async () => {
    const router = renderAt('/xem-thu/student');

    await userEvent.click(screen.getByRole('button', { name: 'Quay lại đăng nhập' }));

    expect(router.state.location.pathname).toBe('/dang-nhap');
  });
});

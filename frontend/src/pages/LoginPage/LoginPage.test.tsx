import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ROLES } from '../../features/auth/roles';
import { routes } from '../../router';

function renderLogin() {
  const router = createMemoryRouter(routes, { initialEntries: ['/dang-nhap'] });
  render(<RouterProvider router={router} />);
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

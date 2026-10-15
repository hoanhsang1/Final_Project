import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
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

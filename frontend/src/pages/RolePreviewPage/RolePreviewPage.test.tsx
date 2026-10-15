import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ROLES } from '../../features/auth/roles';
import { routes } from '../../router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

it('hiện "Bạn đang là" kèm nhãn vai trò khi slug hợp lệ', () => {
  renderAt('/xem-thu/teacher');

  expect(screen.getByText(/bạn đang là/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Giáo viên' })).toBeInTheDocument();
});

it.each(ROLES)('mở thẳng /xem-thu/$id thì dựng đúng nhãn "$label"', ({ id, label }) => {
  renderAt(`/xem-thu/${id}`);

  expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
});

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

it('nói rõ đây chỉ là chế độ xem thử, chưa kết nối hệ thống', () => {
  renderAt('/xem-thu/teacher');

  expect(screen.getByText(/chưa kết nối/i)).toBeInTheDocument();
});

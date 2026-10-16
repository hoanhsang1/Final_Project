import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

it('có đủ trường thông tin tổ chức', () => {
  renderPage();

  expect(screen.getByRole('heading', { name: 'Thông tin tổ chức' })).toBeInTheDocument();
  expect(screen.getByLabelText('Tên tổ chức')).toBeInTheDocument();
  expect(screen.getByLabelText('Loại tổ chức')).toBeInTheDocument();
  expect(screen.getByLabelText('Email liên hệ')).toBeInTheDocument();
  expect(screen.getByLabelText('Số điện thoại')).toBeInTheDocument();
});

it('có đủ trường tài khoản quản trị', () => {
  renderPage();

  expect(screen.getByRole('heading', { name: 'Tài khoản quản trị' })).toBeInTheDocument();
  expect(screen.getByLabelText('Tên đăng nhập')).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
  expect(screen.getByLabelText('Nhập lại mật khẩu')).toBeInTheDocument();
});

it('nêu rõ tổ chức sẽ ở trạng thái chờ duyệt', () => {
  renderPage();

  expect(screen.getByText(/chờ duyệt/i)).toBeInTheDocument();
});

it('bỏ trống rồi gửi thì hiện lỗi tại từng trường', async () => {
  renderPage();

  await userEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }));

  expect(await screen.findByText('Vui lòng nhập tên tổ chức')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng chọn loại tổ chức')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng nhập email liên hệ')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng nhập số điện thoại')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng nhập tên đăng nhập')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng nhập email')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
  expect(await screen.findByText('Vui lòng nhập lại mật khẩu')).toBeInTheDocument();
});

it('mật khẩu nhập lại khác thì báo lỗi, và không báo lỗi khi khớp', async () => {
  renderPage();

  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'MatKhau123');
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu'), 'KhacHan456');
  await userEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }));

  expect(await screen.findByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
});

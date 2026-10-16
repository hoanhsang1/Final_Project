import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthCard } from './AuthCard';
import type { AuthTab } from './types';

function renderCard(activeTab: AuthTab) {
  return render(
    <MemoryRouter>
      <AuthCard
        activeTab={activeTab}
        title="Đăng nhập để tiếp tục"
        subtitle="Dùng tài khoản đã được cấp"
      >
        <p>nội dung con của thẻ</p>
      </AuthCard>
    </MemoryRouter>,
  );
}

it('đánh dấu tab đang mở cho trình đọc màn hình', () => {
  renderCard('login');

  expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Đăng ký' })).not.toHaveAttribute('aria-current');
});

it('đổi dấu tab khi mở trang đăng ký', () => {
  renderCard('register');

  expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Đăng nhập' })).not.toHaveAttribute('aria-current');
});

it('tab trỏ tới đúng đường dẫn để nút Back của trình duyệt hoạt động', () => {
  renderCard('login');

  expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/dang-ky');
  expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/dang-nhap');
});

it('hiện tiêu đề, phụ đề và nội dung con', () => {
  renderCard('login');

  expect(screen.getByRole('heading', { name: 'Đăng nhập để tiếp tục' })).toBeInTheDocument();
  expect(screen.getByText('Dùng tài khoản đã được cấp')).toBeInTheDocument();
  expect(screen.getByText('nội dung con của thẻ')).toBeInTheDocument();
});

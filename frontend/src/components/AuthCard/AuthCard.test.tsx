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

it('không còn cặp tab Đăng nhập / Đăng ký ở đầu thẻ', () => {
  renderCard('login');

  // Đã thay bằng liên kết ở chân thẻ (xem `RegisterPage`), tránh trùng với dòng
  // "Chưa có tổ chức? Đăng ký tổ chức".
  expect(screen.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Đăng ký' })).not.toBeInTheDocument();
});

it('thẻ đăng ký rộng hơn thẻ đăng nhập để chứa form 2 cột', () => {
  const { unmount } = renderCard('register');
  expect(document.querySelector<HTMLElement>('.ant-card')?.style.maxWidth).toBe('720px');
  unmount();

  renderCard('login');
  expect(document.querySelector<HTMLElement>('.ant-card')?.style.maxWidth).toBe('520px');
});

it('luôn có lối liên hệ quản trị ở chân thẻ', () => {
  renderCard('login');

  expect(
    screen.getByText('Cần hỗ trợ đăng nhập? Liên hệ quản trị viên hệ thống.'),
  ).toBeInTheDocument();
});

it('hiện tiêu đề, phụ đề và nội dung con', () => {
  renderCard('login');

  expect(screen.getByRole('heading', { name: 'Đăng nhập để tiếp tục' })).toBeInTheDocument();
  expect(screen.getByText('Dùng tài khoản đã được cấp')).toBeInTheDocument();
  expect(screen.getByText('nội dung con của thẻ')).toBeInTheDocument();
});

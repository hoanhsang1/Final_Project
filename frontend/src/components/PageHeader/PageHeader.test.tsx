import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('render tiêu đề thành H1, kèm phụ đề và hành động', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Phòng ban"
          subtitle="Quản lý cơ cấu"
          extra={<button type="button">Tạo mới</button>}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Phòng ban' })).toBeInTheDocument();
    expect(screen.getByText('Quản lý cơ cấu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo mới' })).toBeInTheDocument();
  });

  it('breadcrumb: mục có href là liên kết, mục cuối là "đang ở đây"', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Nguyễn Văn A"
          breadcrumb={[{ title: 'Giáo viên', href: '/giao-vien' }, { title: 'Chi tiết' }]}
        />
      </MemoryRouter>,
    );

    // Mục giữa điều hướng được, mục cuối không phải liên kết trỏ về chính nó.
    expect(screen.getByRole('link', { name: 'Giáo viên' })).toHaveAttribute(
      'href',
      '/giao-vien',
    );
    expect(screen.queryByRole('link', { name: 'Chi tiết' })).not.toBeInTheDocument();
    expect(screen.getByText('Chi tiết')).toHaveAttribute('aria-current', 'page');
  });
});

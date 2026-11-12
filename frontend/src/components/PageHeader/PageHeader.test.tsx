import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('renders the page title as a level-1 heading and optional subtitle/actions', () => {
    render(
      <ConfigProvider>
        <MemoryRouter>
          <PageHeader
            title="Phòng ban"
            subtitle="Quản lý cơ cấu"
            extra={<button type="button">Tạo mới</button>}
          />
        </MemoryRouter>
      </ConfigProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Phòng ban' })).toBeInTheDocument();
    expect(screen.getByText('Quản lý cơ cấu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo mới' })).toBeInTheDocument();
  });
});

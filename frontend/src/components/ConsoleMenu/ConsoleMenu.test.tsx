import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';
import ConsoleMenu from './ConsoleMenu';

const items: ConsoleMenuItem[] = [
  { key: 'phong-ban', label: 'Phòng ban', path: '/to-chuc', exact: true },
  { key: 'chuc-vu', label: 'Chức vụ', path: '/to-chuc/chuc-vu', exact: true },
];

describe('ConsoleMenu', () => {
  it('renders nav with aria-label, links, and aria-current only on selected item', () => {
    render(
      <ConfigProvider>
        <MemoryRouter>
          <ConsoleMenu items={items} menuAriaLabel="Menu test" selectedKey="phong-ban" />
        </MemoryRouter>
      </ConfigProvider>,
    );

    expect(screen.getByRole('navigation', { name: 'Menu test' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Phòng ban' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Chức vụ' })).not.toHaveAttribute('aria-current');
  });
});

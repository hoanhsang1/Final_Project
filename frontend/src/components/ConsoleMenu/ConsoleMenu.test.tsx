import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';
import ConsoleMenu from './ConsoleMenu';

const items: ConsoleMenuItem[] = [
  { key: 'phong-ban', label: 'Phòng ban', path: '/to-chuc', exact: true },
  { key: 'chuc-vu', label: 'Chức vụ', path: '/to-chuc/chuc-vu', exact: true },
];

function renderMenu(selectedKey: string | null) {
  return render(
    <MemoryRouter>
      <ConsoleMenu items={items} menuAriaLabel="Menu test" selectedKey={selectedKey} />
    </MemoryRouter>,
  );
}

describe('ConsoleMenu', () => {
  it('render nav có aria-label, mỗi mục là một liên kết thật', () => {
    renderMenu('phong-ban');

    expect(screen.getByRole('navigation', { name: 'Menu test' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Phòng ban' })).toHaveAttribute('href', '/to-chuc');
    expect(screen.getByRole('link', { name: 'Chức vụ' })).toHaveAttribute(
      'href',
      '/to-chuc/chuc-vu',
    );
  });

  it('chỉ đánh dấu aria-current="page" cho mục đang chọn', () => {
    renderMenu('phong-ban');

    expect(screen.getByRole('link', { name: 'Phòng ban' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Chức vụ' })).not.toHaveAttribute('aria-current');
  });

  it('không đánh dấu mục nào khi selectedKey = null (màn chi tiết)', () => {
    renderMenu(null);

    expect(screen.getByRole('link', { name: 'Phòng ban' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Chức vụ' })).not.toHaveAttribute('aria-current');
  });
});

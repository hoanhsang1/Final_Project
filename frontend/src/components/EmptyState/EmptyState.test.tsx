import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('hiện câu rỗng và chỉ hiện hành động khi được truyền', () => {
    const onClick = vi.fn();
    const { rerender } = render(<EmptyState description="Chưa có lớp học nào." />);

    expect(screen.getByRole('heading', { level: 2, name: 'Chưa có lớp học nào.' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<EmptyState description="Chưa có lớp học nào." action={{ label: 'Tạo lớp', onClick }} />);
    expect(screen.getByRole('button', { name: 'Tạo lớp' })).toBeInTheDocument();
  });

  it('cho phép hạ cấp heading khi nằm trong một khối đã có H2', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        compact
        headingLevel={3}
        description="Chưa có lịch sử trạng thái."
        action={{ label: 'Tải lại', onClick }}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Chưa có lịch sử trạng thái.' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

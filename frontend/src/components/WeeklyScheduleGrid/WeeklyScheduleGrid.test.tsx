import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WeeklyScheduleGrid from './WeeklyScheduleGrid';
import type { ScheduleItem } from '../../features/schedule/types';

const base: ScheduleItem[] = [
  {
    id: 's1',
    classId: 'c1',
    className: '12A1',
    teacherId: 't1',
    teacherName: 'Võ Thị Vy',
    roomId: 'r1',
    roomCode: 'P201',
    subjectName: 'Java cơ bản',
    startTime: '2026-12-07T07:30:00',
    endTime: '2026-12-07T09:00:00',
    status: 'scheduled',
  },
];

describe('WeeklyScheduleGrid', () => {
  it('renders day headers and an accessible session button', () => {
    const onSelect = vi.fn();
    render(<WeeklyScheduleGrid items={base} emptyText="Trống" onSelect={onSelect} />);
    expect(screen.getByRole('columnheader', { name: 'T2' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /07:30–09:00, Java cơ bản, 12A1, Võ Thị Vy, P201, scheduled/,
      }),
    ).toBeInTheDocument();
  });

  it('renders a cancelled session as a muted, strike-through button', () => {
    render(<WeeklyScheduleGrid items={[{ ...base[0], status: 'cancelled' }]} emptyText="Trống" />);
    const block = screen.getByRole('button', { name: /cancelled/ });
    expect(block).toHaveClass('weekly-block--cancelled');
  });

  it('recognises cancelled status case-insensitively', () => {
    render(<WeeklyScheduleGrid items={[{ ...base[0], status: 'CANCELLED' }]} emptyText="Trống" />);
    expect(screen.getByRole('button', { name: /CANCELLED/ })).toHaveClass(
      'weekly-block--cancelled',
    );
  });

  it('moves to the next week', async () => {
    render(<WeeklyScheduleGrid items={base} emptyText="Trống" />);
    expect(screen.getByText(/Tuần 07\/12–13\/12\/2026/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tuần sau' }));
    expect(screen.getByText(/Tuần 14\/12–20\/12\/2026/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Java cơ bản/ })).not.toBeInTheDocument();
  });

  it('moves back to the previous week', async () => {
    render(<WeeklyScheduleGrid items={base} emptyText="Trống" />);
    await userEvent.click(screen.getByRole('button', { name: 'Tuần trước' }));
    expect(screen.getByText(/Tuần 30\/11–06\/12\/2026/)).toBeInTheDocument();
  });

  it('renders 14 hour labels from 07:00 through 20:00 inclusive', () => {
    const { container } = render(<WeeklyScheduleGrid items={base} emptyText="Trống" />);
    const labels = Array.from(container.querySelectorAll('.weekly-grid__hour-label')).map(
      (node) => node.textContent,
    );
    expect(labels).toHaveLength(14);
    expect(labels[0]).toBe('07:00');
    expect(labels[13]).toBe('20:00');
  });

  it('hides the teacher in the body when showTeacher is false but keeps it in the label', () => {
    render(<WeeklyScheduleGrid items={base} emptyText="Trống" showTeacher={false} />);
    const block = screen.getByRole('button', { name: /Võ Thị Vy/ });
    expect(block).not.toHaveTextContent('Võ Thị Vy');
  });

  it('only calls onSelect when a handler is provided', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<WeeklyScheduleGrid items={base} emptyText="Trống" />);
    const plainBlock = screen.getByRole('button', { name: /Java cơ bản/ });
    expect(plainBlock).toHaveAttribute('type', 'button');
    await userEvent.click(plainBlock);

    rerender(<WeeklyScheduleGrid items={base} emptyText="Trống" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Java cơ bản/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(base[0]);
  });

  it('reports sessions clipped outside the grid window', () => {
    const early: ScheduleItem = {
      ...base[0],
      startTime: '2026-12-07T06:00:00',
      endTime: '2026-12-07T07:30:00',
    };
    render(<WeeklyScheduleGrid items={[early]} emptyText="Trống" />);
    expect(screen.getByText('1 buổi ngoài khung giờ')).toBeInTheDocument();
  });

  it('renders the project empty state when there are no items', () => {
    render(<WeeklyScheduleGrid items={[]} emptyText="Trống" />);
    expect(screen.getByRole('heading', { name: 'Trống' })).toBeInTheDocument();
  });
});

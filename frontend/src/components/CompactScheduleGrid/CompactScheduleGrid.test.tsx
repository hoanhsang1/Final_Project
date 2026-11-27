import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CompactScheduleGrid from './CompactScheduleGrid';
import type { ScheduleItem } from '../../features/schedule/types';

const item = (over: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: 's1',
  classId: 'c1',
  className: '12A1',
  startTime: '2026-12-01T07:30:00',
  endTime: '2026-12-01T09:00:00',
  subjectName: 'Java cơ bản',
  status: 'scheduled',
  ...over,
});

const a = item({ id: 'a', startTime: '2026-12-01T07:30:00', endTime: '2026-12-01T09:00:00' });
const b = item({ id: 'b', startTime: '2026-12-01T09:00:00', endTime: '2026-12-01T10:30:00' });
const e = item({ id: 'e', startTime: '2026-12-01T19:00:00', endTime: '2026-12-01T20:30:00' });

describe('CompactScheduleGrid', () => {
  it('renders a 3×7 grid with the week label and the sessions', () => {
    render(<CompactScheduleGrid items={[a, b, e]} emptyText="rỗng" />);

    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getByRole('rowheader', { name: 'Sáng' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Chiều' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Tối' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /07:30–09:00/ })).toHaveLength(1);
    expect(screen.getByText('Tuần 30/11–06/12/2026')).toBeInTheDocument();
  });

  it('labels a session with its day, buổi, time, subject, class, teacher, room and status', () => {
    const maths = item({
      id: 'm',
      subjectName: 'Toán',
      className: '10A1',
      teacherName: 'Nguyễn Văn A',
      roomCode: 'P101',
      status: 'DRAFT',
    });
    render(<CompactScheduleGrid items={[maths]} emptyText="rỗng" />);

    // 2026-12-01 là thứ Ba → T3.
    expect(
      screen.getByRole('button', {
        name: 'T3 01/12, buổi Sáng, 07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT',
      }),
    ).toBeInTheDocument();
  });

  it('does not duplicate the class name when subjectName is missing', () => {
    const noSubject = item({ id: 'n', subjectName: null, className: '12A1' });
    render(<CompactScheduleGrid items={[noSubject]} emptyText="rỗng" />);

    const btn = screen.getByRole('button', {
      name: 'T3 01/12, buổi Sáng, 07:30–09:00, 12A1, —, —, scheduled',
    });
    expect(btn).toBeInTheDocument();
    expect(within(btn).getByText('12A1')).toBeInTheDocument();
    expect(btn).not.toHaveTextContent('12A1 · 12A1');
  });

  it('keeps two sessions of the same day and buổi as separate buttons', () => {
    render(<CompactScheduleGrid items={[a, b]} emptyText="rỗng" />);

    expect(screen.getByRole('button', { name: /07:30–09:00/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /09:00–10:30/ })).toBeInTheDocument();
  });

  it('renders a cancelled session with a ribbon and calls onSelect', async () => {
    const onSelect = vi.fn();
    const cancelled = item({
      status: 'cancelled',
      subjectName: 'Java cơ bản',
      className: '12A1',
      teacherName: 'Võ Thị Vy',
      roomCode: 'P201',
    });
    render(<CompactScheduleGrid items={[cancelled]} emptyText="rỗng" onSelect={onSelect} />);

    const btn = screen.getByRole('button', {
      name: /07:30–09:00, Java cơ bản, 12A1, Võ Thị Vy, P201, cancelled/,
    });
    expect(btn).toHaveClass('compact-session--cancelled');
    expect(within(btn).getByText('Đã hủy')).toBeInTheDocument();

    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(cancelled);
  });

  it('moves to the next week', async () => {
    render(<CompactScheduleGrid items={[a, b, e]} emptyText="rỗng" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tuần sau' }));
    expect(screen.getByText('Tuần 07/12–13/12/2026')).toBeInTheDocument();
  });

  it('moves back to the previous week', async () => {
    render(<CompactScheduleGrid items={[a, b, e]} emptyText="rỗng" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tuần trước' }));
    expect(screen.getByText('Tuần 23/11–29/11/2026')).toBeInTheDocument();
  });

  it('renders only the empty state when there are no items', () => {
    render(<CompactScheduleGrid items={[]} emptyText="rỗng" />);

    expect(screen.getByRole('heading', { name: 'rỗng' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

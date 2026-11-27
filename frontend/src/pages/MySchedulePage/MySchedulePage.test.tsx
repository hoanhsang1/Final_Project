import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleItem } from '../../features/schedule/types';
import { useAuthStore } from '../../stores/authStore';
import MySchedulePage from './MySchedulePage';

vi.mock('../../features/schedule/scheduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/schedule/scheduleApi')>();
  return { ...actual, fetchMySchedule: vi.fn() };
});

const { fetchMySchedule } = await import('../../features/schedule/scheduleApi');
const mockFetch = vi.mocked(fetchMySchedule);

const SESSION: ScheduleItem = {
  id: 's1',
  classId: 'c1',
  className: '10A1',
  teacherId: 't9',
  teacherName: 'Tôi',
  roomId: 'r1',
  roomCode: 'P101',
  subjectName: 'Toán',
  startTime: '2026-12-03T07:30:00',
  endTime: '2026-12-03T09:00:00',
  status: 'CONFIRMED',
  departmentId: 'd1',
};

function renderPage(
  permissions: string[] = ['schedule.self_view'],
  backendRoles: string[] = ['TEACHER'],
) {
  useAuthStore.setState({
    userId: 'u9',
    username: 'toi',
    isAuthenticated: true,
    role: null,
    backendRoles,
    permissions,
    mustChangePassword: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dao-tao/lich-cua-toi']}>
        <MySchedulePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    isAuthenticated: false,
    role: null,
    backendRoles: [],
    permissions: [],
    mustChangePassword: false,
  });
});

describe('MySchedulePage — 5 trạng thái', () => {
  it('loading: hiện trạng thái đang tải, chưa render bảng', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getAllByText('Đang tải…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('success: hiện buổi của mình, chỉ gọi /schedules/me qua API không có departmentId', async () => {
    mockFetch.mockResolvedValue([SESSION]);

    renderPage();

    const block = await screen.findByRole('button', {
      name: /07:30–09:00, Toán, 10A1, Tôi, P101, CONFIRMED/,
    });
    expect(block).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it('empty: không có buổi nào thì nêu việc cần làm', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Chưa có buổi học nào trong khoảng này.')).toBeInTheDocument();
  });

  it('error: hiện cảnh báo kèm nút "Thử lại", bấm thì gọi lại API', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce([SESSION]);

    renderPage();

    expect(await screen.findByText('Không tải được lịch cá nhân.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('button', { name: /10A1/ })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('forbidden: chỉ có schedule.view thì trang cá nhân không gọi API', async () => {
    renderPage(['schedule.view']);

    expect(
      await screen.findByText('Bạn không có quyền truy cập khu vực này.'),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('MySchedulePage — lọc theo khoảng ngày', () => {
  it('bấm Tìm thì gửi đúng from/to cho fetchMySchedule', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage();
    await screen.findByText('Chưa có buổi học nào trong khoảng này.');

    const from = screen.getByLabelText('Từ ngày');
    const to = screen.getByLabelText('Đến ngày');
    await userEvent.type(from, '2026-12-01');
    await userEvent.type(to, '2026-12-07');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith({
        from: new Date('2026-12-01T00:00:00').toISOString(),
        to: new Date('2026-12-07T23:59:59.999').toISOString(),
      });
    });
  });
});

describe('MySchedulePage — chế độ xem theo vai trò', () => {
  it('STUDENT thấy lịch gọn, không có công tắc', async () => {
    mockFetch.mockResolvedValue([SESSION]);

    renderPage(['schedule.self_view'], ['STUDENT']);

    expect(
      await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ }),
    ).toBeInTheDocument();
    // Khẳng định đúng lưới gọn chứ không phải lưới giờ.
    expect(screen.getByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Sáng' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lịch tuần' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3 buổi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Theo giờ' })).not.toBeInTheDocument();
  });

  it('nhân viên thấy công tắc, mặc định 3 buổi, bấm Theo giờ thì đổi lưới', async () => {
    mockFetch.mockResolvedValue([SESSION]);

    renderPage(['schedule.self_view'], []);

    expect(screen.getByRole('button', { name: '3 buổi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Sáng' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Theo giờ' }));

    expect(
      await screen.findByRole('button', {
        name: /07:30–09:00, Toán, 10A1, Tôi, P101, CONFIRMED/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Lịch tuần' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lịch tuần gọn' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theo giờ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(mockFetch).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it('bổ nhiệm TEACHER sau khi đã chọn Theo giờ thì giữ lưới giờ và ẩn công tắc', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(['schedule.self_view'], []);
    await userEvent.click(screen.getByRole('button', { name: 'Theo giờ' }));
    expect(screen.getByRole('region', { name: 'Lịch tuần' })).toBeInTheDocument();

    act(() => {
      useAuthStore.setState({ backendRoles: ['TEACHER'] });
    });

    expect(screen.getByRole('region', { name: 'Lịch tuần' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lịch tuần gọn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Chế độ xem lịch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Theo giờ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3 buổi' })).not.toBeInTheDocument();
  });

  it('mất vai trò TEACHER sau khi mount thì về lịch gọn và mặc định 3 buổi', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(['schedule.self_view'], ['TEACHER']);
    await screen.findByRole('region', { name: 'Lịch tuần' });

    act(() => {
      useAuthStore.setState({ backendRoles: [] });
    });

    expect(screen.getByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lịch tuần' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 buổi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Theo giờ' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('bấm ô trong lịch gọn trên trang self không mở dialog', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(['schedule.self_view'], []);
    const block = await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ });

    await userEvent.click(block);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

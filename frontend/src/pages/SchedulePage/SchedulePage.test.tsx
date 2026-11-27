import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoomSuggestion, ScheduleItem } from '../../features/schedule/types';
import { useAuthStore } from '../../stores/authStore';
import SchedulePage from './SchedulePage';

const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/schedule/scheduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/schedule/scheduleApi')>();
  return {
    ...actual,
    fetchSchedules: vi.fn(),
    fetchRoomSuggestions: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    cancelSession: vi.fn(),
    deleteSession: vi.fn(),
  };
});

const { cancelSession, createSchedule, deleteSession, fetchRoomSuggestions, fetchSchedules } =
  await import('../../features/schedule/scheduleApi');

const mockFetch = vi.mocked(fetchSchedules);
const mockSuggestions = vi.mocked(fetchRoomSuggestions);
const mockCreate = vi.mocked(createSchedule);
const mockCancel = vi.mocked(cancelSession);
const mockDelete = vi.mocked(deleteSession);

const SESSION: ScheduleItem = {
  id: 's1',
  classId: 'c1',
  className: '10A1',
  teacherId: 't1',
  teacherName: 'Nguyễn Văn A',
  roomId: 'r1',
  roomCode: 'P101',
  subjectName: 'Toán',
  startTime: '2026-12-01T07:30:00',
  endTime: '2026-12-01T09:00:00',
  status: 'DRAFT',
  departmentId: 'd1',
};

const ROOM: RoomSuggestion = {
  id: 'r9',
  code: 'P9',
  name: 'Phòng 9',
  capacity: 40,
  status: 'ACTIVE',
};

const FULL_PERMISSIONS = [
  'schedule.view',
  'schedule.create',
  'schedule.update',
  'schedule.cancel_session',
  'schedule.delete',
];

function renderPage(
  permissions: string[] = FULL_PERMISSIONS,
  departmentId = 'd1',
  backendRoles: string[] = ['TEACHER'],
) {
  useAuthStore.setState({
    userId: 'u1',
    username: 'giao.vu',
    isAuthenticated: true,
    role: null,
    backendRoles,
    permissions,
    mustChangePassword: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[`/dao-tao/lich?departmentId=${encodeURIComponent(departmentId)}`]}
      >
        <SchedulePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateQueriesSpy };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockSuggestions.mockReset();
  mockCreate.mockReset();
  mockCancel.mockReset();
  mockDelete.mockReset();
  notifySpies.success.mockReset();
  notifySpies.error.mockReset();
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

describe('SchedulePage — 5 trạng thái', () => {
  it('loading: hiện trạng thái đang tải, chưa render bảng', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getAllByText('Đang tải…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('success: hiện buổi học dưới dạng khối lưới với nhãn đầy đủ', async () => {
    mockFetch.mockResolvedValue([SESSION]);

    renderPage();

    const block = await screen.findByRole('button', {
      name: /07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT/,
    });
    expect(block).toBeInTheDocument();
    // P4 bị BLOCKED: không được render nút tự xếp lịch.
    expect(screen.queryByRole('button', { name: 'Tự xếp lịch' })).not.toBeInTheDocument();
  });

  it('empty: danh sách rỗng thì nêu việc cần làm', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Chưa có buổi học nào.')).toBeInTheDocument();
  });

  it('error: hiện cảnh báo và nút "Thử lại", bấm thì gọi lại API', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    mockFetch.mockResolvedValueOnce([SESSION]);

    renderPage();

    expect(await screen.findByText('Không tải được lịch đào tạo.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('button', { name: /10A1/ })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('forbidden: không có schedule.view thì không gọi API và hiện lời nhắc', async () => {
    renderPage([]);

    expect(
      await screen.findByText('Bạn không có quyền truy cập khu vực này.'),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('SchedulePage — lọc tuần/lớp và thao tác', () => {
  it('gõ mã lớp rồi bấm Tìm thì gửi classId cho fetchSchedules', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage();
    await screen.findByText('Chưa có buổi học nào.');

    await userEvent.type(screen.getByRole('textbox', { name: 'Mã lớp' }), 'c2');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith({
        departmentId: 'd1',
        from: undefined,
        to: undefined,
        classId: 'c2',
      }),
    );
  });

  it('chỉ schedule.view thì ẩn nút tạo và cột thao tác', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(['schedule.view']);

    await screen.findByRole('button', { name: /10A1/ });
    expect(screen.queryByRole('button', { name: 'Thêm buổi học' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Thao tác' })).not.toBeInTheDocument();
  });

  it('only schedule.view: block is not editable', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(['schedule.view']);
    const block = await screen.findByRole('button', { name: /10A1/ });
    await userEvent.click(block);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancel/delete from the edit dialog', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    mockCancel.mockResolvedValue({ ...SESSION, status: 'CANCELLED' });
    mockDelete.mockResolvedValue(undefined);
    renderPage(['schedule.view', 'schedule.update', 'schedule.cancel_session', 'schedule.delete']);
    await userEvent.click(await screen.findByRole('button', { name: /10A1/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỳ buổi' }));
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('d1', 's1'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá buổi' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('d1', 's1'));
  });

  it('có quyền huỳ/xoá nhưng không có schedule.update thì vẫn mở được dialog chi tiết', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    mockCancel.mockResolvedValue({ ...SESSION, status: 'CANCELLED' });

    renderPage(['schedule.view', 'schedule.cancel_session', 'schedule.delete']);
    await userEvent.click(await screen.findByRole('button', { name: /10A1/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Chi tiết buổi học')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỳ buổi' }));
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('d1', 's1'));
    expect(within(dialog).queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument();
  });
});

describe('SchedulePage — room picker và lỗi trùng lịch', () => {
  async function fillForm(dialog: HTMLElement) {
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Mã lớp' }), 'c2');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Bắt đầu (ISO)' }),
      '2026-12-02T07:30:00',
    );
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Kết thúc (ISO)' }),
      '2026-12-02T09:00:00',
    );
  }

  it('chọn phòng gợi ý rồi tạo buổi học: payload có roomId, suggestion không nhận classId', async () => {
    mockFetch.mockResolvedValue([]);
    mockSuggestions.mockResolvedValue([ROOM]);
    mockCreate.mockResolvedValue({ ...SESSION, id: 's2' });

    const { invalidateQueriesSpy } = renderPage(['schedule.view', 'schedule.create']);
    await screen.findByText('Chưa có buổi học nào.');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm buổi học' }));

    const dialog = screen.getByRole('dialog');
    await fillForm(dialog);

    await waitFor(() =>
      expect(mockSuggestions).toHaveBeenCalledWith({
        departmentId: 'd1',
        startTime: '2026-12-02T07:30:00',
        endTime: '2026-12-02T09:00:00',
      }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'P9 — Phòng 9 (40)' }));
    expect(within(dialog).getByRole('textbox', { name: 'Phòng học (mã)' })).toHaveValue('r9');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo buổi học' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({
        classId: 'c2',
        roomId: 'r9',
        startTime: '2026-12-02T07:30:00',
        endTime: '2026-12-02T09:00:00',
      }),
    );
    expect(notifySpies.success).toHaveBeenCalledWith('Đã tạo buổi học.');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['schedules'] });
  });

  it('BE trả TEACHER_SCHEDULE_CONFLICT (chuỗi) thì hiện lỗi trong form, không báo thành công', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    mockSuggestions.mockResolvedValue([]);
    mockCreate.mockRejectedValueOnce({
      response: { status: 409, data: { code: 'TEACHER_SCHEDULE_CONFLICT' } },
    });

    renderPage(['schedule.view', 'schedule.create']);
    await screen.findByRole('button', { name: /10A1/ });
    await userEvent.click(screen.getByRole('button', { name: 'Thêm buổi học' }));

    const dialog = screen.getByRole('dialog');
    await fillForm(dialog);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo buổi học' }));

    const message = 'Giáo viên đã có buổi học trong khung giờ này.';
    expect((await within(dialog).findAllByText(message)).length).toBeGreaterThan(0);
    expect(notifySpies.success).not.toHaveBeenCalled();
  });

  it('chỉ có schedule.update thì không gọi room-suggestions (cần schedule.create)', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    mockSuggestions.mockResolvedValue([]);

    renderPage(['schedule.view', 'schedule.update']);
    const block = await screen.findByRole('button', { name: /10A1/ });
    await userEvent.click(block);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: 'Bắt đầu (ISO)' })).toHaveValue(
      '2026-12-01T07:30:00',
    );
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('form chưa hợp lệ thì không gọi API', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage(['schedule.view', 'schedule.create']);
    await screen.findByText('Chưa có buổi học nào.');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm buổi học' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo buổi học' }));

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('SchedulePage — chế độ xem lịch gọn 3 buổi', () => {
  it('nhân viên mở trang mặc định là lịch gọn và công tắc 3 buổi được chọn', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(FULL_PERMISSIONS, 'd1', []);
    expect(await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ })).toBeInTheDocument();
    // Regex trên khớp cả nhãn lưới giờ, nên khẳng định thêm cấu trúc lịch gọn.
    expect(screen.getByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Sáng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 buổi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Theo giờ' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('bấm Theo giờ thì hiện lưới giờ, filter vẫn gửi như cũ', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(FULL_PERMISSIONS, 'd1', []);
    await userEvent.click(await screen.findByRole('button', { name: 'Theo giờ' }));
    expect(await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT/ })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Mã lớp' }), 'c2');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));
    await waitFor(() => expect(mockFetch).toHaveBeenLastCalledWith({
      departmentId: 'd1', from: undefined, to: undefined, classId: 'c2',
    }));
  });

  it('TEACHER không thấy công tắc và luôn dùng lưới giờ', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(FULL_PERMISSIONS, 'd1', ['TEACHER']);
    await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT/ });
    expect(screen.queryByRole('button', { name: '3 buổi' })).not.toBeInTheDocument();
  });

  it('bổ nhiệm TEACHER sau khi đã chọn Theo giờ thì giữ lưới giờ và ẩn công tắc', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(FULL_PERMISSIONS, 'd1', []);
    await userEvent.click(await screen.findByRole('button', { name: 'Theo giờ' }));
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
    renderPage(FULL_PERMISSIONS, 'd1', ['TEACHER']);
    await screen.findByRole('region', { name: 'Lịch tuần' });

    act(() => {
      useAuthStore.setState({ backendRoles: [] });
    });

    expect(screen.getByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lịch tuần' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 buổi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Theo giờ' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('STUDENT trên trang quản lý thấy lịch gọn, không có công tắc', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(FULL_PERMISSIONS, 'd1', ['STUDENT']);

    expect(await screen.findByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lịch tuần' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Chế độ xem lịch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3 buổi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Theo giờ' })).not.toBeInTheDocument();
  });

  it('click ô trong lịch gọn vẫn mở dialog sửa', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(FULL_PERMISSIONS, 'd1', []);
    const block = await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ });
    expect(screen.getByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Sáng' })).toBeInTheDocument();
    await userEvent.click(block);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('chỉ schedule.view: ô lịch gọn không mở dialog', async () => {
    mockFetch.mockResolvedValue([SESSION]);
    renderPage(['schedule.view'], 'd1', []);
    const block = await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ });
    expect(screen.getByRole('region', { name: 'Lịch tuần gọn' })).toBeInTheDocument();
    await userEvent.click(block);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('SchedulePage — liên kết giữ departmentId', () => {
  it('link Buổi bị ảnh hưởng nối departmentId đã encode', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderPage(FULL_PERMISSIONS, 'd1 x');

    expect(screen.getByRole('link', { name: 'Buổi bị ảnh hưởng' })).toHaveAttribute(
      'href',
      '/dao-tao/lich/buoi-bi-anh-huong?departmentId=d1%20x',
    );
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Equipment, Room } from '../../features/facility/types';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';
import RoomsPage from './RoomsPage';

const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/facility/facilityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/facility/facilityApi')>();
  return {
    ...actual,
    fetchRooms: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
    fetchEquipment: vi.fn(),
    createEquipment: vi.fn(),
    updateEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
  };
});

vi.mock('../../features/schedule/scheduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/schedule/scheduleApi')>();
  return { ...actual, fetchRoomSuggestions: vi.fn() };
});

const {
  createEquipment,
  createRoom,
  deleteRoom,
  fetchEquipment,
  fetchRooms,
  updateRoom,
} = await import('../../features/facility/facilityApi');
const { fetchRoomSuggestions, ScheduleApiError } = await import(
  '../../features/schedule/scheduleApi'
);

const mockFetchRooms = vi.mocked(fetchRooms);
const mockFetchEquipment = vi.mocked(fetchEquipment);
const mockCreateRoom = vi.mocked(createRoom);
const mockUpdateRoom = vi.mocked(updateRoom);
const mockDeleteRoom = vi.mocked(deleteRoom);
const mockCreateEquipment = vi.mocked(createEquipment);
const mockSuggestions = vi.mocked(fetchRoomSuggestions);

const ROOM: Room = {
  id: 'r1',
  code: 'P101',
  name: 'Phòng 101',
  building: null,
  floor: null,
  capacity: 40,
  roomType: 'classroom',
  status: 'active',
};

const EQUIPMENT: Equipment = {
  id: 'e1',
  assetCode: 'TS-001',
  name: 'Máy chiếu',
  equipmentType: null,
  roomId: 'r1',
  roomName: 'Phòng 101',
  status: 'in_use',
  purchaseDate: null,
};

const FULL_PERMISSIONS = [
  'facility.room.view',
  'facility.room.create',
  'facility.room.update',
  'facility.room.delete',
  'facility.equipment.view',
  'facility.equipment.create',
];
const SUGGEST_PERMISSIONS = [...FULL_PERMISSIONS, 'schedule.create'];

function renderPage(
  permissions: string[] = FULL_PERMISSIONS,
  backendRoles: string[] = [],
  departmentId = 'd1',
) {
  useAuthStore.setState({
    userId: 'u1',
    username: 'owner',
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
        initialEntries={[
          `/to-chuc/co-so-vat-chat?departmentId=${encodeURIComponent(departmentId)}`,
        ]}
      >
        <RoomsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateQueriesSpy };
}

beforeEach(() => {
  mockFetchRooms.mockReset();
  mockFetchEquipment.mockReset();
  mockCreateRoom.mockReset();
  mockUpdateRoom.mockReset();
  mockDeleteRoom.mockReset();
  mockCreateEquipment.mockReset();
  mockSuggestions.mockReset();
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

describe('RoomsPage — trạng thái danh sách', () => {
  it('loading: hiện trạng thái đang tải, chưa render bảng', () => {
    mockFetchRooms.mockReturnValue(new Promise(() => {}));
    mockFetchEquipment.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getAllByText('Đang tải…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('success: hiện phòng kèm loại phòng/trạng thái và thiết bị', async () => {
    mockFetchRooms.mockResolvedValue([ROOM]);
    mockFetchEquipment.mockResolvedValue([EQUIPMENT]);

    renderPage();

    const roomRow = await screen.findByRole('row', { name: /P101/ });
    expect(within(roomRow).getByText('classroom')).toBeInTheDocument();
    expect(within(roomRow).getByText('active')).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /TS-001/ }),
    ).toBeInTheDocument();
    expect(mockFetchRooms).toHaveBeenCalledWith('d1');
    expect(mockFetchEquipment).toHaveBeenCalledWith('d1');
  });

  it('empty: danh sách rỗng thì nêu việc cần làm', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Chưa có phòng nào.')).toBeInTheDocument();
    expect(await screen.findByText('Chưa có thiết bị nào.')).toBeInTheDocument();
  });

  it('error: hiện cảnh báo và nút Thử lại', async () => {
    mockFetchRooms.mockRejectedValueOnce(new Error('network'));
    mockFetchRooms.mockResolvedValueOnce([ROOM]);
    mockFetchEquipment.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Không tải được danh sách phòng.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('row', { name: /P101/ })).toBeInTheDocument();
    expect(mockFetchRooms).toHaveBeenCalledTimes(2);
  });

  it('forbidden: không có quyền facility.* thì không gọi API', async () => {
    renderPage([]);

    expect(
      await screen.findByText('Bạn không có quyền truy cập khu vực này.'),
    ).toBeInTheDocument();
    expect(mockFetchRooms).not.toHaveBeenCalled();
    expect(mockFetchEquipment).not.toHaveBeenCalled();
  });

  it('FACILITY_STAFF + FACILITY_READ xem được phòng/thiết bị nhưng chỉ ở mức đọc', async () => {
    mockFetchRooms.mockResolvedValue([ROOM]);
    mockFetchEquipment.mockResolvedValue([EQUIPMENT]);

    renderPage(['FACILITY_READ'], ['FACILITY_STAFF'], 'd1');

    expect(screen.getByRole('textbox', { name: 'Phòng ban (mã)' })).toBeInTheDocument();
    const roomRow = await screen.findByRole('row', { name: /P101/ });
    expect(within(roomRow).getByText('classroom')).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /TS-001/ })).toBeInTheDocument();
    expect(screen.queryByText(MSG_S4.NO_PERMISSION)).toBeNull();
    expect(mockFetchRooms).toHaveBeenCalledWith('d1');
    expect(mockFetchEquipment).toHaveBeenCalledWith('d1');
    expect(screen.queryByRole('button', { name: 'Thêm phòng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm thiết bị' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Thao tác' })).not.toBeInTheDocument();
  });
});

describe('RoomsPage — CRUD phòng/thiết bị', () => {
  it('tạo phòng gửi roomType computer_room và status active đúng contract', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);
    mockCreateRoom.mockResolvedValue({ ...ROOM, id: 'r2' });
    const { invalidateQueriesSpy } = renderPage();
    await screen.findByText('Chưa có phòng nào.');

    await userEvent.click(screen.getByRole('button', { name: 'Thêm phòng' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Mã phòng' }), 'LAB1');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên phòng' }), 'Phòng Lab 1');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Sức chứa' }), '30');
    // Form có giá trị mặc định classroom/active — phải xoá rồi gõ giá trị mới.
    const roomTypeInput = within(dialog).getByRole('textbox', { name: 'Loại phòng' });
    await userEvent.clear(roomTypeInput);
    await userEvent.type(roomTypeInput, 'computer_room');
    const statusInput = within(dialog).getByRole('textbox', { name: 'Trạng thái phòng' });
    await userEvent.clear(statusInput);
    await userEvent.type(statusInput, 'active');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo phòng' }));

    await waitFor(() =>
      expect(mockCreateRoom).toHaveBeenCalledWith('d1', {
        code: 'LAB1',
        name: 'Phòng Lab 1',
        building: null,
        floor: null,
        capacity: 30,
        roomType: 'computer_room',
        status: 'active',
      }),
    );
    expect(notifySpies.success).toHaveBeenCalledWith('Đã tạo phòng.');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['facility-rooms'] });
  });

  it('sửa phòng gọi updateRoom với roomId từ dòng được chọn', async () => {
    mockFetchRooms.mockResolvedValue([ROOM]);
    mockFetchEquipment.mockResolvedValue([]);
    mockUpdateRoom.mockResolvedValue(ROOM);

    renderPage();
    const row = await screen.findByRole('row', { name: /P101/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Sửa phòng' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: 'Mã phòng' })).toHaveValue('P101');
    await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Tầng' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tầng' }), '2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu phòng' }));

    await waitFor(() =>
      expect(mockUpdateRoom).toHaveBeenCalledWith('d1', 'r1', {
        code: 'P101',
        name: 'Phòng 101',
        building: null,
        floor: '2',
        capacity: 40,
        roomType: 'classroom',
        status: 'active',
      }),
    );
  });

  it('xoá phòng bị BE trả ROOM_IN_USE thì hiện thông báo, không báo thành công', async () => {
    mockFetchRooms.mockResolvedValue([ROOM]);
    mockFetchEquipment.mockResolvedValue([]);
    mockDeleteRoom.mockRejectedValueOnce({
      response: { status: 409, data: { code: 'ROOM_IN_USE' } },
    });

    renderPage();
    const row = await screen.findByRole('row', { name: /P101/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Xoá phòng' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));

    expect(
      await screen.findByText('Không thể xoá phòng vì vẫn còn thiết bị đang hoạt động trong phòng.'),
    ).toBeInTheDocument();
    expect(notifySpies.success).not.toHaveBeenCalled();
  });

  it('tạo thiết bị gửi đúng assetCode/roomId/status', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);
    mockCreateEquipment.mockResolvedValue(EQUIPMENT);

    renderPage();
    await screen.findByText('Chưa có thiết bị nào.');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm thiết bị' }));

    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Mã tài sản' }), 'TS-002');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên thiết bị' }), 'Máy tính');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Phòng (mã)' }), 'r9');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo thiết bị' }));

    await waitFor(() =>
      expect(mockCreateEquipment).toHaveBeenCalledWith('d1', {
        assetCode: 'TS-002',
        name: 'Máy tính',
        equipmentType: null,
        roomId: 'r9',
        status: 'in_use',
        purchaseDate: null,
      }),
    );
  });

  it('chỉ có facility.room.view thì ẩn nút tạo/cột thao tác', async () => {
    mockFetchRooms.mockResolvedValue([ROOM]);
    mockFetchEquipment.mockResolvedValue([]);

    renderPage(['facility.room.view']);

    await screen.findByRole('row', { name: /P101/ });
    expect(screen.queryByRole('button', { name: 'Thêm phòng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm thiết bị' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Thao tác' })).not.toBeInTheDocument();
  });
});

describe('RoomsPage — room picker', () => {
  it('lấy gợi ý theo khung giờ, không gửi classId/roomType và không tự lọc theo loại phòng', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);
    mockSuggestions.mockResolvedValue([
      { id: 'r9', code: 'P9', name: 'Phòng 9', capacity: 40, status: 'active' },
      { id: 'lab1', code: 'LAB1', name: 'Lab 1', capacity: 30, roomType: 'computer_room' },
    ]);

    renderPage(SUGGEST_PERMISSIONS);
    await screen.findByText('Chưa có phòng nào.');
    await userEvent.type(screen.getByRole('textbox', { name: 'Bắt đầu (ISO)' }), '2026-12-01T07:30:00');
    await userEvent.type(screen.getByRole('textbox', { name: 'Kết thúc (ISO)' }), '2026-12-01T09:00:00');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm phòng' }));

    await waitFor(() =>
      expect(mockSuggestions).toHaveBeenCalledWith({
        departmentId: 'd1',
        startTime: '2026-12-01T07:30:00',
        endTime: '2026-12-01T09:00:00',
      }),
    );
    expect(mockSuggestions.mock.calls[0][0]).not.toHaveProperty('classId');
    expect(mockSuggestions.mock.calls[0][0]).not.toHaveProperty('roomType');

    const group = await screen.findByRole('group', { name: 'Phòng gợi ý' });
    expect(within(group).getByRole('button', { name: 'P9 — Phòng 9 (40)' })).toBeInTheDocument();
    // Solver chưa nối roomType: FE phải hiển thị mọi phòng BE trả về.
    expect(within(group).getByRole('button', { name: 'LAB1 — Lab 1 (30)' })).toBeInTheDocument();
  });

  it('chưa nhập khung giờ thì không gọi room-suggestions', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);

    renderPage(SUGGEST_PERMISSIONS);
    await screen.findByText('Chưa có phòng nào.');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm phòng' }));

    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('chỉ có quyền facility.* thì KHÔNG gọi room-suggestions (thiếu schedule.create)', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);

    renderPage();
    await screen.findByText('Chưa có phòng nào.');
    await userEvent.type(screen.getByRole('textbox', { name: 'Bắt đầu (ISO)' }), '2026-12-01T07:30:00');
    await userEvent.type(screen.getByRole('textbox', { name: 'Kết thúc (ISO)' }), '2026-12-01T09:00:00');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm phòng' }));

    expect(mockFetchRooms).toHaveBeenCalledWith('d1');
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('nhận cả mã quyền viết hoa SCHEDULE_CREATE (alias) cho room-suggestions', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);
    mockSuggestions.mockResolvedValue([]);

    renderPage([...FULL_PERMISSIONS, 'SCHEDULE_CREATE']);
    await screen.findByText('Chưa có phòng nào.');
    await userEvent.type(screen.getByRole('textbox', { name: 'Bắt đầu (ISO)' }), '2026-12-01T07:30:00');
    await userEvent.type(screen.getByRole('textbox', { name: 'Kết thúc (ISO)' }), '2026-12-01T09:00:00');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm phòng' }));

    await waitFor(() => expect(mockSuggestions).toHaveBeenCalledTimes(1));
  });

  it('lỗi ScheduleApiError 403 ở picker dịch bằng scheduleErrorMessage, không phải lỗi mạng', async () => {
    mockFetchRooms.mockResolvedValue([]);
    mockFetchEquipment.mockResolvedValue([]);
    mockSuggestions.mockRejectedValueOnce(
      new ScheduleApiError('Bạn không có quyền thực hiện thao tác này.', { status: 403 }),
    );

    renderPage(SUGGEST_PERMISSIONS);
    await screen.findByText('Chưa có phòng nào.');
    await userEvent.type(screen.getByRole('textbox', { name: 'Bắt đầu (ISO)' }), '2026-12-01T07:30:00');
    await userEvent.type(screen.getByRole('textbox', { name: 'Kết thúc (ISO)' }), '2026-12-01T09:00:00');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm phòng' }));

    expect(
      await screen.findByText('Bạn không có quyền thực hiện thao tác này.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.'),
    ).not.toBeInTheDocument();
  });
});

describe('RoomsPage — liên kết giữ departmentId', () => {
  it('link Sự cố thiết bị nối departmentId đã encode', () => {
    renderPage([], [], 'd1 x');

    expect(screen.getByRole('link', { name: 'Sự cố thiết bị' })).toHaveAttribute(
      'href',
      '/co-so-vat-chat/su-co?departmentId=d1%20x',
    );
  });
});

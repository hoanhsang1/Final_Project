import { isAxiosError } from 'axios';
import { apiClient, unwrapList } from '../../lib/api';
import { MSG_OPS } from './operationsMessages';
import type {
  EquipmentItem,
  EquipmentPayload,
  IssueItem,
  IssuePayload,
  RoomItem,
  RoomPayload,
  RoomSuggestion,
  ScheduleItem,
  SchedulePayload,
} from './types';

/** Lỗi Phần 7 đã chuẩn hoá: giữ `status` và mã lỗi BE để UI dịch đúng câu. */
export class OperationsApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(status: number | null, code: string | null, message: string) {
    super(message);
    this.name = 'OperationsApiError';
    this.status = status;
    this.code = code;
  }
}

function extractError(error: unknown): { status: number | null; code: string | null; message?: string } {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const data = error.response?.data as { code?: string; message?: string } | undefined;
    return { status, code: data?.code ?? null, message: data?.message };
  }
  if (error instanceof OperationsApiError) {
    return { status: error.status, code: error.code, message: error.message };
  }
  return { status: null, code: null };
}

const CODE_MESSAGES: Record<string, string> = {
  MODULE_NOT_ENABLED: MSG_OPS.MODULE_DISABLED,
  IDENTITY_UNAVAILABLE: 'Không kiểm tra được module của tổ chức, vui lòng thử lại sau.',
  PEOPLE_UNAVAILABLE: 'Không lấy được thông tin lớp học, vui lòng thử lại sau.',
  FACILITY_UNAVAILABLE: 'Không lấy được thông tin phòng học, vui lòng thử lại sau.',

  CLASS_NOT_FOUND: 'Không tìm thấy lớp học.',
  CLASS_NOT_SCHEDULABLE: 'Lớp đã kết thúc hoặc đã hủy, không thể xếp lịch.',
  TEACHER_NOT_ASSIGNED: 'Giáo viên không khớp với lớp hoặc lớp chưa có giáo viên.',
  INVALID_TIME_RANGE: 'Thời gian kết thúc phải sau thời gian bắt đầu.',
  SCHEDULE_NOT_FOUND: 'Không tìm thấy buổi học.',
  TEACHER_SCHEDULE_CONFLICT: 'Giáo viên đã có buổi học khác trong khung giờ này.',
  ROOM_SCHEDULE_CONFLICT: 'Phòng đã được xếp cho buổi học khác trong khung giờ này.',
  CLASS_SCHEDULE_CONFLICT: 'Lớp đã có buổi học khác trong khung giờ này.',
  ROOM_NOT_AVAILABLE:
    'Phòng không khả dụng: đang bảo trì/đóng, có thiết bị hỏng hoặc sức chứa không đủ.',

  ROOM_NOT_FOUND: 'Không tìm thấy phòng.',
  ROOM_IN_USE: 'Phòng còn thiết bị đang dùng, không thể xóa.',
  EQUIPMENT_NOT_FOUND: 'Không tìm thấy thiết bị.',
  ISSUE_NOT_FOUND: 'Không tìm thấy sự cố.',
  ISSUE_ALREADY_RESOLVED: 'Sự cố này đã được xử lý trước đó.',
  INVALID_ROOM_TYPE: 'Loại phòng không hợp lệ.',
};

function viMessage(info: { status: number | null; code: string | null; message?: string }): string {
  const { status, code, message } = info;
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (status === 400) return message?.trim() || MSG_OPS.INTERNAL_ERROR;
  if (status === null) return MSG_OPS.NETWORK_ERROR;
  if (status === 401) return MSG_OPS.SESSION_EXPIRED;
  if (status === 403) return MSG_OPS.FORBIDDEN;
  if (status === 404) return MSG_OPS.NOT_FOUND;
  if (status === 409) return MSG_OPS.DATA_CHANGED;
  if (status === 503) return 'Dịch vụ tạm thời không sẵn sàng, vui lòng thử lại sau.';
  return MSG_OPS.INTERNAL_ERROR;
}

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    const info = extractError(error);
    throw new OperationsApiError(info.status, info.code, viMessage(info));
  }
}

/** Bọc lời gọi trả danh sách — mọi shape lạ đều thành mảng. */
function requestList<T>(fn: () => Promise<{ data: unknown }>): Promise<T[]> {
  return request(fn).then((raw) => unwrapList<T>(raw));
}

/** Câu lỗi hiển thị cho người dùng cuối. */
export function operationsErrorMessage(error: unknown): string {
  if (error instanceof OperationsApiError) return error.message;
  return viMessage(extractError(error));
}

export function isModuleDisabledError(error: unknown): boolean {
  return error instanceof OperationsApiError && error.code === 'MODULE_NOT_ENABLED';
}

// ------------------------------------------------------------------ schedules

export function fetchSchedules(
  departmentId: string,
  params: { from?: string; to?: string; classId?: string } = {},
): Promise<ScheduleItem[]> {
  return requestList<ScheduleItem>(() =>
    apiClient.get(`/api/departments/${departmentId}/schedules`, { params }),
  );
}

export function createSchedule(departmentId: string, payload: SchedulePayload): Promise<ScheduleItem> {
  return request(() => apiClient.post<ScheduleItem>(`/api/departments/${departmentId}/schedules`, payload));
}

export function updateSchedule(
  departmentId: string,
  sessionId: string,
  payload: SchedulePayload,
): Promise<ScheduleItem> {
  return request(() =>
    apiClient.put<ScheduleItem>(`/api/departments/${departmentId}/schedules/${sessionId}`, payload),
  );
}

export function cancelSchedule(departmentId: string, sessionId: string): Promise<ScheduleItem> {
  return request(() =>
    apiClient.post<ScheduleItem>(`/api/departments/${departmentId}/schedules/${sessionId}/cancel`),
  );
}

export function deleteSchedule(departmentId: string, sessionId: string): Promise<void> {
  return request(() => apiClient.delete<void>(`/api/departments/${departmentId}/schedules/${sessionId}`));
}

export function fetchRoomSuggestions(
  departmentId: string,
  startTime: string,
  endTime: string,
): Promise<RoomSuggestion[]> {
  return requestList<RoomSuggestion>(() =>
    apiClient.get(`/api/departments/${departmentId}/schedules/room-suggestions`, {
      params: { startTime, endTime },
    }),
  );
}

export function fetchMySchedule(params: { from?: string; to?: string } = {}): Promise<ScheduleItem[]> {
  return requestList<ScheduleItem>(() => apiClient.get('/api/schedules/me', { params }));
}

// ------------------------------------------------------------------- facility

export function fetchRooms(departmentId: string): Promise<RoomItem[]> {
  return requestList<RoomItem>(() =>
    apiClient.get(`/api/departments/${departmentId}/facilities/rooms`),
  );
}

export function createRoom(departmentId: string, payload: RoomPayload): Promise<RoomItem> {
  return request(() =>
    apiClient.post<RoomItem>(`/api/departments/${departmentId}/facilities/rooms`, payload),
  );
}

export function updateRoom(departmentId: string, roomId: string, payload: RoomPayload): Promise<RoomItem> {
  return request(() =>
    apiClient.put<RoomItem>(`/api/departments/${departmentId}/facilities/rooms/${roomId}`, payload),
  );
}

export function deleteRoom(departmentId: string, roomId: string): Promise<void> {
  return request(() =>
    apiClient.delete<void>(`/api/departments/${departmentId}/facilities/rooms/${roomId}`),
  );
}

export function fetchEquipment(departmentId: string): Promise<EquipmentItem[]> {
  return requestList<EquipmentItem>(() =>
    apiClient.get(`/api/departments/${departmentId}/facilities/equipment`),
  );
}

export function createEquipment(departmentId: string, payload: EquipmentPayload): Promise<EquipmentItem> {
  return request(() =>
    apiClient.post<EquipmentItem>(`/api/departments/${departmentId}/facilities/equipment`, payload),
  );
}

export function updateEquipment(
  departmentId: string,
  equipmentId: string,
  payload: EquipmentPayload,
): Promise<EquipmentItem> {
  return request(() =>
    apiClient.put<EquipmentItem>(
      `/api/departments/${departmentId}/facilities/equipment/${equipmentId}`,
      payload,
    ),
  );
}

export function deleteEquipment(departmentId: string, equipmentId: string): Promise<void> {
  return request(() =>
    apiClient.delete<void>(`/api/departments/${departmentId}/facilities/equipment/${equipmentId}`),
  );
}

export function fetchIssues(departmentId: string, status?: string): Promise<IssueItem[]> {
  return requestList<IssueItem>(() =>
    apiClient.get(`/api/departments/${departmentId}/facilities/issues`, {
      params: status ? { status } : undefined,
    }),
  );
}

export function reportIssue(departmentId: string, payload: IssuePayload): Promise<IssueItem> {
  return request(() =>
    apiClient.post<IssueItem>(`/api/departments/${departmentId}/facilities/issues`, payload),
  );
}

export function resolveIssue(departmentId: string, issueId: string): Promise<IssueItem> {
  return request(() =>
    apiClient.post<IssueItem>(`/api/departments/${departmentId}/facilities/issues/${issueId}/resolve`),
  );
}

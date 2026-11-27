import { apiClient } from '../../lib/api';
import { getApiCode } from '../platform/errorCodes';
import { MSG_SCHEDULE, SCHEDULE_ERROR_MESSAGES } from './scheduleMessages';
import type {
  RoomSuggestion,
  ScheduleItem,
  SchedulePayload,
  SessionImpact,
} from './types';

/** Lỗi Schedule đã chuẩn hoá: mã lỗi luôn là CHUỖI (xem `getApiCode`). */
export class ScheduleApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = 'ScheduleApiError';
    this.code = options.code;
    this.status = options.status;
  }
}

interface ErrorInfo {
  code?: string;
  status?: number;
  message: string;
}

function errorInfo(error: unknown): ErrorInfo {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } } | null)
    ?.response;
  const raw = response?.data?.message;
  return {
    code: getApiCode(error),
    status: response?.status,
    message: typeof raw === 'string' ? raw.trim() : '',
  };
}

function vietnameseMessage(info: ErrorInfo): string {
  if (info.code && SCHEDULE_ERROR_MESSAGES[info.code]) {
    return SCHEDULE_ERROR_MESSAGES[info.code];
  }
  if (info.message) return info.message;
  if (info.status === undefined) return MSG_SCHEDULE.NETWORK_ERROR;
  if (info.status === 401) return MSG_SCHEDULE.SESSION_EXPIRED;
  if (info.status === 403) return MSG_SCHEDULE.FORBIDDEN;
  return MSG_SCHEDULE.SAVE_FAILED;
}

function toScheduleApiError(error: unknown): ScheduleApiError {
  const info = errorInfo(error);
  return new ScheduleApiError(vietnameseMessage(info), { code: info.code, status: info.status });
}

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw toScheduleApiError(error);
  }
}

/** Câu lỗi hiển thị cho người dùng cuối (đã là tiếng Việt). */
export function scheduleErrorMessage(error: unknown): string {
  if (error instanceof ScheduleApiError) return error.message;
  return vietnameseMessage(errorInfo(error));
}

export interface ScheduleListQuery {
  departmentId: string;
  from?: string;
  to?: string;
  classId?: string;
}

export interface RoomSuggestionQuery {
  departmentId: string;
  startTime?: string;
  endTime?: string;
  /** S7: lọc phòng theo sĩ số/lớp khi có; giữ tương thích khi không truyền. */
  classId?: string;
}

export interface ImpactQuery {
  departmentId: string;
  status?: string;
}

export interface MyScheduleQuery {
  from?: string;
  to?: string;
}

const departmentPath = (departmentId: string) =>
  `/api/departments/${encodeURIComponent(departmentId)}/schedules`;

/* ── Lịch theo phòng ban ─────────────────────────────────────────────────── */

export const fetchSchedules = ({ departmentId, from, to, classId }: ScheduleListQuery) =>
  request(() =>
    apiClient.get<ScheduleItem[]>(departmentPath(departmentId), {
      params: { from, to, classId },
    }),
  );

export const createSchedule = (departmentId: string, payload: SchedulePayload) =>
  request(() => apiClient.post<ScheduleItem>(departmentPath(departmentId), payload));

export const updateSchedule = (
  departmentId: string,
  sessionId: string,
  payload: SchedulePayload,
) =>
  request(() =>
    apiClient.put<ScheduleItem>(
      `${departmentPath(departmentId)}/${encodeURIComponent(sessionId)}`,
      payload,
    ),
  );

/** Huỷ buổi học là POST .../cancel — KHÔNG phải DELETE (xóa mới dùng DELETE). */
export const cancelSession = (departmentId: string, sessionId: string) =>
  request(() =>
    apiClient.post<ScheduleItem>(
      `${departmentPath(departmentId)}/${encodeURIComponent(sessionId)}/cancel`,
    ),
  );

export const deleteSession = (departmentId: string, sessionId: string): Promise<void> =>
  request(() =>
    apiClient.delete(`${departmentPath(departmentId)}/${encodeURIComponent(sessionId)}`),
  ).then(() => undefined);

/* ── Room picker / impacts / lịch cá nhân ────────────────────────────────── */

/**
 * Gợi ý phòng trống. S7 đã chốt: `classId` là tham số tùy chọn để BE lọc theo sĩ
 * số/loại phòng. Caller cũ (room picker của màn lịch) giữ nguyên request 2 tham
 * số; caller cần lọc S7 truyền thêm `includeClassId = true`.
 */
export const fetchRoomSuggestions = (
  { departmentId, startTime, endTime, classId }: RoomSuggestionQuery,
  includeClassId = false,
) =>
  request(() =>
    apiClient.get<RoomSuggestion[]>(`${departmentPath(departmentId)}/room-suggestions`, {
      params: {
        startTime,
        endTime,
        ...(includeClassId && classId ? { classId } : {}),
      },
    }),
  );

export const fetchImpacts = ({ departmentId, status }: ImpactQuery) =>
  request(() =>
    apiClient.get<SessionImpact[]>(`${departmentPath(departmentId)}/impacts`, {
      params: { status },
    }),
  );

/** Lịch của chính người đăng nhập — KHÔNG gửi `departmentId`. */
export const fetchMySchedule = ({ from, to }: MyScheduleQuery) =>
  request(() =>
    apiClient.get<ScheduleItem[]>('/api/schedules/me', {
      params: { from, to },
    }),
  );

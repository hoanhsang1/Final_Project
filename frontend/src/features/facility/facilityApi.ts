import { apiClient } from '../../lib/api';
import { getApiCode } from '../platform/errorCodes';
import { FACILITY_ERROR_MESSAGES, MSG_FACILITY } from './facilityMessages';
import type {
  Equipment,
  EquipmentPayload,
  FacilityIssue,
  FacilityIssueQuery,
  IssueReportPayload,
  Room,
  RoomPayload,
} from './types';

/** Lỗi Facility đã chuẩn hoá: mã lỗi luôn là CHUỖI (xem `getApiCode`). */
export class FacilityApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = 'FacilityApiError';
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
  if (info.code && FACILITY_ERROR_MESSAGES[info.code]) {
    return FACILITY_ERROR_MESSAGES[info.code];
  }
  if (info.message) return info.message;
  if (info.status === undefined) return MSG_FACILITY.NETWORK_ERROR;
  if (info.status === 401) return MSG_FACILITY.SESSION_EXPIRED;
  if (info.status === 403) return MSG_FACILITY.FORBIDDEN;
  return MSG_FACILITY.SAVE_FAILED;
}

function toFacilityApiError(error: unknown): FacilityApiError {
  const info = errorInfo(error);
  return new FacilityApiError(vietnameseMessage(info), { code: info.code, status: info.status });
}

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw toFacilityApiError(error);
  }
}

/** Câu lỗi hiển thị cho người dùng cuối (đã là tiếng Việt). */
export function facilityErrorMessage(error: unknown): string {
  if (error instanceof FacilityApiError) return error.message;
  return vietnameseMessage(errorInfo(error));
}

/**
 * Mọi route đều nằm dưới `/api/departments/{departmentId}/facilities/**`.
 * Không dùng `/internal/rooms`, `/outbox/**` hay host cứng — Vite proxy `/api`.
 */
const facilityPath = (departmentId: string) =>
  `/api/departments/${encodeURIComponent(departmentId)}/facilities`;

/* ── Phòng học ────────────────────────────────────────────────────────────── */

export const fetchRooms = (departmentId: string): Promise<Room[]> =>
  request(() => apiClient.get<Room[]>(`${facilityPath(departmentId)}/rooms`));

export const createRoom = (departmentId: string, payload: RoomPayload): Promise<Room> =>
  request(() => apiClient.post<Room>(`${facilityPath(departmentId)}/rooms`, payload));

export const updateRoom = (
  departmentId: string,
  roomId: string,
  payload: RoomPayload,
): Promise<Room> =>
  request(() =>
    apiClient.put<Room>(
      `${facilityPath(departmentId)}/rooms/${encodeURIComponent(roomId)}`,
      payload,
    ),
  );

export const deleteRoom = (departmentId: string, roomId: string): Promise<void> =>
  request(() =>
    apiClient.delete(`${facilityPath(departmentId)}/rooms/${encodeURIComponent(roomId)}`),
  ).then(() => undefined);

/* ── Thiết bị ─────────────────────────────────────────────────────────────── */

export const fetchEquipment = (departmentId: string): Promise<Equipment[]> =>
  request(() => apiClient.get<Equipment[]>(`${facilityPath(departmentId)}/equipment`));

export const createEquipment = (
  departmentId: string,
  payload: EquipmentPayload,
): Promise<Equipment> =>
  request(() => apiClient.post<Equipment>(`${facilityPath(departmentId)}/equipment`, payload));

export const updateEquipment = (
  departmentId: string,
  equipmentId: string,
  payload: EquipmentPayload,
): Promise<Equipment> =>
  request(() =>
    apiClient.put<Equipment>(
      `${facilityPath(departmentId)}/equipment/${encodeURIComponent(equipmentId)}`,
      payload,
    ),
  );

export const deleteEquipment = (departmentId: string, equipmentId: string): Promise<void> =>
  request(() =>
    apiClient.delete(
      `${facilityPath(departmentId)}/equipment/${encodeURIComponent(equipmentId)}`,
    ),
  ).then(() => undefined);

/* ── Sự cố ────────────────────────────────────────────────────────────────── */

export const fetchFacilityIssues = ({ departmentId, status }: FacilityIssueQuery): Promise<
  FacilityIssue[]
> =>
  request(() =>
    apiClient.get<FacilityIssue[]>(`${facilityPath(departmentId)}/issues`, {
      params: { status },
    }),
  );

export const reportFacilityIssue = (
  departmentId: string,
  payload: IssueReportPayload,
): Promise<FacilityIssue> =>
  request(() => apiClient.post<FacilityIssue>(`${facilityPath(departmentId)}/issues`, payload));

/** Xử lý sự cố là POST .../resolve — KHÔNG phải PUT/PATCH. */
export const resolveFacilityIssue = (
  departmentId: string,
  issueId: string,
): Promise<FacilityIssue> =>
  request(() =>
    apiClient.post<FacilityIssue>(
      `${facilityPath(departmentId)}/issues/${encodeURIComponent(issueId)}/resolve`,
    ),
  );

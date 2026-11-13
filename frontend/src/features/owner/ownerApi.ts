import { isAxiosError } from 'axios';
import { apiClient } from '../../lib/api';
import { MSG_OWNER } from './ownerMessages';
import type {
  CreatedMember,
  Department,
  DepartmentPayload,
  Member,
  MemberPayload,
  Permission,
  Position,
  PositionPayload,
} from './types';

/**
 * Lỗi gọi API của khu vực Owner.
 *
 * PeopleService trả `{code, message}` (xem `GlobalExceptionHandler`), khác
 * IdentityService trả `{success, message, data}` — nên phải đọc `code` để dịch
 * câu chữ tiếng Việt, KHÔNG dùng `message` (message của BE là tiếng Anh).
 *
 * `NFR-REL-001`: lỗi/timeout không bao giờ được hiện thành công → mọi nhánh lỗi
 * đều ném, không nuốt.
 */
export class OwnerApiError extends Error {
  /** HTTP status, hoặc `null` khi lỗi mạng / timeout. */
  readonly status: number | null;
  /** Mã lỗi nghiệp vụ của BE (`DEPARTMENT_NOT_EMPTY`, `FORBIDDEN`, …), hoặc `null`. */
  readonly code: string | null;

  constructor(status: number | null, code: string | null, message: string) {
    super(message);
    this.name = 'OwnerApiError';
    this.status = status;
    this.code = code;
  }
}

/** Chuyển mọi thứ axios ném ra thành `OwnerApiError` — nơi duy nhất biết hình dạng lỗi. */
function toOwnerApiError(error: unknown): OwnerApiError {
  if (error instanceof OwnerApiError) {
    return error;
  }
  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body = error.response?.data as { code?: unknown; message?: unknown } | undefined;
    const code = typeof body?.code === 'string' ? body.code : null;
    const message = typeof body?.message === 'string' ? body.message : '';
    return new OwnerApiError(status, code, message || 'Owner API error');
  }
  return new OwnerApiError(null, null, error instanceof Error ? error.message : 'Owner API error');
}

/** Bọc một lời gọi HTTP: lỗi luôn thành `OwnerApiError`. */
async function request<T>(call: () => Promise<{ data: T }>): Promise<T> {
  try {
    const response = await call();
    return response.data;
  } catch (error) {
    throw toOwnerApiError(error);
  }
}

/** Câu chữ theo mã lỗi nghiệp vụ — ưu tiên mã, không dựa vào message tiếng Anh. */
function messageForCode(code: string | null, rawMessage?: string): string | null {
  if (rawMessage && /owners cannot remove their own access/i.test(rawMessage)) {
    return 'Bạn không thể tự xoá quyền truy cập của mình.';
  }
  switch (code) {
    case 'DEPARTMENT_NOT_EMPTY':
      return 'Phòng ban còn nhân viên. Hãy xoá hết nhân viên khỏi phòng ban trước.';
    case 'POSITION_IN_USE':
      return 'Chức vụ đang được gán cho nhân viên. Gỡ chức vụ khỏi nhân viên trước khi xoá.';
    case 'ACCOUNT_EXISTS':
      return 'Tên đăng nhập hoặc email đã tồn tại.';
    case 'FORBIDDEN':
      return MSG_OWNER.FORBIDDEN;
    case 'IDENTITY_UNAVAILABLE':
      return MSG_OWNER.IDENTITY_UNAVAILABLE;
    case 'UNKNOWN_PERMISSION':
      return MSG_OWNER.UNKNOWN_PERMISSION;
    case 'VALIDATION_ERROR':
      return MSG_OWNER.INVALID_INPUT;
    case 'DEPARTMENT_NOT_FOUND':
    case 'POSITION_NOT_FOUND':
    case 'MEMBER_NOT_FOUND':
      return MSG_OWNER.NOT_FOUND;
    default:
      return null;
  }
}

/**
 * Dịch lỗi thành câu tiếng Việt để hiện cho người dùng.
 *
 * Nhận cả `OwnerApiError` (đường đi bình thường) lẫn lỗi axios thô (khi có chỗ
 * gọi chưa bọc), để không chỗ nào lỡ hiện `Error.message` tiếng Anh.
 */
export function ownerErrorMessage(error: unknown): string {
  const apiError = toOwnerApiError(error);

  const byCode = messageForCode(apiError.code, apiError.message);
  if (byCode) {
    return byCode;
  }

  if (apiError.status === null) {
    return MSG_OWNER.NETWORK_ERROR;
  }
  if (apiError.status === 403) {
    if (/owners cannot remove their own access/i.test(apiError.message)) {
      return 'Bạn không thể tự xoá quyền truy cập của mình.';
    }
    return MSG_OWNER.FORBIDDEN;
  }
  if (apiError.status === 404) {
    return MSG_OWNER.NOT_FOUND;
  }
  if (apiError.status === 503) {
    return MSG_OWNER.IDENTITY_UNAVAILABLE;
  }
  return MSG_OWNER.SAVE_FAILED;
}

/* -------------------------------------------------------------------------- */
/*  Phòng ban                                                                  */
/* -------------------------------------------------------------------------- */

export function fetchDepartments(): Promise<Department[]> {
  return request(() => apiClient.get<Department[]>('/departments'));
}

export function createDepartment(payload: DepartmentPayload): Promise<Department> {
  return request(() => apiClient.post<Department>('/departments', payload));
}

export function updateDepartment(id: string, payload: DepartmentPayload): Promise<Department> {
  return request(() => apiClient.put<Department>(`/departments/${id}`, payload));
}

export function deleteDepartment(id: string): Promise<void> {
  return request(() => apiClient.delete<void>(`/departments/${id}`));
}

/* -------------------------------------------------------------------------- */
/*  Chức vụ và danh mục quyền                                                  */
/* -------------------------------------------------------------------------- */

export function fetchPositions(): Promise<Position[]> {
  return request(() => apiClient.get<Position[]>('/positions'));
}

export function createPosition(payload: PositionPayload): Promise<Position> {
  return request(() => apiClient.post<Position>('/positions', payload));
}

export function updatePosition(id: string, payload: PositionPayload): Promise<Position> {
  return request(() => apiClient.put<Position>(`/positions/${id}`, payload));
}

export function deletePosition(id: string): Promise<void> {
  return request(() => apiClient.delete<void>(`/positions/${id}`));
}

export function fetchPermissions(): Promise<Permission[]> {
  return request(() => apiClient.get<Permission[]>('/permissions'));
}

/* -------------------------------------------------------------------------- */
/*  Nhân viên của phòng ban                                                    */
/* -------------------------------------------------------------------------- */

export function fetchMembers(departmentId: string): Promise<Member[]> {
  return request(() => apiClient.get<Member[]>(`/departments/${departmentId}/members`));
}

export function createMember(departmentId: string, payload: MemberPayload): Promise<CreatedMember> {
  return request(() => apiClient.post<CreatedMember>(`/departments/${departmentId}/members`, payload));
}

export function updateMemberPositions(
  departmentId: string,
  userId: string,
  positionIds: string[],
): Promise<Member> {
  return request(() =>
    apiClient.put<Member>(`/departments/${departmentId}/members/${userId}/positions`, {
      positionIds,
    }),
  );
}

export function deleteMember(departmentId: string, userId: string): Promise<void> {
  return request(() => apiClient.delete<void>(`/departments/${departmentId}/members/${userId}`));
}

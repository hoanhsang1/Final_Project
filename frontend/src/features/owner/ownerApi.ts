import { isAxiosError } from 'axios';
import { apiClient, unwrapList } from '../../lib/api';
import { MSG_DEL, MSG_OWNER } from './ownerMessages';
import type {
  AssignmentHistoryItem,
  CreatedMember,
  Delegation,
  DelegationPayload,
  DelegationUpdatePayload,
  Department,
  DepartmentModuleImpact,
  DepartmentPayload,
  GeneralManager,
  GeneralManagerCandidate,
  Member,
  MemberDetail,
  MemberPayload,
  Permission,
  PermissionBundle,
  Position,
  PositionClonePayload,
  PositionCloneResult,
  PositionImpact,
  PositionPayload,
  ResignationRequest,
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

/** Bọc lời gọi trả danh sách — shape lạ (HTML/object) luôn thành mảng rỗng. */
function requestList<T>(call: () => Promise<{ data: unknown }>): Promise<T[]> {
  return request(call).then((raw) => unwrapList<T>(raw));
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
    case 'MODULE_NOT_ENABLED':
      return MSG_OWNER.MODULE_NOT_ENABLED;
    case 'PERMISSION_OUT_OF_MODULE':
      return MSG_OWNER.PERMISSION_OUT_OF_MODULE;
    case 'DEPARTMENT_NOT_FOUND':
    case 'POSITION_NOT_FOUND':
    case 'MEMBER_NOT_FOUND':
      return MSG_OWNER.NOT_FOUND;
    case 'EMAIL_EXISTS':
      return 'Email đã được dùng bởi nhân sự khác trong tổ chức.';
    case 'MEMBER_NOT_ACTIVE':
      return 'Nhân sự đã nghỉ việc, không thể thao tác thêm.';
    case 'RESIGNATION_NOT_FOUND':
      return 'Không tìm thấy yêu cầu nghỉ việc.';
    case 'RESIGNATION_ALREADY_PENDING':
      return 'Nhân sự đã có một yêu cầu nghỉ việc đang chờ duyệt.';
    case 'RESIGNATION_NOT_PENDING':
      return 'Yêu cầu nghỉ việc đã được xử lý bởi người khác.';
    case 'SELF_APPROVAL_NOT_ALLOWED':
      return 'Người tạo yêu cầu không thể tự duyệt yêu cầu của mình.';
    case 'DELEGATION_NOT_FOUND':
    case 'DELEGATION_NOT_ACTIVE':
      return MSG_DEL.NOT_ACTIVE;
    case 'DELEGATION_SELF_NOT_ALLOWED':
      return MSG_DEL.SELF_NOT_ALLOWED;
    case 'DELEGATION_RE_DELEGATION_FORBIDDEN':
      return MSG_DEL.RE_DELEGATION_FORBIDDEN;
    case 'DELEGATE_NOT_GENERAL_MANAGER':
      return MSG_DEL.DELEGATE_NOT_MANAGER;
    case 'DELEGATION_PERMISSION_NOT_HELD':
      return MSG_DEL.PERMISSION_NOT_HELD;
    case 'GENERAL_MANAGER_ALREADY_APPOINTED':
      return MSG_DEL.ALREADY_MANAGER;
    case 'GENERAL_MANAGER_NOT_APPOINTED':
      return MSG_DEL.NOT_MANAGER;
    case 'SELF_ESCALATION_NOT_ALLOWED':
      return MSG_DEL.SELF_ESCALATION;
    case 'DELEGATION_INVALID_WINDOW':
      return MSG_DEL.INVALID_WINDOW;
    case 'DELEGATION_SCOPE_NOT_SUPPORTED':
      return MSG_DEL.SCOPE_UNSUPPORTED;
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
  if (apiError.status === 400) {
    return MSG_OWNER.INVALID_INPUT;
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
  return requestList<Department>(() => apiClient.get('/departments'));
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

/** Quyền khả dụng của phòng — đã lọc theo module phòng + module tổ chức đang bật. */
export function fetchDepartmentAvailablePermissions(id: string): Promise<Permission[]> {
  return requestList<Permission>(() => apiClient.get(`/departments/${id}/available-permissions`));
}

/** Cảnh báo trước khi lưu danh sách module mới: chức danh/quyền nào sẽ mất hiệu lực. */
export function fetchDepartmentModuleImpact(
  id: string,
  moduleCodes: string[],
): Promise<DepartmentModuleImpact> {
  return request(() =>
    apiClient.get<DepartmentModuleImpact>(`/departments/${id}/module-impact`, {
      params: { moduleCodes: moduleCodes.join(',') },
    }),
  );
}

/* -------------------------------------------------------------------------- */
/*  Chức vụ và danh mục quyền                                                  */
/* -------------------------------------------------------------------------- */

export function fetchPositions(): Promise<Position[]> {
  return requestList<Position>(() => apiClient.get('/positions'));
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

/** Số người đang giữ chức danh — dùng để cảnh báo khi gỡ quyền. */
export function fetchPositionImpact(id: string): Promise<PositionImpact> {
  return request(() => apiClient.get<PositionImpact>(`/positions/${id}/impact`));
}

/** Nhân bản chức danh sang phòng khác; BE loại quyền ngoài module phòng đích. */
export function clonePosition(id: string, payload: PositionClonePayload): Promise<PositionCloneResult> {
  return request(() => apiClient.post<PositionCloneResult>(`/positions/${id}/clone`, payload));
}

export function fetchPermissions(): Promise<Permission[]> {
  return requestList<Permission>(() => apiClient.get('/permissions'));
}

export function fetchPermissionBundles(): Promise<PermissionBundle[]> {
  return requestList<PermissionBundle>(() => apiClient.get('/permission-bundles'));
}

/* -------------------------------------------------------------------------- */
/*  Nhân viên của phòng ban                                                    */
/* -------------------------------------------------------------------------- */

export function fetchMembers(departmentId: string): Promise<Member[]> {
  return requestList<Member>(() => apiClient.get(`/departments/${departmentId}/members`));
}

export function createMember(departmentId: string, payload: MemberPayload): Promise<CreatedMember> {
  return request(() => apiClient.post<CreatedMember>(`/departments/${departmentId}/members`, payload));
}

export function updateMemberPositions(
  departmentId: string,
  userId: string,
  positionIds: string[],
  reason?: string,
): Promise<Member> {
  return request(() =>
    apiClient.put<Member>(`/departments/${departmentId}/members/${userId}/positions`, {
      positionIds,
      ...(reason ? { reason } : {}),
    }),
  );
}

export function fetchMemberDetail(departmentId: string, userId: string): Promise<MemberDetail> {
  return request(() => apiClient.get<MemberDetail>(`/departments/${departmentId}/members/${userId}`));
}

export function fetchMemberAssignments(
  departmentId: string,
  userId: string,
): Promise<AssignmentHistoryItem[]> {
  return requestList<AssignmentHistoryItem>(() =>
    apiClient.get(`/departments/${departmentId}/members/${userId}/assignments`),
  );
}

export function deleteMember(departmentId: string, userId: string): Promise<void> {
  return request(() => apiClient.delete<void>(`/departments/${departmentId}/members/${userId}`));
}

/* -------------------------------------------------------------------------- */
/*  Nghỉ việc                                                                  */
/* -------------------------------------------------------------------------- */

export function fetchResignationRequests(
  departmentId: string,
  status?: string,
): Promise<ResignationRequest[]> {
  return requestList<ResignationRequest>(() =>
    apiClient.get(`/departments/${departmentId}/resignation-requests`, {
      params: status ? { status } : undefined,
    }),
  );
}

export function createResignationRequest(
  departmentId: string,
  userId: string,
  reason: string,
): Promise<ResignationRequest> {
  return request(() =>
    apiClient.post<ResignationRequest>(`/departments/${departmentId}/resignation-requests`, {
      userId,
      reason,
    }),
  );
}

export function approveResignation(
  departmentId: string,
  requestId: string,
  note?: string,
): Promise<ResignationRequest> {
  return request(() =>
    apiClient.post<ResignationRequest>(
      `/departments/${departmentId}/resignation-requests/${requestId}/approve`,
      { note },
    ),
  );
}

export function rejectResignation(
  departmentId: string,
  requestId: string,
  note?: string,
): Promise<ResignationRequest> {
  return request(() =>
    apiClient.post<ResignationRequest>(
      `/departments/${departmentId}/resignation-requests/${requestId}/reject`,
      { note },
    ),
  );
}

/* -------------------------------------------------------------------------- */
/*  Tổng quản lý và ủy quyền (quy tắc 3, 7)                                    */
/* -------------------------------------------------------------------------- */

// Gateway chỉ mở các route /api/* cho hai tài nguyên mới (xem APIGateway/application.yml).
export function fetchGeneralManagers(): Promise<GeneralManager[]> {
  return requestList<GeneralManager>(() => apiClient.get('/api/general-manager'));
}

export function fetchGeneralManagerCandidates(): Promise<GeneralManagerCandidate[]> {
  return requestList<GeneralManagerCandidate>(() =>
    apiClient.get('/api/general-manager/candidates'),
  );
}

export function appointGeneralManager(userId: string, reason?: string): Promise<GeneralManager> {
  return request(() =>
    apiClient.post<GeneralManager>('/api/general-manager', { userId, ...(reason ? { reason } : {}) }),
  );
}

export function removeGeneralManager(userId: string, reason?: string): Promise<void> {
  return request(() =>
    apiClient.delete<void>(`/api/general-manager/${userId}`, {
      params: reason ? { reason } : undefined,
    }),
  );
}

export function fetchDelegations(activeOnly = false): Promise<Delegation[]> {
  return requestList<Delegation>(() =>
    apiClient.get('/api/delegations', { params: { activeOnly } }),
  );
}

/** Ủy quyền đang dành cho chính mình — dùng cho Tổng quản lý. */
export function fetchMyDelegations(): Promise<Delegation[]> {
  return requestList<Delegation>(() => apiClient.get('/api/delegations/me'));
}

export function createDelegation(payload: DelegationPayload): Promise<Delegation> {
  return request(() => apiClient.post<Delegation>('/api/delegations', payload));
}

export function updateDelegation(
  id: string,
  payload: DelegationUpdatePayload,
): Promise<Delegation> {
  return request(() => apiClient.put<Delegation>(`/api/delegations/${id}`, payload));
}

export function revokeDelegation(id: string, reason?: string): Promise<Delegation> {
  return request(() =>
    apiClient.post<Delegation>(`/api/delegations/${id}/revoke`, { ...(reason ? { reason } : {}) }),
  );
}

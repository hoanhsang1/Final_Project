import { apiClient } from '../../lib/api';
import type {
  AccountCreatePayload,
  AccountItem,
  AccountListQuery,
  AuditLogItem,
  AuditLogQuery,
  OrganizationDetail,
  OrganizationListItem,
  OrganizationListQuery,
  OrganizationOption,
  PageResponse,
  PendingOrganization,
} from './types';

/**
 * Lỗi gọi API quản trị — giữ lại HTTP status để UI chọn đúng câu chữ tiếng Việt
 * (409 → "đã được xử lý", 404 → "không tìm thấy", lỗi khác → "không lưu được…").
 *
 * `NFR-REL-001`: lỗi/timeout KHÔNG được hiện thành công → mọi nhánh lỗi đều
 * dùng `status` để rơi vào nhánh báo lỗi, không bao giờ rơi vào nhánh thành công.
 *
 * ⚠️ Phân biệt 404: endpoint dạng **collection** (list, options, audit-logs) trả 404
 * = BE **chưa làm** endpoint → UI hiện "Tính năng đang chờ backend". Endpoint dạng
 * **item** (`/{id}`) trả 404 = không tìm thấy đối tượng → hiện màn 404. Xem đặc tả §4.5.
 */
export class AdminApiError extends Error {
  /** HTTP status (400/403/404/409/...) hoặc `null` khi lỗi mạng / timeout. */
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

/** Chuyển lỗi axios về `AdminApiError` để caller đọc được `status`. */
function toAdminError(error: unknown): AdminApiError {
  const err = error as {
    response?: { status?: number; data?: { message?: string } | null };
    request?: unknown;
  };
  const status = err?.response?.status ?? null;
  const serverMessage = err?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.length > 0) {
    return new AdminApiError(serverMessage, status);
  }
  if (err?.request) {
    return new AdminApiError('Không kết nối được máy chủ.', status);
  }
  return new AdminApiError('Đã xảy ra lỗi.', status);
}

/**
 * Danh sách tổ chức đang chờ duyệt — `GET /api/v1/organizations/pending`.
 *
 * Auth: `SUPER_ADMIN`. Thành công 200 trả mảng PHẲNG (không bọc ApiResponse).
 * BE đã sắp xếp theo tên (`ORDER BY o.name`) — FE không cần sắp xếp lại.
 */
export async function fetchPendingOrganizations(): Promise<PendingOrganization[]> {
  try {
    const { data } = await apiClient.get<PendingOrganization[]>('/api/v1/organizations/pending');
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Chi tiết tổ chức — `GET /api/v1/organizations/{id}`.
 *
 * Thành công 200 trả `{ organization, owners, modules }`.
 * 404 khi không có tổ chức (`Organization not found`).
 */
export async function fetchOrganizationDetail(orgId: string): Promise<OrganizationDetail> {
  try {
    const { data } = await apiClient.get<OrganizationDetail>(`/api/v1/organizations/${orgId}`);
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Duyệt tổ chức — `PATCH /api/v1/organizations/{id}/approve`.
 *
 * Body `{ notifyEmail?: boolean }` (`D-27`) — BE gửi email cho chủ tổ chức.
 * Thành công 204 (không body). 409 khi tổ chức đã được xử lý.
 *
 * ⚠️ BE hiện **chưa** đọc body này (`D-05` + `D-27`) — vẫn trả 204.
 * FE gửi đúng contract để sẵn sàng khi Sang sửa.
 */
export async function approveOrganization(orgId: string, notifyEmail = true): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/organizations/${orgId}/approve`, { notifyEmail });
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Từ chối tổ chức — `PATCH /api/v1/organizations/{id}/reject`.
 *
 * Body `{ "reason": "...", notifyEmail? }` — `reason` BẮT BUỘC, ≤ 500 ký tự sau trim (`Q-14`).
 *
 * ⚠️ BE hiện **chưa** nhận body này (`D-05`) — sẽ bỏ qua và vẫn trả 204.
 * FE vẫn gửi đúng contract để sẵn sàng khi Sang sửa; FE tự chặn lý do rỗng
 * ở phía trình duyệt nên không chạm nhánh lỗi 500 của `D-01`.
 */
export async function rejectOrganization(
  orgId: string,
  reason: string,
  notifyEmail = true,
): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/organizations/${orgId}/reject`, { reason, notifyEmail });
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Cập nhật cấu hình module của tổ chức — `PUT /api/v1/organizations/{id}/modules`.
 *
 * ⚠️ Endpoint CHƯA có ở BE (`D-16`) — đây là hợp đồng đã chốt ở Đặc tả Sprint 2 §4.6
 * để Sang làm song song. Body là **tập đầy đủ** module mong muốn, không phải
 * danh sách thêm/bớt. Thành công 204 (không body).
 */
export async function updateOrganizationModules(
  orgId: string,
  modules: string[],
): Promise<void> {
  try {
    await apiClient.put(`/api/v1/organizations/${orgId}/modules`, { modules });
  } catch (error) {
    throw toAdminError(error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Mở rộng console Super Admin (Đặc tả "Sprint 2 — Mở rộng console")          */
/*  Toàn bộ endpoint dưới đây CHƯA có ở BE — xem mục 4.4 của đặc tả.          */
/* -------------------------------------------------------------------------- */

/**
 * Chuẩn hoá query object thành `params` gửi lên BE.
 *
 * - Bỏ `undefined` / `null` / chuỗi rỗng / mảng rỗng.
 * - Mảng → chuỗi csv (`['active','rejected']` → `"active,rejected"`).
 * - Số → giữ nguyên (`page=1`, `size=20`).
 *
 * Quy ước: `page` 1-based, `size` mặc định 20, `sort` dạng `field,dir`.
 */
function buildPageParams(query: object = {}): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      params[key] = value.join(',');
      continue;
    }
    params[key] = value as string | number;
  }
  return params;
}

/**
 * Danh sách **tất cả** tổ chức — `GET /api/v1/organizations` (`D-20`).
 *
 * ⚠️ Chưa có ở BE. Khi endpoint trả 404 → UI hiện "Tính năng đang chờ backend" (`D-20`).
 */
export async function fetchOrganizations(
  query: OrganizationListQuery = {},
): Promise<PageResponse<OrganizationListItem>> {
  try {
    const { data } = await apiClient.get<PageResponse<OrganizationListItem>>(
      '/api/v1/organizations',
      { params: buildPageParams(query) },
    );
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Tổ chức rút gọn cho dropdown — `GET /api/v1/organizations/options` (`D-20b`).
 *
 * Trả mảng phẳng `[{ id, name }]`, KHÔNG phân trang.
 */
export async function fetchOrganizationOptions(): Promise<OrganizationOption[]> {
  try {
    const { data } = await apiClient.get<OrganizationOption[]>('/api/v1/organizations/options');
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Vô hiệu hoá tổ chức — `PATCH /api/v1/organizations/{id}/suspend` (`D-21`).
 *
 * Body `{ reason }` — BẮT BUỘC, 1..500 ký tự (cần audit). Thành công 204.
 * BE đổi `organization.status` → `suspended`, vô hiệu hoá `account` của chủ tổ chức.
 */
export async function suspendOrganization(orgId: string, reason: string): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/organizations/${orgId}/suspend`, { reason });
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Kích hoạt lại tổ chức — `PATCH /api/v1/organizations/{id}/reactivate` (`D-21b`).
 *
 * Body `{ reason? }` — lý do KHÔNG bắt buộc. Thành công 204.
 */
export async function reactivateOrganization(orgId: string, reason?: string): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/organizations/${orgId}/reactivate`, {
      ...(reason ? { reason } : {}),
    });
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Nhật ký hệ thống — `GET /api/v1/audit-logs` (`D-22`).
 *
 * Dùng cho 3 màn: Nhật ký hệ thống · Lịch sử duyệt tổ chức (`organizationId`)
 * · Nhật ký của tài khoản (`accountId`).
 */
export async function fetchAuditLogs(
  query: AuditLogQuery = {},
): Promise<PageResponse<AuditLogItem>> {
  try {
    const { data } = await apiClient.get<PageResponse<AuditLogItem>>('/api/v1/audit-logs', {
      params: buildPageParams(query),
    });
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/** Danh sách tài khoản — `GET /api/v1/accounts` (`D-24`). */
export async function fetchAccounts(
  query: AccountListQuery = {},
): Promise<PageResponse<AccountItem>> {
  try {
    const { data } = await apiClient.get<PageResponse<AccountItem>>('/api/v1/accounts', {
      params: buildPageParams(query),
    });
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/** Chi tiết tài khoản — `GET /api/v1/accounts/{id}` (`D-24b`). */
export async function fetchAccount(accountId: string): Promise<AccountItem> {
  try {
    const { data } = await apiClient.get<AccountItem>(`/api/v1/accounts/${accountId}`);
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Đổi trạng thái tài khoản — `PATCH /api/v1/accounts/{id}/status` (`D-24c`).
 *
 * Body `{ status, reason? }` — `status ∈ {active, locked, disabled}`.
 * `reason` tuỳ chọn; nếu có thì ≤ 500 ký tự. Thành công 204.
 */
export async function updateAccountStatus(
  accountId: string,
  status: 'active' | 'locked' | 'disabled',
  reason?: string,
): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/accounts/${accountId}/status`, {
      status,
      ...(reason ? { reason } : {}),
    });
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Tạo tài khoản — `POST /api/v1/accounts` (`D-29`).
 *
 * `username` + mật khẩu tạm do **BE sinh** (gửi qua email). Thành công 201
 * trả về item vừa tạo; 409 khi email/username đã tồn tại.
 */
export async function createAccount(payload: AccountCreatePayload): Promise<AccountItem> {
  try {
    const { data } = await apiClient.post<AccountItem>('/api/v1/accounts', payload);
    return data;
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Đổi vai trò tài khoản — `PATCH /api/v1/accounts/{id}/role` (`D-30`).
 *
 * Body `{ role }` — role backend gốc, không nhận `SUPER_ADMIN`. Thành công 204;
 * 409 khi admin tự đổi vai trò của chính mình.
 */
export async function updateAccountRole(accountId: string, role: string): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/accounts/${accountId}/role`, { role });
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Đặt lại mật khẩu — `POST /api/v1/accounts/{id}/reset-password` (`D-31`).
 *
 * - Không truyền `newPassword` → BE sinh mật khẩu tạm + gửi email người dùng.
 * - Truyền `newPassword` (≥ 8 ký tự) → BE đặt thẳng mật khẩu mới.
 *
 * Thành công 204.
 */
export async function resetAccountPassword(
  accountId: string,
  newPassword?: string,
): Promise<void> {
  try {
    await apiClient.post(`/api/v1/accounts/${accountId}/reset-password`, {
      ...(newPassword ? { new_password: newPassword } : {}),
    });
  } catch (error) {
    throw toAdminError(error);
  }
}

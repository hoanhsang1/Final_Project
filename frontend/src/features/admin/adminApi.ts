import { apiClient } from '../../lib/api';
import type { OrganizationDetail, PendingOrganization } from './types';

/**
 * Lỗi gọi API quản trị — giữ lại HTTP status để UI chọn đúng câu chữ tiếng Việt
 * (409 → "đã được xử lý", 404 → "không tìm thấy", lỗi khác → "không lưu được…").
 *
 * `NFR-REL-001`: lỗi/timeout KHÔNG được hiện thành công → mọi nhánh lỗi đều
 * dùng `status` để rơi vào nhánh báo lỗi, không bao giờ rơi vào nhánh thành công.
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
 * Không body. Thành công 204 (không body). 409 khi tổ chức đã được xử lý.
 */
export async function approveOrganization(orgId: string): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/organizations/${orgId}/approve`);
  } catch (error) {
    throw toAdminError(error);
  }
}

/**
 * Từ chối tổ chức — `PATCH /api/v1/organizations/{id}/reject`.
 *
 * Body `{ "reason": "..." }` — BẮT BUỘC, ≤ 500 ký tự sau trim (`Q-14`).
 *
 * ⚠️ BE hiện **chưa** nhận body này (`D-05`) — sẽ bỏ qua và vẫn trả 204.
 * FE vẫn gửi đúng contract để sẵn sàng khi Sang sửa; FE tự chặn lý do rỗng
 * ở phía trình duyệt nên không chạm nhánh lỗi 500 của `D-01`.
 */
export async function rejectOrganization(orgId: string, reason: string): Promise<void> {
  try {
    await apiClient.patch(`/api/v1/organizations/${orgId}/reject`, { reason });
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

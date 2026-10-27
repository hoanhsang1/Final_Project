/**
 * Type DTO cho luồng quản trị của Admin hệ thống (Sprint 2).
 *
 * ⚠️ TẠM THỜI VIẾT TAY theo contract đã đối chiếu với code backend thật
 * (`OrganizationApprovalService`, `ModuleController`). Backend CHƯA xuất file
 * OpenAPI nên chưa sinh type tự động được. Khi Sang xuất OpenAPI → thay file
 * này bằng type sinh tự động, không viết tay.
 *
 * LƯU Ý QUAN TRỌNG: `org_type` và `status` BE trả **CHỮ THƯỜNG** (`school`, `pending`)
 * vì đọc thẳng ENUM trong MySQL. Đặc tả `docs/api.md` ghi "SCHOOL" là SAI (`D-08`).
 */

/** Loại tổ chức — khớp ENUM `organization.org_type`. */
export type OrgType = 'school' | 'center';

/** Trạng thái tổ chức — khớp ENUM `organization.status`. */
export type OrgStatus = 'pending' | 'active' | 'rejected' | 'suspended';

/** Trạng thái module của tổ chức — khớp ENUM `organization_module.status`. */
export type ModuleStatus = 'requested' | 'active' | 'rejected';

/** Trạng thái tài khoản — khớp ENUM `account.status`. */
export type AccountStatus = 'pending' | 'active' | 'locked' | 'disabled';

/** Một dòng trong danh sách tổ chức chờ duyệt (`GET /organizations/pending`). */
export interface PendingOrganization {
  id: string;
  name: string;
  org_type: OrgType;
  status: OrgStatus;
  owner_username: string;
  owner_email: string;
}

/**
 * Thông tin tổ chức trong response chi tiết (`GET /organizations/{id}`).
 *
 * 6 field cuối là phần **cần mở rộng** (`D-19`): BE hiện mới trả 4 field đầu.
 * FE vẫn khai báo để sẵn sàng, và hiển thị "—" khi BE chưa trả (`TC-ORG-25`).
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  org_type: OrgType;
  status: OrgStatus;
  /** `D-11` + `D-19` — BE chưa lưu/trả. */
  contact_email?: string | null;
  /** `D-11` + `D-19` — BE chưa lưu/trả. */
  contact_phone?: string | null;
  /** `D-19` — BE chưa trả. */
  created_at?: string | null;
  /** `D-05` + `D-19` — BE chưa ghi/trả. */
  approved_by?: string | null;
  /** `D-05` + `D-19` — BE chưa ghi/trả. */
  approved_at?: string | null;
  /** `D-05` + `D-19` — BE chưa ghi/trả. */
  rejection_reason?: string | null;
}

/** Người đại diện của tổ chức (role backend `ORG_OWNER`). */
export interface OrganizationOwner {
  id: string;
  username: string;
  email: string;
  status: AccountStatus;
}

/** Module tổ chức đã đăng ký. */
export interface OrganizationModule {
  code: string;
  name: string;
  status: ModuleStatus;
}

/** Response đầy đủ của `GET /organizations/{id}`. */
export interface OrganizationDetail {
  organization: OrganizationSummary;
  owners: OrganizationOwner[];
  modules: OrganizationModule[];
}

/* -------------------------------------------------------------------------- */
/*  Mở rộng console (Đặc tả "Sprint 2 — Mở rộng console Super Admin")          */
/* -------------------------------------------------------------------------- */

/**
 * Một dòng trong danh sách TẤT CẢ tổ chức — `GET /api/v1/organizations` (`D-20`).
 *
 * ⚠️ Endpoint CHƯA có ở BE → type viết theo contract đã chốt trong đặc tả §4.2.
 */
export interface OrganizationListItem {
  id: string;
  name: string;
  org_type: OrgType;
  status: OrgStatus;
  owner_username: string;
  owner_email: string;
  /** `D-19` — BE chưa trả. */
  created_at?: string | null;
}

/**
 * Envelope phân trang — quy ước chung cho các endpoint list (`D-20`, `D-22`, `D-24`).
 *
 * `page` là **1-based** (khớp `Table.current` của antd), `total` là tổng **sau khi lọc**.
 */
export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/** Tổ chức rút gọn cho dropdown — `GET /api/v1/organizations/options` (`D-20b`). */
export interface OrganizationOption {
  id: string;
  name: string;
}

/** Hành động ghi trong `audit_log` — giá trị thô do BE quy định (đặc tả §4.3). */
export type AuditAction =
  | 'ORG_APPROVED'
  | 'ORG_REJECTED'
  | 'ORG_SUSPENDED'
  | 'ORG_REACTIVATED'
  | 'ORG_MODULES_UPDATED'
  | 'ACCOUNT_STATUS_CHANGED'
  // UC-19 (D-29/D-30/D-31) — đặc tả §4.3 ghi 3 hành động này; BE chưa chốt tên cuối cùng.
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_ROLE_CHANGED'
  | 'ACCOUNT_PASSWORD_RESET';

/** Loại đối tượng bị tác động — quyết định link "Đối tượng" trỏ đi đâu. */
export type AuditTargetType = 'ORGANIZATION' | 'ACCOUNT';

/** Một dòng nhật ký hệ thống — `GET /api/v1/audit-logs` (`D-22`). */
export interface AuditLogItem {
  id: string;
  /** ISO-8601 naive local — FE format trực tiếp, không chuyển múi giờ. */
  created_at: string;
  action: AuditAction;
  actor_username: string;
  target_type: AuditTargetType;
  target_id: string;
  target_name: string;
  description?: string | null;
}

/**
 * Một dòng tài khoản — `GET /api/v1/accounts` (`D-24`).
 *
 * `role` là role **backend gốc** (`SUPER_ADMIN`, `ORG_OWNER`, …) — khớp claim JWT.
 */
export interface AccountItem {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  role: string;
  status: AccountStatus;
  created_at?: string | null;
  last_login_at?: string | null;
}

/**
 * Body `POST /api/v1/accounts` — tạo tài khoản (`D-29`).
 *
 * **Không** có `username`/`password`: BE sinh username từ email và sinh mật khẩu
 * tạm, gửi qua email người dùng (Q-36). `role` là role backend gốc, **không bao
 * giờ là `SUPER_ADMIN`** (Q-35).
 */
export interface AccountCreatePayload {
  email: string;
  full_name: string;
  role: string;
  /** Bắt buộc với mọi role tạo mới — mọi role đều gắn một tổ chức. */
  organization_id: string;
}

/** Tham số lọc danh sách tổ chức (`D-20`). */
export interface OrganizationListQuery {
  page?: number;
  size?: number;
  status?: OrgStatus[];
  orgType?: OrgType | null;
  keyword?: string;
  sort?: string;
}

/** Tham số lọc danh sách tài khoản (`D-24`). */
export interface AccountListQuery {
  page?: number;
  size?: number;
  organizationId?: string | null;
  role?: string | null;
  status?: AccountStatus[];
  keyword?: string;
  sort?: string;
}

/** Tham số lọc nhật ký hệ thống (`D-22`). */
export interface AuditLogQuery {
  page?: number;
  size?: number;
  action?: AuditAction[];
  organizationId?: string | null;
  accountId?: string | null;
  /** ISO-8601 naive local — chỉ ngày (`2026-10-21`). */
  from?: string | null;
  to?: string | null;
  keyword?: string;
  sort?: string;
}

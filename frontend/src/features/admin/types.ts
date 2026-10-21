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

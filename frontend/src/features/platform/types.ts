export type OrgStatus = 'pending' | 'active' | 'rejected' | 'suspended'
export type OrgType = 'SCHOOL' | 'CENTER'

export interface OrganizationRow {
  id: string
  name: string
  orgType: OrgType
  status: OrgStatus
  createdAt: string | null
  ownerUsername: string
  ownerEmail: string
}

export interface PendingOrganization {
  id: string
  name: string
  orgType: OrgType
  status: OrgStatus
  ownerUsername: string
  ownerEmail: string
}

export interface OrganizationOwner {
  id: string
  username: string
  email: string
  status: string
}

export type ModuleStatus =
  | 'requested'
  | 'active'
  | 'rejected'
  | 'disabled'
  | 'locked'
  | 'not_registered'

export interface OrganizationModule {
  code: string
  name: string
  status: ModuleStatus
}

export interface AdminModule extends OrganizationModule {
  isCore: boolean
  lockedByAdmin: string | null
  lockedReason: string | null
  lockedAt: string | null
  disabledAt: string | null
}

export interface OrganizationDetail {
  organization: {
    id: string
    name: string
    orgType: OrgType
    status: OrgStatus
  }
  owners: OrganizationOwner[]
  modules: OrganizationModule[]
}

export interface AuditLogItem {
  id: string
  createdAt: string
  action: string
  actorUsername: string
  targetType: 'ORGANIZATION' | 'ACCOUNT'
  targetId: string
  targetName: string
  description: string | null
}

export interface OrganizationListParams {
  page?: number
  size?: number
  status?: OrgStatus[]
  orgType?: OrgType
  keyword?: string
  sort?: string
}

export interface ModuleCatalogItem {
  code: string
  name: string
}

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  pending: 'Chờ duyệt',
  active: 'Đang hoạt động',
  suspended: 'Tạm ngưng',
  rejected: 'Bị từ chối',
}

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  SCHOOL: 'Trường học',
  CENTER: 'Trung tâm',
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ORG_APPROVED: 'Duyệt tổ chức',
  ORG_REJECTED: 'Từ chối tổ chức',
  ORG_SUSPENDED: 'Tạm ngưng tổ chức',
  ORG_REACTIVATED: 'Kích hoạt lại tổ chức',
  ORG_MODULES_UPDATED: 'Cập nhật module tổ chức',
  ACCOUNT_STATUS_CHANGED: 'Đổi trạng thái tài khoản',
  ACCOUNT_CREATED: 'Tạo tài khoản',
  ACCOUNT_ROLE_CHANGED: 'Đổi vai trò tài khoản',
  ACCOUNT_PASSWORD_RESET: 'Đặt lại mật khẩu tài khoản',
}

export interface AccountRow {
  id: string
  username: string
  email: string
  fullName: string
  organizationId: string | null
  organizationName: string | null
  role: string
  status: string
  createdAt: string | null
  lastLoginAt: string | null
}

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  locked: 'Tạm khoá',
  disabled: 'Đã vô hiệu hoá',
}

export const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ tổ chức',
  ORG_OWNER: 'Chủ tổ chức (cũ)',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
  STUDENT: 'Sinh viên',
  TEACHER: 'Giáo viên (cũ)',
  ORG_ADMIN: 'Quản trị tổ chức (cũ)',
  ACADEMIC_STAFF: 'Giáo vụ (cũ)',
  FACILITY_STAFF: 'Cơ sở vật chất (cũ)',
  SUPER_ADMIN: 'Quản trị hệ thống',
}

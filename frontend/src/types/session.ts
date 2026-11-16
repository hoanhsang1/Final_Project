/** Vai trò đăng nhập (JWT). Chức vụ/quyền KHÔNG phải role. */
export type RoleCode =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'ORG_OWNER'
  | 'MANAGER'
  | 'STAFF'
  | 'STUDENT'
  /** @deprecated — không cấp mới, chỉ còn trong dữ liệu cũ. */
  | 'ORG_ADMIN'
  | 'ACADEMIC_STAFF'
  | 'FACILITY_STAFF'
  /** @deprecated — giáo viên là STAFF + chức vụ. */
  | 'TEACHER'
  | (string & {})

export interface SessionUser {
  id: string
  username: string
  /** Chưa có trong JWT thật; lấy từ mock hoặc API hồ sơ khi được bổ sung. */
  fullName?: string | null
  email?: string | null
  /** Tổ chức đang thao tác; null với SUPER_ADMIN. */
  organizationId?: string | null
  organizationName?: string | null
  departmentId?: string | null
  positionNames?: string[]
  mustChangePassword: boolean
}

export interface Session {
  user: SessionUser
  roles: RoleCode[]
  /** Vai trò hiệu lực đơn (claim `role`). */
  role?: string | null
  /** Quyền hiệu lực đã gồm chức vụ + bundle + ủy quyền. */
  permissions: string[]
  /** Phạm vi từng quyền: ORGANIZATION hoặc DEPARTMENT:<id>. */
  permissionScopes: Record<string, string[]>
  /** Quyền đang nhận qua ủy quyền. */
  delegatedPermissions: string[]
  /**
   * Module đang bật — backend hiện KHÔNG trả trong JWT.
   * Để trống nghĩa là "chưa xác định": UI dựa vào quyền, backend vẫn chặn bằng MODULE_NOT_ENABLED.
   */
  modules: string[]
  expiresAt?: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface RegisterOrganizationRequest {
  organizationName: string
  orgType: 'SCHOOL' | 'CENTER'
  username: string
  email: string
  password: string
  modules: string[]
}

export interface RegisterOrganizationResponse {
  organizationId: string
  accountId: string
  organizationStatus: 'PENDING'
  accountStatus: 'PENDING'
  requestedModules: string[]
}
